import { tool } from 'ai';
import { z } from 'zod';
import { getGoogleCalendarClient } from '@/lib/google-calendar-api';

// Calendar event schema for creating/updating events
const calendarEventSchema = z.object({
    summary: z.string().describe('Title/summary of the event'),
    description: z.string().optional().describe('Detailed description of the event'),
    location: z.string().optional().describe('Location of the event'),
    startDateTime: z.string().describe('Start date and time in ISO 8601 format (e.g., "2024-03-20T10:00:00")'),
    endDateTime: z.string().describe('End date and time in ISO 8601 format (e.g., "2024-03-20T11:00:00")'),
    timeZone: z.string().default('America/New_York').describe('Time zone for the event (e.g., "America/New_York", "Europe/London")'),
    attendees: z.array(z.string()).optional().describe('Array of email addresses for attendees'),
    reminders: z.array(z.object({
        method: z.enum(['email', 'popup']),
        minutes: z.number().describe('Minutes before the event to send the reminder')
    })).optional().describe('Reminder notifications for the event'),
    colorId: z.string().optional().describe('Color ID for the event (1-11)'),
    recurrence: z.array(z.string()).optional().describe('Recurrence rules in RRULE format (e.g., ["RRULE:FREQ=DAILY;COUNT=10"])'),
});

// List events tool
export const listCalendarEvents = tool({
    description: 'List calendar events within a specified time range. Use this to check availability, view scheduled events, or search for specific meetings.',
    inputSchema: z.object({
        calendarId: z.string().default('primary').describe('Calendar ID (default: "primary" for the user\'s primary calendar)'),
        timeMin: z.string().describe('Start date/time in ISO 8601 format (e.g., "2024-03-20T00:00:00Z")'),
        timeMax: z.string().optional().describe('End date/time in ISO 8601 format (e.g., "2024-03-27T23:59:59Z")'),
        maxResults: z.number().min(1).max(100).default(10).describe('Maximum number of events to return (1-100, default: 10)'),
        query: z.string().optional().describe('Free text search query to filter events'),
        singleEvents: z.boolean().default(true).describe('Whether to expand recurring events into instances'),
        orderBy: z.enum(['startTime', 'updated']).default('startTime').describe('Order of events in the result'),
    }),
    execute: async ({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        query,
        singleEvents,
        orderBy
    }) => {
        try {
            const calendar = await getGoogleCalendarClient();

            const response = await calendar.events.list({
                calendarId,
                timeMin,
                timeMax,
                maxResults,
                q: query,
                singleEvents,
                orderBy,
            });

            const events = response.data.items || [];

            if (events.length === 0) {
                return {
                    success: true,
                    message: 'No events found in the specified time range.',
                    events: [],
                };
            }

            const formattedEvents = events.map((event) => ({
                id: event.id,
                summary: event.summary || 'No title',
                description: event.description,
                location: event.location,
                start: event.start?.dateTime || event.start?.date,
                end: event.end?.dateTime || event.end?.date,
                attendees: event.attendees?.map(a => a.email) || [],
                status: event.status,
                htmlLink: event.htmlLink,
                colorId: event.colorId,
                creator: event.creator?.email,
                organizer: event.organizer?.email,
            }));

            return {
                success: true,
                message: `Found ${events.length} event(s).`,
                events: formattedEvents,
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: `Failed to list calendar events: ${errorMessage}`,
                events: [],
            };
        }
    },
});

