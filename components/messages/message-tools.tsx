/**
 * Tool rendering components for message tools
 * Handles Weather, Calendar, and other tool results display
 */

import React from 'react';
import cx from 'classnames';
import { Weather } from '../weather';
import { Calendar } from '../calendar';
import { CodeSandbox } from '../code-sandbox';
import type { EnhancedMessagePart } from './message-types';
import {
  extractToolName,
  getToolCallId,
  isToolPart,
  isCalendarTool,
  getToolOutput,
  isToolResultAvailable,
} from './message-utils';
import type { ToolCallPart } from '@/lib/ai/types';

interface ExecuteSandboxCodeArgs {
  code: string;
  packages?: string[];
  filename?: string;
  language?: string;
}

interface ExecuteSandboxCodeResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: string;
  sandboxId?: string;
}

interface ToolCallSkeletonProps {
  toolName: string;
  toolCallId: string;
  toolIndex?: number;
  messageId: string;
  part?: EnhancedMessagePart;
}

/**
 * Renders skeleton/loading state for tool calls
 */
export const ToolCallSkeleton: React.FC<ToolCallSkeletonProps> = ({
  toolName,
  toolCallId,
  toolIndex,
  messageId,
  part,
}) => {
  const key = `call_${messageId}_${toolCallId}${typeof toolIndex === 'number' && toolIndex >= 0 ? `_${toolIndex}` : ''}`;

  if (toolName === 'executeSandboxCode') {
    const args = (part as unknown as ToolCallPart)?.args as ExecuteSandboxCodeArgs;
    return (
      <CodeSandbox
        key={key}
        state="input-streaming"
        code={args?.code || ""}
        filename={args?.filename || "script.js"}
        language={args?.language || "javascript"}
      />
    );
  }

  return (
    <div
      key={key}
      className={cx({
        skeleton: toolName === 'getWeather' || isCalendarTool(toolName),
      })}
    >
      {toolName === 'getWeather' ? (
        <Weather />
      ) : isCalendarTool(toolName) ? (
        <Calendar />
      ) : null}
    </div>
  );
};

interface ToolResultProps {
  part: EnhancedMessagePart;
  messageId: string;
  allParts?: EnhancedMessagePart[];
}

/**
 * Renders a single tool result (standalone)
 */
