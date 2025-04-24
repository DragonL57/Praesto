import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import Script from 'next/script';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { PageTransition } from '@/components/ui/page-transition';

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
    canonical: 'https://unitaskai.vercel.app/',
  },
};

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

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

  if (!modelIdFromCookie) {
    return (
      <>
        <Script
          id="schema-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PageTransition>
          <Chat
            key={id}
            id={id}
            initialMessages={[]}
            selectedChatModel={DEFAULT_CHAT_MODEL}
            selectedVisibilityType="private"
            isReadonly={false}
          />
          <DataStreamHandler id={id} />
        </PageTransition>
      </>
    );
  }

  return (
    <>
      <Script
        id="schema-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageTransition>
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          selectedChatModel={modelIdFromCookie.value}
          selectedVisibilityType="private"
          isReadonly={false}
        />
        <DataStreamHandler id={id} />
      </PageTransition>
    </>
  );
}
