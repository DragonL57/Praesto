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

// Define our custom components type, extending the base and adding 'citation-button'
interface CustomMarkdownComponents extends Components {
  'citation-button'?: React.FC<{
      node?: HastNodeWithProperties;
      [key: string]: unknown;
  }>;
}

// Define custom props to track heading depth
interface MarkdownProps {
  children: string;
  baseHeadingLevel?: number;
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

// Define the new CitationButton component
const CitationButton = ({ num, url }: { num: string; url: string }) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center px-[6px] py-px mx-0.2 text-xs font-light text-gray-700 bg-gray-200 rounded-[5px] hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 no-underline"
      aria-label={`Source ${num}`}
    >
      {num}
    </a>
  );
};

// Simplified component using react-markdown library
const NonMemoizedMarkdown = ({
  children,
  baseHeadingLevel = 1,
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

          'citation-button': ({ node }: { node?: HastNodeWithProperties }) => {
            const num = node?.properties?.num;
            const url = node?.properties?.url;
            // Ensure num and url are strings before passing to CitationButton
            if (typeof num === 'string' && typeof url === 'string') {
              return <CitationButton num={num} url={url} />;
            }
            // Fallback for malformed or missing attributes
            return <span style={{ color: 'red', fontWeight: 'bold' }}>[Citation Error]</span>;
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

// Memoize the component for better performance
export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, _nextProps) =>
    prevProps.children === _nextProps.children &&
    prevProps.baseHeadingLevel === _nextProps.baseHeadingLevel,
);

// Add display name to the memoized component
Markdown.displayName = 'Markdown';