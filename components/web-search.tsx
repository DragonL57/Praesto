'use client';

import type React from 'react';
import { memo, useState } from 'react';
import SitePill from './messages/site-pill';

interface WebSearchResult {
  title: string;
  href: string;
  body: string;
}

interface WebSearchProps {
  results: WebSearchResult[];
  query: string;
  count: number;
}

function PureWebSearch({ results, query }: WebSearchProps) {
  const [showAllPills, setShowAllPills] = useState(false);
  const maxVisiblePills = 5;

  const safeResults = Array.isArray(results)
    ? results.filter(
        (result) =>
          result &&
          typeof result === 'object' &&
          result.href !== undefined &&
          result.title,
      )
    : [];

  const getDomainFromUrl = (url: string): string => {
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      return 'unknown.com';
    }
  };

  const getFaviconUrl = (domain: string) => {
    return `https://www.google.com/s2/favicons?sz=32&domain_url=${domain}`;
  };

  if (safeResults.length === 0 && !query) return null;

  const pillsToDisplay = showAllPills ? safeResults : safeResults.slice(0, maxVisiblePills);
  const remainingPillsCount = safeResults.length - pillsToDisplay.length;

  return (
    <div className="my-2 p-3 rounded-md bg-background">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
        Searched for: <span className="font-semibold ml-1.5 text-gray-800 dark:text-gray-200 truncate" title={query}>&quot;{query}&quot;</span>
      </h3>
      {pillsToDisplay.length > 0 ? (
        <div className="flex flex-wrap gap-2 items-center">
          {pillsToDisplay.map((result, index) => {
            const domain = getDomainFromUrl(result.href);
            return (
              <SitePill 
                key={`${domain}-${index}-pill`} 
                domain={domain} 
                faviconUrl={getFaviconUrl(domain)}
                originalUrl={result.href}
              />
            );
          })}
          {!showAllPills && remainingPillsCount > 0 && (
            <button 
              onClick={() => setShowAllPills(true)} 
              className="inline-flex items-center bg-gray-200 dark:bg-zinc-700 rounded-full px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              title={`Show ${remainingPillsCount} more results`}
            >
              +{remainingPillsCount} more
            </button>
          )}
        </div>
      ) : (
        query && <p className="text-xs text-gray-500 dark:text-gray-400">No results found for this search.</p>
      )}
    </div>
  );
}

export const WebSearch = memo(PureWebSearch);
