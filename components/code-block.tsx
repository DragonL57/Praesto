'use client';

import { useState, memo, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Only import one theme to ensure consistency
import { coldarkDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
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
  const [clientMounted, setClientMounted] = useState(false);

  // Use useEffect to detect when component is mounted on client
  useEffect(() => {
    setClientMounted(true);
  }, []);

  const onCopy = () => {
    navigator.clipboard.writeText(children);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Normalize language identifier
  const normalizedLang = lang?.toLowerCase() || '';
  // Map common language names to their syntax highlighter identifiers
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'yml': 'yaml',
    'yaml': 'yaml',
    'md': 'markdown',
    'sh': 'bash',
    'bash': 'bash',
    'shell': 'bash',
    'sql': 'sql',
    'rust': 'rust',
    'rs': 'rust',
    'swift': 'swift',
    'scala': 'scala',
    'kotlin': 'kotlin',
    'dart': 'dart',
  };
  
  // Get the correct language identifier or fallback to the original
  const highlighterLang = languageMap[normalizedLang] || normalizedLang || 'text';

  return (
    <div className="bg-zinc-100 dark:bg-[#161616] text-zinc-900 dark:text-zinc-100 rounded-md">
      <div className="flex justify-between items-center px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-t-md">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {lang || 'Text'}
        </span>
        <button
          onClick={onCopy}
          className="text-xs bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 px-2 py-1 rounded-md transition-colors"
        >
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="w-full max-w-full bg-transparent">
        {!clientMounted ? (
          // Pre-render fallback - simple code block without highlighting
          <pre className="p-4 overflow-auto font-mono text-sm">
            <code>{children}</code>
          </pre>
        ) : (
          // Client-side only rendering for SyntaxHighlighter
          <SyntaxHighlighter
            language={highlighterLang}
            style={coldarkDark}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              background: 'transparent',
              borderRadius: '0 0 0.375rem 0.375rem',
            }}
            showLineNumbers={highlighterLang !== 'text'}
            wrapLines={true}
            codeTagProps={{
              style: {
                backgroundColor: 'transparent'
              }
            }}
          >
            {children}
          </SyntaxHighlighter>
        )}
      </div>
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