import Link from 'next/link';
import { memo, useState } from 'react';
import type { Chat } from '@/lib/db/schema';
import type { SWRInfiniteKeyedMutator } from 'swr/infinite';
import type { ChatHistory } from './sidebar-history';

import { SidebarMenuAction, SidebarMenuButton } from './ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilEditIcon,
  ShareIcon,
  TrashIcon,
} from './icons';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';

// Create a div version of SidebarMenuItem to avoid nested li elements
const SidebarMenuItemDiv = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-sidebar="menu-item"
    className={cn('group/menu-item relative', className)}
    {...props}
  >
    {children}
  </div>
);

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
  mutate,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
  mutate: SWRInfiniteKeyedMutator<ChatHistory[]>;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibility: chat.visibility,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [isSaving, setIsSaving] = useState(false);

  const handleRename = async () => {
    if (title.trim() === '') return;
    if (title.trim() === chat.title) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/chat/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: chat.id,
          title: title.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename chat');
      }

      // Update the UI immediately
      toast.success('Chat renamed successfully');

      // Update data cache to reflect the new title across the app
      await mutate(
        (data) => {
          if (!data) return data;

          return data.map((page) => ({
            ...page,
            chats: page.chats.map((c) =>
              c.id === chat.id ? { ...c, title: title.trim() } : c,
            ),
          }));
        },
        { populateCache: true, revalidate: false },
      );

      setIsEditing(false);
    } catch (error) {
      console.error('Error renaming chat:', error);
      toast.error('Failed to rename chat');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidebarMenuItemDiv>
      {isEditing ? (
        <div className="flex items-center gap-2 p-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm"
            disabled={isSaving}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSaving) {
                handleRename();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setTitle(chat.title);
              }
            }}
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              disabled={isSaving}
              onClick={() => {
                setIsEditing(false);
                setTitle(chat.title);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 px-2"
              onClick={handleRename}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className="py-3 h-auto"
            size="lg"
          >
            <Link
              href={`/chat/${chat.id}`}
              onClick={() => setOpenMobile(false)}
            >
              <span>{chat.title}</span>
            </Link>
          </SidebarMenuButton>

          <DropdownMenu modal={true}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuAction
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
                showOnHover={!isActive}
              >
                <MoreHorizontalIcon />
                <span className="sr-only">More</span>
              </SidebarMenuAction>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  setIsEditing(true);
                }}
              >
                <PencilEditIcon />
                <span>Rename</span>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <ShareIcon />
                  <span>Share</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      className="cursor-pointer flex-row justify-between"
                      onClick={() => {
                        setVisibilityType('private');
                      }}
                    >
                      <div className="flex flex-row gap-2 items-center">
                        <LockIcon size={12} />
                        <span>Private</span>
                      </div>
                      {visibilityType === 'private' ? (
                        <CheckCircleFillIcon />
                      ) : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer flex-row justify-between"
                      onClick={() => {
                        setVisibilityType('public');
                      }}
                    >
                      <div className="flex flex-row gap-2 items-center">
                        <GlobeIcon />
                        <span>Public</span>
                      </div>
                      {visibilityType === 'public' ? (
                        <CheckCircleFillIcon />
                      ) : null}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
                onSelect={() => onDelete(chat.id)}
              >
                <TrashIcon />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </SidebarMenuItemDiv>
  );
};

type ChatItemProps = {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
  mutate: SWRInfiniteKeyedMutator<ChatHistory[]>;
};

export const ChatItem = memo(
  PureChatItem,
  (prevProps: ChatItemProps, nextProps: ChatItemProps) => {
    // Only re-render if active state or title changes
    if (prevProps.isActive !== nextProps.isActive) return false;
    if (prevProps.chat.title !== nextProps.chat.title) return false;
    return true;
  },
);
