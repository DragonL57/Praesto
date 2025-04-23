import Link from 'next/link';
import { memo, Children, isValidElement, type ReactElement, createElement } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Import highlight.js directly instead of rehype-highlight for better control
import hljs from 'highlight.js/lib/common';

// Define interface for code component props
interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any;
  parent?: { tagName?: string }; 
  [key: string]: any;
}

// Define custom props to track heading depth
interface MarkdownProps {
  children: string;
  baseHeadingLevel?: number;
}

// Pre-defined component functions outside of getComponents to improve performance
// This prevents re-creating these functions on every render
const PreComponent = ({ node, className, children, ...props }: any) => {
  // Find the <code> child to potentially get the language
  let language = '';
  const codeChild = Children.toArray(children).find(child => 
    isValidElement(child) && child.type === 'code'
  ) as ReactElement | undefined;

  if (codeChild?.props.className) {
    const match = /language-(\w+)/.exec(codeChild?.props.className || '');
    if (match) {
      language = match[1];
    }
  }

  return (
    <pre
      className={`overflow-x-auto rounded-md p-0 m-0 border-0 bg-zinc-100 dark:bg-[#161616] ${className || ''}`}
      {...props}
      data-language={language || undefined}
    >
      {children}
    </pre>
  );
};
PreComponent.displayName = 'MarkdownPre';

const CodeComponent = ({ node, inline, className, children, ...props }: CodeProps) => {
  // Determine if inline based on parent element
  const isInline = !props.parent?.tagName?.match(/^pre$/i);
  
  // If it's a code block and has a language class, manually apply syntax highlighting
  if (!isInline && className) {
    const language = /language-(\w+)/.exec(className);
    if (language && language[1] && typeof children === 'string') {
      try {
        const highlightedCode = hljs.highlight(
          children.toString(),
          { language: language[1] }
        ).value;
        
        return (
          <code 
            className={className} 
            {...props}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        );
      } catch (error) {
        // Fall back to unformatted code if language not supported
      }
    }
  }
  
  // Apply Tailwind classes directly for inline code
  const codeClassName = isInline 
    ? `inline-code px-1 py-0.5 rounded-sm font-mono text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 ${className || ''}` 
    : className || ''; 
  
  return (
    <code className={codeClassName.trim()} {...props}>
      {children}
    </code>
  );
};
CodeComponent.displayName = 'MarkdownCode';

// Optimized image component without unnecessary state
const ImageComponent = ({ node, src, alt, ...props }: any) => {
  if (!src) {
    return (
      <div className="my-2 flex justify-center">
        <div className="text-sm text-muted-foreground italic text-center">
          Failed to load image: {alt || "Unknown image"}
        </div>
      </div>
    );
  }

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
};
ImageComponent.displayName = 'MarkdownImage';

// Use a more predictable approach for heading levels
const getComponents = (baseHeadingLevel: number = 1): Partial<Components> => {
  return {
    pre: PreComponent,
    code: CodeComponent,
    img: ImageComponent,

    // Simplified table components
    table: ({ node, children, ...props }) => (
      <div className="my-4 p-4 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 rounded-md">
        <p className="text-sm text-muted-foreground mb-2">
          <strong>Note:</strong> This table would display better as a spreadsheet. 
          For optimal viewing on all devices, especially mobile, tables should be created 
          using the <code>createDocument</code> tool with <code>kind: 'sheet'</code>.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" {...props}>
            {children}
          </table>
        </div>
      </div>
    ),
    
    thead: ({ children, ...props }) => <thead {...props}>{children}</thead>,
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => <tr className="border-b border-zinc-300 dark:border-zinc-700" {...props}>{children}</tr>,
    th: ({ children, ...props }) => <th className="px-2 py-1 text-left font-semibold" {...props}>{children}</th>,
    td: ({ children, ...props }) => <td className="px-2 py-1" {...props}>{children}</td>,

    hr: ({ ...props }) => <hr className="my-8 border-0 border-t border-zinc-300 dark:border-zinc-700" {...props} />,
    
    ol: ({ children, ...props }) => <ol className="list-decimal list-outside ml-4 my-2" {...props}>{children}</ol>,
    
    li: ({ children, ...props }) => <li className="py-1 break-words" {...props}>{children}</li>,
    
    ul: ({ children, ...props }) => <ul className="nested-bullets list-outside ml-4 my-2" {...props}>{children}</ul>,
    
    strong: ({ children, ...props }) => <span className="font-semibold" {...props}>{children}</span>,
    
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
    
    p: ({ children, ...props }) => <p className="my-2 break-words" {...props}>{children}</p>,

    // Using more efficient arrow functions for headings with the same styling
    h1: ({ children, ...props }) => createElement(
      `h${Math.min(baseHeadingLevel, 6)}`,
      { className: "text-3xl font-semibold mt-2 mb-2 break-words", ...props },
      children
    ),
    h2: ({ children, ...props }) => createElement(
      `h${Math.min(baseHeadingLevel + 1, 6)}`,
      { className: "text-2xl font-semibold mt-2 mb-2 break-words", ...props },
      children
    ),
    h3: ({ children, ...props }) => createElement(
      `h${Math.min(baseHeadingLevel + 2, 6)}`,
      { className: "text-xl font-semibold mt-2 mb-2 break-words", ...props },
      children
    ),
    h4: ({ children, ...props }) => createElement(
      `h${Math.min(baseHeadingLevel + 3, 6)}`,
      { className: "text-lg font-semibold mt-2 mb-2 break-words", ...props },
      children
    ),
    h5: ({ children, ...props }) => createElement(
      `h${Math.min(baseHeadingLevel + 4, 6)}`,
      { className: "text-base font-semibold mt-2 mb-2 break-words", ...props },
      children
    ),
    h6: ({ children, ...props }) => createElement(
      `h${Math.min(baseHeadingLevel + 5, 6)}`,
      { className: "text-sm font-semibold mt-2 mb-2 break-words", ...props },
      children
    ),
  };
};

// Use only necessary plugins
const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children, baseHeadingLevel = 1 }: MarkdownProps) => {
  // Early return for empty content to avoid unnecessary rendering
  if (!children || children.trim() === '') {
    return null;
  }
  
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      components={getComponents(baseHeadingLevel)}
      skipHtml={true} // Skip HTML parsing for security and performance
    >
      {children}
    </ReactMarkdown>
  );
};

NonMemoizedMarkdown.displayName = 'NonMemoizedMarkdown';

// Memoize the component for better performance
export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => 
    prevProps.children === nextProps.children && 
    prevProps.baseHeadingLevel === nextProps.baseHeadingLevel
);

Markdown.displayName = 'Markdown';
