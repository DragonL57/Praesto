// Export all sidebar components from this barrel file
export { AppSidebar } from './app-sidebar';
export { SidebarHistory, getChatHistoryPaginationKey } from './sidebar-history';
export { ChatItem } from './sidebar-history-item';
export { SidebarToggle } from './sidebar-toggle';
export { SidebarUserNav } from './sidebar-user-nav';

// Re-export any types that other components may need
export type { ChatHistory } from './sidebar-history';
