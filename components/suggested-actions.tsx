'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';

interface Suggestion {
  title: string;
  label: string;
  action: string;
}

interface SuggestedActionsProps {
  chatId: string;
  _messages: UIMessage[];
  suggestions?: Suggestion[];
  sendMessage: UseChatHelpers<UIMessage>['sendMessage'];
  isLoading?: boolean;
}

// Skeleton loader component
function SuggestionSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      className={cn(
        'rounded-lg border border-zinc-200 dark:border-zinc-800',
        'px-3 py-2.5 h-[68px]',
        index > 1 ? 'hidden sm:block' : 'block'
      )}
    >
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-full" />
      </div>
    </motion.div>
  );
}

// Default fallback suggestions (used on first load or if no suggestions provided)
const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    title: 'Explain the concept',
    label: 'of sustainable living',
    action:
      'Explain the concept of sustainable living and how individuals can implement it in their daily lives.',
  },
  {
    title: 'Compare and contrast',
    label: 'meditation and mindfulness',
    action:
      'Compare and contrast meditation and mindfulness practices. What are the benefits of each?',
  },
  {
    title: 'Give me a recipe',
    label: 'for an easy vegetarian dinner',
    action:
      'Give me a recipe for an easy and nutritious vegetarian dinner that can be prepared in under 30 minutes.',
  },
  {
    title: 'Write a short story',
    label: 'about a journey to the stars',
    action:
      'Write a short story about an unexpected journey to the stars and the discovery that changes everything.',
  },
];

function PureSuggestedActions({
  chatId,
  _messages,
  suggestions,
  sendMessage,
  isLoading = false,
}: SuggestedActionsProps) {
  // Show loading skeletons while suggestions are being generated
  if (isLoading) {
    return (
      <div
        data-testid="suggested-actions-loading"
        className="grid grid-cols-2 gap-2 w-full"
      >
        {[0, 1, 2, 3].map((index) => (
          <SuggestionSkeleton key={`skeleton-${index}`} index={index} />
        ))}
      </div>
    );
  }

  // Use provided suggestions or fallback to defaults
  const suggestedActions = suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;

  return (
    <div
      data-testid="suggested-actions"
      className="grid grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * index, duration: 0.2 }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);
              sendMessage({ text: suggestedAction.action });
            }}
            className={cn(
              'text-left border border-zinc-200 dark:border-zinc-800',
              'rounded-lg px-3 py-2.5',
              'text-sm text-zinc-700 dark:text-zinc-300',
              'w-full h-auto justify-start items-start',
              'hover:bg-zinc-50 dark:hover:bg-zinc-900',
              'transition-colors duration-200',
              'whitespace-normal break-words line-clamp-3'
            )}
          >
            {suggestedAction.title} {suggestedAction.label}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    return (
      prevProps.suggestions === nextProps.suggestions &&
      prevProps.isLoading === nextProps.isLoading
    );
  },
);
