import { tool } from 'ai';
import { z } from 'zod';

interface SearchResult {
  title: string;
  href: string;
  body: string;
}

export const webSearch = tool({
  description: 'Perform a web search using Google and return the results',
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
    console.log(`Google Search via Serper: query='${query}', max=${maxResults}, region=${region}, safe=${safeSearch ? 'on' : 'off'}`);
    
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
        throw new Error(`Search API error: ${response.status} ${response.statusText}`);
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
      
      console.log(`Search Complete: Found ${results.length} results`);
      
      return {
        results: results.slice(0, maxResults),
        count: results.length,
        query: query
      };
      
    } catch (error: any) {
      console.error(`Error during web search: ${error.message}`);
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