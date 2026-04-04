'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-md opacity-0 ${className}`}
      >
        <Sun className="size-[18px]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`rounded-md size-8 md:size-10 ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="size-[16px] md:size-[18px]" />
      ) : (
        <Moon className="size-[16px] md:size-[18px]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
