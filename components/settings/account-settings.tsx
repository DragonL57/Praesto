'use client';

import { Plus, MoreHorizontal } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { SettingsSection, SettingsItem } from './settings-section';

export function AccountSettings() {
  const { data: session } = useSession();

  return (
    <SettingsSection
      title="Account"
      description="Manage your account settings and profile"
    >
      <SettingsItem
        label="Profile"
        action={
          <Button variant="outline" size="sm">
            Update
          </Button>
        }
      >
        <div className="flex items-center gap-3">
          <Image
            src={session?.user?.image || '/images/default-avatar.png'}
            alt={session?.user?.name || 'User Avatar'}
            width={48}
            height={48}
            className="rounded-full border border-zinc-200 dark:border-zinc-800"
          />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {session?.user?.email || 'No email'}
            </p>
          </div>
        </div>
      </SettingsItem>

      <SettingsItem
        label="Username"
        action={
          <Button variant="outline" size="sm">
            Update
          </Button>
        }
      >
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {session?.user?.email?.split('@')[0] || 'your_username'}
        </p>
      </SettingsItem>

      <SettingsItem
        label="Email Addresses"
        action={
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {session?.user?.email || 'No email provided'}
            </p>
            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
              Primary
            </span>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Plus className="size-4 mr-2" />
            Add email
          </Button>
        </div>
      </SettingsItem>

      <SettingsItem
        label="Connected Accounts"
        action={
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        }
      >
        {session?.user?.email ? (
          <div className="flex items-center gap-2">
            <svg
              className="size-5 fill-zinc-600 dark:fill-zinc-400"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.54,18.33 21.54,12.81C21.54,11.9 21.35,11.1 21.35,11.1Z" />
            </svg>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Google
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              • {session.user.email}
            </span>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No connected accounts
          </p>
        )}
      </SettingsItem>
    </SettingsSection>
  );
}
