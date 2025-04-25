'use client';

import { useState, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ReactNode } from 'react';

type Props = {
  lang: string;
  children: string;
};

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

const CodeBlock = memo(({ lang, children }: Props) => {
  const [isCopied, setIsCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(children);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="not-prose flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {lang}
        </span>
        <button
          onClick={onCopy}
          className="text-sm text-blue-500 hover:underline"
        >
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={coldarkDark}
        customStyle={{
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
});

// Add display name to fix ESLint warning
CodeBlock.displayName = 'CodeBlock';

export function code({ inline, className, children, ...props }: CodeProps) {
  const match = /language-(\w+)/.exec(className || '');

  if (inline) {
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  } else {
    // Fix children prop warning by using JSX children syntax
    return (
      <CodeBlock lang={match?.[1] || ''}>
        {String(children)}
      </CodeBlock>
    );
  }
}

// Export CodeBlock component for use in other files
export { CodeBlock };