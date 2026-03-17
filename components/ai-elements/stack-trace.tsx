"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StackFrame {
  method: string;
  file: string;
  line?: number;
  column?: number;
  isInternal: boolean;
}

const StackTraceContext = React.createContext<{
  trace: string;
  frames: StackFrame[];
  errorName: string;
  errorMessage: string;
} | null>(null);

const StackTrace = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { trace: string; defaultOpen?: boolean }
>(({ trace, className, children, ...props }, ref) => {
  const { frames, errorName, errorMessage } = React.useMemo(() => {
    const lines = trace.split("\n");
    const errorLine = lines[0] || "";
    const [name, ...msgParts] = errorLine.split(": ");
    
    const parsedFrames = lines
      .slice(1)
      .map((line) => {
        const match = line.match(/^\s*at (?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)\)?|(.+?)\)?)$/);
        if (!match) return null;

        const file = match[2] || match[5] || "";
        return {
          method: match[1] || "<anonymous>",
          file,
          line: match[3] ? parseInt(match[3], 10) : undefined,
          column: match[4] ? parseInt(match[4], 10) : undefined,
          isInternal: file.includes("node_modules") || file.startsWith("node:"),
        };
      })
      .filter((f): f is StackFrame => f !== null);

    return {
      frames: parsedFrames,
      errorName: name || "Error",
      errorMessage: msgParts.join(": ") || "",
    };
  }, [trace]);

  return (
    <StackTraceContext.Provider value={{ trace, frames, errorName, errorMessage }}>
      <div
        ref={ref}
        className={cn("rounded-lg border bg-muted/50 font-mono text-xs overflow-hidden", className)}
        {...props}
      >
        {children}
      </div>
    </StackTraceContext.Provider>
  );
});
StackTrace.displayName = "StackTrace";

const StackTraceHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between px-3 py-2 border-b bg-muted", className)} {...props}>
    {children}
  </div>
);

const StackTraceError = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2 text-destructive", className)} {...props}>
    {children}
  </div>
);

const StackTraceErrorType = () => {
  const ctx = React.useContext(StackTraceContext);
  return <span className="font-bold">{ctx?.errorName}</span>;
};

const StackTraceErrorMessage = () => {
  const ctx = React.useContext(StackTraceContext);
  return <span>{ctx?.errorMessage}</span>;
};

const StackTraceActions = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

const StackTraceCopyButton = () => {
  const ctx = React.useContext(StackTraceContext);
  const [copied, setCopied] = React.useState(false);

  const onCopy = () => {
    if (!ctx?.trace) return;
    navigator.clipboard.writeText(ctx.trace);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="size-6" onClick={onCopy}>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </Button>
  );
};

const StackTraceExpandButton = () => {
  // This is a placeholder since we're using sub-components. 
  // In a real implementation this might toggle state in a parent.
  return null; 
};

const StackTraceContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-1", className)} {...props}>
    {children}
  </div>
);

const StackTraceFrames = () => {
  const ctx = React.useContext(StackTraceContext);
  return (
    <>
      {ctx?.frames.map((frame, i) => (
        <div
          key={`${frame.method}-${frame.file}-${frame.line}-${i}`}
          className={cn(
            "px-2 py-1 flex flex-wrap gap-x-2",
            frame.isInternal ? "text-muted-foreground opacity-60" : "text-foreground"
          )}
        >
          <span className="text-blue-500">at</span>
          <span className="font-medium">{frame.method}</span>
          <span className="text-muted-foreground">
            ({frame.file}{frame.line ? `:${frame.line}` : ''}{frame.column ? `:${frame.column}` : ''})
          </span>
        </div>
      ))}
    </>
  );
};

export {
  StackTrace,
  StackTraceHeader,
  StackTraceError,
  StackTraceErrorType,
  StackTraceErrorMessage,
  StackTraceActions,
  StackTraceCopyButton,
  StackTraceExpandButton,
  StackTraceContent,
  StackTraceFrames,
};
