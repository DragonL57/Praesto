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
      refetchInterval={0} // Disable automatic refetching to reduce session endpoint calls
      refetchOnWindowFocus={false} // Don't refetch when the window gains focus
    >
      {children}
    </NextAuthSessionProvider>
  );
}