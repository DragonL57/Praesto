import Link from 'next/link';
import Image from 'next/image';
import React, { memo, createElement, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { ImagePreviewModal } from './image-preview-modal';
import { CodeBlock } from './code-block'; // Import the proper CodeBlock component
import { InlineCode } from './ui/code/inline-code';

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
        width: '100%', // Match text container width
        maxWidth: '100%', // Prevent wrapper from exceeding parent width
        maxHeight: '400px',
        overflowY: 'auto',
        overflowX: 'auto', // Changed from 'scroll' to 'auto' to only show scrollbar when needed
        display: 'block',
        borderRadius: '0.375rem',
        border: '1px solid var(--border)',
        WebkitOverflowScrolling: 'touch',
        position: 'relative', // Add this to create a positioning context
      }}
    >
      {children}
    </div>
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

          // Table components with improved overflow handling
          table: ({ children, ...props }) => (
            <TableWrapper>
              <table
                style={{
                  borderSpacing: 0,
                  minWidth: '100%',
                  width: 'auto', // Changed from fixed 150% to auto
                  tableLayout: 'auto', // Let browser determine column widths based on content
                }}
                {...props}
              >
                {children}
              </table>
            </TableWrapper>
          ),

          thead: ({ children, ...props }) => (
            <thead
              className="bg-zinc-50 dark:bg-zinc-800"
              style={{ position: 'sticky', top: 0, zIndex: 1 }}
              {...props}
            >
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
          tr: ({ children, ...props }) => (
            <tr className="border-b dark:border-zinc-700" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-4 py-2 text-left font-semibold"
              style={{
                minWidth: '150px',
                maxWidth: '350px',
                whiteSpace: 'pre-wrap', // Changed to pre-wrap for better whitespace handling
                wordBreak: 'break-word', // Add word breaking for better text flow
                padding: '8px 16px',
              }}
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-4 py-2"
              style={{
                minWidth: '150px',
                maxWidth: '350px',
                whiteSpace: 'pre-wrap', // Changed to pre-wrap for better whitespace handling
                wordBreak: 'break-word', // Add word breaking for better text flow
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
        }}
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