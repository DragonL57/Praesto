import { tool } from 'ai';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

// Get the serper.dev API key from environment variables, with fallback to hardcoded key for development
const SERPER_API_KEY = process.env.SERPER_API_KEY || '5b106638ab76499468577a6a8844cacfa7d38551';

export const readWebsiteContent = tool({
  description: 'Fetch and return the text content of a webpage/article in nicely formatted markdown for easy readability.',
  parameters: z.object({
    url: z.string().describe('The URL of the webpage to fetch content from'),
    query: z.string().optional().describe('Optional search query to find specific content within the page')
  }),
  execute: async ({ url, query }) => {
    console.log(`Fetching website content from: ${url} ${query ? `with query: ${query}` : ''}`);
    
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Direct approach - always try this first for all websites
    try {
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
      turndownService.addRule('preserveCodeBlocks', {
        filter: node => 
          node.nodeName === 'PRE' || 
          (node.nodeName === 'CODE' && !!node.parentNode && node.parentNode.nodeName !== 'PRE'),
        replacement: (content, node) => {
          if (node.nodeName === 'PRE') {
            // Handle pre blocks (usually code blocks)
            return `\n\`\`\`\n${content}\n\`\`\`\n`;
          } else {
            // Handle inline code
            return `\`${content}\``;
          }
        }
      });
      
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
      
      // Strip out all image references from the markdown content
      // This removes both Markdown image syntax ![alt](url) and HTML <img> tags that might be in the content
      markdown = markdown.replace(/!\[.*?\]\(.*?\)/g, '*[Image removed]*'); // Remove markdown images
      markdown = markdown.replace(/<img.*?>/g, '*[Image removed]*'); // Remove HTML img tags
      markdown = markdown.replace(/<figure.*?>.*?<\/figure>/g, '*[Figure removed]*'); // Remove figure elements
      
      // Check if the markdown has useful content (at least 100 chars)
      if (markdown.trim().length < 100) {
        console.log("Primary fetch succeeded but content is insufficient, trying fallback");
        throw new Error('Insufficient content extracted');
      }
      
      console.log("Website content fetched and converted successfully");
      
      return {
        url: fullUrl,
        content: markdown,
        query: query || null,
        status: 'success',
        source: 'direct'
      };
      
    } catch (error: any) {
      console.error(`Error fetching website content: ${error.message}`);
      
      const errorMessage = axios.isAxiosError(error)
        ? `Request failed: ${error.message} ${error.response?.status ? `(Status: ${error.response.status})` : ''}`
        : error.message;
      
      // Only attempt fallback if we have an API key
      if (!SERPER_API_KEY) {
        console.error("No SERPER_API_KEY found in environment variables, can't use fallback");
        return {
          url: fullUrl,
          content: `Error fetching webpage content: ${errorMessage}\nFallback not attempted: Missing API key`,
          query: query || null,
          status: 'error',
          error: errorMessage
        };
      }
      
      // Try fallback using serper.dev scraping API
      console.log("Attempting fallback with serper.dev scraping API");
      try {
        const content = await fetchWithSerper(fullUrl);
        if (content) {
          return {
            url: fullUrl,
            content,
            query: query || null,
            status: 'success',
            source: 'serper-dev-fallback'
          };
        } else {
          throw new Error('No content found in scraped data');
        }
      } catch (fallbackError: any) {
        console.error(`Fallback scraping also failed: ${fallbackError.message}`);
        return {
          url: fullUrl,
          content: formatErrorMessage(fullUrl, errorMessage, fallbackError.message),
          query: query || null,
          status: 'error',
          error: errorMessage,
          fallbackError: fallbackError.message
        };
      }
    }
  },
});

// Helper function to fetch content using serper.dev
async function fetchWithSerper(url: string): Promise<string> {
  if (!SERPER_API_KEY) {
    throw new Error('No SERPER_API_KEY provided');
  }

  console.log(`Using serper.dev to fetch: ${url}`);
  
  // Using the exact configuration from the working example
  const data = JSON.stringify({
    "url": url,
    "includeMarkdown": true
  });

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://scrape.serper.dev',
    headers: { 
      'X-API-KEY': SERPER_API_KEY, 
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    const response = await axios.request(config);
    const scrapeData = response.data;
    
    let content = '';
    if (scrapeData.markdown) {
      console.log('Serper.dev returned markdown content');
      content = scrapeData.markdown;
    } else if (scrapeData.text) {
      console.log('Serper.dev returned text content');
      content = scrapeData.text;
    } else {
      throw new Error('No content found in serper.dev response');
    }
    
    // Strip out all image references from the markdown content
    // This removes both Markdown image syntax ![alt](url) and HTML <img> tags that might be in the content
    content = content.replace(/!\[.*?\]\(.*?\)/g, '*[Image removed]*'); // Remove markdown images
    content = content.replace(/<img.*?>/g, '*[Image removed]*'); // Remove HTML img tags
    content = content.replace(/<figure.*?>.*?<\/figure>/g, '*[Figure removed]*'); // Remove figure elements that might contain images
    
    console.log('Images stripped from content');
    return content;
  } catch (error: any) {
    console.error(`Error in serper.dev request: ${error.message}`);
    throw error;
  }
}

// Helper function to format error messages
function formatErrorMessage(url: string, primaryError: string, fallbackError: string): string {
  if (url.includes('forum.') || url.includes('community.')) {
    return `Error extracting content from ${new URL(url).hostname}:\n` +
      `Primary method: ${primaryError}\n` +
      `Fallback method: ${fallbackError}\n\n` + 
      `Forums often use complex JavaScript and may require authentication, making them difficult to scrape.\n\n` +
      `Suggestions:\n\n` +
      `- Visit the website directly using the link in the top-right\n` +
      `- Try asking a specific question about the website's content\n` +
      `- If you have access to the content, try copying and pasting relevant sections directly\n` +
      `- For forum posts or complex pages, try viewing in Reader Mode in your browser first, then share the content`;
  }
  
  return `Error fetching webpage content:\nPrimary method: ${primaryError}\nFallback method: ${fallbackError}`;
}