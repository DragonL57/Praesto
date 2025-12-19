/**
 * Google Calendar Tools - Server Only
 * 
 * This file should only be imported in server actions/routes.
 * DO NOT import this in providers.ts or any file that's used by client components.
 */

export async function getCalendarTools() {
    const {
        listCalendarEvents,
        createCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        findFreeTimeSlots,
        getCalendarEvent,
    } = await import('./tools/google-calendar');

    return {
        experimental_activeTools: [
            'listCalendarEvents',
            'createCalendarEvent',
            'updateCalendarEvent',
            'deleteCalendarEvent',
            'findFreeTimeSlots',
            'getCalendarEvent',
        ] as const,
        tools: {
            listCalendarEvents,
            createCalendarEvent,
            updateCalendarEvent,
            deleteCalendarEvent,
            findFreeTimeSlots,
            getCalendarEvent,
        },
    };
}
