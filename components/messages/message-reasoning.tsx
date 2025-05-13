'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
} from '../icons';
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
}

export function MessageReasoning({
  isLoading,
  content,
  hasResponseStarted = false, 
}: MessageReasoningProps) {
  // Always expand during loading, auto-collapse immediately when phase 1 ends
  const [isOverallExpanded, setIsOverallExpanded] = useState(isLoading && !hasResponseStarted);
  const [scrollableContentRef, animateScrollableContent] = useAnimate();
  
  // Force immediate collapse when phase 2 starts (hasResponseStarted becomes true)
  useEffect(() => {
    if (isLoading && !hasResponseStarted) {
      setIsOverallExpanded(true);
    } 
    // If we have any content from phase 2, collapse immediately
    else if (hasResponseStarted) {
      setIsOverallExpanded(false);
    }
  }, [isLoading, hasResponseStarted]);

  // Auto-scroll to bottom when new content is added and container is expanded
  useEffect(() => {
    if (isOverallExpanded && scrollableContentRef.current) {
      animateScrollableContent(
        scrollableContentRef.current,
        { scrollTop: scrollableContentRef.current.scrollHeight },
        { duration: 0.4, ease: 'easeInOut' }
      );
    }
  }, [content, isOverallExpanded, animateScrollableContent, scrollableContentRef]);

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

  // Determine the title for the main toggle button
  const toggleButtonTitle = () => {
    if (isLoading && !hasResponseStarted) return "Thinking...";
    // Count thoughts and searches for a more descriptive title
    const thoughtCount = content.filter(item => typeof item === 'string').length;
    const searchCount = content.filter(item => typeof item === 'object' && (item.type === 'webSearch' || item.type === 'fetchedPageInfo')).length;
    
    const parts: string[] = [];
    if (thoughtCount > 0) parts.push(`${thoughtCount} Thought${thoughtCount > 1 ? 's' : ''}`);
    if (searchCount > 0) parts.push(`${searchCount} Search${searchCount > 1 ? 'es' : ''}`);
    if (parts.length === 0 && hasContent) return "Reasoning Steps";
    if (parts.length === 0 && !hasContent) return "";

    return parts.join(', ');
  };

  const currentToggleButtonTitle = toggleButtonTitle();

  // Only render the component if there's something to show
  if (!isLoading && !hasContent && !hasResponseStarted) return null;

  return (
    <div className="flex flex-col mb-2">
      {/* Main toggle button - always visible when loading */} 
      { (isLoading || hasContent) && currentToggleButtonTitle && (
        <button
          type="button"
          data-testid="message-reasoning-header-toggle"
          className={`flex flex-row gap-2 items-center w-full cursor-pointer p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all duration-200 ${isLoading && !hasResponseStarted ? 'my-1' : 'my-0.5'} group`}
          onClick={() => {
            setIsOverallExpanded(!isOverallExpanded);
          }}
        >
          {isLoading && !hasResponseStarted ? (
            <div className="flex items-center justify-center size-4">
              <svg className="animate-spin size-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <div className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isOverallExpanded ? 'rotate-180' : ''} group-hover:text-blue-500 dark:group-hover:text-blue-400`}>
              <ChevronDownIcon />
            </div>
          )}
          <div className={`font-medium text-sm ${isLoading && !hasResponseStarted ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400'} group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors duration-200 grow text-left`}>
            {currentToggleButtonTitle}
          </div>
        </button>
      )}

      <AnimatePresence initial={false}>
        {(isOverallExpanded && (isLoading || hasContent)) && (
          <motion.div
            data-testid="message-reasoning-content"
            key="reasoning-content"
            ref={scrollableContentRef}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative flex flex-col py-0.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-full overflow-auto max-h-[30rem]"
          >
            <div className="relative pl-6 flex flex-col gap-1.5">
              <div className="absolute left-[10px] inset-y-0 w-px bg-zinc-300 dark:bg-zinc-700"></div>

              {content.map((item, index) => {
                const itemKey = `reasoning-item-${index}`;
                return (
                  <motion.div 
                    key={itemKey} 
                    className="relative flex flex-col gap-0.5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
                  >
                    {typeof item === 'string' ? (
                      <div className="ml-0 prose-sm prose-zinc dark:prose-invert prose-p:my-0.5 prose-p:leading-tight prose-ul:my-0.5 prose-li:my-0 prose-li:leading-tight">
                        <Markdown key={`reasoning-text-${index}`}>{item}</Markdown>
                      </div>
                    ) : item.type === 'webSearch' ? (
                      <>
                        <div className="ml-0">
                          <WebSearch
                            key={`reasoning-search-${index}`}
                            results={item.data.results}
                            query={item.data.query}
                            count={item.data.count}
                            inGroup={true}
                          />
                        </div>
                      </>
                    ) : item.type === 'fetchedPageInfo' ? (
                      <>
                        <div className="ml-0">
                          <WebsiteContent 
                            key={`fetched-page-${index}`}
                            url={item.data.url}
                            query={item.data.query}
                            content="" // WebsiteContent doesn't display full content string
                            status="success" // Hardcode status as it's just an info display here
                            inGroup={true}
                          />
                        </div>
                      </>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
