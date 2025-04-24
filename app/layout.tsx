import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@vercel/analytics/react';
import type { Viewport, Metadata } from 'next';
import localFont from 'next/font/local';
import { AnimatePresence } from 'framer-motion';

import './globals.css';

// Define theme colors at the top level before using them
const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.unitaskai.com'),
  title: {
    default: 'UniTaskAI',
    template: '%s | UniTaskAI',
  },
  description:
    'Enhance your productivity with UniTaskAI, an intelligent assistant for chat, code generation, and more.',
  keywords: [
    'AI assistant',
    'productivity',
    'chat',
    'code generation',
    'AI tools',
  ],
  authors: [{ name: 'UniTaskAI Team' }],
  creator: 'UniTaskAI Team',
  publisher: 'UniTaskAI',
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'UniTaskAI',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'UniTaskAI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@unitaskai',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const pfBeauSansPro = localFont({
  src: [
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-LightItalic.ttf',
      weight: '300',
      style: 'italic',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-BoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-SemiBoldItalic.ttf',
      weight: '600',
      style: 'italic',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-Black.ttf',
      weight: '900',
      style: 'normal',
    },
    {
      path: '../public/fonts/PFBeauSansPro/FS PFBeauSansPro-BlackItalic.ttf',
      weight: '900',
      style: 'italic',
    },
  ],
  variable: '--font-pf-beau-sans-pro',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${pfBeauSansPro.variable}`}
    >
      <head />
      <body className="antialiased font-pf-beau">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <AnimatePresence mode="wait">{children}</AnimatePresence>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
