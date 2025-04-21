import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Define interface for code component props that includes the 'inline' property
interface ExtendedCodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const components: Partial<Components> = {
  // Keep the handler for <pre> elements (code blocks)
  pre({ node, className, children, style, ...props }) {
    // Find the <code> child to potentially get the language
    let language = '';
    const codeChild = React.Children.toArray(children).find(child => 
      React.isValidElement(child) && child.type === 'code'
    ) as React.ReactElement | undefined;

    if (codeChild?.props.className) {
      const match = /language-(\w+)/.exec(codeChild?.props.className || '');
      if (match) {
        language = match[1];
      }
    }

    return (
      <pre
        className={`not-prose text-sm w-full overflow-x-auto dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900 ${className || ''}`}
        style={style}
        {...props}
        data-language={language || undefined}
      >
        {children}
      </pre>
    );
  },
  // Use a function with type assertion for the code component
  code: React.forwardRef<HTMLElement, any>((props, ref) => {
    // Safely cast props to our extended type that includes 'inline'
    const { inline, className, children, ...rest } = props as ExtendedCodeProps;
    
    // Only apply custom styling for inline code
    if (inline) {
      return (
        <code
          ref={ref}
          className="text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-0.5 px-1.5 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono"
          {...rest}
        >
          {children}
        </code>
      );
    }
    
    // For block code, let rehype-highlight handle the syntax highlighting
    return (
      <code ref={ref} className={className} {...rest}>
        {children}
      </code>
    );
  }),
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
// Fix the rehypePlugins configuration format to match the expected TypeScript type
const rehypePlugins = [[rehypeHighlight, { 
  detect: true,       // Auto-detect language if not specified
  ignoreMissing: true, // Don't throw on missing language
  subset: false        // Use all languages available in highlight.js
}]];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
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
