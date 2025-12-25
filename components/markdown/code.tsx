import type { HTMLAttributes } from 'react';
import { CodeBlock } from '@/components/code-block';
import { InlineCode } from '@/components/ui/code/inline-code';

type CodeProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  node?: unknown;
};

export const Pre = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);

export const Code = ({
  className,
  children,
  node: _node,
  ...props
}: CodeProps) => {
  // Handle both standard 3-backtick and 4-backtick code blocks
  const match = /language-(\w+)/.exec(className || '');
  const language = match?.[1] || '';

  // Check if this is inline code or a code block
  const content = String(children);

  // Code blocks have:
  // 1. A className with language- prefix, OR
  // 2. No className but contain newlines (common with 4 backticks), OR
  // 3. Content that looks like code (has backticks, semicolons, brackets, etc.)
  const hasMultipleLines = content.includes('\n');
  const hasCodeBlockSyntax = content.includes('```') || content.includes('`');
  const looksLikeCode = /[{}[\];()]/.test(content) || content.includes('//') || content.includes('#');
  const isLongContent = content.length > 50; // Longer content is likely a code block

  // Determine if this should be a code block vs inline code
  const isInline = !match && !hasMultipleLines && !hasCodeBlockSyntax && !looksLikeCode && !isLongContent;

  if (isInline) {
    return <InlineCode {...props}>{children}</InlineCode>;
  }

  return <CodeBlock lang={language}>{content}</CodeBlock>;
};

/**
 * Creates code components for react-markdown
 */
export const createCodeComponents = () => ({
  pre: Pre,
  code: Code,
});