// Create event tool
export const createCalendarEvent = tool({
    description: 'Create a new calendar event. Use this to schedule meetings, appointments, reminders, or any time-blocked activities.',
    inputSchema: calendarEventSchema.extend({
        calendarId: z.string().default('primary').describe('Calendar ID (default: "primary" for the user\'s primary calendar)'),
        sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('none').describe('Whether to send notifications to attendees'),
    }),
    execute: async ({
        calendarId,
        summary,
        description,
        location,
        startDateTime,
        endDateTime,
        timeZone,
        attendees,
        reminders,
        colorId,
        recurrence,
        sendUpdates,
    }) => {
        try {
            const calendar = await getGoogleCalendarClient();

            const event = {
                summary,
                description,
                location,
                start: {
                    dateTime: startDateTime,
                    timeZone,
                },
                end: {
                    dateTime: endDateTime,
                    timeZone,
                },
                attendees: attendees?.map(email => ({ email })),
                reminders: reminders ? {
                    useDefault: false,
                    overrides: reminders,
                } : undefined,
                colorId,
                recurrence,
            };

            const response = await calendar.events.insert({
                calendarId,
                requestBody: event,
                sendUpdates,
            });

            return {
                success: true,
                message: `Event "${summary}" created successfully.`,
                event: {
                    id: response.data.id,
                    summary: response.data.summary,
                    start: response.data.start?.dateTime || response.data.start?.date,
                    end: response.data.end?.dateTime || response.data.end?.date,
                    htmlLink: response.data.htmlLink,
                },
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: `Failed to create calendar event: ${errorMessage}`,
            };
        }
    },
});

// Update event tool
export const updateCalendarEvent = tool({
    description: 'Update an existing calendar event. Use this to modify event details, reschedule meetings, or update attendees.',
    inputSchema: calendarEventSchema.extend({
        calendarId: z.string().default('primary').describe('Calendar ID (default: "primary" for the user\'s primary calendar)'),
        eventId: z.string().describe('ID of the event to update'),
        sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all').describe('Whether to send notifications to attendees'),
    }).partial().required({ eventId: true }),
    execute: async ({
        calendarId = 'primary',
        eventId,
        summary,
        description,
        location,
        startDateTime,
        endDateTime,
        timeZone = 'America/New_York',
        attendees,
        reminders,
        colorId,
        recurrence,
        sendUpdates = 'all',
    }) => {
        try {
            const calendar = await getGoogleCalendarClient();

            // First, get the existing event
            const existingEvent = await calendar.events.get({
                calendarId,
                eventId,
            });

            // Build the update object with only provided fields
            const updateData: Record<string, unknown> = {
                ...existingEvent.data,
            };

            if (summary !== undefined) updateData.summary = summary;
            if (description !== undefined) updateData.description = description;
            if (location !== undefined) updateData.location = location;

            if (startDateTime !== undefined) {
                updateData.start = {
                    dateTime: startDateTime,
                    timeZone,
                };
            }

            if (endDateTime !== undefined) {
                updateData.end = {
                    dateTime: endDateTime,
                    timeZone,
                };
            }

            if (attendees !== undefined) {
                updateData.attendees = attendees.map(email => ({ email }));
            }

            if (reminders !== undefined) {
                updateData.reminders = {
                    useDefault: false,
                    overrides: reminders,
                };
            }

            if (colorId !== undefined) updateData.colorId = colorId;
            if (recurrence !== undefined) updateData.recurrence = recurrence;

            const response = await calendar.events.update({
                calendarId,
                eventId,
                requestBody: updateData,
                sendUpdates,
            });

            return {
                success: true,
                message: `Event updated successfully.`,
                event: {
                    id: response.data.id,
                    summary: response.data.summary,
                    start: response.data.start?.dateTime || response.data.start?.date,
                    end: response.data.end?.dateTime || response.data.end?.date,
                    htmlLink: response.data.htmlLink,
                },
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: `Failed to update calendar event: ${errorMessage}`,
            };
        }
    },
});

// Delete event tool
export const deleteCalendarEvent = tool({
    description: 'Delete a calendar event. Use this to cancel meetings, remove appointments, or clear your schedule.',
    inputSchema: z.object({
        calendarId: z.string().default('primary').describe('Calendar ID (default: "primary" for the user\'s primary calendar)'),
        eventId: z.string().describe('ID of the event to delete'),
        sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all').describe('Whether to send cancellation notifications to attendees'),
    }),
    execute: async ({ calendarId, eventId, sendUpdates }) => {
        try {
            const calendar = await getGoogleCalendarClient();

            // Get event details before deletion for confirmation
            const event = await calendar.events.get({
                calendarId,
                eventId,
            });

            await calendar.events.delete({
                calendarId,
                eventId,
                sendUpdates,
            });

            return {
                success: true,
                message: `Event "${event.data.summary}" deleted successfully.`,
                deletedEvent: {
                    id: event.data.id,
                    summary: event.data.summary,
                },
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: `Failed to delete calendar event: ${errorMessage}`,
            };
        }
    },
});

