// Markdown component exports
export { Markdown } from './markdown';

// Re-export types
export type {
    HastNodeWithProperties,
    Metadata,
    CustomMarkdownComponents,
    MarkdownProps,
} from './types';

// Re-export sub-components for advanced usage
export { createHeadingComponents, createHeadingComponent } from './headings';
export { CitationButton } from './citations';
export { createTableComponents, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from './tables';
export { createListComponents, OrderedList, UnorderedList, ListItem } from './lists';
export { createCodeComponents, Pre, Code } from './code';
export { createElementComponents, HorizontalRule, Strong, Emphasis, Anchor, Blockquote, Paragraph, MarkdownImage } from './elements';

// Re-export styles for customization
export * from './styles';
