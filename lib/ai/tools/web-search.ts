import { tool } from 'ai';
import { z } from 'zod';

// Brave Search API configuration
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';
const BRAVE_API_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

// Global rate limiter: Track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1200; // 1.2 seconds between requests

// Rate limiting: Ensure minimum interval between requests
async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    console.log(`[Rate Limit] Waiting ${waitTime}ms before next request`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
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

interface SearchResult {
  title: string;
  href: string;
  body: string;
}

export const webSearch = tool({
  description:
    'Perform a web search using Brave Search and return the results. Supports real-time information lookup with high-quality sources, news, videos, and more.',
  inputSchema: z.object({
    query: z
      .string()
      .max(400)
      .describe('The search query (max 400 characters, 50 words)'),
    count: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe('Number of search results to return (default: 10, max: 20)'),
    country: z
      .string()
      .default('US')
      .describe(
        'The 2-character country code (e.g., "US", "DE", "VN"). Default: "US".',
      ),
    search_lang: z
      .string()
      .default('en')
      .describe(
        'The 2+ character language code for search results (e.g., "en", "es", "de"). Default: "en".',
      ),
    ui_lang: z
      .string()
      .optional()
      .describe(
        'UI language preference in format <language>-<country> (e.g., "en-US", "vi-VN").',
      ),
    safesearch: z
      .enum(['off', 'moderate', 'strict'])
      .default('moderate')
      .describe(
        'Safe search filter: "off" (no filtering), "moderate" (filter explicit content), "strict" (drop all adult content). Default: "moderate".',
      ),
    freshness: z
      .string()
      .optional()
      .describe(
        "Filter by freshness: 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year), or date range '2024-01-01to2024-12-31'.",
      ),
    offset: z
      .number()
      .min(0)
      .max(9)
      .optional()
      .describe(
        'Pagination offset (0-9). Use with count to paginate results.',
      ),
    spellcheck: z
      .boolean()
      .default(true)
      .describe(
        'Whether to spellcheck the query. Modified query appears in response. Default: true.',
      ),
    result_filter: z
      .string()
      .optional()
      .describe(
        'Comma-delimited result types to include: discussions, faq, infobox, news, query, summarizer, videos, web, locations. Example: "news,videos".',
      ),
    text_decorations: z
      .boolean()
      .default(true)
      .describe(
        'Include decoration markers (highlighting) in snippets. Default: true.',
      ),
    extra_snippets: z
      .boolean()
      .optional()
      .describe(
        'Get up to 5 additional alternative excerpts per result. Requires premium plan.',
      ),
    summary: z
      .boolean()
      .optional()
      .describe(
        'Enable summary key generation in results. Required for summarizer. Requires premium plan.',
      ),
    units: z
      .enum(['metric', 'imperial'])
      .optional()
      .describe(
        'Measurement units: "metric" (standardized) or "imperial" (British system). Auto-detected from country if not provided.',
      ),
  }),
  execute: async ({
    query,
    count = 10,
    country = 'VN',
    search_lang = 'en',
    ui_lang,
    safesearch = 'moderate',
    freshness,
    offset,
    spellcheck = true,
    result_filter,
    text_decorations = true,
    extra_snippets,
    summary,
    units,
  }) => {
    // Check if API key is configured
    if (!BRAVE_API_KEY) {
      console.error('[Brave Search] Missing BRAVE_API_KEY environment variable');
      return {
        results: [
          {
            title: 'Search Configuration Error',
            href: '',
            body: 'Web search is not available. The BRAVE_API_KEY environment variable is not set. Please configure your Brave Search API key to use web search.',
          },
        ],
        count: 0,
        query: query,
      };
    }

    let logParams = `Brave Search: query='${query}', count=${count}, country=${country}, lang=${search_lang}, safesearch=${safesearch}`;
    if (freshness) logParams += `, freshness=${freshness}`;
    if (offset !== undefined) logParams += `, offset=${offset}`;
    if (result_filter) logParams += `, filter=${result_filter}`;
    if (summary) logParams += `, summary=true`;
    console.log(logParams);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        q: query,
        count: Math.min(count, 20).toString(),
        country,
        search_lang,
        safesearch,
        text_decorations: text_decorations.toString(),
        spellcheck: spellcheck.toString(),
      });

      // Add optional parameters
      if (ui_lang) params.append('ui_lang', ui_lang);
      if (freshness) params.append('freshness', freshness);
      if (offset !== undefined) params.append('offset', offset.toString());
      if (result_filter) params.append('result_filter', result_filter);
      if (extra_snippets) params.append('extra_snippets', extra_snippets.toString());
      if (summary) params.append('summary', summary.toString());
      if (units) params.append('units', units);

      // Make request to Brave Search API with rate limiting
      const response = await rateLimitedFetch(
        `${BRAVE_API_ENDPOINT}?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': BRAVE_API_KEY,
          },
        },
      );

      if (!response.ok) {
        let errorDetail = `${response.status} ${response.statusText}`;

        // Add specific guidance for common HTTP errors
        if (response.status === 422) {
          errorDetail += ' (Unprocessable Entity - check API key validity and request parameters)';
        } else if (response.status === 401 || response.status === 403) {
          errorDetail += ' (Authentication failed - verify BRAVE_API_KEY is valid)';
        }

        throw new Error(
          `Brave Search API error: ${errorDetail}`,
        );
      }

      interface BraveWebResult {
        title: string;
        url: string;
        description?: string;
        age?: string;
        page_age?: string;
        language?: string;
        extra_snippets?: string[];
      }

      interface BraveNewsResult {
        title: string;
        url: string;
        description?: string;
        age?: string;
        source?: string;
        breaking?: boolean;
      }

      interface BraveVideoResult {
        title: string;
        url: string;
        description?: string;
        video?: {
          duration?: string;
          views?: string;
          creator?: string;
        };
      }

      interface BraveDiscussionResult {
        type: string;
        data?: {
          forum_name?: string;
          title?: string;
          question?: string;
          top_comment?: string;
          num_answers?: number;
        };
      }

      interface BraveFAQ {
        question: string;
        answer: string;
        url?: string;
        title?: string;
      }

      interface BraveResponse {
        type: string;
        query?: {
          original: string;
          altered?: string;
          spellcheck_off?: boolean;
        };
        web?: {
          type: string;
          results: BraveWebResult[];
        };
        news?: {
          type: string;
          results: BraveNewsResult[];
        };
        videos?: {
          type: string;
          results: BraveVideoResult[];
        };
        discussions?: {
          type: string;
          results: BraveDiscussionResult[];
        };
        faq?: {
          type: string;
          results: BraveFAQ[];
        };
        infobox?: any;
        locations?: any;
      }

      const data = (await response.json()) as BraveResponse;

      if (!data || data.type !== 'search') {
        throw new Error('Invalid response from Brave Search');
      }

      // Collect all results from different sections
      const allResults: SearchResult[] = [];
      let resultCount = 0;

      // Add web results
      if (data.web?.results) {
        console.log(`Found ${data.web.results.length} web results`);
        const webResults = data.web.results.slice(0, count).map((result) => ({
          title: result.title || 'No title',
          href: result.url || '',
          body: result.description || 'No description available',
        }));
        allResults.push(...webResults);
        resultCount += webResults.length;
      }

      // Add news results if available
      if (data.news?.results && data.news.results.length > 0) {
        console.log(`Found ${data.news.results.length} news results`);
        const newsHeader: SearchResult = {
          title: '📰 News Results',
          href: '',
          body: `Found ${data.news.results.length} recent news articles:`,
        };
        allResults.push(newsHeader);

        const newsResults = data.news.results.slice(0, 5).map((result) => ({
          title: `${result.breaking ? '🔴 BREAKING: ' : ''}${result.title || 'No title'}`,
          href: result.url || '',
          body: `${result.description || 'No description'} ${result.age ? `(${result.age})` : ''} ${result.source ? `[${result.source}]` : ''}`,
        }));
        allResults.push(...newsResults);
      }

      // Add video results if available
      if (data.videos?.results && data.videos.results.length > 0) {
        console.log(`Found ${data.videos.results.length} video results`);
        const videoHeader: SearchResult = {
          title: '🎥 Video Results',
          href: '',
          body: `Found ${data.videos.results.length} related videos:`,
        };
        allResults.push(videoHeader);

        const videoResults = data.videos.results.slice(0, 3).map((result) => ({
          title: result.title || 'No title',
          href: result.url || '',
          body: `${result.description || 'No description'} ${result.video?.duration ? `[Duration: ${result.video.duration}]` : ''} ${result.video?.views ? `[Views: ${result.video.views}]` : ''}`,
        }));
        allResults.push(...videoResults);
      }

      // Add discussion/forum results if available
      if (data.discussions?.results && data.discussions.results.length > 0) {
        console.log(`Found ${data.discussions.results.length} discussion results`);
        const discussionHeader: SearchResult = {
          title: '💬 Discussions & Forums',
          href: '',
          body: `Found ${data.discussions.results.length} relevant forum discussions:`,
        };
        allResults.push(discussionHeader);

        const discussionResults = data.discussions.results.slice(0, 3).map((result) => ({
          title: result.data?.title || 'Forum Discussion',
          href: '',
          body: `[${result.data?.forum_name || 'Forum'}] ${result.data?.question || result.data?.top_comment || 'No details'} ${result.data?.num_answers ? `(${result.data.num_answers} answers)` : ''}`,
        }));
        allResults.push(...discussionResults);
      }

      // Add FAQ results if available
      if (data.faq?.results && data.faq.results.length > 0) {
        console.log(`Found ${data.faq.results.length} FAQ results`);
        const faqHeader: SearchResult = {
          title: '❓ Frequently Asked Questions',
          href: '',
          body: `Found ${data.faq.results.length} related questions:`,
        };
        allResults.push(faqHeader);

        const faqResults = data.faq.results.slice(0, 3).map((result) => ({
          title: result.question || 'Question',
          href: result.url || '',
          body: result.answer || 'No answer available',
        }));
        allResults.push(...faqResults);
      }

      console.log(
        `Brave Search Complete: Returning ${allResults.length} total results (${resultCount} web results)`,
      );

      const finalResults = {
        results: allResults,
        count: allResults.length,
        query: data.query?.original || query,
        ...(data.query?.altered && { corrected_query: data.query.altered }),
      };

      return finalResults;
    } catch (error: unknown) {
      console.error(`Error during Brave search: ${getErrorMessage(error)}`);

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
