'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { ChatItem } from './sidebar-history-item';
import useSWRInfinite from 'swr/infinite';
import { LoaderIcon } from './icons';

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export interface ChatHistory {
  chats: Array<Chat>;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory,
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) return null;

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

// Animation variants for container and items
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { id } = useParams();

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
  });

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: 'DELETE',
    });

    toast.promise(deletePromise, {
      loading: 'Deleting chat...',
      success: () => {
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
            }));
          }
        });

        return 'Chat deleted successfully';
      },
      error: 'Failed to delete chat',
    });

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push('/');
    }
  };

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/75">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={
                    {
                      '--skeleton-width': `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          {paginatedChatHistories &&
            (() => {
              const chatsFromHistory = paginatedChatHistories.flatMap(
                (paginatedChatHistory) => paginatedChatHistory.chats,
              );

              const groupedChats = groupChatsByDate(chatsFromHistory);

              return (
                <>
                  {groupedChats.today.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-sidebar-foreground">
                        Today
                      </div>
                      <SidebarMenu>
                        <li className="p-0 m-0">
                          <motion.div 
                            className="flex w-full min-w-0 flex-col gap-1"
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                          >
                            {groupedChats.today.map((chat) => (
                              <motion.div 
                                key={chat.id}
                                variants={itemVariants}
                                className="chat-item-container"
                              >
                                <ChatItem
                                  chat={chat}
                                  isActive={chat.id === id}
                                  onDelete={(chatId) => {
                                    setDeleteId(chatId);
                                    setShowDeleteDialog(true);
                                  }}
                                  setOpenMobile={setOpenMobile}
                                />
                              </motion.div>
                            ))}
                          </motion.div>
                        </li>
                      </SidebarMenu>
                    </>
                  )}

                  {groupedChats.yesterday.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-sidebar-foreground">
                        Yesterday
                      </div>
                      <SidebarMenu>
                        <li className="p-0 m-0">
                          <motion.div 
                            className="flex w-full min-w-0 flex-col gap-1"
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                          >
                            {groupedChats.yesterday.map((chat) => (
                              <motion.div 
                                key={chat.id}
                                variants={itemVariants}
                                className="chat-item-container"
                              >
                                <ChatItem
                                  chat={chat}
                                  isActive={chat.id === id}
                                  onDelete={(chatId) => {
                                    setDeleteId(chatId);
                                    setShowDeleteDialog(true);
                                  }}
                                  setOpenMobile={setOpenMobile}
                                />
                              </motion.div>
                            ))}
                          </motion.div>
                        </li>
                      </SidebarMenu>
                    </>
                  )}

                  {groupedChats.lastWeek.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-sidebar-foreground">
                        Last 7 days
                      </div>
                      <SidebarMenu>
                        <li className="p-0 m-0">
                          <motion.div 
                            className="flex w-full min-w-0 flex-col gap-1"
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                          >
                            {groupedChats.lastWeek.map((chat) => (
                              <motion.div 
                                key={chat.id}
                                variants={itemVariants}
                                className="chat-item-container"
                              >
                                <ChatItem
                                  chat={chat}
                                  isActive={chat.id === id}
                                  onDelete={(chatId) => {
                                    setDeleteId(chatId);
                                    setShowDeleteDialog(true);
                                  }}
                                  setOpenMobile={setOpenMobile}
                                />
                              </motion.div>
                            ))}
                          </motion.div>
                        </li>
                      </SidebarMenu>
                    </>
                  )}

                  {groupedChats.lastMonth.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-sidebar-foreground">
                        Last 30 days
                      </div>
                      <SidebarMenu>
                        <li className="p-0 m-0">
                          <motion.div 
                            className="flex w-full min-w-0 flex-col gap-1"
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                          >
                            {groupedChats.lastMonth.map((chat) => (
                              <motion.div 
                                key={chat.id}
                                variants={itemVariants}
                                className="chat-item-container"
                              >
                                <ChatItem
                                  chat={chat}
                                  isActive={chat.id === id}
                                  onDelete={(chatId) => {
                                    setDeleteId(chatId);
                                    setShowDeleteDialog(true);
                                  }}
                                  setOpenMobile={setOpenMobile}
                                />
                              </motion.div>
                            ))}
                          </motion.div>
                        </li>
                      </SidebarMenu>
                    </>
                  )}

                  {groupedChats.older.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-sidebar-foreground">
                        Older than last month
                      </div>
                      <SidebarMenu>
                        <li className="p-0 m-0">
                          <motion.div 
                            className="flex w-full min-w-0 flex-col gap-1"
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                          >
                            {groupedChats.older.map((chat) => (
                              <motion.div 
                                key={chat.id}
                                variants={itemVariants}
                                className="chat-item-container"
                              >
                                <ChatItem
                                  chat={chat}
                                  isActive={chat.id === id}
                                  onDelete={(chatId) => {
                                    setDeleteId(chatId);
                                    setShowDeleteDialog(true);
                                  }}
                                  setOpenMobile={setOpenMobile}
                                />
                              </motion.div>
                            ))}
                          </motion.div>
                        </li>
                      </SidebarMenu>
                    </>
                  )}
                </>
              );
            })()}

          <motion.div
            onViewportEnter={() => {
              if (!isValidating && !hasReachedEnd) {
                setSize((size) => size + 1);
              }
            }}
          />

          {hasReachedEnd ? (
            <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2 mt-8">
              You have reached the end of your chat history.
            </div>
          ) : (
            <div className="p-2 text-zinc-500 dark:text-zinc-400 flex flex-row gap-2 items-center mt-8">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div>Loading Chats...</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
