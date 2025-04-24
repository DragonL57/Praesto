import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import localFont from 'next/font/local';
import { AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';

import './globals.css';

// Define theme colors at the top level before using them
const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';

export const metadata: Metadata = {
  metadataBase: new URL('https://unitaskai.vercel.app'),
  title: {
    default: 'UniTaskAI - Your Intelligent AI Assistant',
    template: '%s | UniTaskAI'
  },
  description: 'UniTaskAI is a versatile AI assistant that helps you with chat, code, text generation, and more, providing intelligent responses to all your needs.',
  generator: 'Next.js',
  applicationName: 'UniTaskAI',
  referrer: 'origin-when-cross-origin',
  keywords: ['AI assistant', 'chat AI', 'coding assistant', 'text generation', 'AI tools', 'artificial intelligence'],
  authors: [
    { name: 'UniTaskAI Team' }
  ],
  creator: 'UniTaskAI',
  publisher: 'UniTaskAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://unitaskai.vercel.app',
    title: 'UniTaskAI - Your Intelligent AI Assistant',
    description: 'UniTaskAI is a versatile AI assistant that helps you with chat, code, text generation, and more, providing intelligent responses to all your needs.',
    siteName: 'UniTaskAI',
    images: [
      {
        url: 'https://unitaskai.vercel.app/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'UniTaskAI - Your Intelligent AI Assistant',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UniTaskAI - Your Intelligent AI Assistant',
    description: 'UniTaskAI is a versatile AI assistant that helps you with chat, code, text generation, and more.',
    images: ['https://unitaskai.vercel.app/twitter-image.png'],
    creator: '@unitaskai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  verification: {
    google: 'google-site-verification-code', // Replace with your actual verification code
    yandex: 'yandex-verification-code', // Replace with your actual verification code if needed
  },
  alternates: {
    canonical: 'https://unitaskai.vercel.app',
    languages: {
      'en-US': 'https://unitaskai.vercel.app/en-US',
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Removed maximumScale restriction to allow zooming for accessibility
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: LIGHT_THEME_COLOR },
    { media: '(prefers-color-scheme: dark)', color: DARK_THEME_COLOR },
  ],
};

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

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

const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${pfBeauSansPro.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased font-pf-beau">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
