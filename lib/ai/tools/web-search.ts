import { tool } from 'ai';
import { z } from 'zod';
import * as DDG from 'duck-duck-scrape';

interface SearchResult {
  title: string;
  href: string;
  body: string;
}

// DuckDuckGo client using duck-duck-scrape library
class DuckDuckGoClient {
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

    try {
      // Use duck-duck-scrape library for better search results
      const searchResults = await DDG.search(query, {
        safeSearch: safeSearch
          ? DDG.SafeSearchType.MODERATE
          : DDG.SafeSearchType.OFF,
        region: region.toUpperCase(),
        time: DDG.SearchTimeType.ALL,
      });

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

      return {
        results: results.slice(0, maxResults),
        count: results.length,
        query: query,
      };
    } catch (error: any) {
      console.error(`Error during DuckDuckGo search: ${error.message}`);

      // If standard search fails, try using other DuckDuckGo APIs
      try {
        console.log('Trying alternative DuckDuckGo search methods...');
        return await this.alternativeSearch(query, maxResults);
      } catch (altError) {
        console.error('Alternative search methods also failed');
        throw error; // Re-throw original error for fallback
      }
    }
  }

  private async alternativeSearch(query: string, maxResults: number) {
    // Try to get direct answers if possible
    const results: SearchResult[] = [];
    
    try {
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
    } catch (e) {
      // Ignore errors from specific API endpoints
    }
    
    // If no direct answers, try a standard web search again
    if (results.length === 0) {
      try {
        const webSearch = await DDG.search(query);
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
      } catch (e) {
        // Ignore errors from specific API endpoints
      }
    }
    
    // If still no results, try news search
    if (results.length === 0) {
      try {
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
      } catch (e) {
        // Ignore errors from specific API endpoints
      }
    }
    
    console.log(`DuckDuckGo Alternative Search: Found ${results.length} results`);
    
    return {
      results: results.slice(0, maxResults),
      count: results.length,
      query: query
    };
  }
}

// Serper client for fallback web searches
class SerperClient {
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

    try {
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

      return {
        results: results.slice(0, maxResults),
        count: results.length,
        query: query,
      };
    } catch (error: any) {
      console.error(`Error during Serper search: ${error.message}`);
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

        return duckResults;
      } catch (duckError: any) {
        console.error(
          `DuckDuckGo search failed: ${duckError.message}, falling back to Serper`,
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
    } catch (error: any) {
      console.error(`All search attempts failed: ${error.message}`);
      return {
        results: [
          {
            title: 'Search Error',
            href: '',
            body: `Failed to search for '${query}'. Error: ${error.message}. Please try again with a different query.`,
          },
        ],
        count: 0,
        query: query,
        error: `Search error: ${error.message}`,
      };
    }
  },
});
