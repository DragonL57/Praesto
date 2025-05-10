'use server';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

type CacheOptions = {
    revalidate?: number;
    tags?: string[];
};

// Define cache tags as constants instead of exporting them as an object
const USER_CACHE_TAG = 'user';
const CHAT_CACHE_TAG = 'chat';
const MESSAGE_CACHE_TAG = 'message';
const DOCUMENT_CACHE_TAG = 'document';
const SUGGESTION_CACHE_TAG = 'suggestion';
const VOTE_CACHE_TAG = 'vote';

// Export individual tags as async functions to comply with 'use server' requirements
export async function getUserCacheTag(): Promise<string> {
    return USER_CACHE_TAG;
}

export async function getChatCacheTag(): Promise<string> {
    return CHAT_CACHE_TAG;
}

export async function getMessageCacheTag(): Promise<string> {
    return MESSAGE_CACHE_TAG;
}

export async function getDocumentCacheTag(): Promise<string> {
    return DOCUMENT_CACHE_TAG;
}

export async function getSuggestionCacheTag(): Promise<string> {
    return SUGGESTION_CACHE_TAG;
}

export async function getVoteCacheTag(): Promise<string> {
    return VOTE_CACHE_TAG;
}

/**
 * Creates a cached function with configurable options
 * @param fn The function to cache
 * @param options Cache configuration options
 * @returns Cached function
 */
export async function createCachedFunction<InputType extends unknown[], ReturnType>(
    fn: (...args: InputType) => Promise<ReturnType>,
    options: CacheOptions = {}
): Promise<(...args: InputType) => Promise<ReturnType>> {
    const { revalidate = 60, tags = [] } = options;

    return unstable_cache(
        async (...args: InputType) => {
            try {
                return await fn(...args);
            } catch (error) {
                console.error('Cache function error:', error);
                // Re-throw to ensure errors are properly handled
                throw error;
            }
        },
        // Dynamically create cache key based on function name and tags
        [`${fn.name}_cache`, ...tags],
        { revalidate }
    ) as (...args: InputType) => Promise<ReturnType>;
}

/**
 * Creates a React cached function that's deduplicated during a React render pass
 * Use for data that doesn't change within a request and can be reused
 */
export async function createReactCachedFunction<InputType extends unknown[], ReturnType>(
    fn: (...args: InputType) => ReturnType
): Promise<(...args: InputType) => ReturnType> {
    return cache(fn);
}

/**
 * Revalidate cached data for specific tags
 * @param tags Tags to revalidate
 */
export async function revalidateCache(tags: string[]): Promise<void> {
    try {
        const { revalidateTag } = await import('next/cache');
        await Promise.all(tags.map(tag => revalidateTag(tag)));
    } catch (error) {
        console.error('Failed to revalidate cache:', error);
    }
}