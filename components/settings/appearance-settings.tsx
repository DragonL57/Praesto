'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsSection, SettingsItem } from './settings-section';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SettingsSection
      title="Appearance"
      description="Customize the visual appearance of the application"
    >
      <SettingsItem
        label="Theme"
        description="Choose how the interface looks"
      >
        {!mounted ? (
          <div className="w-full max-w-48 h-10 rounded-md border border-input bg-background" />
        ) : (
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-full max-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="size-4" />
                  <span>Light</span>
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="size-4" />
                  <span>Dark</span>
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Laptop className="size-4" />
                  <span>System</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </SettingsItem>
    </SettingsSection>
  );
}
