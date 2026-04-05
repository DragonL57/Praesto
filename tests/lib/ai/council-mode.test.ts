import { test, expect } from '@playwright/test';
import { createUITracker } from '@/lib/ai/chat/ui-tracker';
import { buildThinkingItems } from '@/components/messages/MessageThinkingTrigger';
import type { Message, MessagePart } from '@/lib/ai/types';
import type {
  MergedMessagePart,
  ReasoningContentItem,
} from '@/components/messages/message-types';

test.describe('UI Tracker - Council Mode', () => {
  test.describe('addCouncilToUI', () => {
    test('should create council-debate part on start phase', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [
          { name: 'Researcher', icon: 'R' },
          { name: 'Analyst', icon: 'A' },
          { name: 'Contrarian', icon: 'X' },
        ],
      });

      expect(tracker.uiParts).toHaveLength(1);
      expect(tracker.uiParts[0].type).toBe('council-debate');
      const council = tracker.uiParts[0] as Record<string, unknown>;
      expect(council.agents).toHaveLength(3);
      expect(council.isComplete).toBe(false);
      expect(council.isSynthesizing).toBe(false);
    });

    test('should update agent status on agent-complete phase', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [{ name: 'Researcher', icon: 'R' }],
      });

      tracker.addCouncilToUI({
        phase: 'agent-complete',
        name: 'Researcher',
        content: 'Research findings here',
        round: 1,
      });

      const council = tracker.uiParts[0] as Record<string, unknown>;
      const agents = council.agents as Array<Record<string, unknown>>;
      expect(agents[0].status).toBe('complete');
      expect(agents[0].content).toBe('Research findings here');
      expect(agents[0].rounds).toHaveLength(1);
    });

    test('should deduplicate rounds by round number', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [{ name: 'Researcher', icon: 'R' }],
      });

      tracker.addCouncilToUI({
        phase: 'agent-complete',
        name: 'Researcher',
        content: 'Round 1 content',
        round: 1,
      });

      tracker.addCouncilToUI({
        phase: 'agent-complete',
        name: 'Researcher',
        content: 'Round 1 duplicate',
        round: 1,
      });

      const council = tracker.uiParts[0] as Record<string, unknown>;
      const agents = council.agents as Array<Record<string, unknown>>;
      const rounds = agents[0].rounds as Array<{
        round: number;
        content: string;
      }>;
      expect(rounds).toHaveLength(1);
      expect(rounds[0].content).toBe('Round 1 content');
    });

    test('should mark agent as error if content starts with brackets', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [{ name: 'Researcher', icon: 'R' }],
      });

      tracker.addCouncilToUI({
        phase: 'agent-complete',
        name: 'Researcher',
        content: '[Error: Something went wrong]',
        round: 1,
      });

      const council = tracker.uiParts[0] as Record<string, unknown>;
      const agents = council.agents as Array<Record<string, unknown>>;
      expect(agents[0].status).toBe('error');
    });

    test('should set synthesizing and complete on synthesis phase', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [{ name: 'Researcher', icon: 'R' }],
      });

      tracker.addCouncilToUI({
        phase: 'synthesis',
      });

      const council = tracker.uiParts[0] as Record<string, unknown>;
      expect(council.isSynthesizing).toBe(true);
      expect(council.isComplete).toBe(true);
    });
  });

  test.describe('addCouncilToolEvent', () => {
    test('should add tool call event to uiParts', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [{ name: 'Researcher', icon: 'R' }],
      });

      tracker.addCouncilToolEvent(
        {
          agentName: 'Researcher',
          toolCallId: 'tc-1',
          toolName: 'web_search',
          args: { query: 'test' },
        },
        false,
      );

      expect(tracker.uiParts).toHaveLength(2);
      const toolCall = tracker.uiParts[1] as Record<string, unknown>;
      expect(toolCall.type).toBe('tool-call');
      expect(toolCall.toolCallId).toBe('tc-1');
      expect(toolCall.toolName).toBe('web_search');
      expect(toolCall.councilAgent).toBe('Researcher');
    });

    test('should append tool result after tool call to preserve sequence', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [{ name: 'Researcher', icon: 'R' }],
      });

      tracker.addCouncilToolEvent(
        {
          agentName: 'Researcher',
          toolCallId: 'tc-1',
          toolName: 'web_search',
          args: { query: 'test' },
        },
        false,
      );

      tracker.addCouncilToolEvent(
        {
          agentName: 'Researcher',
          toolCallId: 'tc-1',
          toolName: 'web_search',
          result: { results: [{ title: 'Result 1' }] },
        },
        true,
      );

      // Should have 3 parts: council-debate, tool-call, tool-result
      expect(tracker.uiParts).toHaveLength(3);
      const toolCall = tracker.uiParts[1] as Record<string, unknown>;
      expect(toolCall.type).toBe('tool-call');
      const toolResult = tracker.uiParts[2] as Record<string, unknown>;
      expect(toolResult.type).toBe('tool-result');
      expect(toolResult.state).toBe('output-available');
    });

    test('should set error state when result contains error', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [{ name: 'Researcher', icon: 'R' }],
      });

      tracker.addCouncilToolEvent(
        {
          agentName: 'Researcher',
          toolCallId: 'tc-1',
          toolName: 'web_search',
          args: { query: 'test' },
        },
        false,
      );

      tracker.addCouncilToolEvent(
        {
          agentName: 'Researcher',
          toolCallId: 'tc-1',
          toolName: 'web_search',
          result: { error: 'Search failed' },
        },
        true,
      );

      const toolResult = tracker.uiParts[1] as Record<string, unknown>;
      expect(toolResult.state).toBe('output-error');
    });

    test('should track tool calls per agent', () => {
      const tracker = createUITracker();

      tracker.addCouncilToUI({
        phase: 'start',
        agents: [{ name: 'Researcher', icon: 'R' }],
      });

      tracker.addCouncilToolEvent(
        {
          agentName: 'Researcher',
          toolCallId: 'tc-1',
          toolName: 'web_search',
          args: { query: 'test' },
        },
        false,
      );

      const council = tracker.uiParts[0] as Record<string, unknown>;
      const agents = council.agents as Array<Record<string, unknown>>;
      const toolCalls = agents[0].toolCalls as Array<Record<string, unknown>>;
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].toolCallId).toBe('tc-1');
      expect(toolCalls[0].status).toBe('calling');
    });
  });

  test.describe('addPartToUI', () => {
    test('should deduplicate tool parts by toolCallId', () => {
      const tracker = createUITracker();

      tracker.addPartToUI({
        type: 'tool-call',
        toolCallId: 'tc-1',
        toolName: 'web_search',
        args: { query: 'test' },
        state: 'input-available',
      } as MessagePart);

      tracker.addPartToUI({
        type: 'tool-call',
        toolCallId: 'tc-1',
        toolName: 'web_search',
        args: { query: 'test2' },
        state: 'input-available',
      } as MessagePart);

      expect(tracker.uiParts).toHaveLength(1);
    });

    test('should keep both tool-call and tool-result for same toolCallId', () => {
      const tracker = createUITracker();

      tracker.addPartToUI({
        type: 'tool-call',
        toolCallId: 'tc-1',
        toolName: 'web_search',
        args: { query: 'test' },
        state: 'input-available',
      } as MessagePart);

      tracker.addPartToUI({
        type: 'tool-result',
        toolCallId: 'tc-1',
        toolName: 'web_search',
        result: { results: [] },
        state: 'output-available',
      } as MessagePart);

      // Should keep both parts to preserve assistant(tool_calls) -> tool(tool_call_id) sequence
      expect(tracker.uiParts).toHaveLength(2);
      expect(tracker.uiParts[0].type).toBe('tool-call');
      expect(tracker.uiParts[1].type).toBe('tool-result');
    });
  });
});

