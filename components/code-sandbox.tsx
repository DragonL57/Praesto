"use client";

import React, { useState, useEffect } from 'react';
import {
  Sandbox,
  SandboxContent,
  SandboxHeader,
  SandboxTabContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
} from "@/components/ai-elements/sandbox";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import {
  StackTrace,
  StackTraceHeader,
  StackTraceError,
  StackTraceErrorType,
  StackTraceErrorMessage,
  StackTraceActions,
  StackTraceCopyButton,
  StackTraceContent,
  StackTraceFrames,
} from "@/components/ai-elements/stack-trace";

interface CodeSandboxProps {
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error' | string;
  code: string;
  output?: string;
  error?: string;
  filename?: string;
  language?: string;
}

export const CodeSandbox: React.FC<CodeSandboxProps> = ({
  state,
  code,
  output,
  error,
  filename = "code.js",
  language = "javascript",
}) => {
  const [activeTab, setActiveTab] = useState(error ? "output" : "code");

  // Auto-switch to output tab when result is available or error occurs
  useEffect(() => {
    if (state === 'output-available' || state === 'output-error') {
      setActiveTab("output");
    }
  }, [state]);

  return (
    <Sandbox defaultOpen className="my-4">
      <SandboxHeader state={state} title={filename} />
      <SandboxContent>
        <SandboxTabs value={activeTab} onValueChange={setActiveTab}>
          <SandboxTabsBar>
            <SandboxTabsList>
              <SandboxTabsTrigger value="code">Code</SandboxTabsTrigger>
              <SandboxTabsTrigger value="output">Output</SandboxTabsTrigger>
            </SandboxTabsList>
          </SandboxTabsBar>
          
          <SandboxTabContent value="code">
            <CodeBlock
              className="border-0"
              code={state === "input-streaming" && !code ? "// Generating code..." : code}
              language={language}
            >
              <CodeBlockCopyButton
                className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                size="sm"
              />
            </CodeBlock>
          </SandboxTabContent>
          
          <SandboxTabContent value="output">
            {state === "output-error" || error ? (
              <StackTrace
                className="rounded-none border-0"
                trace={error || output || ""}
              >
                <StackTraceHeader>
                  <StackTraceError>
                    <StackTraceErrorType />
                    <StackTraceErrorMessage />
                  </StackTraceError>
                  <StackTraceActions>
                    <StackTraceCopyButton />
                  </StackTraceActions>
                </StackTraceHeader>
                <StackTraceContent>
                  <StackTraceFrames />
                </StackTraceContent>
              </StackTrace>
            ) : (
              <CodeBlock
                className="border-0"
                code={output || (state === "output-available" ? "" : "No output yet...")}
                language="log"
              >
                <CodeBlockCopyButton
                  className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  size="sm"
                />
              </CodeBlock>
            )}
          </SandboxTabContent>
        </SandboxTabs>
      </SandboxContent>
    </Sandbox>
  );
};
