import Link from 'next/link';
import { memo, forwardRef, Children, isValidElement, type ReactElement, createElement, Fragment } from 'react';
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

const getComponents = (baseHeadingLevel: number = 1): Partial<Components> => {
  // Helper function to create heading components
  const createHeadingComponent = (originalLevel: number, className: string) => {
    // Calculate the actual heading level to use
    const targetLevel = Math.min(baseHeadingLevel + originalLevel - 1, 6);
    
    // Return the appropriate heading component with display name
    switch (targetLevel) {
      case 1: {
        const H1Component = ({ children, ...props }: any) => (
          <h1 className={className} {...props}>{children}</h1>
        );
        H1Component.displayName = 'MarkdownH1';
        return H1Component;
      }
      case 2: {
        const H2Component = ({ children, ...props }: any) => (
          <h2 className={className} {...props}>{children}</h2>
        );
        H2Component.displayName = 'MarkdownH2';
        return H2Component;
      }
      case 3: {
        const H3Component = ({ children, ...props }: any) => (
          <h3 className={className} {...props}>{children}</h3>
        );
        H3Component.displayName = 'MarkdownH3';
        return H3Component;
      }
      case 4: {
        const H4Component = ({ children, ...props }: any) => (
          <h4 className={className} {...props}>{children}</h4>
        );
        H4Component.displayName = 'MarkdownH4';
        return H4Component;
      }
      case 5: {
        const H5Component = ({ children, ...props }: any) => (
          <h5 className={className} {...props}>{children}</h5>
        );
        H5Component.displayName = 'MarkdownH5';
        return H5Component;
      }
      case 6:
      default: {
        const H6Component = ({ children, ...props }: any) => (
          <h6 className={className} {...props}>{children}</h6>
        );
        H6Component.displayName = 'MarkdownH6';
        return H6Component;
      }
    }
  };

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

  // Continue adding named components for all other markdown elements

  return {
    pre: PreComponent,
    code: CodeComponent,

    // Add display names to the rest of the components
    // Table container with horizontal scrolling
    table: function MarkdownTable({ node, children, ...props }) {
      return (
        <div className="overflow-x-auto my-4 max-w-full">
          <table className="min-w-full border-collapse border border-zinc-300 dark:border-zinc-700" {...props}>
            {children}
          </table>
        </div>
      );
    },
    
    thead: function MarkdownThead({ node, children, ...props }) {
      return (
        <thead className="bg-zinc-100 dark:bg-zinc-800" {...props}>
          {children}
        </thead>
      );
    },
    
    tbody: function MarkdownTbody({ node, children, ...props }) {
      return (
        <tbody className="bg-white dark:bg-zinc-900" {...props}>
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
        <th className="px-4 py-2 text-left font-semibold border-r last:border-r-0 border-zinc-300 dark:border-zinc-700" {...props}>
          {children}
        </th>
      );
    },
    
    td: function MarkdownTd({ node, children, ...props }) {
      return (
        <td className="px-4 py-2 border-r last:border-r-0 border-zinc-300 dark:border-zinc-700" {...props}>
          {children}
        </td>
      );
    },
    
    hr: function MarkdownHr({ node, ...props }) {
      return (
        <hr
          className="my-4 border-0 border-t border-zinc-300 dark:border-zinc-700"
          {...props}
        />
      );
    },
    
    ol: function MarkdownOl({ node, children, ...props }) {
      return (
        <ol className="list-decimal list-outside ml-4" {...props}>
          {children}
        </ol>
      );
    },
    
    li: function MarkdownLi({ node, children, ...props }) {
      return (
        <li className="py-1" {...props}>
          {children}
        </li>
      );
    },
    
    ul: function MarkdownUl({ node, children, ...props }) {
      return (
        <ul className="nested-bullets list-outside ml-4" {...props}>
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
    
    a: function MarkdownLink({ node, children, ...props }) {
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

    // Dynamic heading levels with the proper TypeScript types and display names
    h1: createHeadingComponent(1, "text-3xl font-semibold mt-6 mb-2"),
    h2: createHeadingComponent(2, "text-2xl font-semibold mt-6 mb-2"),
    h3: createHeadingComponent(3, "text-xl font-semibold mt-6 mb-2"),
    h4: createHeadingComponent(4, "text-lg font-semibold mt-6 mb-2"),
    h5: createHeadingComponent(5, "text-base font-semibold mt-6 mb-2"),
    h6: createHeadingComponent(6, "text-sm font-semibold mt-6 mb-2"),
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
