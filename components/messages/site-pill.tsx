import Image from 'next/image';
import React from 'react';

interface SitePillProps {
  domain: string;
  faviconUrl: string;
  originalUrl: string;
}

const SitePill: React.FC<SitePillProps> = ({ domain, faviconUrl, originalUrl }) => {
  const getFormattedUrl = (urlInput: string) => {
    if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
      return `https://${urlInput}`;
    }
    return urlInput;
  };

  return (
    <a 
      href={getFormattedUrl(originalUrl)} 
      target="_blank" 
      rel="noopener noreferrer"
      className="inline-flex items-center bg-gray-100 dark:bg-zinc-800 rounded-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 no-underline hover:no-underline"
      title={`Visit ${domain} (${originalUrl})`}
    >
      <Image 
        src={faviconUrl} 
        alt={`${domain} favicon`} 
        width={16} 
        height={16} 
        className="mr-2 rounded-full shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="truncate">{domain}</span>
    </a>
  );
};

export default SitePill; 