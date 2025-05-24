'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <NextAuthSessionProvider 
      session={session}
      basePath="/api/auth"
      refetchInterval={15 * 60} // Refresh session every 15 minutes (900 seconds)
      refetchOnWindowFocus={true} // Refresh when window regains focus
    >
      {children}
    </NextAuthSessionProvider>
  );
}