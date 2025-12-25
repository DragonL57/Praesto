'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { UIMessage } from 'ai';

interface SuggestedActionsProps {
  chatId: string;
  // AI SDK 5.x: append was renamed to sendMessage
  sendMessage: UseChatHelpers<UIMessage>['sendMessage'];
}

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Explain the concept',
      label: 'of sustainable living',
      action:
        'Explain the concept of sustainable living and how individuals can implement it in their daily lives.',
    },
    {
      title: 'Compare and contrast',
      label: `meditation and mindfulness`,
      action: `Compare and contrast meditation and mindfulness practices. What are the benefits of each?`,
    },
    {
      title: 'Give me a recipe',
      label: `for an easy vegetarian dinner`,
      action: `Give me a recipe for an easy and nutritious vegetarian dinner that can be prepared in under 30 minutes.`,
    },
    {
      title: 'Write a short story',
      label: 'about a journey to the stars',
      action:
        'Write a short story about an unexpected journey to the stars and the discovery that changes everything.',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              // AI SDK 5.x: sendMessage accepts text directly
              sendMessage({ text: suggestedAction.action });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
