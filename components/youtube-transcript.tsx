'use client';

import { cn } from '@/lib/utils';
import { memo, useState } from 'react';
import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { Button } from './ui/button';

interface YouTubeTranscriptProps {
  transcript: string;
  videoId: string;
  title?: string;
  hasTimestamps: boolean;
  channelTitle?: string;
  publishDate?: string;
  duration?: string;
  urlOrId: string; // Original URL or ID used to fetch the transcript
  languages?: string[]; // Languages that were used to fetch the transcript
}

function PureYouTubeTranscript({
  transcript,
  videoId,
  title,
  hasTimestamps,
  channelTitle,
  publishDate,
  duration,
  urlOrId,
  languages = ['en'],
}: YouTubeTranscriptProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Format the transcript for display
  const formattedTranscript = hasTimestamps
    ? transcript // Already formatted with timestamps
    : expanded || transcript.length <= 800
      ? transcript
      : `${transcript.substring(0, 800)}...`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Try to extract video duration from the duration string if provided
  const formatDuration = () => {
    if (!duration) return null;

    // For displaying durations in a nicer format
    if (duration.includes('PT')) {
      // ISO 8601 format
      try {
        const hoursMatch = duration.match(/(\d+)H/);
        const minutesMatch = duration.match(/(\d+)M/);
        const secondsMatch = duration.match(/(\d+)S/);

        const hours = hoursMatch ? Number.parseInt(hoursMatch[1], 10) : 0;
        const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;
        const seconds = secondsMatch ? Number.parseInt(secondsMatch[1], 10) : 0;

        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      } catch (e) {
        return duration;
      }
    }

    return duration;
  };

  // Format publish date if provided
  const formattedDate = publishDate
    ? new Date(publishDate).toLocaleDateString()
    : null;

  return (
    <div className="flex flex-col gap-4 w-full bg-background border rounded-xl p-4 mb-2">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center text-sm text-muted-foreground">
          <YoutubeIcon size={16} />
          <span>YouTube Transcript</span>
          {languages.length > 0 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {languages[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {hasTimestamps ? 'With timestamps' : 'Full transcript'}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Thumbnail and video info */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative group rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <Image
              src={thumbnailUrl}
              alt="Video thumbnail"
              width={320}
              height={180}
              className="w-full h-auto object-cover"
              unoptimized={false}
              priority={true}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <PlayIcon size={48} className="text-white" />
            </div>
            {formatDuration() && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 rounded">
                {formatDuration()}
              </div>
            )}
          </a>
          <div className="flex justify-between items-start mt-1">
            <div className="flex flex-col">
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium line-clamp-2 hover:underline"
                title={title || 'View on YouTube'}
              >
                {title || 'View on YouTube'}
              </a>
              {channelTitle && (
                <span className="text-xs text-muted-foreground mt-0.5">
                  {channelTitle}
                </span>
              )}
              {formattedDate && (
                <span className="text-xs text-muted-foreground">
                  {formattedDate}
                </span>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-6 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <ExternalLinkIcon size={12} />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Open in YouTube</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex flex-col w-full md:w-2/3">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-muted-foreground">Transcript:</div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <CheckIcon size={14} className="mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon size={14} className="mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div
            className={cn(
              'text-sm text-foreground/80 overflow-y-auto',
              hasTimestamps ? 'max-h-80 whitespace-pre-line' : 'max-h-60',
              hasTimestamps && 'font-mono',
            )}
          >
            {formattedTranscript}
          </div>
          {transcript.length > 800 && !hasTimestamps && !expanded && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-xs"
              onClick={() => setExpanded(true)}
            >
              <ChevronDownIcon size={14} className="mr-1" />
              Show full transcript ({Math.ceil(transcript.length / 800)} times
              longer)
            </Button>
          )}
          {expanded && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-xs"
              onClick={() => setExpanded(false)}
            >
              <ChevronUpIcon size={14} className="mr-1" />
              Show less
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export const YouTubeTranscript = memo(PureYouTubeTranscript);

function YoutubeIcon({
  size = 16,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn('fill-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function PlayIcon({
  size = 16,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn('fill-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 5v14l11-7z" />
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

function CheckIcon({
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CopyIcon({
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
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function ChevronDownIcon({
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon({
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}
