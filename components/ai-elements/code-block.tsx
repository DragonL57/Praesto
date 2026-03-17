"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from 'next-themes';

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
  children?: React.ReactNode;
}

const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ code, language = "text", className, children, ...props }, ref) => {
    const { resolvedTheme } = useTheme();
    const [isClient, setIsClient] = React.useState(false);
    
    React.useEffect(() => {
      setIsClient(true);
    }, []);

    const theme = resolvedTheme === 'dark' ? oneDark : oneLight;

    return (
      <div
        ref={ref}
        className={cn("group relative overflow-hidden font-mono text-sm", className)}
        {...props}
      >
        <div className="w-full overflow-auto">
          {isClient ? (
            <SyntaxHighlighter
              language={language}
              style={theme}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.875rem',
                background: 'transparent',
              }}
              wrapLines={true}
            >
              {code}
            </SyntaxHighlighter>
          ) : (
            <pre className="p-4 bg-transparent">
              <code>{code}</code>
            </pre>
          )}
        </div>
        {/* Pass the code to children (like CopyButton) via context or clone if needed, 
            but for simplicity we'll just let children be rendered and handle their own logic */}
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            // @ts-expect-error - we know we might pass code
            return React.cloneElement(child, { code });
          }
          return child;
        })}
      </div>
    );
  }
);
CodeBlock.displayName = "CodeBlock";

interface CodeBlockCopyButtonProps extends React.ComponentProps<typeof Button> {
  code?: string;
}

const CodeBlockCopyButton = ({ code, className, ...props }: CodeBlockCopyButtonProps) => {
  const [copied, setCopied] = React.useState(false);

  const onCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      onClick={onCopy}
      {...props}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      <span className="sr-only">Copy code</span>
    </Button>
  );
};
CodeBlockCopyButton.displayName = "CodeBlockCopyButton";

export { CodeBlock, CodeBlockCopyButton };
