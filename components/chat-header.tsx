'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { useModelStorage } from '@/hooks/use-model-storage';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { memo, useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType } from './visibility-selector';
import { ShareDialog } from './share-dialog';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();
  // Use client-side only rendering for the buttons to avoid hydration issues
  const [mounted, setMounted] = useState(false);
  const { width: windowWidth } = useWindowSize();
  
  // Use local storage for the model to prevent unnecessary rerenders
  // The default value will be the prop, but changes will be managed through local storage
  const [localModelId] = useModelStorage('current-chat-model', selectedModelId);
  
  // Check if we're in a specific chat (not the root /chat page)
  const isInSavedChat = pathname && pathname.startsWith('/chat/') && pathname !== '/chat/new';

  // Only render dynamic content after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex sticky top-0 bg-background py-2.5 items-center px-3 md:px-3 gap-3">
      <SidebarToggle />

      {mounted ? (
        <>
          {(!open || windowWidth < 768) && (
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
              selectedModelId={localModelId} // Use localModelId instead of prop
              className="order-1 md:order-2"
            />
          )}

          {!isReadonly && isInSavedChat && (
            <ShareDialog
              chatId={chatId}
              selectedVisibilityType={selectedVisibilityType}
              className="order-1 md:order-3 md:ml-auto"
            />
          )}
        </>
      ) : (
        <div className="h-[40px] flex-1" />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (_prevProps, _nextProps) => {
  // Don't compare based on selectedModelId since we use localModelId internally
  // Just return true to prevent unnecessary re-renders on model change
  // Other props will still trigger re-renders as needed
  return true;
});