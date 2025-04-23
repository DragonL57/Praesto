import Link from 'next/link';
import Image from 'next/image';
import { memo, Children, isValidElement, type ReactElement, createElement, useEffect, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
// highlight.js themes are still imported in globals.css

// Define interface for code component props
interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any;
  // Add parent prop type based on potential usage by react-markdown
  parent?: { tagName?: string }; 
  [key: string]: any;
}

// Define custom props to track heading depth
interface MarkdownProps {
  children: string;
  baseHeadingLevel?: number;
}

// Use a more predictable approach for heading levels
// Instead of maintaining state, we'll use fixed heading levels from baseHeadingLevel
const getComponents = (baseHeadingLevel: number = 1): Partial<Components> => {
  // Create named components for other Markdown elements
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
    // Determine if inline based on parent element (more reliable than inline prop)
    const isInline = !props.parent?.tagName?.match(/^pre$/i);
    
    // Apply Tailwind classes directly for inline code
    const codeClassName = isInline 
      ? `inline-code px-1 py-0.5 rounded-sm font-mono text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 ${className || ''}` 
      : className || ''; // Keep original className for code blocks (for highlight.js)
    
    return (
      <code className={codeClassName.trim()} {...props}>
        {children}
      </code>
    );
  };
  CodeComponent.displayName = 'MarkdownCode';

  // Custom image component with responsive behavior
  const ImageComponent = ({ node, src, alt, ...props }: any) => {
    const [isError, setIsError] = useState(false);
    
    return (
      <div className="my-2 flex justify-center">
        {src && !isError ? (
          <Image
            src={src}
            alt={alt || "Image"}
            className="rounded-md max-w-full h-auto"
            width={700}
            height={350}
            style={{ maxWidth: "100%", height: "auto" }}
            loading="lazy"
            onError={() => setIsError(true)}
            {...props}
          />
        ) : (
          <div className="text-sm text-muted-foreground italic text-center">
            Failed to load image: {alt || src}
          </div>
        )}
      </div>
    );
  };
  ImageComponent.displayName = 'MarkdownImage';

  return {
    pre: PreComponent,
    code: CodeComponent,
    img: ImageComponent,

    // Remove table-specific components and use simpler implementations
    // that indicate tables should be created with createDocument
    table: function MarkdownTable({ node, children, ...props }) {
      return (
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
      );
    },
    
    // Simplify remaining table components
    thead: function MarkdownThead({ node, children, ...props }) {
      return (
        <thead {...props}>
          {children}
        </thead>
      );
    },
    
    tbody: function MarkdownTbody({ node, children, ...props }) {
      return (
        <tbody {...props}>
          {children}
        </tbody>
      );
    },
    
    tr: function MarkdownTr({ node, children, ...props }) {
      return (
        <tr className="border-b border-zinc-300 dark:border-zinc-700" {...props}>
          {children}
        </tr>
      );
    },
    
    th: function MarkdownTh({ node, children, ...props }) {
      return (
        <th className="px-2 py-1 text-left font-semibold" {...props}>
          {children}
        </th>
      );
    },
    
    td: function MarkdownTd({ node, children, ...props }) {
      return (
        <td className="px-2 py-1" {...props}>
          {children}
        </td>
      );
    },

    hr: function MarkdownHr({ node, ...props }) {
      return (
        <hr
          className="my-8 border-0 border-t border-zinc-300 dark:border-zinc-700"
          {...props}
        />
      );
    },
    
    ol: function MarkdownOl({ node, children, ...props }) {
      return (
        <ol className="list-decimal list-outside ml-4 my-2" {...props}>
          {children}
        </ol>
      );
    },
    
    li: function MarkdownLi({ node, children, ...props }) {
      return (
        <li className="py-1 break-words" {...props}>
          {children}
        </li>
      );
    },
    
    ul: function MarkdownUl({ node, children, ...props }) {
      return (
        <ul className="nested-bullets list-outside ml-4 my-2" {...props}>
          {children}
        </ul>
      );
    },
    
    strong: function MarkdownStrong({ node, children, ...props }) {
      return (
        <span className="font-semibold" {...props}>
          {children}
        </span>
      );
    },
    
    a: function MarkdownLink({ node, children, href, ...props }) {
      return (
        <Link
          className="text-blue-500 hover:underline break-words overflow-wrap-anywhere"
          target="_blank"
          rel="noreferrer"
          href={href as any}
          {...props}
        >
          {children}
        </Link>
      );
    },
    
    p: function MarkdownParagraph({ node, children, ...props }) {
      return (
        <p className="my-2 break-words" {...props}>
          {children}
        </p>
      );
    },

    // Fixed heading components with deterministic level calculation
    // For better accessibility without hydration issues, we use a fixed mapping approach
    h1: function MarkdownH1({ node, children, ...props }) {
      // Always map h1 -> baseHeadingLevel
      const level = Math.min(baseHeadingLevel, 6);
      return createElement(
        `h${level}`,
        { className: "text-3xl font-semibold mt-2 mb-2 break-words", ...props },
        children
      );
    },
    h2: function MarkdownH2({ node, children, ...props }) {
      // Always map h2 -> baseHeadingLevel + 1
      const level = Math.min(baseHeadingLevel + 1, 6);
      return createElement(
        `h${level}`,
        { className: "text-2xl font-semibold mt-2 mb-2 break-words", ...props },
        children
      );
    },
    h3: function MarkdownH3({ node, children, ...props }) {
      // Always map h3 -> baseHeadingLevel + 2
      const level = Math.min(baseHeadingLevel + 2, 6);
      return createElement(
        `h${level}`,
        { className: "text-xl font-semibold mt-2 mb-2 break-words", ...props },
        children
      );
    },
    h4: function MarkdownH4({ node, children, ...props }) {
      // Always map h4 -> baseHeadingLevel + 3
      const level = Math.min(baseHeadingLevel + 3, 6);
      return createElement(
        `h${level}`,
        { className: "text-lg font-semibold mt-2 mb-2 break-words", ...props },
        children
      );
    },
    h5: function MarkdownH5({ node, children, ...props }) {
      // Always map h5 -> baseHeadingLevel + 4
      const level = Math.min(baseHeadingLevel + 4, 6);
      return createElement(
        `h${level}`,
        { className: "text-base font-semibold mt-2 mb-2 break-words", ...props },
        children
      );
    },
    h6: function MarkdownH6({ node, children, ...props }) {
      // Always map h6 -> baseHeadingLevel + 5
      const level = Math.min(baseHeadingLevel + 5, 6);
      return createElement(
        `h${level}`,
        { className: "text-sm font-semibold mt-2 mb-2 break-words", ...props },
        children
      );
    },
  };
};

const remarkPlugins = [remarkGfm];
// Configure rehypeHighlight with options
const rehypePlugins = [
  [rehypeHighlight, { 
    detect: true,       // Auto-detect language if not specified
    ignoreMissing: true, // Don't throw on missing language
    subset: false        // Use all languages available in highlight.js
  }]
];

const NonMemoizedMarkdown = ({ children, baseHeadingLevel = 1 }: MarkdownProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      // Use type assertion here since ReactMarkdown's types are compatible
      rehypePlugins={rehypePlugins as any}
      components={getComponents(baseHeadingLevel)}
    >
      {children}
    </ReactMarkdown>
  );
};

// Add display name to the non-memoized component
NonMemoizedMarkdown.displayName = 'NonMemoizedMarkdown';

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => 
    prevProps.children === nextProps.children && 
    prevProps.baseHeadingLevel === nextProps.baseHeadingLevel
);

// Add display name to the memoized component
Markdown.displayName = 'Markdown';
