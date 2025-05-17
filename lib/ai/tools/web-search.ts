import { tool } from 'ai';
import { z } from 'zod';

// Error type definitions
interface ErrorWithMessage {
  message: string;
}

// Type guard for checking if an error has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Safely extract error message
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

// Add a simple delay function to prevent hitting rate limits
const delay = (baseMs: number) => {
  const jitter = Math.random() * baseMs * 0.5; // Add up to 50% jitter
  const totalDelay = Math.floor(baseMs + jitter);
  return new Promise(resolve => setTimeout(resolve, totalDelay));
};

// Simple in-memory cache for search results
const searchCache = new Map<string, {
  timestamp: number,
  results: { results: SearchResult[], count: number, query: string }
}>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

interface SearchResult {
  title: string;
  href: string;
  body: string;
}

// Brave Search client
class BraveSearchClient {
  private API_KEY = 'BSA-tvUmDnW2Qv1RarZrQKNgU0yjcC_';
  private API_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

  // Realistic browser user agents
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15'
  ];

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async search({
    query,
    maxResults = 20,
    region = 'us',
    safeSearch = true,
    search_lang,
    freshness,
    result_filter,
    summary
  }: {
    query: string;
    maxResults?: number;
    region?: string;
    safeSearch?: boolean;
    search_lang?: string;
    freshness?: string;
    result_filter?: string;
    summary?: boolean;
  }) {
    let logParams = `Brave Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`;
    if (search_lang) logParams += `, search_lang=${search_lang}`;
    if (freshness) logParams += `, freshness=${freshness}`;
    if (result_filter) logParams += `, result_filter=${result_filter}`;
    if (summary !== undefined) logParams += `, summary=${summary}`;
    console.log(logParams);

    // Check cache first
    const cacheKey = `brave:${query}:${maxResults}:${region}:${safeSearch}:${search_lang || ''}:${freshness || ''}:${result_filter || ''}:${summary !== undefined ? summary : ''}`;
    const cachedResult = searchCache.get(cacheKey);

    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      console.log('Using cached Brave search results');
      return cachedResult.results;
    }

    try {
      // Add a small delay before making the request to avoid rate limiting
      await delay(300);

      // Construct the URL with query parameters
      const url = new URL(this.API_ENDPOINT);
      url.searchParams.append('q', query);
      url.searchParams.append('count', String(Math.min(maxResults, 20))); // Brave API max is 20
      url.searchParams.append('country', region.toUpperCase());
      url.searchParams.append('safesearch', safeSearch ? 'moderate' : 'off');
      url.searchParams.append('extra_snippets', 'true');

      if (search_lang) {
        url.searchParams.append('search_lang', search_lang);
      }
      if (freshness) {
        url.searchParams.append('freshness', freshness);
      }
      if (result_filter) {
        url.searchParams.append('result_filter', result_filter);
      }
      if (summary !== undefined) {
        url.searchParams.append('summary', String(summary));
      }

      // Make the request to Brave Search API
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'User-Agent': this.getRandomUserAgent(),
          'X-Subscription-Token': this.API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Brave Search API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const results: SearchResult[] = [];

      // Process web search results
      if (data.web && data.web.results && Array.isArray(data.web.results)) {
        for (const result of data.web.results) {
          if (results.length >= maxResults) break;

          // Convert Brave search result to our SearchResult format
          results.push({
            title: result.title || 'No title',
            href: result.url || '',
            body: result.description || result.snippet || (result.meta_url && result.meta_url.path) || 'No description available',
          });
        }
      }

      // Process summary if available
      if (data.summarizer && data.summarizer.results && data.summarizer.results.length > 0 && results.length < maxResults) {
        const summaryText = data.summarizer.results[0].text;
        if (summaryText) {
          results.unshift({ // Add summary to the beginning of results
            title: 'Search Summary',
            href: '', // Summaries don't have a direct URL
            body: summaryText,
          });
        }
      }

      // Add infobox if available
      if (data.infobox && data.infobox.results && results.length < maxResults) {
        const infobox = data.infobox.results;

        if (infobox.long_desc) {
          results.push({
            title: infobox.label || 'Information',
            href: infobox.website_url || '',
            body: infobox.long_desc || 'No description available',
          });
        }
      }

      // Add FAQ content if available
      if (data.faq && data.faq.results && Array.isArray(data.faq.results) && results.length < maxResults) {
        for (const faq of data.faq.results) {
          if (results.length >= maxResults) break;

          results.push({
            title: faq.question || 'Question',
            href: faq.url || '',
            body: faq.answer || 'No answer available',
          });
        }
      }

      // Add discussions if available
      if (data.discussions && data.discussions.results && Array.isArray(data.discussions.results) && results.length < maxResults) {
        for (const discussion of data.discussions.results) {
          if (results.length >= maxResults) break;
          results.push({
            title: discussion.title || 'Discussion',
            href: discussion.url || '',
            body: discussion.description || 'No description available',
          });
        }
      }

      // Add videos if available
      if (data.videos && data.videos.results && Array.isArray(data.videos.results) && results.length < maxResults) {
        for (const video of data.videos.results) {
          if (results.length >= maxResults) break;
          results.push({
            title: video.title || 'Video',
            href: video.url || '',
            body: video.description || 'No description available',
          });
        }
      }

      // Add news if available
      if (data.news && data.news.results && Array.isArray(data.news.results) && results.length < maxResults) {
        for (const news_item of data.news.results) {
          if (results.length >= maxResults) break;
          results.push({
            title: news_item.title || 'News',
            href: news_item.url || '',
            body: news_item.description || 'No description available',
          });
        }
      }


      console.log(
        `Brave Search Complete: Found ${results.length} results`
      );

      const finalResults = {
        results: results.slice(0, maxResults),
        count: results.length,
        query: query,
      };

      // Cache the results
      searchCache.set(cacheKey, {
        timestamp: Date.now(),
        results: finalResults
      });

      return finalResults;
    } catch (error: unknown) {
      console.error(`Error during Brave search: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}

// Serper client for fallback web searches
class SerperClient {
  // Simple in-memory cache for Serper API results
  private cache = new Map<string, {
    timestamp: number,
    results: { results: SearchResult[], count: number, query: string }
  }>();

  async search({
    query,
    maxResults = 20,
    region = 'us',
    safeSearch = true,
    search_lang, // Added for consistency, basic mapping for 'hl'
    freshness,   // Added for consistency, basic mapping for 'tbs'
    // result_filter and summary are not directly supported by Serper in the same way
  }: {
    query: string;
    maxResults?: number;
    region?: string;
    safeSearch?: boolean;
    search_lang?: string;
    freshness?: string;
    // result_filter?: string; // Not directly mapped
    // summary?: boolean; // Not directly mapped
  }) {
    let logParams = `Serper (Google) Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`;
    if (search_lang) logParams += `, search_lang=${search_lang}`;
    if (freshness) logParams += `, freshness=${freshness}`;
    console.log(logParams);


    // Check cache first
    const cacheKey = `serper:${query}:${maxResults}:${region}:${safeSearch}:${search_lang || ''}:${freshness || ''}`;
    const cachedResult = this.cache.get(cacheKey);

    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      console.log('Using cached Serper search results');
      return cachedResult.results;
    }

    try {
      // Add a small delay before making the request
      await delay(200);

      const serperPayload: Record<string, string | number> = {
        q: query,
        gl: region,
        hl: search_lang || 'en', // Default to 'en' if not provided
        num: maxResults,
        safe: safeSearch ? 'active' : 'off',
      };

      // Basic freshness mapping for Serper (qdr: h, w, m, y)
      if (freshness) {
        const freshnessLower = freshness.toLowerCase();
        if (freshnessLower === 'pd') {
          serperPayload.tbs = 'qdr:h'; // Past 24 hours
        } else if (freshnessLower === 'pw') {
          serperPayload.tbs = 'qdr:w'; // Past week
        } else if (freshnessLower === 'pm') {
          serperPayload.tbs = 'qdr:m'; // Past month
        } else if (freshnessLower === 'py') {
          serperPayload.tbs = 'qdr:y'; // Past year
        }
        // Note: Serper's custom date range (YYYY-MM-DDtoYYYY-MM-DD) needs different 'tbs' format,
        // e.g., cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY. This is not implemented here for simplicity.
      }


      // Set up the request to the Serper API
      const options = {
        method: 'POST',
        headers: {
          'X-API-KEY': '5b106638ab76499468577a6a8844cacfa7d38551',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serperPayload),
      };

      // Make the request to the Serper API
      const response = await fetch('https://google.serper.dev/search', options);

      if (!response.ok) {
        throw new Error(
          `Serper API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const results: SearchResult[] = [];

      // Process organic search results
      if (data.organic && Array.isArray(data.organic)) {
        for (const result of data.organic) {
          if (results.length >= maxResults) break;

          results.push({
            title: result.title || 'No title',
            href: result.link || '',
            body: result.snippet || 'No description available',
          });
        }
      }

      // Add knowledge graph information if available
      if (data.knowledgeGraph && results.length < maxResults) {
        const kg = data.knowledgeGraph;
        results.push({
          title: kg.title || 'Knowledge Graph',
          href: kg.website || '',
          body:
            kg.description ||
            (kg.attributes
              ? JSON.stringify(kg.attributes)
              : 'No description available'),
        });
      }

      // Add answer box information if available
      if (data.answerBox && results.length < maxResults) {
        const answer = data.answerBox;
        results.push({
          title: answer.title || 'Answer',
          href: answer.link || '',
          body: answer.answer || answer.snippet || 'No direct answer available',
        });
      }

      // Add news if available (Serper often includes news in organic or has a 'news' key)
      if (data.news && Array.isArray(data.news) && results.length < maxResults) {
        for (const news_item of data.news) {
          if (results.length >= maxResults) break;
          results.push({
            title: news_item.title || 'News',
            href: news_item.link || '',
            body: news_item.snippet || 'No description available',
          });
        }
      }

      // Add videos if available (Serper often includes videos in organic or has a 'videos' key)
      if (data.videos && Array.isArray(data.videos) && results.length < maxResults) {
        for (const video_item of data.videos) {
          if (results.length >= maxResults) break;
          results.push({
            title: video_item.title || 'Video',
            href: video_item.link || '',
            body: video_item.snippet || 'No description available',
          });
        }
      }


      console.log(`Serper Search Complete: Found ${results.length} results`);

      const finalResults = {
        results: results.slice(0, maxResults),
        count: results.length,
        query: query,
      };

      // Cache the results
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        results: finalResults
      });

      return finalResults;
    } catch (error: unknown) {
      console.error(`Error during Serper search: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}

// Initialize clients
const braveSearch = new BraveSearchClient();
const serper = new SerperClient();

export const webSearch = tool({
  description:
    'Perform a web search using Brave Search (with Google as fallback) and return the results. Supports advanced parameters for targeted searches.',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z
      .number()
      .min(1) // Allow smaller requests if needed, though Brave might still return more up to its cap
      .max(20) // Brave's documented max for 'count'
      .default(10) // Sensible default
      .describe('The desired number of results to return (default: 10, max: 20)'),
    region: z
      .string()
      .default('us')
      .describe('The 2-character country code for the search region (default: "us"). Example: "de" for Germany.'),
    safeSearch: z
      .boolean()
      .default(true)
      .describe('Whether to enable safe search (filters explicit content). Default: true.'),
    search_lang: z
      .string()
      .optional()
      .describe('Optional: The 2-character language code for the search results (e.g., "en", "es", "fr").'),
    freshness: z
      .string()
      .optional()
      .describe("Optional: Filter search results by when they were discovered. Supported values: 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year), or a date range like 'YYYY-MM-DDtoYYYY-MM-DD'."),
    result_filter: z
      .string()
      .optional()
      .describe("Optional: Comma-delimited string of result types to include (e.g., 'news,web', 'videos'). Supported types: discussions, faq, infobox, news, query, summarizer, videos, web, locations."),
    summary: z
      .boolean()
      .optional()
      .describe('Optional: Whether to request a summary of the search results from the Brave Search API. Default: false.'),
  }),
  execute: async ({
    query,
    maxResults = 10,
    region = 'us',
    safeSearch = true,
    search_lang,
    freshness,
    result_filter,
    summary = false, // Default summary to false
  }) => {
    // Normalize maxResults for internal use, respecting Brave's cap.
    // The Zod schema now has default(10) and max(20).
    const normalizedMaxResults = Math.min(maxResults, 20);

    let logParams = `Web Search: query='${query}', max=${normalizedMaxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}, summary=${summary}`;
    if (search_lang) logParams += `, search_lang=${search_lang}`;
    if (freshness) logParams += `, freshness=${freshness}`;
    if (result_filter) logParams += `, result_filter=${result_filter}`;
    console.log(logParams);

    try {
      // Try Brave Search first
      try {
        const braveResults = await braveSearch.search({
          query,
          maxResults: normalizedMaxResults,
          region,
          safeSearch,
          search_lang,
          freshness,
          result_filter,
          summary
        });

        // If we got at least some results, return them
        if (braveResults.results.length > 0) {
          return braveResults;
        }

        console.log('Brave Search returned no results, trying Serper');
        // If no results from Brave, fall back to Serper
        const serperResults = await serper.search({
          query,
          maxResults: normalizedMaxResults,
          region,
          safeSearch,
          search_lang, // Pass along for consistency
          freshness,   // Pass along for consistency
        });
        return serperResults;
      } catch (braveError: unknown) {
        console.error(
          `Brave search failed: ${getErrorMessage(braveError)}, falling back to Serper`
        );
        // Fall back to Serper if Brave fails
        const serperResults = await serper.search({
          query,
          maxResults: normalizedMaxResults,
          region,
          safeSearch,
          search_lang, // Pass along for consistency
          freshness,   // Pass along for consistency
        });
        return serperResults;
      }
    } catch (error: unknown) {
      console.error(`All search attempts failed: ${getErrorMessage(error)}`);
      return {
        results: [
          {
            title: 'Search Error',
            href: '',
            body: `Failed to search for '${query}'. Error: ${getErrorMessage(error)}. Please try again with a different query.`,
          },
        ],
        count: 0,
        query: query,
        // error: `Search error: ${getErrorMessage(error)}`, // This was causing a type error with the 'ai' package's tool definition.
      };
    }
  },
});
