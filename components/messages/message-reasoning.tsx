'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon } from '../icons';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import { Markdown } from '../markdown';
import { WebSearch } from '../web-search';
import { WebsiteContent } from '../website-content';

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
  iconType?: 'spinner' | 'tick' | 'chevron';
}

export function MessageReasoning({
  isLoading,
  content,
  hasResponseStarted = false,
  overrideTitle,
  iconType,
}: MessageReasoningProps) {
  const [isOverallExpanded, setIsOverallExpanded] = useState(
    overrideTitle ? true : isLoading && !hasResponseStarted,
  );
  const [scrollableContentRef, animateScrollableContent] = useAnimate();

  useEffect(() => {
    if (isLoading && !hasResponseStarted) {
      setIsOverallExpanded(true);
    } else if (hasResponseStarted) {
      setIsOverallExpanded(false);
    }
  }, [isLoading, hasResponseStarted]);

  useEffect(() => {
    if (isOverallExpanded && scrollableContentRef.current) {
      scrollableContentRef.current.scrollTop =
        scrollableContentRef.current.scrollHeight;
      animateScrollableContent(
        scrollableContentRef.current,
        { scrollTop: scrollableContentRef.current.scrollHeight },
        { duration: 0.3, ease: 'easeInOut' },
      );
      const timeoutId = setTimeout(() => {
        if (scrollableContentRef.current) {
          scrollableContentRef.current.scrollTop =
            scrollableContentRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [
    content,
    isOverallExpanded,
    animateScrollableContent,
    scrollableContentRef,
  ]);

  useEffect(() => {
    if (isOverallExpanded && scrollableContentRef.current) {
      const observerCallback = () => {
        if (scrollableContentRef.current) {
          scrollableContentRef.current.scrollTop =
            scrollableContentRef.current.scrollHeight;
        }
      };
      const observer = new MutationObserver(observerCallback);
      observer.observe(scrollableContentRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return () => observer.disconnect();
    }
  }, [isOverallExpanded, scrollableContentRef]);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
    },
  };

  const hasContent = content && content.length > 0;
  const currentIconType =
    iconType || (isLoading && !hasResponseStarted ? 'spinner' : 'chevron');

  const toggleButtonTitle = () => {
    if (overrideTitle) return overrideTitle;
    if (isLoading && !hasResponseStarted) return 'Thinking, wait a bit...';

    const thoughtCount = content.filter(
      (item) => typeof item === 'string',
    ).length;
    const toolCallCount = content.filter(
      (item) => typeof item === 'object',
    ).length;

    const parts: string[] = [];
    if (thoughtCount > 0)
      parts.push(`${thoughtCount} Thought${thoughtCount > 1 ? 's' : ''}`);
    if (toolCallCount > 0)
      parts.push(`${toolCallCount} Tool Call${toolCallCount > 1 ? 's' : ''}`);
    if (parts.length === 0 && hasContent) return 'Reasoning Steps';
    if (parts.length === 0 && !hasContent) return '';

    return parts.join(', ');
  };

  const currentToggleButtonTitle = toggleButtonTitle();

  if (!overrideTitle && !isLoading && !hasContent && !hasResponseStarted)
    return null;

  const toolIsLoading = isLoading && !hasResponseStarted;

  return (
    <div
      className="flex flex-col mb-2 prevent-layout-shift"
      style={{
        minHeight: overrideTitle ? '40px' : 'auto',
      }}
    >
      {(overrideTitle || isLoading || hasContent) &&
        currentToggleButtonTitle && (
          <button
            type="button"
            data-testid="message-reasoning-header-toggle"
            className={`flex flex-row gap-2 items-center w-full cursor-pointer py-1.5 pr-1.5 pl-[6px] rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all duration-200 ${currentIconType === 'spinner' ? 'my-1' : 'my-0.5'} group stable-height-container`}
            onClick={() => setIsOverallExpanded(!isOverallExpanded)}
          >
            {currentIconType === 'spinner' ? (
              <div className="flex items-center justify-center size-4">
                <svg
                  className="animate-spin size-4 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : currentIconType === 'tick' ? (
              <div className="flex items-center justify-center size-4 text-green-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : (
              <div
                className={`size-4 flex items-center justify-center text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isOverallExpanded ? 'rotate-180' : ''} group-hover:text-blue-500 dark:group-hover:text-blue-400`}
              >
                <ChevronDownIcon />
              </div>
            )}
            <div
              className={`font-medium text-sm ${currentIconType === 'spinner' ? 'text-blue-600 dark:text-blue-400' : currentIconType === 'tick' ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'} group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors duration-200 grow text-left min-w-0`}
            >
              {currentToggleButtonTitle}
            </div>
          </button>
        )}

      <AnimatePresence initial={false}>
        {isOverallExpanded && (overrideTitle || isLoading || hasContent) && (
          <motion.div
            key="reasoning-content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border border-zinc-300 dark:border-zinc-700 rounded-md w-full"
            data-testid="message-reasoning-content-area-outer"
          >
            <div
              ref={scrollableContentRef}
              className="p-3 text-sm"
              data-testid="message-reasoning-content-area-inner"
            >
              {content.map((item, index) => {
                const itemKey = `reasoning-item-${typeof item === 'string' ? index : item.type || index}`;
                if (typeof item === 'string') {
                  return (
                    <motion.div
                      key={itemKey}
                      className="relative flex flex-col gap-0.5 my-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.05,
                        ease: 'easeOut',
                      }}
                    >
                      <div className="ml-0 prose-sm prose-zinc dark:prose-invert prose-p:my-0.5 prose-p:leading-tight prose-ul:my-0.5 prose-li:my-0 prose-li:leading-tight">
                        <Markdown key={itemKey}>{item}</Markdown>
                      </div>
                    </motion.div>
                  );
                } else if (item.type === 'webSearch') {
                  return (
                    <motion.div
                      key={itemKey}
                      className="my-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.05,
                        ease: 'easeOut',
                      }}
                    >
                      <WebSearch {...item.data} />
                    </motion.div>
                  );
                } else if (item.type === 'fetchedPageInfo') {
                  return (
                    <motion.div
                      key={itemKey}
                      className="my-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.05,
                        ease: 'easeOut',
                      }}
                    >
                      <WebsiteContent
                        url={item.data.url}
                        query={item.data.query}
                        status={toolIsLoading ? 'loading' : 'success'}
                        error={undefined}
                      />
                    </motion.div>
                  );
                }
                return null;
              })}
              {content.length === 0 && isLoading && !hasResponseStarted && (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-3">
                  Processing...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
