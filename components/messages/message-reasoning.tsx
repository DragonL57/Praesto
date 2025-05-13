'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDownIcon,
  LoaderIcon,
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
  const [isOverallExpanded, setIsOverallExpanded] = useState(false);
  const prevLoadingRef = useRef(isLoading);
  const prevContentLengthRef = useRef(content.length);
  
  // Auto-expand during loading, auto-collapse when done
  useEffect(() => {
    if (isLoading && !prevLoadingRef.current) {
      // Only auto-expand when loading starts
      setIsOverallExpanded(true);
    } else if (!isLoading && prevLoadingRef.current && content.length > 0) {
      // Only auto-collapse when loading completes
      setIsOverallExpanded(false);
    }
    
    // Update refs for next comparison
    prevLoadingRef.current = isLoading;
    prevContentLengthRef.current = content.length;
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

  return (
    <div className="flex flex-col mb-2">
      {/* Main toggle button */} 
      { (isLoading || hasContent) && currentToggleButtonTitle && (
        <button
          type="button"
          data-testid="message-reasoning-header-toggle"
          className="flex flex-row gap-2 items-center w-full cursor-pointer p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150 my-1"
          onClick={() => {
            setIsOverallExpanded(!isOverallExpanded);
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center size-4">
              <div className={`h-2 w-2 bg-blue-500 rounded-full ${loadingCircleAnimation}`}></div>
            </div>
          ) : (
            <ChevronDownIcon />
          )}
          <div className="font-medium text-sm text-zinc-600 dark:text-zinc-400 grow text-left">
            {currentToggleButtonTitle}
          </div>
        </button>
      )}

      <AnimatePresence initial={false}>
        {isOverallExpanded && hasContent && (
          <motion.div
            data-testid="message-reasoning-content"
            key="reasoning-content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="relative pl-6 flex flex-col gap-3 py-1 text-sm"
          >
            <div className="absolute left-[10px] inset-y-0 w-px bg-zinc-300 dark:bg-zinc-600"></div>

            {content.map((item, index) => {
              const itemKey = `reasoning-item-${index}`;
              return (
                <div key={itemKey} className="relative flex flex-col gap-1">
                  {typeof item === 'string' ? (
                    <>
                      <div className="ml-0 pt-1">
                        <Markdown key={`reasoning-text-${index}`}>{item}</Markdown>
                      </div>
                    </>
                  ) : item.type === 'webSearch' ? (
                    <>
                      <div className="ml-0 pt-1">
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
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
