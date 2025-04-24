import Navbar from '@/components/landing/navbar';
import Footer from '@/components/landing/footer';
import { LandingThemeProvider } from '@/components/landing/landing-theme-provider';
import Script from 'next/script';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About UniTaskAI - Our Mission and Vision',
  description:
    'Learn about UniTaskAI, our mission to enhance productivity through AI technology, and our vision for the future of intelligent assistants.',
  keywords: [
    'UniTaskAI',
    'about us',
    'AI mission',
    'AI vision',
    'company information',
  ],
  openGraph: {
    title: 'About UniTaskAI - Our Mission and Vision',
    description:
      'Learn about UniTaskAI, our mission to enhance productivity through AI technology, and our vision for the future of intelligent assistants.',
  },
  twitter: {
    title: 'About UniTaskAI - Our Mission and Vision',
    description:
      'Learn about UniTaskAI, our mission to enhance productivity through AI technology, and our vision for the future of intelligent assistants.',
  },
};

export default function AboutPage() {
  return (
    <LandingThemeProvider forcedTheme="dark">
      {/* JSON-LD structured data */}
      <Script
        id="schema-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'UniTaskAI',
            url: 'https://www.unitaskai.com',
            description:
              'Providers of intelligent AI assistant technology for productivity enhancement',
          }),
        }}
      />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="grow container py-12 md:py-24">
          <h1 className="text-4xl font-bold mb-8">About UniTaskAI</h1>
          <div className="prose dark:prose-invert max-w-none">
            <p>
              Welcome to UniTaskAI, your intelligent AI assistant designed to
              boost productivity and streamline your workflows.
            </p>
            <p>
              Our mission is to provide a versatile and powerful AI tool that
              integrates seamlessly into your daily tasks, whether it&apos;s
              coding, writing, research, or complex problem-solving.
            </p>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Vision</h2>
            <p>
              We believe in the potential of artificial intelligence to augment
              human capabilities. UniTaskAI is built with the user in mind,
              focusing on providing accurate, relevant, and timely assistance
              across a wide range of domains.
            </p>
            {/* Add more content about the team, technology, etc. */}
          </div>
        </main>
        <Footer />
      </div>
    </LandingThemeProvider>
  );
}
