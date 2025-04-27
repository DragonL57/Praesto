'use client';

import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { memo, useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import Link from 'next/link';

function PureSharedChatHeader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { width: _windowWidth } = useWindowSize();
  
  // Only render dynamic content after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      {mounted ? (
        <>
          {/* Left section with Start your own conversation button */}
          <div className="flex-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="md:px-2 px-2 md:h-fit"
                    onClick={() => {
                      router.push('/chat');
                      router.refresh();
                    }}
                    data-testid="new-chat-button"
                    type="button"
                  >
                    <PlusIcon size={16} />
                    <span className="md:hidden">Start your own</span>
                    <span className="hidden md:inline-block">Start your own conversation</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Start your own conversation</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Middle section with UniTaskAI and disclaimer */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <Link href="/" className="flex items-center font-bold">
              <span>UniTaskAI</span>
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">This is a shared conversation from an user on UniTaskAI</p>
          </div>
          
          {/* Right section with Login and Register buttons */}
          <div className="flex-1 flex justify-end gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Register
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <div className="h-[34px] flex-1" />
      )}
    </header>
  );
}

export const SharedChatHeader = memo(PureSharedChatHeader);