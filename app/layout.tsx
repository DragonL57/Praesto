import type React from "react"
import "@/app/globals.css"
import "katex/dist/katex.min.css" // Add KaTeX CSS for math rendering
import "@/public/katex-override.css" // Import KaTeX override CSS
import "@/public/virtual-keyboard.css" // Import virtual keyboard CSS handling
// Removing Inter font import
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { JsonLd } from "@/components/json-ld"
import { Toaster } from 'sonner'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { SessionProvider } from '@/components/auth-session-provider'
import { auth } from "@/app/auth"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
}

export const metadata: Metadata = {
  metadataBase: new URL("https://www.unitaskai.com"),
  title: {
    default: "UniTaskAI - AI-Powered Workspace for Enhanced Productivity",
    template: "%s | UniTaskAI"
  },
  description: "Transform your workflow with UniTaskAI - the all-in-one AI platform for content creation, code generation, data analysis, and task automation. Try it for free today.",
  keywords: ["AI workspace", "productivity tool", "AI assistant", "content generation", "code assistant", "data analysis", "workflow automation", "AI chat", "document analysis", "file processing", "multimodal AI", "AI document processing"],
  authors: [{ name: "UniTaskAI Team" }],
  creator: "UniTaskAI",
  publisher: "UniTaskAI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://www.unitaskai.com",
    languages: {
      'en-US': "https://www.unitaskai.com",
    },
  },
  icons: {
    icon: [
      { url: "/UniTaskAI_logo.png" }
    ],
    shortcut: ["/UniTaskAI_logo.png"],
    apple: [
      { url: "/UniTaskAI_logo.png" }
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/UniTaskAI_logo.png",
      }
    ]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.unitaskai.com",
    title: "UniTaskAI - AI-Powered Workspace for Enhanced Productivity",
    description: "Transform your workflow with UniTaskAI - the all-in-one AI platform for content creation, code generation, data analysis, and task automation.",
    siteName: "UniTaskAI",
    images: [
      {
        url: "/UniTaskAI_logo.png",
        width: 800,
        height: 800,
        alt: "UniTaskAI Logo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "UniTaskAI - AI-Powered Workspace",
    description: "Your complete AI assistant for content, code, data, and more",
    images: ["/UniTaskAI_logo.png"],
    creator: "@unitaskai",
    site: "@unitaskai",
  },
  verification: {
    google: "your-google-verification-code", // Replace with actual code when available
    yandex: "yandex-verification-code", // Optional: Add when available
    other: {
      "msvalidate.01": "bing-verification-code", // For Bing Webmaster Tools verification
    },
  },
  applicationName: "UniTaskAI",
  appLinks: {
    web: {
      url: "https://www.unitaskai.com",
    },
  },
  category: "productivity",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isProd = process.env.NODE_ENV === 'production'
  // Get the session from the server
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress KaTeX warnings for Vietnamese characters
              const originalConsoleWarn = console.warn;
              console.warn = function() {
                const args = Array.from(arguments);
                if (args[0] && typeof args[0] === 'string') {
                  if (args[0].includes('No character metrics for') || 
                      args[0].includes('LaTeX-incompatible input') ||
                      args[0].includes('Unrecognized Unicode character')) {
                    return; // Suppress these specific warnings
                  }
                }
                return originalConsoleWarn.apply(console, args);
              };
            `,
          }}
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      </head>
      <body className="flex min-h-screen flex-col overscroll-none bg-background font-sans text-foreground selection:bg-slate-200 dark:selection:bg-slate-700 antialiased">
        <SessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <JsonLd
              data={{
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                'name': 'UniTaskAI',
                'description': 'AI-powered workspace for content creation, code generation, data analysis, and task automation.',
                'url': 'https://www.unitaskai.com',
                'applicationCategory': 'ProductivityApplication',
                'operatingSystem': 'All',
                'offers': {
                  '@type': 'Offer',
                  'price': '0',
                  'priceCurrency': 'USD'
                },
                'featureList': 'AI Chat, Document Analysis, Code Generation, Data Analysis, Multimodal Input',
                'browserRequirements': 'Requires JavaScript. Requires HTML5.',
                'softwareVersion': '1.0',
                'author': {
                  '@type': 'Organization',
                  'name': 'UniTaskAI'
                }
              }}
            />
            <Toaster richColors closeButton={false} position="top-center" />
            <main className="flex flex-1 flex-col">
              {children}
            </main>
            {isProd && <SpeedInsights />}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
