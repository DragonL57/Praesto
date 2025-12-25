import { tool } from 'ai';
import { z } from 'zod';

// Tavily API configuration
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const TAVILY_API_ENDPOINT = 'https://api.tavily.com/search';

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

interface SearchResult {
  title: string;
  href: string;
  body: string;
}

export const webSearch = tool({
  description:
    'Perform a web search using Tavily and return the results. Supports real-time information lookup with high-quality sources.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    maxResults: z
      .number()
      .min(1)
      .max(20)
      .default(10)
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
      .describe("Optional: Filter search results by when they were discovered. Supported values: 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year)."),
    result_filter: z
      .string()
      .optional()
      .describe("Optional: Comma-delimited string of result types to include (e.g., 'news,web'). Supported types: news, research_paper, url, tweet."),
    summary: z
      .boolean()
      .optional()
      .describe('Optional: Whether to request a summary of the search results. Default: false.'),
  }),
  execute: async ({
    query,
    maxResults = 10,
    region = 'vn',
    safeSearch = true,
    search_lang,
    freshness,
    result_filter,
    summary = false,
  }) => {
    let logParams = `Tavily Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`;
    if (search_lang) logParams += `, search_lang=${search_lang}`;
    if (freshness) logParams += `, freshness=${freshness}`;
    if (result_filter) logParams += `, result_filter=${result_filter}`;
    if (summary) logParams += `, summary=${summary}`;
    console.log(logParams);

    try {
      // Make request to Tavily API
      const tavilyRequest = {
        api_key: TAVILY_API_KEY,
        query,
        max_results: Math.min(maxResults, 20),
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
      };

      const response = await fetch(TAVILY_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tavilyRequest),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const results = await response.json() as { results: Array<{ title: string; url: string; content?: string }>; answer?: string };

      if (!results || !results.results) {
        throw new Error('Invalid response from Tavily Search');
      }

      console.log(`Tavily Search Complete: Found ${results.results.length} results`);

      // Transform Tavily results to our SearchResult format
      const transformedResults: SearchResult[] = results.results.slice(0, maxResults).map((result: { title?: string; url?: string; content?: string }) => ({
        title: result.title || 'No title',
        href: result.url || '',
        body: result.content || 'No description available',
      }));

      // Add answer if available and requested
      if (results.answer && summary) {
        transformedResults.unshift({
          title: 'Summary',
          href: '',
          body: results.answer,
        });
      }

      const finalResults = {
        results: transformedResults,
        count: transformedResults.length,
        query: query,
      };

      return finalResults;
    } catch (error: unknown) {
      console.error(`Error during Tavily search: ${getErrorMessage(error)}`);

      // Return error result in consistent format
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
      };
    }
  },
});
