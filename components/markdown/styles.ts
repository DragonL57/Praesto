/**
 * Centralized typography and styling configuration for markdown components
 */

export const headingStyles = {
    h1: 'text-base font-semibold mt-3 mb-2 break-words',
    h2: 'text-sm font-semibold mt-2 mb-2 break-words',
    h3: 'text-sm font-semibold mt-2 mb-2 break-words',
    h4: 'text-sm font-semibold mt-2 mb-2 break-words',
    h5: 'text-xs font-semibold mt-2 mb-2 break-words',
    h6: 'text-xs font-semibold mt-2 mb-1 break-words',
} as const;

export const textStyles = {
    paragraph: 'my-2 break-words text-sm',
    strong: 'font-semibold after:content-[\'\'] after:whitespace-pre',
    em: 'italic after:content-[\'\'] after:whitespace-pre',
    link: 'text-sm text-blue-700 dark:text-blue-400 hover:underline break-words overflow-wrap-anywhere',
    listItem: 'break-words text-sm leading-relaxed',
} as const;

export const listStyles = {
    ordered: 'list-decimal list-outside ml-6 my-2 space-y-1 text-sm [&>li]:pl-1',
    unordered: 'list-disc list-outside ml-6 my-2 space-y-1 text-sm [&_ul]:ml-4 [&_ol]:ml-4 [&_ul]:mt-1 [&_ol]:mt-1',
} as const;

export const blockStyles = {
    hr: 'my-8 border-0 border-t border-zinc-300 dark:border-zinc-700',
    blockquoteWrapper: 'my-4 px-4 py-2 border-l-4 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded-r-md',
    blockquote: 'text-zinc-700 dark:text-zinc-300',
} as const;

export const tableStyles = {
    wrapper: {
        width: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        overflowY: 'auto' as const,
        overflowX: 'auto' as const,
        display: 'block' as const,
        border: '1px solid var(--border)',
        WebkitOverflowScrolling: 'touch' as const,
        position: 'relative' as const,
    },
    table: {
        borderCollapse: 'collapse' as const,
        borderSpacing: 0,
        tableLayout: 'auto' as const, // Changed from 'fixed' to 'auto' to allow natural width
        width: 'auto' as const, // Allow table to be wider than container
        minWidth: 'max-content' as const, // Ensure table doesn't compress
    },
    thead: 'bg-zinc-200 dark:bg-zinc-700',
    theadStyle: { position: 'sticky' as const, top: 0, zIndex: 1 },
    tr: 'even:bg-zinc-100 dark:even:bg-zinc-800',
    th: 'px-4 py-2 text-center text-sm font-semibold border-x border-zinc-300 dark:border-zinc-700',
    thStyle: {
        maxWidth: '300px',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
        overflowWrap: 'anywhere' as const,
        padding: '8px 16px',
        boxShadow: 'inset 0 1px 0 0 hsl(var(--border)), inset 0 -1px 0 0 hsl(var(--border))',
    },
    td: 'px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700',
    tdStyle: {
        maxWidth: '300px',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
        overflowWrap: 'anywhere' as const,
        padding: '8px 16px',
    },
} as const;

export const citationStyles = {
    button: 'inline-flex items-center justify-center min-w-4 h-4 px-0 mx-0.5 text-[10px] font-light text-gray-700 bg-gray-200 rounded-[5px] hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 no-underline align-middle text-center',
    hoverCard: 'w-80 p-3 shadow-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg z-[60]',
    loading: 'text-sm text-gray-500 dark:text-gray-400',
    error: 'text-sm text-red-500',
    siteName: 'text-xs font-semibold text-gray-700 dark:text-gray-300 truncate',
    title: 'block text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight',
    description: 'block text-xs text-gray-500 dark:text-gray-400 max-h-20 overflow-hidden text-ellipsis',
    author: 'block text-xs text-gray-500 dark:text-gray-400',
    date: 'flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400',
} as const;

export const imageStyles = {
    wrapper: 'my-2 flex justify-center',
    container: 'relative max-w-full',
    button: 'cursor-pointer',
    image: 'rounded-md object-contain hover:opacity-90 transition-opacity',
} as const;
