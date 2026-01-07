'use client';

import { SearchIcon, FileTextIcon, BrainIcon, LoaderIcon } from 'lucide-react';
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from '@/components/ai-elements/chain-of-thought';
import { Markdown } from '../markdown';

// Define the structure for WebSearch data within the reasoning content
interface WebSearchResult {
  title: string;
  href: string;
  body: string;
}

interface WebSearchData {
  results: WebSearchResult[];
  query: string;
  count: number;
}

// Define data structure for Fetched Page Info (mirroring message.tsx)
interface FetchedPageInfoData {
  url: string;
  query?: string | null;
}

// Updated ReasoningContentItem type
type ReasoningContentItem =
  | string
  | { type: 'webSearch'; data: WebSearchData }
  | { type: 'fetchedPageInfo'; data: FetchedPageInfoData };

interface MessageReasoningProps {
  isLoading: boolean;
  content: ReasoningContentItem[];
  hasResponseStarted: boolean;
  overrideTitle?: string;
}

export function MessageReasoning({
  isLoading,
  content,
  hasResponseStarted = false,
  overrideTitle,
}: MessageReasoningProps) {
  const hasContent = content && content.length > 0;

  // Don't render if no content and not loading
  if (!overrideTitle && !isLoading && !hasContent && !hasResponseStarted) {
    return null;
  }

  // Determine if we should auto-open (during loading or if has content)
  const defaultOpen = isLoading && !hasResponseStarted;

  // Count different types of content
  const thoughtCount = content.filter((item) => typeof item === 'string').length;
  const toolCallCount = content.filter((item) => typeof item === 'object').length;

  // Generate header title
  const headerTitle = (() => {
    if (overrideTitle) return overrideTitle;
    if (isLoading && !hasResponseStarted) return 'Thinking...';
    
    const parts: string[] = [];
    if (thoughtCount > 0) parts.push(`${thoughtCount} Thought${thoughtCount > 1 ? 's' : ''}`);
    if (toolCallCount > 0) parts.push(`${toolCallCount} Tool Call${toolCallCount > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Chain of Thought';
  })();

  return (
    <ChainOfThought defaultOpen={defaultOpen}>
      <ChainOfThoughtHeader>{headerTitle}</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {content.map((item, index) => {
          // Reasoning text step
          if (typeof item === 'string') {
            return (
              <ChainOfThoughtStep
                key={`thought-${item.slice(0, 50)}-${index}`}
                icon={BrainIcon}
                label="Reasoning"
                status={isLoading && index === content.length - 1 ? 'active' : 'complete'}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{item}</Markdown>
                </div>
              </ChainOfThoughtStep>
            );
          }

          // Web search step
          if (item.type === 'webSearch') {
            return (
              <ChainOfThoughtStep
                key={`websearch-${item.data.query}-${index}`}
                icon={SearchIcon}
                label={`Searching for: ${item.data.query}`}
                description={`Found ${item.data.count} result${item.data.count !== 1 ? 's' : ''}`}
                status="complete"
              >
                <ChainOfThoughtSearchResults>
                  {item.data.results.map((result) => (
                    <a
                      key={result.href}
                      href={result.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ChainOfThoughtSearchResult>
                        {new URL(result.href).hostname}
                      </ChainOfThoughtSearchResult>
                    </a>
                  ))}
                </ChainOfThoughtSearchResults>
              </ChainOfThoughtStep>
            );
          }

          // Fetched page info step
          if (item.type === 'fetchedPageInfo') {
            return (
              <ChainOfThoughtStep
                key={`fetch-${item.data.url}`}
                icon={FileTextIcon}
                label="Fetched page content"
                description={item.data.url}
                status={isLoading ? 'active' : 'complete'}
              />
            );
          }

          return null;
        })}

        {/* Loading state when no content yet */}
        {content.length === 0 && isLoading && !hasResponseStarted && (
          <ChainOfThoughtStep
            icon={LoaderIcon}
            label="Processing..."
            status="active"
          />
        )}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
