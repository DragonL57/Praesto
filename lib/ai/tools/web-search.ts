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
    maxResults = 10,
    region = 'us',
    safeSearch = true,
  }: {
    query: string;
    maxResults?: number;
    region?: string;
    safeSearch?: boolean;
  }) {
    console.log(
      `Brave Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`,
    );

    // Check cache first
    const cacheKey = `brave:${query}:${maxResults}:${region}:${safeSearch}`;
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
          `Brave Search API error: ${response.status} ${response.statusText}`,
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
            body: result.description || 'No description available',
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

      console.log(
        `Brave Search Complete: Found ${results.length} results`,
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
    maxResults = 10,
    region = 'us',
    safeSearch = true,
  }: {
    query: string;
    maxResults?: number;
    region?: string;
    safeSearch?: boolean;
  }) {
    console.log(
      `Serper (Google) Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`,
    );

    // Check cache first
    const cacheKey = `serper:${query}:${maxResults}:${region}:${safeSearch}`;
    const cachedResult = this.cache.get(cacheKey);

    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      console.log('Using cached Serper search results');
      return cachedResult.results;
    }

    try {
      // Add a small delay before making the request
      await delay(200);

      // Set up the request to the Serper API
      const options = {
        method: 'POST',
        headers: {
          'X-API-KEY': '5b106638ab76499468577a6a8844cacfa7d38551',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          gl: region, // Google country code
          hl: 'en', // Language
          num: maxResults,
          safe: safeSearch ? 'active' : 'off',
        }),
      };

      // Make the request to the Serper API
      const response = await fetch('https://google.serper.dev/search', options);

      if (!response.ok) {
        throw new Error(
          `Serper API error: ${response.status} ${response.statusText}`,
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
    'Perform a web search using Brave Search (with Google as fallback) and return the results',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z
      .number()
      .min(10)
      .max(10)
      .default(10)
      .describe('The number of results to return (default: 10)'),
    region: z
      .string()
      .default('us')
      .describe('The region for the search (default: "us")'),
    safeSearch: z
      .boolean()
      .default(true)
      .describe('Whether to enable safe search'),
  }),
  execute: async ({
    query,
    maxResults: _maxResults = 10, // Prefix with underscore to mark as deliberately unused
    region = 'us',
    safeSearch = true,
  }) => {
    // Always use 10 results
    const normalizedMaxResults = 10;

    console.log(
      `Web Search: query='${query}', max=${normalizedMaxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`,
    );

    try {
      // Try Brave Search first
      try {
        const braveResults = await braveSearch.search({
          query,
          maxResults: normalizedMaxResults,
          region,
          safeSearch,
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
        });
        return serperResults;
      } catch (braveError: unknown) {
        console.error(
          `Brave search failed: ${getErrorMessage(braveError)}, falling back to Serper`,
        );
        // Fall back to Serper if Brave fails
        const serperResults = await serper.search({
          query,
          maxResults: normalizedMaxResults,
          region,
          safeSearch,
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
        error: `Search error: ${getErrorMessage(error)}`,
      };
    }
  },
});
