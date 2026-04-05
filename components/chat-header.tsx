'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useWindowSize, useLocalStorage } from 'usehooks-ts';
import { useSidebar } from './ui/sidebar';
import { SidebarToggle } from '@/components/sidebar';
import { memo, useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { VisibilityType } from './visibility-selector';
import { ShareDialog } from '@/components/shared';
import { ModelSelector } from '@/components/model-selector';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/models';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

const PlusIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
      clipRule="evenodd"
    />
  </svg>
);

interface PureChatHeaderProps {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  councilMode?: boolean;
  onCouncilModeChange?: (enabled: boolean) => void;
}

function PureChatHeader({
  chatId,
  selectedModelId: initialSelectedModelId,
  selectedVisibilityType,
  isReadonly,
  councilMode,
  onCouncilModeChange,
}: PureChatHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const { width: windowWidth } = useWindowSize();

  const [globallySelectedModelId] = useLocalStorage(
    'chat-model',
    initialSelectedModelId || DEFAULT_CHAT_MODEL_ID,
  );

  const isInSavedChat =
    pathname?.startsWith('/chat/') && pathname !== '/chat/new';
  const isInNewChat = pathname === '/chat' || pathname === '/chat/new';

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex sticky top-0 bg-background py-1.5 md:py-2 items-center px-2 md:px-3 gap-1.5 md:gap-2 z-50 border-b">
      <SidebarToggle />

      {mounted ? (
        <>
          {(!open || windowWidth < 768) && !isInNewChat && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="size-8 md:h-10 md:w-auto p-0 md:px-3 ml-auto md:ml-0"
                  onClick={() => {
                    router.push('/chat');
                    router.refresh();
                  }}
                  data-testid="new-chat-button"
                  type="button"
                >
                  <PlusIcon size={18} />
                  <span className="hidden md:inline ml-2">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}

          {!isReadonly && (
            <ModelSelector
              selectedModelId={globallySelectedModelId}
              className="shrink-0"
            />
          )}

          {!isReadonly && onCouncilModeChange && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onCouncilModeChange(!councilMode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
                    councilMode
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-muted/50 text-muted-foreground border border-border hover:text-foreground'
                  }`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="hidden sm:inline">Council</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {councilMode
                  ? 'Council Mode ON: 4 agents debate before answering'
                  : 'Enable Council Mode for multi-agent debate'}
              </TooltipContent>
            </Tooltip>
          )}

          {!isReadonly &&
            (isInSavedChat ? (
              <ShareDialog
                chatId={chatId}
                selectedVisibilityType={selectedVisibilityType}
                className="md:ml-auto"
              />
            ) : (
              <div className="md:ml-auto">
                <ThemeToggle className="hidden md:flex h-10 px-3" />
              </div>
            ))}
        </>
      ) : (
        <div className="h-8 md:h-10 flex-1" />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
