import Link from 'next/link';
import { memo, forwardRef, Children, isValidElement, type ReactElement } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import hljs from 'highlight.js';

// Define interface for code component props
interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any;
  [key: string]: any;
}

const components: Partial<Components> = {
  // Keep the handler for <pre> elements (code blocks)
  pre({ node, className, children, ...props }) {
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
        className={`${className || ''}`}
        {...props}
        data-language={language || undefined}
      >
        {children}
      </pre>
    );
  },
  // Enhanced code component with better inline detection
  code: ({ node, inline, className, children, ...props }: CodeProps) => {
    // If this code is inside a pre element, it's a code block
    // Otherwise, it's inline code and we should add our inline-code class
    const isInline = !props.parent?.tagName?.match(/^pre$/i);
    const codeClassName = isInline ? `inline-code ${className || ''}` : className || '';
    
    return (
      <code className={codeClassName.trim()} {...props}>
        {children}
      </code>
    );
  },
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="nested-bullets list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  },
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

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      // Use type assertion here since ReactMarkdown's types are compatible
      rehypePlugins={rehypePlugins as any}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
