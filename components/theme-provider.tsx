"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes"
import type { ReactNode } from "react"

// Define the props interface using the types from next-themes
interface ThemeProviderProps extends Omit<NextThemesProviderProps, 'children'> {
  children: ReactNode
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
