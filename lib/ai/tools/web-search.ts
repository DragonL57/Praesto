// Brave Search API configuration
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';
const BRAVE_API_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout per request

// Global rate limiter: Track next available time slot
let nextAvailableTime = 0;
const MIN_REQUEST_INTERVAL_MS = 2000; // 2 seconds between requests for Free plan safety (1 req/sec limit)

// Rate limiting: Ensure minimum interval between requests by reserving slots
async function rateLimitedFetch(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const now = Date.now();

  // Calculate wait time based on the next available slot
  // If nextAvailableTime is in the past, we can go now (waitTime = 0)
  const waitTime = Math.max(0, nextAvailableTime - now);

  // Reserve the slot for this request and update the next available time
  // This ensures even simultaneous calls get sequential slots
  nextAvailableTime =
    Math.max(now, nextAvailableTime) + MIN_REQUEST_INTERVAL_MS;

  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Add timeout to the fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
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

// Supported country codes for Brave Search API
const SUPPORTED_COUNTRIES = [
  'AR',
  'AU',
  'AT',
  'BE',
  'BR',
  'CA',
  'CL',
  'DK',
  'FI',
  'FR',
  'DE',
  'GR',
  'HK',
  'IN',
  'ID',
  'IT',
  'JP',
  'KR',
  'MY',
  'MX',
  'NL',
  'NZ',
  'NO',
  'CN',
  'PL',
  'PT',
  'PH',
  'RU',
  'SA',
  'ZA',
  'ES',
  'SE',
  'CH',
  'TW',
  'TR',
  'GB',
  'US',
  'ALL',
];

// Supported UI languages for Brave Search API
const UI_LANGUAGES = [
  'es-AR',
  'en-AU',
  'de-AT',
  'nl-BE',
  'fr-BE',
  'pt-BR',
  'en-CA',
  'fr-CA',
  'es-CL',
  'da-DK',
  'fi-FI',
  'fr-FR',
  'de-DE',
  'el-GR',
  'zh-HK',
  'en-IN',
  'en-ID',
  'it-IT',
  'ja-JP',
  'ko-KR',
  'en-MY',
  'es-MX',
  'nl-NL',
  'en-NZ',
  'no-NO',
  'zh-CN',
  'pl-PL',
  'en-PH',
  'ru-RU',
  'en-ZA',
  'es-ES',
  'sv-SE',
  'fr-CH',
  'de-CH',
  'zh-TW',
  'tr-TR',
  'en-GB',
  'en-US',
  'es-US',
];

/**
 * Web search tool configuration for OpenAI SDK
 */
export const webSearch = {
  description:
    'Search the web using Brave Search. Returns results with titles, URLs, and snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        maxLength: 400,
        description: 'The search query (max 400 characters)',
      },
      count: {
        type: 'number',
        minimum: 1,
        maximum: 20,
        default: 10,
        description: 'Number of results to return (default: 10)',
      },
      country: {
        type: 'string',
        default: 'ALL',
        description:
          '2-character country code (e.g., "US", "DE"). Use "ALL" for global.',
      },
      search_lang: {
        type: 'string',
        default: 'vi',
        description:
          'Language code for results (e.g., "en", "vi"). Default: "vi".',
      },
      safesearch: {
        type: 'string',
        enum: ['off', 'moderate', 'strict'],
        default: 'moderate',
        description: 'Safe search level. Default: "moderate".',
      },
      freshness: {
        type: 'string',
        description:
          "Filter by freshness: 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year).",
      },
    },
    required: ['query'],
  },
  // Parameters interface for web search

  execute: async ({
    query,
    count = 10,
    country = 'ALL',
    search_lang = 'vi',
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
  }: {
    query: string;
    count?: number;
    country?: string;
    search_lang?: string;
    ui_lang?: string;
    safesearch?: string;
    freshness?: string;
    offset?: number;
    spellcheck?: boolean;
    result_filter?: string;
    text_decorations?: boolean;
    extra_snippets?: boolean;
    summary?: boolean;
    units?: string;
  }) => {
    // Validate country code - Brave Search only supports specific countries
    const validatedCountry = SUPPORTED_COUNTRIES.includes(
      country?.toUpperCase(),
    )
      ? country.toUpperCase()
      : 'ALL';

    // Check if API key is configured
    if (!BRAVE_API_KEY) {
      console.error(
        '[Brave Search] Missing BRAVE_API_KEY environment variable',
      );
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

    try {
      // Build query parameters
      const params = new URLSearchParams({
        q: query,
        count: Math.min(count, 20).toString(),
        country: validatedCountry,
        search_lang,
        safesearch,
        text_decorations: text_decorations.toString(),
        spellcheck: spellcheck.toString(),
      });

      // Add optional parameters
      if (ui_lang) {
        const validatedUiLang = UI_LANGUAGES.includes(ui_lang)
          ? ui_lang
          : 'en-US';
        params.append('ui_lang', validatedUiLang);
      }
      if (freshness) params.append('freshness', freshness);
      if (offset !== undefined) params.append('offset', offset.toString());
      if (result_filter) params.append('result_filter', result_filter);
      if (extra_snippets)
        params.append('extra_snippets', extra_snippets.toString());
      if (summary) params.append('summary', summary.toString());
      if (units) params.append('units', units);

      // Make request to Brave Search API with rate limiting and retry for 429
      let response: Response | null = null;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        response = await rateLimitedFetch(
          `${BRAVE_API_ENDPOINT}?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Accept-Encoding': 'gzip',
              'X-Subscription-Token': BRAVE_API_KEY,
            },
          },
        );

        if (response.ok) break;

        const errorBody = await response.text();
        console.error(`[Brave Search Debug] Error body: ${errorBody}`);

        if (response.status === 429 && retries < maxRetries) {
          const retryAfter = response.headers.get('retry-after');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : 2000 + retries * 1000;
          console.error(
            `[Brave Search] Rate limited, retrying in ${waitMs}ms (attempt ${retries + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          retries++;
          continue;
        }

        // Add specific guidance for common HTTP errors
        let errorDetail = `${response.status} ${response.statusText}`;
        if (response.status === 422) {
          errorDetail += ` (Unprocessable Entity - ${errorBody})`;
        } else if (response.status === 401 || response.status === 403) {
          errorDetail +=
            ' (Authentication failed - verify BRAVE_API_KEY is valid)';
        } else if (response.status === 429) {
          errorDetail += ' (Rate limit exceeded after retries)';
        }

        throw new Error(`Brave Search API error: ${errorDetail}`);
      }

      if (!response || !response.ok) {
        throw new Error('Brave Search API error after retries');
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
        infobox?: unknown;
        locations?: unknown;
      }

      const data = (await response.json()) as BraveResponse;

      if (!data || data.type !== 'search') {
        throw new Error('Invalid response from Brave Search');
      }

      // Collect all results from different sections
      const allResults: SearchResult[] = [];

      // Add web results
      if (data.web?.results) {
        const webResults = data.web.results.slice(0, count).map((result) => ({
          title: result.title || 'No title',
          href: result.url || '',
          body: result.description || 'No description available',
        }));
        allResults.push(...webResults);
      }

      // Add news results if available
      if (data.news?.results && data.news.results.length > 0) {
        const newsHeader: SearchResult = {
          title: '[News] Latest Articles',
          href: '',
          body: `Found ${data.news.results.length} recent news articles:`,
        };
        allResults.push(newsHeader);

        const newsResults = data.news.results.slice(0, 5).map((result) => ({
          title: `${result.breaking ? '[BREAKING] ' : ''}${result.title || 'No title'}`,
          href: result.url || '',
          body: `${result.description || 'No description'} ${result.age ? `(${result.age})` : ''} ${result.source ? `[${result.source}]` : ''}`,
        }));
        allResults.push(...newsResults);
      }

      // Add video results if available
      if (data.videos?.results && data.videos.results.length > 0) {
        const videoHeader: SearchResult = {
          title: '[Videos] Related Videos',
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
        const discussionHeader: SearchResult = {
          title: '[Discussions] Forum Results',
          href: '',
          body: `Found ${data.discussions.results.length} relevant forum discussions:`,
        };
        allResults.push(discussionHeader);

        const discussionResults = data.discussions.results
          .slice(0, 3)
          .map((result) => ({
            title: result.data?.title || 'Forum Discussion',
            href: '',
            body: `[${result.data?.forum_name || 'Forum'}] ${result.data?.question || result.data?.top_comment || 'No details'} ${result.data?.num_answers ? `(${result.data.num_answers} answers)` : ''}`,
          }));
        allResults.push(...discussionResults);
      }

      // Add FAQ results if available
      if (data.faq?.results && data.faq.results.length > 0) {
        const faqHeader: SearchResult = {
          title: '[FAQ] Frequently Asked Questions',
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
};
