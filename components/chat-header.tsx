'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

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
  isAuthenticated = false,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isAuthenticated?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSidebar();
  // Use client-side only rendering for the buttons to avoid hydration issues
  const [mounted, setMounted] = useState(false);
  const { width: windowWidth } = useWindowSize();
  
  // Check if we're in a specific chat (not the root /chat page)
  const isInSavedChat = pathname && pathname.startsWith('/chat/') && pathname !== '/chat/new';
  // Check if this is a shared conversation view (user not authenticated and viewing a specific chat)
  const isSharedView = isInSavedChat && !isAuthenticated;

  // Only render dynamic content after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      {/* Only show sidebar toggle if authenticated */}
      {(!isSharedView) && <SidebarToggle />}

      {/* Centered UniTaskAI logo - only for shared conversation pages */}
      {isSharedView && (
        <div className="absolute inset-x-0 mx-auto w-full flex justify-center items-center pointer-events-none">
          <h1 className="font-bold text-lg">UniTaskAI</h1>
        </div>
      )}

      {mounted ? (
        <>
          {(!open || windowWidth < 768) && !isSharedView && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0 z-10"
                  onClick={() => {
                    router.push('/chat');
                    router.refresh();
                  }}
                  data-testid="new-chat-button"
                  type="button"
                >
                  <PlusIcon size={16} />
                  <span className="md:sr-only">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}

          {!isReadonly && (
            <ModelSelector
              selectedModelId={selectedModelId}
              className="order-1 md:order-2 z-10"
            />
          )}

          {!isReadonly && isInSavedChat && (
            <ShareDialog
              chatId={chatId}
              selectedVisibilityType={selectedVisibilityType}
              className="order-1 md:order-3 md:ml-auto z-10"
            />
          )}

          {/* Login and Signup buttons for shared views */}
          {isSharedView && (
            <div className="flex gap-2 ml-auto order-last z-10">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => router.push('/login')}
                className="text-sm"
              >
                Log in
              </Button>
              <Button 
                variant="default"
                size="sm"
                onClick={() => router.push('/register')}
                className="text-sm"
              >
                Sign up
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="h-[34px] flex-1" />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
