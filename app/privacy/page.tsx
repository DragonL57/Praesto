import Navbar from '@/components/landing/navbar';
import Footer from '@/components/landing/footer';
import { LandingThemeProvider } from '@/components/landing/landing-theme-provider';
import Script from 'next/script';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - UniTaskAI',
  description:
    'Learn how UniTaskAI collects, uses, and protects your personal information when you use our intelligent AI assistant.',
  keywords: [
    'privacy policy',
    'data protection',
    'personal information',
    'data security',
    'privacy',
  ],
  openGraph: {
    title: 'Privacy Policy - UniTaskAI',
    description:
      'Learn how UniTaskAI collects, uses, and protects your personal information when you use our intelligent AI assistant.',
  },
  twitter: {
    title: 'Privacy Policy - UniTaskAI',
    description:
      'Learn how UniTaskAI collects, uses, and protects your personal information when you use our intelligent AI assistant.',
  },
};

export default function PrivacyPage() {
  return (
    <LandingThemeProvider forcedTheme="dark">
      <Script
        id="schema-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Privacy Policy',
            description: 'Privacy policy for UniTaskAI usage',
          }),
        }}
      />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container py-12 md:py-24">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <div className="prose dark:prose-invert max-w-none">
            <p>Last updated: April 25, 2025</p>
            <p>
              At UniTaskAI, we take your privacy seriously. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you use our UniTaskAI service.
            </p>
            <h2 className="text-2xl font-semibold mt-8 mb-4">
              1. Information We Collect
            </h2>
            <p>
              We collect information that you provide directly to us, such as
              when you create an account, use our chat features, or contact our
              support team. This may include:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li>Personal identifiers (name, email address)</li>
              <li>Account credentials</li>
              <li>Chat conversations and prompts</li>
              <li>Usage data and preferences</li>
            </ul>
            <h2 className="text-2xl font-semibold mt-8 mb-4">
              2. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and complete transactions</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Train and improve our AI models</li>
            </ul>
            <h2 className="text-2xl font-semibold mt-8 mb-4">
              3. Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect the security of your personal information. However, no
              method of transmission over the Internet or electronic storage is
              100% secure, and we cannot guarantee absolute security.
            </p>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </LandingThemeProvider>
  );
}
