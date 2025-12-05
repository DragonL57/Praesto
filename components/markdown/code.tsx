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
  const match = /language-(\w+)/.exec(className || '');
  const language = match?.[1] || '';
  const isInline = !match;

  if (isInline) {
    return <InlineCode {...props}>{children}</InlineCode>;
  }

  return <CodeBlock lang={language}>{String(children)}</CodeBlock>;
};

/**
 * Creates code components for react-markdown
 */
export const createCodeComponents = () => ({
  pre: Pre,
  code: Code,
});
