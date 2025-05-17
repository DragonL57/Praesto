'use client';

import React from 'react';
import { Button } from './ui/button'; // Assuming a shared Button component exists
import type { UseChatHelpers } from '@ai-sdk/react'; // For append type

interface SuggestionButtonProps {
  text: string;
  query: string;
  append: UseChatHelpers['append']; // Function to send a message
}

export const SuggestionButton: React.FC<SuggestionButtonProps> = ({ text, query, append }) => {
  const handleSuggestionClick = () => {
    // Append a new message with the suggestion query.
    // The new message will have the role 'user' by default with append.
    // We might need to construct a more complete message object if specific metadata is needed.
    append({
      role: 'user',
      content: query,
      // parts and other fields might be needed depending on UIMessage structure
    });
  };

  return (
    <Button
      variant="outline" // Or any other appropriate variant
      size="sm" // Or any other appropriate size
      className="m-1 text-md h-auto py-1 px-2" // Example styling
      onClick={handleSuggestionClick}
    >
      {text}
    </Button>
  );
}; 