test.describe('buildThinkingItems', () => {
  test('should extract reasoning items from message parts', () => {
    const message = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Test message',
      parts: [
        {
          type: 'reasoning' as const,
          reasoning: 'This is thinking',
        },
      ],
    } as Message;

    const orderedParts = [
      {
        type: 'reasoning' as const,
        items: ['This is thinking'] as ReasoningContentItem[],
      },
    ];

    const items = buildThinkingItems(message, orderedParts);
    expect(items.length).toBeGreaterThan(0);
  });

  test('should extract tool call items from message parts', () => {
    const message = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Test message',
      parts: [],
    } as Message;

    const orderedParts = [
      {
        type: 'part' as const,
        part: {
          type: 'tool-call' as const,
          toolCallId: 'tc-1',
          toolName: 'web_search',
          args: { query: 'test' },
          state: 'input-available' as const,
        },
      },
    ];

    const items = buildThinkingItems(message, orderedParts);
    const toolItems = items.filter((i) => i.type === 'tool-call');
    expect(toolItems.length).toBe(1);
    expect(toolItems[0].metadata?.toolName).toBe('web_search');
  });

  test('should handle empty parts', () => {
    const message = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Test message',
      parts: [],
    } as Message;

    const orderedParts: MergedMessagePart[] = [];

    const items = buildThinkingItems(message, orderedParts);
    expect(items).toHaveLength(0);
  });

  test('should deduplicate tool call IDs across sources', () => {
    const message = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Test message',
      parts: [
        {
          type: 'tool-call' as const,
          toolCallId: 'tc-1',
          toolName: 'web_search',
          args: { query: 'test' },
          state: 'input-available' as const,
        },
      ],
    } as unknown as Message;

    const orderedParts = [
      {
        type: 'part' as const,
        part: {
          type: 'tool-call' as const,
          toolCallId: 'tc-1',
          toolName: 'web_search',
          args: { query: 'test' },
          state: 'input-available' as const,
        },
      },
    ];

    const items = buildThinkingItems(message, orderedParts);
    const toolItems = items.filter((i) => i.type === 'tool-call');
    expect(toolItems.length).toBe(1);
  });
});
