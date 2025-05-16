'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import SitePill from './messages/site-pill';

interface WebsiteContentProps {
  url: string;
  query?: string | null;
  status: 'success' | 'error' | 'loading';
  error?: string;
}

function PureWebsiteContent({
  url,
  status,
  error: _error,
}: WebsiteContentProps) {

  const getFormattedUrl = (urlInput: string) => {
    return urlInput.startsWith('http') ? urlInput : `https://${urlInput}`;
  };

  const getDomainName = (urlInput: string) => {
    try {
      return new URL(getFormattedUrl(urlInput)).hostname;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      return urlInput;
    }
  };
  
  const getFaviconUrl = (domain: string) => {
    return `https://www.google.com/s2/favicons?sz=32&domain_url=${domain}`;
  };

  const domain = getDomainName(url);
  let titleText = "Reading:";
  let titleColor = "text-gray-700 dark:text-gray-300";

  if (status === 'error') {
    titleText = "Error reading:";
    titleColor = "text-red-600 dark:text-red-400";
  } else if (status === 'loading') {
    // Title remains "Reading" but MessageReasoning spinner indicates loading
    // We could add (Loading...) here if desired, but main spinner should cover it.
  }
  // For 'success' status, it just shows "Reading:" and the pill.

  return (
    <div className="my-2 p-3 rounded-md bg-background border border-border">
      <h3 className={cn("text-sm font-medium mb-2 flex items-center", titleColor)}>
        {titleText} <span className="font-semibold ml-1.5 text-gray-800 dark:text-gray-200 truncate" title={url}>{domain}</span>
        {/* LoaderIcon removed, MessageReasoning header handles overall loading state */}
      </h3>
      <div className="flex flex-wrap gap-2 items-center">
        <SitePill 
          domain={domain} 
          faviconUrl={getFaviconUrl(domain)} 
          originalUrl={url}
        />
      </div>
      {status === 'error' && _error && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{_error}</p>
      )}
    </div>
  );
}

export const WebsiteContent = memo(PureWebsiteContent);


