import { tool } from 'ai';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export const readWebsiteContent = tool({
  description: 'Fetch and return the text content of a webpage/article in nicely formatted markdown for easy readability.',
  parameters: z.object({
    url: z.string().describe('The URL of the webpage to fetch content from'),
    query: z.string().optional().describe('Optional search query to find specific content within the page')
  }),
  execute: async ({ url, query }) => {
    console.log(`Fetching website content from: ${url} ${query ? `with query: ${query}` : ''}`);
    
    try {
      // Ensure URL has protocol
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      
      // Directly fetch webpage content using axios
      const response = await axios.get(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        timeout: 15000, // 15 second timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB max size
      });
      
      // Load HTML into cheerio for processing
      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements that typically contain noise
      $('script, style, noscript, iframe, img, svg, header, footer, nav, aside, ads').remove();
      
      // Get the cleaned HTML content
      const cleanedHtml = $('body').html() || '';
      
      // Convert HTML to markdown
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });
      
      // Custom rules to improve markdown output
      turndownService.addRule('removeEmptyParagraphs', {
        filter: (node) => {
          return node.nodeName === 'P' && node.textContent?.trim() === '';
        },
        replacement: () => ''
      });
      
      // Convert to markdown
      let markdown = turndownService.turndown(cleanedHtml);
      
      // Clean up the markdown - remove excessive newlines
      markdown = markdown.replace(/\n{3,}/g, '\n\n');
      
      console.log("Website content fetched and converted successfully");
      
      return {
        url: fullUrl,
        content: markdown,
        query: query || null,
        status: 'success'
      };
      
    } catch (error: any) {
      console.error(`Error fetching website content: ${error.message}`);
      const errorMessage = axios.isAxiosError(error)
        ? `Request failed: ${error.message} ${error.response?.status ? `(Status: ${error.response.status})` : ''}`
        : error.message;
      
      return {
        url: url,
        content: `Error fetching webpage content: ${errorMessage}`,
        query: query || null,
        status: 'error',
        error: errorMessage
      };
    }
  },
});