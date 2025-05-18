import Link from 'next/link';
import Image from 'next/image';
import React, { memo, createElement, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { ImagePreviewModal } from './image-preview-modal';
import { CodeBlock } from './code-block'; // Import the proper CodeBlock component
import { InlineCode } from './ui/code/inline-code';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'; // Import HoverCard components
import { Info, CalendarDays } from 'lucide-react'; // For icons
import {
  formatDistanceToNowStrict, 
  parseISO, 
  differenceInCalendarDays, 
  format
} from 'date-fns'; // Added more date-fns functions
import { SuggestionButton } from './suggestion-button'; // Added import
import type { UseChatHelpers } from '@ai-sdk/react'; // Added import for append type

// Define a more specific type for HAST nodes with properties
interface HastNodeWithProperties {
  type: string;
  tagName?: string;
  properties?: {
    num?: string;
    url?: string;
    [key: string]: unknown; // Allow other properties but type them as unknown
  };
  children?: HastNodeWithProperties[];
  value?: string; // For text nodes
}

// Define our custom components type, extending the base and adding 'citation-button' and 'suggestion-button'
interface CustomMarkdownComponents extends Components {
  'citation-button'?: React.FC<{
      node?: HastNodeWithProperties;
      [key: string]: unknown;
  }>;
  'suggestion-button'?: React.FC<{
      node?: HastNodeWithProperties;
      append?: UseChatHelpers['append']; // Added append here
      [key: string]: unknown;
  }>;
}

// Define custom props to track heading depth
interface MarkdownProps {
  children: string;
  baseHeadingLevel?: number;
  append?: UseChatHelpers['append']; // Added append prop
}

// Component to handle table overflow with proper scrollbars
const TableWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className="table-container my-4"
      style={{
        width: '100%',
        maxWidth: '100%',
        maxHeight: '600px',
        overflowY: 'auto',
        overflowX: 'auto',
        display: 'block',
        border: '1px solid var(--border)',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
};

interface Metadata {
  title?: string | null;
  siteName?: string | null;
  description?: string | null;
  favicon?: string | null;
  image?: string | null;
  author?: string | null;
  publishedDate?: string | null; // Added publishedDate
  error?: string | null; // To store potential errors from API
}

// Define the new CitationButton component
const CitationButton = ({ num, url }: { num: string; url: string }) => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchMetadata = async () => {
    if (!url || metadata || isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      const data: Metadata = await response.json();
      if (response.ok) {
        setMetadata(data);
      } else {
        setMetadata({ error: data.error || 'Failed to fetch metadata' });
      }
    } catch (error) {
      console.error("Error fetching citation metadata:", error);
      setMetadata({ error: 'Error fetching metadata' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !metadata && !isLoading) {
      fetchMetadata();
    }
  };
  
  const FallbackFavicon = () => (
    <Info className="size-4 text-gray-400" />
  );

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
      
      return relativeTime; // For less than 3 days ago, or if it's a future date (relativeTime handles this)

    } catch (e) {
      console.error("Error parsing date for relative format:", e);
      return dateString; // Fallback to original string if parsing fails
    }
  };

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={handleOpenChange} open={isOpen}>
      <HoverCardTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-[6px] py-px mx-0.5 text-xs font-light text-gray-700 bg-gray-200 rounded-[5px] hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 no-underline align-middle"
          aria-label={`Source ${num} - ${url}`}
        >
          {num}
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-3 shadow-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg z-[60]" sideOffset={5}>
        {isLoading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading metadata...</div>}
        {metadata?.error && <div className="text-sm text-red-500">Error: {metadata.error}</div>}
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
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; /* Hide on error, or replace with fallback */ }}
                />
              ) : <FallbackFavicon />}
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                {metadata.siteName || new URL(url).hostname}
              </h4>
            </div>
            {metadata.title && (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                {metadata.title}
              </p>
            )}
            {metadata.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 max-h-20 overflow-hidden text-ellipsis">
                    {metadata.description}
                </p>
            )}
            {metadata.author && (
              <p className="text-xs text-gray-500 dark:text-gray-400">By: {metadata.author}</p>
            )}
            {metadata.publishedDate && (
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <CalendarDays className="size-3.5" />
                <span>{getRelativeDate(metadata.publishedDate)}</span>
              </div>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

// Simplified component using react-markdown library
const NonMemoizedMarkdown = ({
  children,
  baseHeadingLevel = 1,
  append, // Destructure append
}: MarkdownProps) => {
  // State to track image preview modal - defined before any conditional returns
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  
  // Early return for empty content to avoid unnecessary rendering
  if (!children || children.trim() === '') {
    return null;
  }

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { 
            strict: false,  // Don't throw errors for invalid KaTeX
            output: 'html', // Output as HTML
            throwOnError: false, // Don't throw on parsing errors
            trust: true, // Trust HTML from KaTeX
            macros: {}, // Custom macros can be added here if needed
            errorColor: '#FF5555', // Color for errors
            globalGroup: true // Allow global math commands
          }],
          rehypeRaw // Add rehype-raw to process HTML in markdown
        ]}
        skipHtml={false} // Changed to false to allow HTML like <br> tags
        components={{
          // Remove the component mapping for 'think'
          /*
          // @ts-expect-error // rehypeRaw might produce 'think' nodes for non-standard tags
          think: () => null,
          */

          // Pre and Code components for code blocks - improved to handle overflow
          pre: ({ children }) => {
            // The actual rendering is handled by the code component below
            return <>{children}</>;
          },

          code: ({ className, children, ...props }) => {
            // Determine if this is a code block or inline code
            const match = /language-(\w+)/.exec(className || '');
            const language = match?.[1] || '';
            const isInline = !match;
            
            if (isInline) {
              return (
                <InlineCode {...props}>
                  {children}
                </InlineCode>
              );
            }
            
            // Use the imported CodeBlock component for syntax highlighting
            return (
              <CodeBlock lang={language}>
                {String(children)}
              </CodeBlock>
            );
          },

          'citation-button': ({ node }) => {
            if (!node || !node.properties) return null;
            const num = node.properties.num as string;
            const url = node.properties.url as string;
            if (!num || !url) return null;
              return <CitationButton num={num} url={url} />;
          },

          'suggestion-button': ({ node }) => {
            if (!node || !node.properties || !append) return null; // Check for append
            const text = node.properties.text as string;
            const query = node.properties.query as string;
            if (!text || !query) return null;
            return <SuggestionButton text={text} query={query} append={append} />;
          },

          // Image component with lazy loading and full screen preview
          img: ({ src, alt, ..._props }) => {
            if (!src) return null;
            
            const handleImageClick = () => {
              setPreviewImage({ src, alt: alt || 'Image' });
            };
            
            const handleKeyDown = (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleImageClick();
              }
            };

            return (
              <div className="my-2 flex justify-center">
                <div className="relative max-w-full">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleImageClick}
                    onKeyDown={handleKeyDown}
                    className="cursor-pointer"
                    aria-label={`View ${alt || 'image'} in full screen`}
                  >
                    <Image
                      src={src}
                      alt={alt || 'Image'}
                      width={500} // Fixed width as number
                      height={300} // Fixed height as number
                      className="rounded-md object-contain hover:opacity-90 transition-opacity"
                      style={{ maxWidth: '100%', height: 'auto' }}
                      unoptimized={true} // Set to true for all external images to bypass domain restrictions
                    />
                  </div>
                </div>
              </div>
            );
          },

          // Restore the original table component renderers
          table: ({ children, ...props }) => (
            <TableWrapper>
              <table
                style={{
                  borderCollapse: 'collapse',
                  borderSpacing: 0,
                  width: 'max-content',      // Be as wide as content inherently
                  minWidth: '100%',          // But at least 100% of the container
                  tableLayout: 'auto'
                }}
                {...props}
              >
                {children}
              </table>
            </TableWrapper>
          ),

          thead: ({ children, ...props }) => (
            <thead
              className="bg-zinc-200 dark:bg-zinc-700"
              style={{ position: 'sticky', top: 0, zIndex: 1 }}
              {...props}
            >
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
          tr: ({ children, ...props }) => {
            // Use Tailwind's `even:` variant for striping.
            // This makes the 2nd, 4th, etc., rows in tbody have the specified background,
            // ensuring the first data row has the default background and the second gets the color, then alternates.
            // The "dark:even:bg-zinc-800" ensures dark mode compatibility.
            const rowClassName = "even:bg-zinc-100 dark:even:bg-zinc-800";

            return (
              <tr className={rowClassName} {...props}>
                {children}
              </tr>
            );
          },
          th: ({ children, ...props }) => (
            <th
              className="px-4 py-2 text-center font-semibold border-x border-zinc-300 dark:border-zinc-700"
              style={{
                maxWidth: '300px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                padding: '8px 16px',
                boxShadow: 'inset 0 1px 0 0 hsl(var(--border)), inset 0 -1px 0 0 hsl(var(--border))',
              }}
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700"
              style={{
                maxWidth: '300px',
                whiteSpace:'pre-wrap',
                wordBreak: 'break-word',
                padding: '8px 16px',
              }}
              {...props}
            >
              {children}
            </td>
          ),

          // Basic elements
          hr: ({ ...props }) => (
            <hr
              className="my-8 border-0 border-t border-zinc-300 dark:border-zinc-700"
              {...props}
            />
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-outside ml-4 my-2" {...props}>
              {children}
            </ol>
          ),
          ul: ({ children, ...props }) => (
            <ul className="nested-bullets list-outside ml-4 my-2" {...props}>
              {children}
            </ul>
          ),
          li: ({ children, ...props }) => (
            <li className="py-1 break-words" {...props}>
              {children}
            </li>
          ),
          strong: ({ children, ...props }) => (
            <span className="font-semibold after:content-[''] after:whitespace-pre" {...props}>
              {children}
            </span>
          ),

          // Links
          a: ({ children, href, ...props }) => (
            <Link
              className="text-blue-700 dark:text-blue-400 hover:underline break-words overflow-wrap-anywhere"
              target="_blank"
              rel="noreferrer"
              href={href as string}
              {...props}
            >
              {children || href}
            </Link>
          ),

          // Paragraphs
          p: ({ children, ...props }) => (
            <p className="my-2 break-words" {...props}>
              {children}
            </p>
          ),

          // Blockquote component for markdown quotes
          blockquote: ({ children, ...props }) => {
            // React-Markdown already wraps text in p tags, so we don't need to add more
            return (
              <div className="my-4 px-4 py-2 border-l-4 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded-r-md">
                <blockquote className="text-zinc-700 dark:text-zinc-300" {...props}>
                  {children}
                </blockquote>
              </div>
            );
          },

          // Heading components with dynamic level based on baseHeadingLevel
          h1: ({ children, ...props }) => {
            const level = Math.min(baseHeadingLevel, 6);
            return createElement(
              `h${level}`,
              {
                className: 'text-3xl font-semibold mt-2 mb-2 break-words',
                ...props,
              },
              children,
            );
          },

          h2: ({ children, ...props }) => {
            const level = Math.min(baseHeadingLevel + 1, 6);
            return createElement(
              `h${level}`,
              {
                className: 'text-2xl font-semibold mt-2 mb-2 break-words',
                ...props,
              },
              children,
            );
          },

          h3: ({ children, ...props }) => {
            const level = Math.min(baseHeadingLevel + 2, 6);
            return createElement(
              `h${level}`,
              {
                className: 'text-xl font-semibold mt-2 mb-2 break-words',
                ...props,
              },
              children,
            );
          },

          h4: ({ children, ...props }) => {
            const level = Math.min(baseHeadingLevel + 3, 6);
            return createElement(
              `h${level}`,
              {
                className: 'text-lg font-semibold mt-2 mb-2 break-words',
                ...props,
              },
              children,
            );
          },

          h5: ({ children, ...props }) => {
            const level = Math.min(baseHeadingLevel + 4, 6);
            return createElement(
              `h${level}`,
              {
                className: 'text-base font-semibold mt-2 mb-2 break-words',
                ...props,
              },
              children,
            );
          },

          h6: ({ children, ...props }) => {
            const level = Math.min(baseHeadingLevel + 5, 6);
            return createElement(
              `h${level}`,
              {
                className: 'text-sm font-semibold mt-2 mb-2 break-words',
                ...props,
              },
              children,
            );
          },
        } as CustomMarkdownComponents}
      >
        {children}
      </ReactMarkdown>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.src}
          alt={previewImage.alt}
        />
      )}
    </>
  );
};

// Add display name to the non-memoized component
NonMemoizedMarkdown.displayName = 'NonMemoizedMarkdown';

// Finally, memoize the component
export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.baseHeadingLevel === nextProps.baseHeadingLevel,
);

// Add display name to the memoized component
Markdown.displayName = 'Markdown';