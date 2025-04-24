import Navbar from '@/components/landing/navbar';
import Footer from '@/components/landing/footer';
import { LandingThemeProvider } from '@/components/landing/landing-theme-provider';
import Script from 'next/script';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - UniTaskAI',
  description:
    'Read the terms of service for using UniTaskAI, our intelligent AI assistant for productivity enhancement.',
  keywords: [
    'terms of service',
    'legal',
    'user agreement',
    'terms',
    'conditions',
  ],
  openGraph: {
    title: 'Terms of Service - UniTaskAI',
    description:
      'Read the terms of service for using UniTaskAI, our intelligent AI assistant for productivity enhancement.',
  },
};

export default function TermsPage() {
  return (
    <LandingThemeProvider forcedTheme="dark">
      <Script
        id="schema-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Terms of Service',
            description: 'Legal terms of service for UniTaskAI usage',
          }),
        }}
      />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="grow container py-12 md:py-24">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <div className="prose dark:prose-invert max-w-none">
            <p>Last updated: April 25, 2025</p>
            <p>
              Please read these Terms of Service (&quot;Terms&quot;, &quot;Terms
              of Service&quot;) carefully before using the UniTaskAI website and
              application (the &quot;Service&quot;) operated by UniTaskAI
              (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;).
            </p>
            <h2 className="text-2xl font-semibold mt-8 mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the Service, you agree to be bound by these
              Terms. If you disagree with any part of the terms, then you may
              not access the Service.
            </p>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Accounts</h2>
            <p>
              When you create an account with us, you must provide information
              that is accurate, complete, and current at all times. Failure to
              do so constitutes a breach of the Terms, which may result in
              immediate termination of your account on our Service.
            </p>
            {/* Add more sections as needed: Use of Service, Content, Intellectual Property, Termination, Limitation of Liability, Governing Law, Changes, Contact Us */}
            <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </LandingThemeProvider>
  );
}
