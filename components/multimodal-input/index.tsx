'use client';

// Export the main MultimodalInput component as the default export
export { MultimodalInput } from './MultimodalInput';

// Also export named components and types for direct imports when needed
export { AttachmentsButton } from './AttachmentsButton';
export { SendButton } from './SendButton';
export { StopButton } from './StopButton';
export { ScrollButton } from './ScrollButton';
export { SpeechToTextButton } from './SpeechToTextButton';
export * from './types';
export * from './utils';

// Skeleton loader for input
export function InputSkeleton() {
  return (
    <div className="w-full mx-auto max-w-3xl px-4 my-2">
      <div className="flex flex-row gap-2 items-center w-full py-3 px-4 rounded-xl bg-muted animate-pulse">
        <div className="flex-1">
          <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
        </div>
        <div className="size-10 bg-gray-300 dark:bg-zinc-700 rounded-full ml-2" />
      </div>
    </div>
  );
}