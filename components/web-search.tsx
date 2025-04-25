'use client';

import { cn } from '@/lib/utils';
import { memo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface WebSearchResult {
  title: string;
  href: string; // Changed from url to href to match the tool output
  body: string; // Changed from snippet to body to match the tool output
}

interface WebSearchProps {
  results: WebSearchResult[];
  query: string;
  count: number;
}

// Helper function to safely parse HTML content
const parseHtml = (htmlString: string): string => {
  // Create a temporary DOM element
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  return doc.body.textContent || '';
};

function PureWebSearch({ results, query, count }: WebSearchProps) {
  // Ensure results is an array and each result has the required properties
  const safeResults = Array.isArray(results)
    ? results.filter(
        (result) =>
          result &&
          typeof result === 'object' &&
          result.href !== undefined &&
          result.title &&
          result.body,
      )
    : [];

  const getFormattedUrl = (url: string | undefined) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <div className="flex flex-col gap-4 w-full bg-background border rounded-xl p-4 mb-2">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center text-sm text-muted-foreground">
          <SearchIcon size={16} />
          <span>
            Search results for{' '}
            <span className="font-medium">&quot;{query}&quot;</span>
          </span>
        </div>
        <div className="text-xs text-muted-foreground">{count} results</div>
      </div>

      <div className="flex flex-col gap-4">
        {safeResults.map((result) => (
          <div
            key={`${result.href}-${result.title}`}
            className="flex flex-col gap-1"
          >
            <div className="flex justify-between items-start">
              <a
                href={getFormattedUrl(result.href)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 line-clamp-1 hover:underline"
                title={parseHtml(result.title)}
              >
                {parseHtml(result.title)}
              </a>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={getFormattedUrl(result.href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-6 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <ExternalLinkIcon size={12} />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Open in new tab</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <a
              href={getFormattedUrl(result.href)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground truncate hover:underline"
            >
              {result.href}
            </a>
            <p className="text-sm text-foreground/80 line-clamp-2">
              {parseHtml(result.body)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const WebSearch = memo(PureWebSearch);

function SearchIcon({
  size = 16,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn('stroke-current', className)}
      strokeWidth="2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ExternalLinkIcon({
  size = 16,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn('stroke-current', className)}
      strokeWidth="2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}
