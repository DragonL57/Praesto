'use client';

import { cn } from '@/lib/utils';
import { memo } from 'react';
import { Markdown } from './markdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface WebsiteContentProps {
  url: string;
  content: string;
  query?: string | null;
  status: 'success' | 'error' | 'loading';
  error?: string;
}

function PureWebsiteContent({ url, content, query, status, error }: WebsiteContentProps) {
  // Format the URL for display
  const getFormattedUrl = (url: string) => {
    return url.startsWith('http') ? url : `https://${url}`;
  };

  // Get domain name from URL for display
  const getDomainName = (url: string) => {
    try {
      const domain = new URL(getFormattedUrl(url)).hostname;
      return domain;
    } catch (e) {
      return url;
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full bg-background border rounded-xl p-4 mb-2">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center text-sm text-muted-foreground">
          <WebpageIcon size={16} />
          <span>Content from <span className="font-medium">{getDomainName(url)}</span></span>
          {query && <span className="text-xs text-muted-foreground"> • Search: "{query}"</span>}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={getFormattedUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-6 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <ExternalLinkIcon size={14} />
              </a>
            </TooltipTrigger>
            <TooltipContent>Visit website</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {status === 'loading' ? (
        <div className="flex flex-col w-full space-y-4">
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
          
          <div className="space-y-3 border p-4 rounded-md bg-muted/30">
            {/* Simple placeholder lines instead of Skeleton component */}
            <div className="h-4 w-3/4 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-5/6 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-4/5 bg-muted rounded"></div>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </div>
          
          <p className="text-sm text-center text-muted-foreground">Loading content from {getDomainName(url)}...</p>
        </div>
      ) : (
        <div className="text-sm overflow-auto max-h-[30rem] border p-4 rounded-md bg-muted/30">
          {status === 'error' ? (
            <div className="text-destructive">{error || 'Failed to load website content'}</div>
          ) : (
            <Markdown>{content}</Markdown>
          )}
        </div>
      )}
    </div>
  );
}

export const WebsiteContent = memo(PureWebsiteContent);

function WebpageIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg 
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn("stroke-current", className)}
      strokeWidth="2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
      />
    </svg>
  );
}

function ExternalLinkIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn("stroke-current", className)}
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