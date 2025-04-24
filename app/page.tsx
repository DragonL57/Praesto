import Navbar from '@/components/landing/navbar';
import Hero from '@/components/landing/hero';
import Features from '@/components/landing/features';
import CTA from '@/components/landing/cta';
import Footer from '@/components/landing/footer';
import MouseMoveEffect from '@/components/mouse-move-effect';
import { LandingThemeProvider } from '@/components/landing/landing-theme-provider';
import Script from 'next/script';
import type { Metadata } from 'next';

// Define landing page specific metadata
export const metadata: Metadata = {
  title: 'UniTaskAI - Intelligent AI Assistant for Productivity',
  description:
    'UniTaskAI combines chat, code generation, web search, and text analysis in one powerful AI assistant. Boost your productivity instantly with our versatile AI solution.',
  keywords: [
    'AI assistant',
    'productivity tool',
    'code generation',
    'AI chat',
    'text analysis',
    'web search',
    'intelligent assistant',
  ],
  openGraph: {
    title: 'UniTaskAI - Intelligent AI Assistant for Productivity',
    description:
      'Enhance your productivity with AI-powered chat, code generation, text analysis, web search, and more.',
    images: [
      {
        url: 'https://www.unitaskai.com/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'UniTaskAI - Intelligent AI Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UniTaskAI - Intelligent AI Assistant for Productivity',
    description:
      'Enhance your productivity with AI-powered chat, code generation, text analysis, web search, and more.',
  },
};

export default function Home() {
  return (
    <LandingThemeProvider forcedTheme="dark">
      {/* JSON-LD structured data for better SEO */}
      <Script
        id="schema-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'UniTaskAI',
            applicationCategory: 'ProductivityApplication, AIApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            description:
              'AI-powered assistant that helps with coding, writing, research, and answering questions',
          }),
        }}
      />
      <div className="relative min-h-screen">
        <MouseMoveEffect />
        {/* Background gradients */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
          <div className="absolute right-0 top-0 h-[500px] w-[500px] bg-blue-500/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-purple-500/10 blur-[100px]" />
        </div>
        <div className="relative z-10">
          <Navbar />
          <Hero />
          <Features />
          <CTA />
          <Footer />
        </div>
      </div>
    </LandingThemeProvider>
  );
}