export const ToolResult: React.FC<ToolResultProps> = ({ part, messageId, allParts = [] }) => {
  if (!isToolPart(part)) return null;

  const toolName = extractToolName(part);
  const toolCallId = getToolCallId(part);
  const result = getToolOutput(part) || {};
  const toolIndex =
    typeof part.toolIndex === 'number' && part.toolIndex >= 0
      ? `_${part.toolIndex}`
      : '';

  if (toolName === 'executeSandboxCode') {
    // Find the corresponding tool call part to get the code
    const callPart = allParts.find(p => p.type === 'tool-call' && (p as ToolCallPart).toolCallId === toolCallId) as ToolCallPart | undefined;
    const args = callPart?.args as ExecuteSandboxCodeArgs | undefined;
    const res = result as ExecuteSandboxCodeResult;
    
    return (
      <CodeSandbox
        key={`call_${messageId}_${toolCallId}${toolIndex}`}
        state={res?.success === false ? "output-error" : "output-available"}
        code={args?.code || ""}
        output={res?.stdout || ""}
        error={res?.stderr || res?.error || ""}
        filename={args?.filename || "script.js"}
        language={args?.language || "javascript"}
      />
    );
  }

  return (
    <div
      key={`call_${messageId}_${toolCallId}${toolIndex}`}
      className="border-[1.5px] border-border rounded-xl mb-0 relative"
    >
      {toolName === 'getWeather' ? (
        <Weather
          weatherAtLocation={
            result as unknown as Parameters<
              typeof Weather
            >[0]['weatherAtLocation']
          }
        />
      ) : isCalendarTool(toolName) ? (
        <Calendar
          result={result as unknown as Parameters<typeof Calendar>[0]['result']}
        />
      ) : (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

interface ToolGroupProps {
  parts: EnhancedMessagePart[];
  messageId: string;
  toolIndex: number;
}

/**
 * Renders a group of related tool results
 */
export const ToolGroup: React.FC<ToolGroupProps> = ({
  parts,
  messageId,
  toolIndex,
}) => {
  return (
    <div
      key={`tool-group-${toolIndex}`}
      className="border-[1.5px] border-border rounded-xl mb-0 overflow-hidden"
    >
      {parts.map((groupPart: EnhancedMessagePart) => {
        if (!isToolPart(groupPart)) return null;

        const groupToolName = extractToolName(groupPart);
        const groupToolCallId = getToolCallId(groupPart);
        const toolIdx =
          typeof groupPart.toolIndex === 'number' && groupPart.toolIndex >= 0
            ? `_${groupPart.toolIndex}`
            : '';

        return (
          <div
            key={`call_${messageId}_${groupToolCallId}${toolIdx}`}
            className="border-0"
          >
            {/* Render grouped tool results */}
            {/* For now, using placeholder - can be enhanced with specific grouped rendering */}
            <pre>Grouped: {groupToolName} Result</pre>
          </div>
        );
      })}
    </div>
  );
};

interface MessageToolsProps {
  parts: EnhancedMessagePart[];
  messageId: string;
}

/**
 * Organizes and renders all tool results for a message
 * Handles grouping logic and filtering
 */
export const MessageTools: React.FC<MessageToolsProps> = ({
  parts,
  messageId,
}) => {
  // Organize parts into tool groups
  const toolGroups: { [key: number]: EnhancedMessagePart[] } = {};
  parts.forEach((part) => {
    if (
      isToolPart(part) &&
      isToolResultAvailable(part) &&
      part.toolIndex !== undefined &&
      part.toolIndex >= 0
    ) {
      if (!toolGroups[part.toolIndex]) toolGroups[part.toolIndex] = [];
      toolGroups[part.toolIndex].push(part);
    }
  });

  // Filter out 'input-available' parts if corresponding 'output-available' exists
  const toolResultIds = new Set(
    parts
      .filter(
        (p) => isToolPart(p) && isToolResultAvailable(p) && getToolCallId(p),
      )
      .map((p) => getToolCallId(p)),
  );

  const filteredParts = parts.filter((part) => {
    if (isToolPart(part)) {
      const state = (part as unknown as { state?: unknown }).state;
      if (
        typeof state === 'string' &&
        state === 'input-available' &&
        toolResultIds.has(getToolCallId(part))
      ) {
        return false; // Hide input-available if output-available exists
      }
    }
    return true;
  });

  return (
    <>
      {filteredParts.map((part, index) => {
        const key = `message-${messageId}-part-${index}`;

        // Check if this is a grouped tool (not the first in group)
        if (
          isToolPart(part) &&
          isToolResultAvailable(part) &&
          part.toolIndex !== undefined &&
          part.toolIndex >= 0 &&
          toolGroups[part.toolIndex]?.[0] !== part
        ) {
          return null; // Already rendered in group
        }

        // Check if it's a group
        const isGroup =
          isToolPart(part) &&
          isToolResultAvailable(part) &&
          part.toolIndex !== undefined &&
          part.toolIndex >= 0 &&
          toolGroups[part.toolIndex]?.length > 1;

        if (isGroup && part.toolIndex !== undefined) {
          return (
            <ToolGroup
              key={key}
              parts={toolGroups[part.toolIndex]}
              messageId={messageId}
              toolIndex={part.toolIndex}
            />
          );
        }

        // Standalone tool result
        if (isToolPart(part) && isToolResultAvailable(part)) {
          return <ToolResult key={key} part={part} messageId={messageId} />;
        }

        return null;
      })}
    </>
  );
};
