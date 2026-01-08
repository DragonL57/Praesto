'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SettingTab = 'appearance' | 'speech' | 'data' | 'account';

interface SettingsNavItemProps {
  icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  tab: SettingTab;
  isActive: boolean;
  onClick: (tab: SettingTab) => void;
}

export function SettingsNavItem({
  icon: Icon,
  label,
  tab,
  isActive,
  onClick,
}: SettingsNavItemProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(tab)}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-all',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
        isActive && 'bg-zinc-100 dark:bg-zinc-800 font-medium'
      )}
    >
      <Icon className={cn(
        'size-4 transition-colors',
        isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'
      )} />
      <span className={cn(
        'transition-colors',
        isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'
      )}>
        {label}
      </span>
    </button>
  );
}

interface SettingsNavProps {
  currentTab: SettingTab;
  onTabChange: (tab: SettingTab) => void;
  items: Array<{
    icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
    label: string;
    tab: SettingTab;
  }>;
}

export function SettingsNav({ currentTab, onTabChange, items }: SettingsNavProps) {
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <SettingsNavItem
          key={item.tab}
          icon={item.icon}
          label={item.label}
          tab={item.tab}
          isActive={currentTab === item.tab}
          onClick={onTabChange}
        />
      ))}
    </nav>
  );
}
