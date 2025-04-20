import { tool } from 'ai';
import { z } from 'zod';

export const readWebsiteContent = tool({
  description: 'Fetch and return the text content of a webpage/article in nicely formatted markdown for easy readability.',
  parameters: z.object({
    url: z.string().describe('The URL of the webpage to fetch content from'),
    query: z.string().optional().describe('Optional search query to find specific content within the page')
  }),
  execute: async ({ url, query }) => {
    console.log(`Fetching website content from: ${url} ${query ? `with query: ${query}` : ''}`);
    
    try {
      const base = "https://md.dhr.wtf/?url=";
      const response = await fetch(base + url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch webpage: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      console.log("Website content fetched successfully");
      
      return {
        url: url,
        content: content,
        query: query || null,
        status: 'success'
      };
      
    } catch (error: any) {
      console.error(`Error fetching website content: ${error.message}`);
      return {
        url: url,
        content: `Error fetching webpage content: ${error.message}`,
        query: query || null,
        status: 'error',
        error: error.message
      };
    }
  },
});