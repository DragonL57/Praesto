/**
 * Shared utility for building user time context.
 * Used by both chat and shared-chat components to avoid duplication.
 */
export interface UserTimeContext {
  date: string;
  time: string;
  dayOfWeek: string;
  timeZone: string;
}

export function buildUserTimeContext(): UserTimeContext {
  const now = new Date();
  return {
    date: now.toDateString(),
    time: now.toTimeString().split(' ')[0],
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
