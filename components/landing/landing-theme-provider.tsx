'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';

interface LandingThemeProviderProps {
  children: React.ReactNode;
  forcedTheme: 'light' | 'dark';
}

export function LandingThemeProvider({
  children,
  forcedTheme = 'dark', // Default to dark theme
}: LandingThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={forcedTheme}
      forcedTheme={forcedTheme}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
