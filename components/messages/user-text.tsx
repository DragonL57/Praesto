/**
 * User message text component with line break preservation
 */

import React from 'react';

interface UserTextWithLineBreaksProps {
  text: string;
}

/**
 * Preserves line breaks in user messages by splitting on newlines
 */
export const UserTextWithLineBreaks: React.FC<UserTextWithLineBreaksProps> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, i) => {
        // Create a unique key that doesn't rely solely on array index
        const lineKey = `${text.substring(0, 8)}-line-${i}-${line.substring(0, 8)}`;
        return (
          <span key={lineKey} className="block whitespace-pre-wrap">
            {line || ' '} {/* Replace empty lines with a space to maintain height */}
          </span>
        );
      })}
    </>
  );
};
