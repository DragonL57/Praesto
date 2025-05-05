import { tool } from 'ai';
import { z } from 'zod';
import * as DDG from 'duck-duck-scrape';

// Add a type definition for needle options to handle custom headers
interface NeedleOptions {
  headers?: Record<string, string>;
  [key: string]: any;
}

interface SearchResult {
  title: string;
  href: string;
  body: string;
}

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
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache for search results
const searchCache = new Map<string, {
  timestamp: number,
  results: { results: SearchResult[], count: number, query: string }
}>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// DuckDuckGo client using duck-duck-scrape library
class DuckDuckGoClient {
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
    maxResults = 5,
    region = 'us',
    safeSearch = true,
  }: {
    query: string;
    maxResults?: number;
    region?: string;
    safeSearch?: boolean;
  }) {
    console.log(
      `DuckDuckGo Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`,
    );

    // Check cache first
    const cacheKey = `ddg:${query}:${maxResults}:${region}:${safeSearch}`;
    const cachedResult = searchCache.get(cacheKey);

    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      console.log('Using cached DuckDuckGo search results');
      return cachedResult.results;
    }

    try {
      // Add a small delay before making the request to avoid rate limiting
      // Increased delay from 200ms to 500ms
      await delay(500);

      // Set a custom user agent to appear more like a real browser
      const customHeaders = {
        'User-Agent': this.getRandomUserAgent(),
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://duckduckgo.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      };

      // Use duck-duck-scrape library for better search results
      // Pass the needle options as the third parameter instead of trying to include headers in SearchOptions
      const searchResults = await DDG.search(
        query,
        {
          safeSearch: safeSearch
            ? DDG.SafeSearchType.MODERATE
            : DDG.SafeSearchType.OFF,
          region: region.toUpperCase(),
          time: DDG.SearchTimeType.ALL,
        },
        { headers: customHeaders } as NeedleOptions
      );

      const results: SearchResult[] = [];

      // Process standard search results
      if (searchResults.results && Array.isArray(searchResults.results)) {
        for (const result of searchResults.results) {
          if (results.length >= maxResults) break;

          results.push({
            title: result.title || 'No title',
            href: result.url || '',
            body: result.description || 'No description available',
          });
        }
      }

      console.log(
        `DuckDuckGo Search Complete: Found ${results.length} results`,
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
      console.error(`Error during DuckDuckGo search: ${getErrorMessage(error)}`);

      // If standard search fails, try using other DuckDuckGo APIs
      try {
        console.log('Trying alternative DuckDuckGo search methods...');
        return await this.alternativeSearch(query, maxResults, region);
      } catch (error) {
        console.error(`Alternative search methods also failed: ${getErrorMessage(error)}`);
        throw error; // Re-throw original error for fallback
      }
    }
  }

  private async alternativeSearch(query: string, maxResults: number, region: string) {
    // Try to get direct answers if possible
    const results: SearchResult[] = [];
    const cacheKey = `ddg-alt:${query}:${maxResults}:${region}`;

    // Check cache first
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      console.log('Using cached DuckDuckGo alternative search results');
      return cachedResult.results;
    }

    try {
      // Add a small delay before making the request to avoid rate limiting
      // Increased delay from 300ms to 600ms
      await delay(600);

      // Try dictionary definition
      const definitionResults = await DDG.dictionaryDefinition(query);
      // Check if we have results and they have text property (which contains the definition)
      if (definitionResults?.length > 0 && definitionResults[0]?.text) {
        const def = definitionResults[0];
        results.push({
          title: `Definition of "${query}"`,
          href: "",
          body: `${def.text || ""} ${def.partOfSpeech ? `(${def.partOfSpeech})` : ""}`
        });
      }
    } catch (error) {
      // Ignore errors from specific API endpoints
      console.log(`Alternative search approach failed: ${getErrorMessage(error)}`);
    }

    // If no direct answers, try a standard web search again with different approach
    if (results.length === 0) {
      try {
        // Add a small delay
        // Increased delay from 300ms to 600ms
        await delay(600);

        // Use the standard search method with needle options as the third parameter
        const customHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        };

        const webSearch = await DDG.search(
          query,
          {
            time: DDG.SearchTimeType.ALL,
            region: region.toUpperCase(),
            safeSearch: DDG.SafeSearchType.MODERATE,
          },
          { headers: customHeaders } as NeedleOptions
        );

        if (webSearch?.results?.length > 0) {
          for (const result of webSearch.results) {
            if (results.length >= maxResults) break;

            results.push({
              title: result.title || "No title",
              href: result.url || "",
              body: result.description || "No description available"
            });
          }
        }
      } catch (error) {
        // Ignore errors from specific API endpoints
        console.log(`Web search approach failed: ${getErrorMessage(error)}`);
      }
    }

    // If still no results, try news search
    if (results.length === 0) {
      try {
        // Add a small delay
        // Increased delay from 300ms to 600ms
        await delay(600);

        const newsSearch = await DDG.searchNews(query);
        if (newsSearch?.results?.length > 0) {
          for (const result of newsSearch.results) {
            if (results.length >= maxResults) break;

            results.push({
              title: result.title || "No title",
              href: result.url || "",
              // Use excerpt instead of snippet for NewsResult
              body: `${result.excerpt || "No description available"} (${result.relativeTime || "Unknown date"})`
            });
          }
        }
      } catch (error) {
        // Ignore errors from specific API endpoints
        console.log(`News search approach failed: ${getErrorMessage(error)}`);
      }
    }

    console.log(`DuckDuckGo Alternative Search: Found ${results.length} results`);

    const finalResults = {
      results: results.slice(0, maxResults),
      count: results.length,
      query: query
    };

    // Cache the results
    searchCache.set(cacheKey, {
      timestamp: Date.now(),
      results: finalResults
    });

    return finalResults;
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
    maxResults = 5,
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
const duckDuckGo = new DuckDuckGoClient();
const serper = new SerperClient();

export const webSearch = tool({
  description:
    'Perform a web search using DuckDuckGo (with Google as fallback) and return the results',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z
      .number()
      .min(5)
      .max(10)
      .default(7)
      .describe('The number of results to return (min: 5, max: 10, default: 7)'),
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
    maxResults = 7,
    region = 'us',
    safeSearch = true,
  }) => {
    // Enforce minimum and maximum number of results
    const normalizedMaxResults = Math.min(Math.max(maxResults, 5), 10);

    console.log(
      `Web Search: query='${query}', max=${normalizedMaxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`,
    );

    try {
      // Try DuckDuckGo first
      try {
        const duckResults = await duckDuckGo.search({
          query,
          maxResults: normalizedMaxResults,
          region,
          safeSearch,
        });

        // If we got at least some results, return them
        if (duckResults.results.length > 0) {
          return duckResults;
        }

        console.log('DuckDuckGo returned no results, trying Serper');
        // If no results from DuckDuckGo, fall back to Serper
        const serperResults = await serper.search({
          query,
          maxResults: normalizedMaxResults,
          region,
          safeSearch,
        });
        return serperResults;
      } catch (duckError: unknown) {
        console.error(
          `DuckDuckGo search failed: ${getErrorMessage(duckError)}, falling back to Serper`,
        );
        // Fall back to Serper if DuckDuckGo fails
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
