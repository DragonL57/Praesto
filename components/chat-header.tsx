'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { useSidebar } from './ui/sidebar';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { memo, useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType } from './visibility-selector';
import { ShareDialog } from './share-dialog';
import { PlusIcon } from './icons';
import { Button } from '@/components/ui/button';
// import { ModelSelector } from '@/components/model-selector'; // ModelSelector import removed

function PureChatHeader({
  chatId,
  // selectedModelId: initialSelectedModelId, // Prop removed
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  // selectedModelId: string; // Prop type removed
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const { width: windowWidth } = useWindowSize();
  
  // const [globallySelectedModelId] = useLocalStorage(
  //   'selected-chat-model-id',
  //   initialSelectedModelId
  // ); // Removed useLocalStorage for model ID

  const isInSavedChat = pathname && pathname.startsWith('/chat/') && pathname !== '/chat/new';

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
  return true;
});