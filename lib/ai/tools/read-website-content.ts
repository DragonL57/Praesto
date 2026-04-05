import { getErrorMessage } from '@/lib/ai/error-utils';

// Tavily API configuration
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const TAVILY_EXTRACT_ENDPOINT = 'https://api.tavily.com/extract';

/**
 * Read website content tool configuration for OpenAI SDK
 */
export const readWebsiteContent = {
  description:
    'Fetch and return the text content of a webpage/article in nicely formatted markdown for easy readability.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL of the webpage to fetch content from',
      },
      query: {
        type: 'string',
        description:
          'Optional search query to find specific content within the page',
      },
    },
    required: ['url'],
  },
  execute: async ({ url, query }: { url: string; query?: string }) => {
    console.log(
      `Fetching website content from: ${url} ${query ? `with query: ${query}` : ''}`,
    );

    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;

    if (!TAVILY_API_KEY) {
      return {
        url: fullUrl,
        content: `Error fetching webpage content: TAVILY_API_KEY not configured in environment variables`,
        query: query || null,
        status: 'error',
        error: 'Missing TAVILY_API_KEY',
      };
    }

    try {
      // Make request to Tavily extract API
      const tavilyRequest = {
        api_key: TAVILY_API_KEY,
        urls: [fullUrl],
      };

      const response = await fetch(TAVILY_EXTRACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tavilyRequest),
      });

      if (!response.ok) {
        throw new Error(
          `Tavily API error: ${response.status} ${response.statusText}`,
        );
      }

      const results = (await response.json()) as {
        results: Array<{ url: string; content?: string; raw_content?: string }>;
      };

      if (!results || !results.results || results.results.length === 0) {
        throw new Error('No content found in Tavily extract response');
      }

      const extractedContent =
        results.results[0].content || results.results[0].raw_content;

      if (!extractedContent) {
        throw new Error('No content extracted from webpage');
      }

      // Check if content has useful length (at least 100 chars)
      if (extractedContent.trim().length < 100) {
        throw new Error(
          'Extracted content is insufficient (less than 100 characters)',
        );
      }

      console.log('Website content fetched and converted successfully');

      return {
        url: fullUrl,
        content: extractedContent,
        query: query || null,
        status: 'success',
        source: 'tavily-extract',
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(
        `Error fetching website content with Tavily: ${errorMessage}`,
      );

      return {
        url: fullUrl,
        content: formatErrorMessage(fullUrl, errorMessage),
        query: query || null,
        status: 'error',
        error: errorMessage,
      };
    }
  },
};

// Helper function to format error messages
function formatErrorMessage(url: string, error: string): string {
  return `
Error extracting content from ${new URL(url).hostname}:
${error}

Suggestions:
- Visit the website directly using the link
- Try asking a specific question about the website's content
- If you have access to the content, try copying and pasting relevant sections directly
  `;
}
