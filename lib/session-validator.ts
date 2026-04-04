import 'server-only';

import { auth } from '@/lib/auth-handler';
import { getUserById } from '@/lib/db/queries';

export async function validateSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const dbUser = await getUserById(session.user.id);
  if (
    !dbUser ||
    dbUser.sessionVersion !==
      (session.user as { sessionVersion?: number }).sessionVersion
  ) {
    return null;
  }

  return session;
}
