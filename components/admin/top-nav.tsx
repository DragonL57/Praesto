'use client';

import Link from 'next/link';
import { Bell, Menu, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'next-auth/react';

interface AdminTopNavProps {
  setSidebarOpen: (open: boolean) => void;
}

export function AdminTopNav({ setSidebarOpen }: AdminTopNavProps) {
  return (
    <div className="sticky top-0 z-10 flex h-16 shrink-0 bg-background border-b border-border">
      <button
        type="button"
        className="border-r border-border px-4 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="size-6" aria-hidden="true" />
      </button>
      <div className="flex flex-1 justify-between px-4 md:px-6">
        <div className="flex flex-1">
          <div className="flex w-full items-center md:ml-0">
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <Input
                placeholder="Search..."
                className="pl-10 h-9 md:w-72 lg:w-96"
              />
            </div>
          </div>
        </div>
        <div className="ml-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-primary" />
          </Button>
          <ThemeToggle />
          <div className="ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="size-9 rounded-full"
                  size="icon"
                >
                  <Avatar className="size-8">
                    <AvatarImage src="/placeholder-user.jpg" alt="Admin User" />
                    <AvatarFallback>
                      <User className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Link
                    href="/admin/profile"
                    className="flex items-center w-full"
                  >
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/admin/settings"
                    className="flex items-center w-full"
                  >
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Sign out
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
