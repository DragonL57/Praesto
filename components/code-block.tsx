'use client';

import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import { useTheme } from 'next-themes';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const { theme, resolvedTheme } = useTheme();
  const isDarkTheme = theme === 'dark' || resolvedTheme === 'dark';
  const [isMobile, setIsMobile] = useState(false);
  
  // Extract language from className if available (e.g. language-python)
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  useEffect(() => {
    // Check if viewport is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  useEffect(() => {
    if (!inline && codeRef.current && language) {
      hljs.highlightElement(codeRef.current);
    }
  }, [language, children, inline]);

  if (inline) {
    // Handle inline code
    return (
      <code
        className={`${className || ''} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        style={{
          fontFamily: '"Geist Mono", "Geist Mono Fallback", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          WebkitFontSmoothing: 'auto',
          MozOsxFontSmoothing: 'auto',
          textRendering: 'geometricPrecision',
        }}
        {...props}
      >
        {children}
      </code>
    );
  } else {
    // Handle block code with highlight.js
    return (
      <pre
        {...props}
        className="not-prose text-sm w-full overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-50 scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent"
        style={{
          backgroundColor: isDarkTheme ? 'rgb(13, 17, 23)' : 'white',
          padding: '0.75rem',
          borderRadius: '12px',
          WebkitOverflowScrolling: 'touch', // Improve mobile scrolling
          maxWidth: '100%',
        }}
      >
        <code 
          ref={codeRef}
          className={`${language ? `language-${language}` : ''} hljs`}
          style={{
            fontFamily: '"Geist Mono", "Geist Mono Fallback", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '14px',
            lineHeight: '20px',
            backgroundColor: 'transparent',
            padding: 0,
            color: isDarkTheme ? 'rgb(250, 250, 250)' : undefined,
            WebkitFontSmoothing: 'auto',
            MozOsxFontSmoothing: 'auto',
            textRendering: 'geometricPrecision',
            letterSpacing: '0.01em',
            whiteSpace: isMobile ? 'pre-wrap' : 'pre',
            wordWrap: isMobile ? 'break-word' : 'normal',
            overflowWrap: 'anywhere',
          }}
        >
          {String(children).replace(/\n$/, '')}
        </code>
      </pre>
    );
  }
}
