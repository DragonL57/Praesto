'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'katex/dist/katex.min.css';

import { CitationButton } from './citations';
import { createHeadingComponents } from './headings';
import { createTableComponents } from './tables';
import { createListComponents } from './lists';
import { createCodeComponents } from './code';
import { createElementComponents } from './elements';
import type {
  MarkdownProps,
  CustomMarkdownComponents,
  HastNodeWithProperties,
} from './types';

// KaTeX configuration
const katexOptions = {
  strict: false,
  output: 'html' as const,
  throwOnError: false,
  trust: true,
  macros: {},
  errorColor: '#FF5555',
  globalGroup: true,
};

// Sanitize schema - allows our custom elements but blocks unknown HTML tags
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'citation-button',
  ],
  attributes: {
    ...defaultSchema.attributes,
    'citation-button': ['num', 'url'],
  },
};

const NonMemoizedMarkdown = ({
  children,
  baseHeadingLevel = 1,
  append,
}: MarkdownProps) => {
  // Memoize components based on baseHeadingLevel and append
  // Must be called before any early returns (React hooks rules)
  const components = useMemo<CustomMarkdownComponents>(
    () => ({
      // Code components
      ...createCodeComponents(),

      // Table components
      ...createTableComponents(),

      // List components
      ...createListComponents(),

      // Basic elements
      ...createElementComponents(),

      // Heading components (depend on baseHeadingLevel)
      ...createHeadingComponents(baseHeadingLevel),

      // Custom citation button
      'citation-button': ({ node }: { node?: HastNodeWithProperties }) => {
        if (!node?.properties) return null;
        const num = node.properties.num as string;
        const url = node.properties.url as string;
        if (!num || !url) return null;
        return <CitationButton num={num} url={url} />;
      },
    }),
    [baseHeadingLevel],
  );

  // Early return for empty content (after hooks)
  if (!children || children.trim() === '') {
    return null;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, katexOptions],
        rehypeRaw,
        [rehypeSanitize, sanitizeSchema],
      ]}
      skipHtml={false}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
};

NonMemoizedMarkdown.displayName = 'NonMemoizedMarkdown';

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.baseHeadingLevel === nextProps.baseHeadingLevel &&
    prevProps.append === nextProps.append,
);

Markdown.displayName = 'Markdown';
