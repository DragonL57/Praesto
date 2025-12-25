// Define a more specific type for HAST nodes with properties
export interface HastNodeWithProperties {
    type: string;
    tagName?: string;
    properties?: {
        num?: string;
        url?: string;
        text?: string;
        query?: string;
        [key: string]: unknown;
    };
    children?: HastNodeWithProperties[];
    value?: string;
}

// Metadata interface for citations
export interface Metadata {
    title?: string | null;
    siteName?: string | null;
    description?: string | null;
    favicon?: string | null;
    image?: string | null;
    author?: string | null;
    publishedDate?: string | null;
    error?: string | null;
}

// Define our custom components type
import type { Components } from 'react-markdown';
import type { AppendFunction } from '@/lib/ai/types';

export interface CustomMarkdownComponents extends Components {
    'citation-button'?: React.FC<{
        node?: HastNodeWithProperties;
        [key: string]: unknown;
    }>;
    'suggestion-button'?: React.FC<{
        node?: HastNodeWithProperties;
        append?: AppendFunction;
        [key: string]: unknown;
    }>;
}

// Define custom props for the main Markdown component
export interface MarkdownProps {
    children: string;
    baseHeadingLevel?: number;
    append?: AppendFunction;
}
