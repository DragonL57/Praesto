import 'server-only';

import { auth } from '@/lib/auth-handler';
import { getUserById } from '@/lib/db/queries';

export async function validateSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const dbUser = await getUserById(session.user.id);
  if (!dbUser) {
    return null;
  }

  const jwtSessionVersion = (session.user as { sessionVersion?: number })
    .sessionVersion;

  // Legacy session compatibility: if JWT lacks sessionVersion, treat as version 1
  if (jwtSessionVersion === undefined) {
    if (dbUser.sessionVersion > 1) {
      return null; // Password was reset, legacy session is invalid
    }
    return session;
  }

  if (dbUser.sessionVersion !== jwtSessionVersion) {
    return null;
  }

  return session;
}
