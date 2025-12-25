import 'react-markdown';

// Define a more specific type for HAST nodes with properties
// This can be shared or moved to a more global types file if used elsewhere
interface HastNodeWithProperties {
    type: string;
    tagName?: string;
    properties?: {
        num?: string;
        url?: string;
        [key: string]: unknown;
    };
    children?: HastNodeWithProperties[];
    value?: string; // For text nodes
}

declare module 'react-markdown' {
    // Augment the existing Components interface to include 'citation-button'
    interface Components {
        'citation-button'?: React.FC<{
            node?: HastNodeWithProperties;
            [key: string]: unknown;
        }>;
    }
} 