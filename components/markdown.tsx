import Link from 'next/link';
import { memo, createElement, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Define custom props to track heading depth
interface MarkdownProps {
  children: string;
  baseHeadingLevel?: number;
}

// Type for code component props from react-markdown
interface CodeProps {
  className?: string;
  children?: React.ReactNode;
  node?: any;
  [key: string]: any;
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

// Component to handle code block overflow with proper scrollbars
const CodeBlockWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div 
      className="code-block-container"
      style={{
        width: '100%',
        overflowX: 'scroll', // Force horizontal scrollbar to be visible
        display: 'block',
        borderRadius: '0.375rem',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {children}
    </div>
  );
};

// Simplified component using react-markdown library
const NonMemoizedMarkdown = ({ children, baseHeadingLevel = 1 }: MarkdownProps) => {
  // Early return for empty content to avoid unnecessary rendering
  if (!children || children.trim() === '') {
    return null;
  }
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml={true} // Skip HTML for security and performance
      components={{
        // Pre and Code components for code blocks
        pre: ({ node, className, children, ...props }) => {
          // Find the <code> child to potentially get the language
          let language = '';
          if (Array.isArray(children)) {
            const codeChild = children.find(
              child => typeof child === 'object' && child && 'props' in child && child.props?.className
            );
            
            if (codeChild && typeof codeChild === 'object' && 'props' in codeChild) {
              const match = /language-(\w+)/.exec(codeChild.props.className || '');
              if (match) {
                language = match[1];
              }
            }
          }

          return (
            <div 
              className="relative my-4 w-full"
              style={{
                maxWidth: '100%',
                borderRadius: '0.375rem',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="overflow-x-auto"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--scrollbar-thumb) transparent',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <pre
                  className={cn(`rounded-md p-4 m-0 bg-zinc-100 dark:bg-[#161616]`, className)}
                  data-language={language || undefined}
                  {...props}
                  style={{
                    width: '150%', // Make content wider than container to trigger scroll
                    minWidth: '100%',
                    overflow: 'visible', // Let the parent handle the scrolling
                    whiteSpace: 'pre',
                  }}
                >
                  {children}
                </pre>
              </div>
            </div>
          );
        },
        
        code: ({ className, children, ...props }: CodeProps) => {
          // Determine if this is a code block or inline code
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          
          return (
            <code
              className={cn(
                isInline ? 
                  'px-1 py-0.5 rounded-sm font-mono text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700' : 
                  '',
                className
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
        
        // Image component with lazy loading
        img: ({ src, alt, ...props }) => {
          if (!src) return null;
          
          return (
            <div className="my-2 flex justify-center">
              <img
                src={src}
                alt={alt || "Image"}
                className="rounded-md max-w-full h-auto"
                loading="lazy"
                {...props}
              />
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
                minWidth: '100%'
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
        tr: ({ children, ...props }) => <tr className="border-b dark:border-zinc-700" {...props}>{children}</tr>,
        th: ({ children, ...props }) => (
          <th 
            className="px-4 py-2 text-left font-semibold" 
            style={{ 
              maxWidth: '300px', // Set max width for cell
              overflow: 'hidden',
              textOverflow: 'ellipsis'
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
              wordBreak: 'break-word'
            }}
            {...props}
          >
            {children}
          </td>
        ),
        
        // Basic elements
        hr: ({ ...props }) => <hr className="my-8 border-0 border-t border-zinc-300 dark:border-zinc-700" {...props} />,
        ol: ({ children, ...props }) => <ol className="list-decimal list-outside ml-4 my-2" {...props}>{children}</ol>,
        ul: ({ children, ...props }) => <ul className="nested-bullets list-outside ml-4 my-2" {...props}>{children}</ul>,
        li: ({ children, ...props }) => <li className="py-1 break-words" {...props}>{children}</li>,
        strong: ({ children, ...props }) => <span className="font-semibold" {...props}>{children}</span>,
        
        // Links
        a: ({ children, href, ...props }) => (
          <Link
            className="text-blue-500 hover:underline break-words overflow-wrap-anywhere"
            target="_blank"
            rel="noreferrer"
            href={href as any}
            {...props}
          >
            {children}
          </Link>
        ),
        
        // Paragraphs
        p: ({ children, ...props }) => <p className="my-2 break-words" {...props}>{children}</p>,

        // Heading components with dynamic level based on baseHeadingLevel
        h1: ({ children, ...props }) => {
          const level = Math.min(baseHeadingLevel, 6);
          return createElement(`h${level}`, { 
            className: "text-3xl font-semibold mt-2 mb-2 break-words", 
            ...props 
          }, children);
        },
        
        h2: ({ children, ...props }) => {
          const level = Math.min(baseHeadingLevel + 1, 6);
          return createElement(`h${level}`, { 
            className: "text-2xl font-semibold mt-2 mb-2 break-words", 
            ...props 
          }, children);
        },
        
        h3: ({ children, ...props }) => {
          const level = Math.min(baseHeadingLevel + 2, 6);
          return createElement(`h${level}`, { 
            className: "text-xl font-semibold mt-2 mb-2 break-words", 
            ...props 
          }, children);
        },
        
        h4: ({ children, ...props }) => {
          const level = Math.min(baseHeadingLevel + 3, 6);
          return createElement(`h${level}`, { 
            className: "text-lg font-semibold mt-2 mb-2 break-words", 
            ...props 
          }, children);
        },
        
        h5: ({ children, ...props }) => {
          const level = Math.min(baseHeadingLevel + 4, 6);
          return createElement(`h${level}`, { 
            className: "text-base font-semibold mt-2 mb-2 break-words", 
            ...props 
          }, children);
        },
        
        h6: ({ children, ...props }) => {
          const level = Math.min(baseHeadingLevel + 5, 6);
          return createElement(`h${level}`, { 
            className: "text-sm font-semibold mt-2 mb-2 break-words", 
            ...props 
          }, children);
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
};

// Add display name to the non-memoized component
NonMemoizedMarkdown.displayName = 'NonMemoizedMarkdown';

// Memoize the component for better performance
export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => 
    prevProps.children === nextProps.children && 
    prevProps.baseHeadingLevel === nextProps.baseHeadingLevel
);

// Add display name to the memoized component
Markdown.displayName = 'Markdown';
