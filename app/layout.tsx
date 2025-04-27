import type React from "react"
import "@/app/globals.css"
import "katex/dist/katex.min.css" // Add KaTeX CSS for math rendering
import { Inter } from "next/font/google"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { JsonLd } from "@/components/json-ld"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL("https://www.unitaskai.com"),
  title: {
    default: "UniTaskAI - AI-Powered Workspace for Enhanced Productivity",
    template: "%s | UniTaskAI"
  },
  description: "Transform your workflow with UniTaskAI - the all-in-one AI platform for content creation, code generation, data analysis, and task automation. Try it for free today.",
  keywords: ["AI workspace", "productivity tool", "AI assistant", "content generation", "code assistant", "data analysis", "workflow automation", "AI chat"],
  authors: [{ name: "UniTaskAI Team" }],
  creator: "UniTaskAI",
  publisher: "UniTaskAI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
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
        url: "https://www.unitaskai.com/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "UniTaskAI workspace preview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "UniTaskAI - AI-Powered Workspace",
    description: "Your complete AI assistant for content, code, data, and more",
    images: ["https://www.unitaskai.com/images/twitter-image.png"],
    creator: "@unitaskai",
  },
  verification: {
    google: "your-google-verification-code", // Replace with actual code when available
  },
  category: "productivity",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "UniTaskAI",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "description": "AI-powered workspace for content creation, code generation, data analysis, and task automation."
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
