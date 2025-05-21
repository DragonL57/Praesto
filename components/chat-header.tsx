'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useWindowSize, useLocalStorage } from 'usehooks-ts';
import { useSidebar } from './ui/sidebar';
import { SidebarToggle } from '@/components/sidebar';
import { memo, useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType } from './visibility-selector';
import { ShareDialog } from '@/components/shared';
import { ModelSelector } from '@/components/model-selector';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/models';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

const PlusIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>;

interface PureChatHeaderProps {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}

function PureChatHeader({
  chatId,
  selectedModelId: initialSelectedModelId,
  selectedVisibilityType,
  isReadonly,
}: PureChatHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const { width: windowWidth } = useWindowSize();
  
  const [globallySelectedModelId] = useLocalStorage(
    'chat-model',
    initialSelectedModelId || DEFAULT_CHAT_MODEL_ID
  );

  const isInSavedChat = pathname && pathname.startsWith('/chat/') && pathname !== '/chat/new';
  const isInNewChat = pathname === '/chat' || pathname === '/chat/new';

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex sticky top-0 bg-background py-2.5 items-center px-3 md:px-3 gap-3">
      <SidebarToggle />

      {mounted ? (
        <>
          {(!open || windowWidth < 768) && !isInNewChat && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="order-2 md:order-1 md:px-3 px-3 h-11 md:h-11 ml-auto md:ml-0"
                  onClick={() => {
                    router.push('/chat');
                    router.refresh();
                  }}
                  data-testid="new-chat-button"
                  type="button"
                >
                  <PlusIcon size={20} />
                  <span className="md:sr-only">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}

          {!isReadonly && (
            <ModelSelector
              selectedModelId={globallySelectedModelId}
              className="order-1 md:order-2"
            />
          )}

          {!isReadonly && (
            isInSavedChat ? (
              <ShareDialog
                chatId={chatId}
                selectedVisibilityType={selectedVisibilityType}
                className="order-1 md:order-3 md:ml-auto"
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="order-1 md:order-3 md:ml-auto">
                    <ThemeToggle className="hidden md:flex md:px-3 md:h-11" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Switch theme</TooltipContent>
              </Tooltip>
            )
          )}
        </>
      ) : (
        <div className="h-[40px] flex-1" />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);