'use client';

import { useState } from 'react';
import { ArrowLeft, Palette, Database, User, Menu } from 'lucide-react';
import { FaMicrophone } from 'react-icons/fa';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SettingsNav, type SettingTab } from '@/components/settings/settings-nav';
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { SpeechSettings } from '@/components/settings/speech-settings';
import { DataSettings } from '@/components/settings/data-settings';
import { AccountSettings } from '@/components/settings/account-settings';

const NAV_ITEMS = [
  { icon: Palette, label: 'Appearance', tab: 'appearance' as const },
  { icon: FaMicrophone, label: 'Speech', tab: 'speech' as const },
  { icon: Database, label: 'Data', tab: 'data' as const },
  { icon: User, label: 'Account', tab: 'account' as const },
];

export default function SettingsPage() {
  const [currentTab, setCurrentTab] = useState<SettingTab>('appearance');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="mb-8">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <ArrowLeft className="size-4" />
              Back to Chat
            </Button>
          </Link>
        </div>
        <SettingsNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          items={NAV_ITEMS}
        />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-6">
              <SheetHeader>
                <SheetTitle className="text-left">Settings</SheetTitle>
              </SheetHeader>
              <div className="mt-8 mb-6">
                <Link href="/chat">
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <ArrowLeft className="size-4" />
                    Back to Chat
                  </Button>
                </Link>
              </div>
              <SettingsNav
                currentTab={currentTab}
                onTabChange={(tab) => {
                  setCurrentTab(tab);
                  setIsOpen(false);
                }}
                items={NAV_ITEMS}
              />
            </SheetContent>
          </Sheet>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Settings
          </h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-3xl mx-auto p-4 pt-20 lg:pt-6 lg:p-12">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="p-6 lg:p-8">
              {currentTab === 'appearance' && <AppearanceSettings />}
              {currentTab === 'speech' && <SpeechSettings />}
              {currentTab === 'data' && <DataSettings />}
              {currentTab === 'account' && <AccountSettings />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
