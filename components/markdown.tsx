import Link from 'next/link';
import Image from 'next/image';
import { memo, createElement, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ImagePreviewModal } from './image-preview-modal';

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
        maxHeight: '400px',
        overflowY: 'auto',
        overflowX: 'scroll',
        display: 'block',
        borderRadius: '0.375rem',
        border: '1px solid var(--border)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {children}
    </div>
  );
};

// Code block component with copy functionality
const CodeBlockWithCopy = ({ language, children }: { language: string, children: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-100 dark:bg-[#161616] text-zinc-900 dark:text-zinc-100 rounded-md">
      <div className="flex justify-between items-center px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-t-md">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {language || 'Text'}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 px-2 py-1 rounded-md transition-colors"
        >
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="w-full max-w-full">
        <pre className="p-4 m-0 whitespace-pre-wrap break-all">
          <code className={`language-${language || 'text'} block`}>{children}</code>
        </pre>
      </div>
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
        rehypePlugins={[[rehypeKatex, { 
          strict: false,  // Don't throw errors for invalid KaTeX
          output: 'html', // Output as HTML
          throwOnError: false, // Don't throw on parsing errors
          trust: true, // Trust HTML from KaTeX
          macros: {}, // Custom macros can be added here if needed
          errorColor: '#FF5555', // Color for errors
          globalGroup: true // Allow global math commands
        }]]}
        skipHtml={true} // Skip HTML for security and performance
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
                <code
                  className="px-1 py-0.5 rounded-sm font-mono text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <CodeBlockWithCopy language={language}>
                {String(children)}
              </CodeBlockWithCopy>
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
                  width: '150%', // Force table to be wider than container
                  minWidth: '100%',
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
                maxWidth: '300px', // Set max width for cell
                overflow: 'hidden',
                textOverflow: 'ellipsis',
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
                maxWidth: '300px', // Set max width for cell
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-word',
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
            <span className="font-semibold" {...props}>
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