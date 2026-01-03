/**
 * Re-export from modular markdown components
 *
 * This file maintains backwards compatibility with existing imports.
 * The actual implementation is now in components/markdown/
 */
export { Markdown } from './markdown/index';
export type {
  MarkdownProps,
  CustomMarkdownComponents,
  HastNodeWithProperties,
  Metadata,
} from './markdown/index';

// Re-export sub-components for any direct usage
export {
  CitationButton,
  createHeadingComponents,
  createTableComponents,
  createListComponents,
  createCodeComponents,
  createElementComponents,
} from './markdown/index';
