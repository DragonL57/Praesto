/**
 * Central export point for message components
 * Simplifies imports throughout the application
 */

// Main components
export { PreviewMessage, ThinkingMessage, MessageSkeleton } from './message';
export { Messages } from './messages';
export { MessageActions } from './message-actions';
export { MessageEditor } from './message-editor';
export { MessageReasoning } from './message-reasoning';

// Sub-components
export { MessageContent } from './message-content';
export { MessageAttachments } from './message-attachments';
export { MessageUserActions } from './message-user-actions';
export { MessageTools, ToolCallSkeleton, ToolResult, ToolGroup } from './message-tools';
export { UserTextWithLineBreaks } from './user-text';

// Types
export type {
    PurePreviewMessageProps,
    PreviewMessageProps,
    MessageActionsProps,
    EnhancedMessagePart,
    ReasoningContentItem,
    WebSearchResult,
    WebSearchData,
    FetchedPageInfoData,
    ThinkToolResult,
} from './message-types';

// Utilities
export {
    isToolPart,
    extractToolName,
    getToolCallId,
    isToolResultAvailable,
    getToolOutput,
    getGradientStyle,
    isReasoningTool,
    isCalendarTool,
    shouldGroupTools,
    applyToolGrouping,
    REASONING_TOOL_NAMES,
    CALENDAR_TOOL_NAMES,
} from './message-utils';

// Hooks
export { useReasoningElements, useProcessedParts } from './message-hooks';