// Find free time slots tool
export const findFreeTimeSlots = tool({
    description: 'Find available time slots in the calendar. Use this to help schedule meetings by finding when the user is free.',
    inputSchema: z.object({
        calendarId: z.string().default('primary').describe('Calendar ID (default: "primary" for the user\'s primary calendar)'),
        timeMin: z.string().describe('Start date/time to search from in ISO 8601 format'),
        timeMax: z.string().describe('End date/time to search until in ISO 8601 format'),
        duration: z.number().describe('Duration of the desired time slot in minutes'),
        workingHoursOnly: z.boolean().default(true).describe('Only consider working hours (9 AM - 5 PM)'),
        timeZone: z.string().default('America/New_York').describe('Time zone for the search'),
    }),
    execute: async ({
        calendarId,
        timeMin,
        timeMax,
        duration,
        workingHoursOnly,
        timeZone,
    }) => {
        try {
            const calendar = await getGoogleCalendarClient();

            // Get all events in the time range
            const response = await calendar.events.list({
                calendarId,
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items || [];
            const freeSlots: Array<{ start: string; end: string }> = [];

            const startTime = new Date(timeMin);
            const endTime = new Date(timeMax);

            // Helper to check if time is within working hours
            const isWorkingHours = (date: Date) => {
                if (!workingHoursOnly) return true;
                const hours = date.getHours();
                return hours >= 9 && hours < 17;
            };

            let currentTime = new Date(startTime);

            // Iterate through the time range
            while (currentTime < endTime) {
                const slotEnd = new Date(currentTime.getTime() + duration * 60000);

                if (slotEnd > endTime) break;

                // Check if this slot conflicts with any event
                const hasConflict = events.some((event) => {
                    const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
                    const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');

                    return (
                        (currentTime >= eventStart && currentTime < eventEnd) ||
                        (slotEnd > eventStart && slotEnd <= eventEnd) ||
                        (currentTime <= eventStart && slotEnd >= eventEnd)
                    );
                });

                if (!hasConflict && isWorkingHours(currentTime)) {
                    freeSlots.push({
                        start: currentTime.toISOString(),
                        end: slotEnd.toISOString(),
                    });
                }

                // Move to next 30-minute interval
                currentTime = new Date(currentTime.getTime() + 30 * 60000);
            }

            return {
                success: true,
                message: `Found ${freeSlots.length} available time slot(s).`,
                freeSlots: freeSlots.slice(0, 10), // Return max 10 slots
                duration,
                timeZone,
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: `Failed to find free time slots: ${errorMessage}`,
                freeSlots: [],
            };
        }
    },
});

// Get event details tool
export const getCalendarEvent = tool({
    description: 'Get detailed information about a specific calendar event.',
    inputSchema: z.object({
        calendarId: z.string().default('primary').describe('Calendar ID (default: "primary" for the user\'s primary calendar)'),
        eventId: z.string().describe('ID of the event to retrieve'),
    }),
    execute: async ({ calendarId, eventId }) => {
        try {
            const calendar = await getGoogleCalendarClient();

            const response = await calendar.events.get({
                calendarId,
                eventId,
            });

            const event = response.data;

            return {
                success: true,
                event: {
                    id: event.id,
                    summary: event.summary,
                    description: event.description,
                    location: event.location,
                    start: event.start?.dateTime || event.start?.date,
                    end: event.end?.dateTime || event.end?.date,
                    attendees: event.attendees?.map(a => ({
                        email: a.email,
                        displayName: a.displayName,
                        responseStatus: a.responseStatus,
                    })),
                    status: event.status,
                    htmlLink: event.htmlLink,
                    colorId: event.colorId,
                    creator: event.creator,
                    organizer: event.organizer,
                    recurrence: event.recurrence,
                    reminders: event.reminders,
                },
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: `Failed to get calendar event: ${errorMessage}`,
            };
        }
    },
});
