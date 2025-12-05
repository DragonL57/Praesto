'use client';

import { useRef, memo, useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Import both dark and light themes from the 'one' family
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import type { ReactNode } from 'react';
import { useTheme } from 'next-themes';

type Props = {
  lang: string;
  children: string;
};

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

const CodeBlock = memo(
  ({ lang, children }: Props) => {
    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isCopiedRef = useRef<HTMLSpanElement>(null);
    const { resolvedTheme } = useTheme();
    const [currentSyntaxTheme, setCurrentSyntaxTheme] = useState(oneLight);

    useEffect(() => {
      setCurrentSyntaxTheme(resolvedTheme === 'dark' ? oneDark : oneLight);
    }, [resolvedTheme]);

    // Handle copy functionality without using state
    const onCopy = () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      navigator.clipboard.writeText(String(children));

      if (isCopiedRef.current) {
        isCopiedRef.current.textContent = 'Copied!';
        copyTimeoutRef.current = setTimeout(() => {
          if (isCopiedRef.current) {
            isCopiedRef.current.textContent = 'Copy';
          }
        }, 2000);
      }
    };

    // Normalize language identifier
    const normalizedLang = lang?.toLowerCase() || '';
    // Map common language names to their syntax highlighter identifiers
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      html: 'html',
      css: 'css',
      json: 'json',
      yml: 'yaml',
      yaml: 'yaml',
      md: 'markdown',
      sh: 'bash',
      bash: 'bash',
      shell: 'bash',
      sql: 'sql',
      rust: 'rust',
      rs: 'rust',
      swift: 'swift',
      scala: 'scala',
      kotlin: 'kotlin',
      dart: 'dart',
    };

    // Get the correct language identifier or fallback to the original
    const highlighterLang =
      languageMap[normalizedLang] || normalizedLang || 'text';

    // Use effect to apply syntax highlighting once, without re-renders
    useEffect(() => {
      // Clean up on unmount
      return () => {
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div
        className="my-4 bg-zinc-100 dark:bg-[#161616] text-zinc-900 dark:text-zinc-100 rounded-md w-full"
        style={{ contain: 'content' }}
      >
        <div className="flex justify-between items-center px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-t-md">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {lang || 'Text'}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="text-xs bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 px-2 py-1 rounded-md transition-colors"
          >
            <span ref={isCopiedRef}>Copy</span>
          </button>
        </div>
        <div className="w-full max-w-full bg-transparent overflow-auto code-block-container">
          <SyntaxHighlighter
            language={highlighterLang}
            style={currentSyntaxTheme}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              background: 'transparent',
              borderRadius: '0 0 0.375rem 0.375rem',
            }}
            showLineNumbers={highlighterLang !== 'text'}
            showInlineLineNumbers={false}
            wrapLines={true}
            lineNumberContainerStyle={{
              float: 'left',
              paddingRight: '1em',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              textAlign: 'right',
              minWidth: '2.5em',
              opacity: 0.5,
            }}
            codeTagProps={{
              style: {
                backgroundColor: 'transparent',
              },
            }}
          >
            {String(children)}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Super strict equality check to prevent unnecessary re-renders
    // Only re-render if the language or content actually changes
    if (prevProps.lang !== nextProps.lang) return false;

    // For content, we'll do a length check first (faster)
    // This helps in cases where the content is streaming in
    if (prevProps.children.length !== nextProps.children.length) return false;

    // If the lengths are the same, we'll do a full equality check
    return prevProps.children === nextProps.children;
  },
);

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
    return <CodeBlock lang={match?.[1] || ''}>{String(children)}</CodeBlock>;
  }
}

// Export CodeBlock component for use in other files
export { CodeBlock };
