'use client';

import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

interface SettingsItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function SettingsItem({
  label,
  description,
  children,
  action,
}: SettingsItemProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between py-4 border-b border-zinc-200 dark:border-zinc-800 last:border-0 min-w-0">
      <div className="space-y-1 flex-1 min-w-0 max-w-full">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {label}
          </h3>
          {action && <div className="sm:hidden">{action}</div>}
        </div>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
        <div className="pt-2 max-w-full overflow-hidden">
          {children}
        </div>
      </div>
      {action && <div className="hidden sm:block shrink-0">{action}</div>}
    </div>
  );
}
