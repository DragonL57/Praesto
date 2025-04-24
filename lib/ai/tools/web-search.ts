import { tool } from 'ai';
import { z } from 'zod';

interface SearchResult {
  title: string;
  href: string;
  body: string;
}

// DuckDuckGo client for web searches
class DuckDuckGoClient {
  private API_URL = 'https://api.duckduckgo.com/';

  async search({ query, maxResults = 5, region = 'us', safeSearch = true }: {
    query: string;
    maxResults?: number;
    region?: string;
    safeSearch?: boolean;
  }) {
    console.log(`DuckDuckGo Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`);
    
    try {
      // Construct the URL with parameters
      const url = new URL(this.API_URL);
      url.searchParams.append('q', query);
      url.searchParams.append('format', 'json');
      url.searchParams.append('no_html', '1');
      url.searchParams.append('no_redirect', '1');
      url.searchParams.append('kl', region); // Region
      url.searchParams.append('kp', safeSearch ? '1' : '-1'); // Safe search (1 = on, -1 = off)
      
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'UniTaskAI/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const results: SearchResult[] = [];
      
      // Process Abstract (Featured Snippet)
      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || "Featured Result",
          href: data.AbstractURL,
          body: data.AbstractText
        });
      }
      
      // Process Related Topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= maxResults) break;
          
          // Some topics have nested Topics
          if (topic.Topics) {
            for (const subTopic of topic.Topics) {
              if (results.length >= maxResults) break;
              if (subTopic.Text && subTopic.FirstURL) {
                results.push({
                  title: subTopic.Text.split(' - ')[0] || "Related Topic",
                  href: subTopic.FirstURL,
                  body: subTopic.Text
                });
              }
            }
          } else if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || "Related Topic",
              href: topic.FirstURL,
              body: topic.Text
            });
          }
        }
      }
      
      // Process Infobox if available
      if (data.Infobox?.content) {
        const infoContent = data.Infobox.content
          .map((item: any) => `${item.label || ''}: ${item.value || ''}`)
          .join('; ');
          
        results.push({
          title: data.Infobox?.title || "Information",
          href: data.AbstractURL || "",
          body: infoContent
        });
      }
      
      console.log(`DuckDuckGo Search Complete: Found ${results.length} results`);
      
      return {
        results: results.slice(0, maxResults),
        count: results.length,
        query: query
      };
      
    } catch (error: any) {
      console.error(`Error during DuckDuckGo search: ${error.message}`);
      throw error; // Let the main web search handle fallback
    }
  }
}

// Serper client for fallback web searches
class SerperClient {
  async search({ query, maxResults = 5, region = 'us', safeSearch = true }: {
    query: string;
    maxResults?: number;
    region?: string;
    safeSearch?: boolean;
  }) {
    console.log(`Serper (Google) Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`);
    
    try {
      // Set up the request to the Serper API
      const options = {
        method: 'POST',
        headers: {
          'X-API-KEY': '5b106638ab76499468577a6a8844cacfa7d38551',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          gl: region, // Google country code
          hl: 'en',   // Language
          num: maxResults,
          safe: safeSearch ? 'active' : 'off'
        })
      };
      
      // Make the request to the Serper API
      const response = await fetch('https://google.serper.dev/search', options);
      
      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const results: SearchResult[] = [];
      
      // Process organic search results
      if (data.organic && Array.isArray(data.organic)) {
        for (const result of data.organic) {
          if (results.length >= maxResults) break;
          
          results.push({
            title: result.title || "No title",
            href: result.link || "",
            body: result.snippet || "No description available"
          });
        }
      }
      
      // Add knowledge graph information if available
      if (data.knowledgeGraph && results.length < maxResults) {
        const kg = data.knowledgeGraph;
        results.push({
          title: kg.title || "Knowledge Graph",
          href: kg.website || "",
          body: kg.description || (kg.attributes ? JSON.stringify(kg.attributes) : "No description available")
        });
      }
      
      // Add answer box information if available
      if (data.answerBox && results.length < maxResults) {
        const answer = data.answerBox;
        results.push({
          title: answer.title || "Answer",
          href: answer.link || "",
          body: answer.answer || answer.snippet || "No direct answer available"
        });
      }
      
      console.log(`Serper Search Complete: Found ${results.length} results`);
      
      return {
        results: results.slice(0, maxResults),
        count: results.length,
        query: query
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
  description: 'Perform a web search using DuckDuckGo (with Google as fallback) and return the results',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number()
      .default(5)
      .describe('The maximum number of results to return'),
    region: z.string()
      .default('us')
      .describe('The region for the search (default: "us")'),
    safeSearch: z.boolean()
      .default(true)
      .describe('Whether to enable safe search'),
  }),
  execute: async ({ query, maxResults = 5, region = 'us', safeSearch = true }) => {
    console.log(`Web Search: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`);
    
    try {
      // Try DuckDuckGo first
      try {
        const duckResults = await duckDuckGo.search({ query, maxResults, region, safeSearch });
        
        // If DuckDuckGo returned no results, fall back to Serper
        if (duckResults.count === 0) {
          console.log('DuckDuckGo returned no results, falling back to Serper');
          const serperResults = await serper.search({ query, maxResults, region, safeSearch });
          return serperResults;
        }
        
        return duckResults;
      } catch (duckError: any) {
        console.error(`DuckDuckGo search failed: ${duckError.message}, falling back to Serper`);
        // Fall back to Serper if DuckDuckGo fails
        const serperResults = await serper.search({ query, maxResults, region, safeSearch });
        return serperResults;
      }
      
    } catch (error: any) {
      console.error(`All search attempts failed: ${error.message}`);
      return {
        results: [{
          title: "Search Error",
          href: "",
          body: `Failed to search for '${query}'. Error: ${error.message}. Please try again with a different query.`
        }],
        count: 0,
        query: query,
        error: `Search error: ${error.message}`
      };
    }
  },
});