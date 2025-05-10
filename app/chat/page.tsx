import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';

// Import lightweight synchronous components directly
import { PageTransition } from '@/components/ui/page-transition';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { Chat } from '@/components/chat';

// Simple loading fallback component
function ChatLoadingFallback() {
  return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" aria-hidden="true" />
      <span className="ml-2 text-lg text-muted-foreground">Loading chat interface...</span>
    </div>
  );
}

export const metadata: Metadata = {
  title: 'AI Chat Assistant | UniTaskAI',
  description:
    'Start a conversation with our advanced AI assistant. Get instant help with coding, writing, answering questions, and more.',
  openGraph: {
    title: 'AI Chat Assistant | UniTaskAI',
    description:
      'Engage with our AI assistant for instant help with coding, writing, and answering questions.',
  },
  alternates: {
    canonical: 'https://www.unitaskai.com/',
  },
};

// Extract JSON-LD to a separate component that loads after initial paint
const JsonLdScript = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'UniTaskAI Chat Assistant',
    applicationCategory: 'AIApplication',
    operatingSystem: 'Web',
    description:
      'An AI-powered assistant that helps with tasks such as coding, writing, and answering questions.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1024',
    },
  };

  return (
    <Script
      id="schema-jsonld"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');
  const selectedModel = modelIdFromCookie?.value || DEFAULT_CHAT_MODEL;

  return (
    <>
      <JsonLdScript />
      <PageTransition>
        <Suspense fallback={<ChatLoadingFallback />}>
          <Chat
            key={id}
            id={id}
            initialMessages={[]}
            selectedChatModel={selectedModel}
            selectedVisibilityType="private"
            isReadonly={false}
          />
          {/* DataStreamHandler will be rendered inside the Chat component */}
        </Suspense>
      </PageTransition>
    </>
  );
}
