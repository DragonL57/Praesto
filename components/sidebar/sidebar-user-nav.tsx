'use client';
import { useState } from 'react';
import { ChevronUp, Settings, BookOpen, LogOut } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from '../toast';

export function SidebarUserNav({ user }: { user: User }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);

      // Show a toast for better UX
      toast({
        type: 'success',
        description: 'Signing out...',
      });

      // First try normal sign out
      try {
        await signOut({ callbackUrl: '/' });
      } catch (error) {
        console.error('Standard sign-out failed:', error);

        // Fallback: try to clear cookies and redirect manually
        window.location.href = '/';

        // Force reload after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        type: 'error',
        description: 'Could not sign out. Please try again.',
      });
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10">
                <Image
                  src={`https://avatar.vercel.sh/${user.email}`}
                  alt="Profile avatar"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="truncate">{user?.email}</span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              alignOffset={-8}
              className="w-64 min-w-64 md:w-64"
              sideOffset={0}
              style={{ marginLeft: '0', left: '0' }}
            >
              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="cursor-pointer flex items-center w-full"
                >
                  <Settings className="mr-2 size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/docs" className="cursor-pointer flex items-center">
                  <BookOpen className="mr-2 size-4" />
                  Documentation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <button
                  type="button"
                  className="w-full cursor-pointer flex items-center"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="mr-2 size-4" />
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[700px] md:max-w-[700px] p-0 border-none">
          <DialogTitle className="sr-only">Settings</DialogTitle>
          {/* <SettingsCard onClose={() => setIsSettingsOpen(false)} /> */}
        </DialogContent>
      </Dialog>
    </>
  );
}
