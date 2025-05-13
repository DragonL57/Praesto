'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDownIcon,
} from '../icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Markdown } from '../markdown';
import { WebSearch } from '../web-search';

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

// Define the type for items within the content array
type ReasoningContentItem = string | { type: 'webSearch'; data: WebSearchData };

interface MessageReasoningProps {
  isLoading: boolean;
  content: ReasoningContentItem[];
}

export function MessageReasoning({
  isLoading,
  content,
}: MessageReasoningProps) {
  // Always expand during loading, auto-collapse immediately when phase 1 ends
  const [isOverallExpanded, setIsOverallExpanded] = useState(isLoading);
  const prevContentLengthRef = useRef(0);
  
  // Auto-collapse as soon as content stops growing (phase 1 ends and phase 2 begins)
  useEffect(() => {
    // Always expand when loading
    if (isLoading) {
      setIsOverallExpanded(true);
      prevContentLengthRef.current = content.length;
    } 
    // We're not loading anymore (phase 1 is complete), collapse immediately
    else if (!isLoading) {
      setIsOverallExpanded(false);
    }
  }, [isLoading, content.length]);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '0.5rem',
      marginBottom: '0.5rem',
    },
  };

  const hasContent = content && content.length > 0;

  // Determine the title for the main toggle button
  const toggleButtonTitle = () => {
    if (isLoading) return "Thinking...";
    // Count thoughts and searches for a more descriptive title
    const thoughtCount = content.filter(item => typeof item === 'string').length;
    const searchCount = content.filter(item => typeof item === 'object' && item.type === 'webSearch').length;
    
    const parts: string[] = [];
    if (thoughtCount > 0) parts.push(`${thoughtCount} Thought${thoughtCount > 1 ? 's' : ''}`);
    if (searchCount > 0) parts.push(`${searchCount} Search${searchCount > 1 ? 'es' : ''}`);
    if (parts.length === 0 && hasContent) return "Reasoning Steps";
    if (parts.length === 0 && !hasContent) return "";

    return parts.join(', ');
  };

  const currentToggleButtonTitle = toggleButtonTitle();

  // Custom loading animation for spinner
  const loadingCircleAnimation = isLoading ? "animate-pulse" : "";

  // Only render the component if there's something to show
  if (!isLoading && !hasContent) return null;

  return (
    <div className="flex flex-col mb-2">
      {/* Main toggle button - always visible when loading */} 
      { (isLoading || hasContent) && currentToggleButtonTitle && (
        <button
          type="button"
          data-testid="message-reasoning-header-toggle"
          className={`flex flex-row gap-2 items-center w-full cursor-pointer p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all duration-200 ${isLoading ? 'my-1' : 'my-0.5'} group`}
          onClick={() => {
            setIsOverallExpanded(!isOverallExpanded);
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center size-4">
              <div className={`size-2 bg-blue-500 rounded-full ${loadingCircleAnimation}`}></div>
            </div>
          ) : (
            <div className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${isOverallExpanded ? 'rotate-180' : ''} group-hover:text-blue-500 dark:group-hover:text-blue-400`}>
              <ChevronDownIcon />
            </div>
          )}
          <div className={`font-medium text-sm ${isLoading ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400'} group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors duration-200 grow text-left`}>
            {currentToggleButtonTitle}
          </div>
        </button>
      )}

      <AnimatePresence initial={false}>
        {/* Always show when loading, regardless of content */}
        {(isOverallExpanded && (isLoading || hasContent)) && (
          <motion.div
            data-testid="message-reasoning-content"
            key="reasoning-content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="relative pl-6 flex flex-col gap-1.5 py-0.5 text-sm text-zinc-500 dark:text-zinc-400"
          >
            <div className="absolute left-[10px] inset-y-0 w-px bg-zinc-300 dark:bg-zinc-700"></div>

            {/* Actual content items */}
            {content.map((item, index) => {
              const itemKey = `reasoning-item-${index}`;
              return (
                <motion.div 
                  key={itemKey} 
                  className="relative flex flex-col gap-0.5"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  {typeof item === 'string' ? (
                    <>
                      <div className="ml-0 prose-sm prose-zinc dark:prose-invert prose-p:my-0.5 prose-p:leading-tight prose-ul:my-0.5 prose-li:my-0 prose-li:leading-tight">
                        <Markdown key={`reasoning-text-${index}`}>{item}</Markdown>
                      </div>
                    </>
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
                  ) : null}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
