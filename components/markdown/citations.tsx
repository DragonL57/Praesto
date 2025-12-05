'use client';

import { memo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Info, CalendarDays } from 'lucide-react';
import {
  formatDistanceToNowStrict,
  parseISO,
  differenceInCalendarDays,
  format,
} from 'date-fns';
import { metadataCache } from '@/lib/metadata-cache';
import { citationStyles } from './styles';

interface Metadata {
  title?: string | null;
  siteName?: string | null;
  description?: string | null;
  favicon?: string | null;
  image?: string | null;
  author?: string | null;
  publishedDate?: string | null;
  error?: string | null;
}

interface CitationButtonProps {
  num: string;
  url: string;
}

const FallbackFavicon = () => <Info className="size-4 text-gray-400" />;

const getRelativeDate = (dateString?: string | null) => {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    const now = new Date();

    const relativeTime = formatDistanceToNowStrict(date, { addSuffix: true });
    const diffDays = differenceInCalendarDays(now, date);

    if (diffDays >= 3) {
      const absoluteDate = format(date, 'MMM d, yyyy');
      return `${relativeTime} (${absoluteDate})`;
    }

    return relativeTime;
  } catch (e) {
    console.error('Error parsing date for relative format:', e);
    return dateString;
  }
};

export const CitationButton = memo(({ num, url }: CitationButtonProps) => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!url) return;
      if (hasFetched) return;

      setIsLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const data = await metadataCache.get(url);

        if (isMounted) {
          setMetadata(data);
          setHasFetched(true);
        }
      } catch (error) {
        if (
          !(error instanceof DOMException && error.name === 'AbortError') &&
          isMounted
        ) {
          console.error('Error fetching citation metadata:', error);
          setMetadata({ error: 'Error fetching metadata' });
          setHasFetched(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, hasFetched]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <HoverCard
      openDelay={200}
      closeDelay={100}
      onOpenChange={handleOpenChange}
      open={isOpen}
    >
      <HoverCardTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={citationStyles.button}
          aria-label={`Source ${num} - ${url}`}
        >
          {num}
        </a>
      </HoverCardTrigger>
      <HoverCardContent className={citationStyles.hoverCard} sideOffset={5}>
        {isLoading && (
          <div className={citationStyles.loading}>Loading metadata...</div>
        )}
        {metadata?.error && (
          <div className={citationStyles.error}>Error: {metadata.error}</div>
        )}
        {metadata && !metadata.error && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {metadata.favicon ? (
                <Image
                  src={metadata.favicon}
                  alt={metadata.siteName || 'Favicon'}
                  width={16}
                  height={16}
                  className="rounded-sm"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <FallbackFavicon />
              )}
              <span className={citationStyles.siteName}>
                {metadata.siteName || new URL(url).hostname}
              </span>
            </div>
            {metadata.title && (
              <span className={citationStyles.title}>{metadata.title}</span>
            )}
            {metadata.description && (
              <span className={citationStyles.description}>
                {metadata.description}
              </span>
            )}
            {metadata.author && (
              <span className={citationStyles.author}>
                By: {metadata.author}
              </span>
            )}
            {metadata.publishedDate && (
              <div className={citationStyles.date}>
                <CalendarDays className="size-3.5" />
                <span>{getRelativeDate(metadata.publishedDate)}</span>
              </div>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
});

CitationButton.displayName = 'CitationButton';
