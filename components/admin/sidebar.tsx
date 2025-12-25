'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Users,
  Settings,
  Shield,
  Home,
  MessageSquare,
  Database,
  AlertCircle,
  CreditCard,
  X,
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  current: boolean;
};

interface AdminSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  pathname: string;
}

export function AdminSidebar({
  sidebarOpen,
  setSidebarOpen,
  pathname,
}: AdminSidebarProps) {
  const [navigation, setNavigation] = useState<NavItem[]>([
    { name: 'Dashboard', href: '/admin', icon: Home, current: true },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
      current: false,
    },
    {
      name: 'Conversation Analytics',
      href: '/admin/conversations',
      icon: MessageSquare,
      current: false,
    },
    {
      name: 'Model Usage & Tokens',
      href: '/admin/tokens',
      icon: Database,
      current: false,
    },
    {
      name: 'System Settings',
      href: '/admin/settings',
      icon: Settings,
      current: false,
    },
    {
      name: 'Security & Access',
      href: '/admin/security',
      icon: Shield,
      current: false,
    },
    {
      name: 'Logs & Monitoring',
      href: '/admin/logs',
      icon: AlertCircle,
      current: false,
    },
    {
      name: 'Billing & Subscription',
      href: '/admin/billing',
      icon: CreditCard,
      current: false,
    },
  ]);

  // Update current navigation item based on pathname
  useEffect(() => {
    if (!pathname) return;

    setNavigation((nav) =>
      nav.map((item) => ({
        ...item,
        current:
          item.href === pathname ||
          (item.href === '/admin' && pathname === '/admin'),
      })),
    );
  }, [pathname]);

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-0 z-40 flex md:hidden',
          sidebarOpen ? 'block' : 'hidden',
        )}
      >
        {/* Background overlay */}
        <button
          type="button"
          className="fixed inset-0 bg-gray-600/75 transition-opacity"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
              setSidebarOpen(false);
            }
          }}
          aria-label="Close sidebar"
          tabIndex={0}
        />

        {/* Sidebar panel */}
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-background pt-5 pb-4">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex size-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="size-6 text-white" aria-hidden="true" />
            </button>
          </div>

          <div className="flex shrink-0 items-center px-4">
            <span className="text-foreground text-xl font-bold">
              Admin Dashboard
            </span>
          </div>
          <div className="mt-5 h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/50 hover:scrollbar-thumb-muted-foreground scrollbar-track-transparent">
            <nav className="space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    item.current
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                    'group flex items-center px-2 py-2 text-base font-medium rounded-md',
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={cn(
                      item.current
                        ? 'text-primary'
                        : 'text-foreground/70 group-hover:text-foreground',
                      'mr-4 h-5 w-5 flex-shrink-0',
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-border bg-card">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/50 hover:scrollbar-thumb-muted-foreground scrollbar-track-transparent">
            <div className="flex shrink-0 items-center px-4">
              <span className="text-foreground text-xl font-bold">
                Admin Dashboard
              </span>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    item.current
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                  )}
                >
                  <item.icon
                    className={cn(
                      item.current
                        ? 'text-primary'
                        : 'text-foreground/70 group-hover:text-foreground',
                      'mr-3 h-5 w-5 flex-shrink-0',
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
