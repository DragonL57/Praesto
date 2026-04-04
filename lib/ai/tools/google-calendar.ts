import { getGoogleCalendarClient } from '@/lib/services/google-calendar-api';

// Parameter interfaces for calendar tools
interface ListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  query?: string;
  singleEvents?: boolean;
  orderBy?: string;
}

interface CreateEventParams {
  calendarId?: string;
  summary?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  timeZone?: string;
  attendees?: string[];
  reminders?: Array<{ method?: string; minutes?: number }>;
  colorId?: string;
  recurrence?: string[];
  sendUpdates?: string;
}

interface UpdateEventParams extends CreateEventParams {
  eventId: string;
}

interface DeleteEventParams {
  calendarId?: string;
  eventId: string;
  sendUpdates?: string;
}

interface FindFreeTimeSlotsParams {
  calendarId?: string;
  timeMin: string;
  timeMax: string;
  duration: number;
  workingHoursOnly?: boolean;
  timeZone?: string;
}

interface GetEventParams {
  calendarId?: string;
  eventId: string;
}

// Parameters schema for creating/updating events
const calendarEventParameters = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Title/summary of the event' },
    description: {
      type: 'string',
      description: 'Detailed description of the event',
    },
    location: { type: 'string', description: 'Location of the event' },
    startDateTime: {
      type: 'string',
      description:
        'Start date and time in ISO 8601 format (e.g., "2024-03-20T10:00:00")',
    },
    endDateTime: {
      type: 'string',
      description:
        'End date and time in ISO 8601 format (e.g., "2024-03-20T11:00:00")',
    },
    timeZone: {
      type: 'string',
      default: 'America/New_York',
      description:
        'Time zone for the event (e.g., "America/New_York", "Europe/London")',
    },
    attendees: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of email addresses for attendees',
    },
    reminders: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['email', 'popup'] },
          minutes: {
            type: 'number',
            description: 'Minutes before the event to send the reminder',
          },
        },
      },
      description: 'Reminder notifications for the event',
    },
    colorId: { type: 'string', description: 'Color ID for the event (1-11)' },
    recurrence: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Recurrence rules in RRULE format (e.g., ["RRULE:FREQ=DAILY;COUNT=10"])',
    },
  },
};

// List events tool
export const listCalendarEvents = {
  description: 'List calendar events within a specified time range.',
  parameters: {
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        default: process.env.GOOGLE_CALENDAR_ID || 'primary',
        description: 'Calendar ID (default: primary calendar)',
      },
      timeMin: {
        type: 'string',
        description:
          'Start date/time in ISO 8601 format (e.g., "2024-03-20T00:00:00Z")',
      },
      timeMax: {
        type: 'string',
        description:
          'End date/time in ISO 8601 format (e.g., "2024-03-27T23:59:59Z")',
      },
      maxResults: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 10,
        description: 'Max events to return (1-100, default: 10)',
      },
      query: {
        type: 'string',
        description: 'Free text search to filter events',
      },
      singleEvents: {
        type: 'boolean',
        default: true,
        description: 'Expand recurring events into instances',
      },
      orderBy: {
        type: 'string',
        enum: ['startTime', 'updated'],
        default: 'startTime',
        description: 'Sort order',
      },
    },
    required: ['timeMin'],
  },
  execute: async ({
    calendarId = 'primary',
    timeMin,
    timeMax,
    maxResults = 10,
    query,
    singleEvents = true,
    orderBy = 'startTime',
  }: ListEventsParams) => {
    try {
      const calendar = await getGoogleCalendarClient();

      // Normalize date strings: ensure they have timezone info
      // Default to Asia/Ho_Chi_Minh (UTC+7) if no timezone specified
      const normalizeDate = (dateStr: string | undefined) => {
        if (!dateStr) return dateStr;
        if (
          dateStr.endsWith('Z') ||
          dateStr.endsWith('z') ||
          /\d[+-]\d{2}:\d{2}$/.test(dateStr)
        )
          return dateStr;
        return `${dateStr}+07:00`;
      };

      const response = await calendar.events.list({
        calendarId,
        timeMin: normalizeDate(timeMin),
        timeMax: normalizeDate(timeMax),
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
        attendees:
          event.attendees
            ?.map((a) => a?.email)
            .filter((e): e is string => typeof e === 'string') || [],
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
      console.error('[Google Calendar] Error in listCalendarEvents:', {
        error,
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        query,
        singleEvents,
        orderBy,
      });
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to list calendar events: ${errorMessage}`,
        events: [],
      };
    }
  },
};

// Create event tool
export const createCalendarEvent = {
  description: 'Create a new calendar event.',
  parameters: {
    ...calendarEventParameters,
    properties: {
      ...calendarEventParameters.properties,
      calendarId: {
        type: 'string',
        default: process.env.GOOGLE_CALENDAR_ID || 'primary',
        description: 'Calendar ID (default: primary calendar)',
      },
      sendUpdates: {
        type: 'string',
        enum: ['all', 'externalOnly', 'none'],
        default: 'none',
        description: 'Whether to send notifications to attendees',
      },
    },
    required: ['summary', 'startDateTime', 'endDateTime'],
  },
  execute: async ({
    calendarId = 'primary',
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
  }: CreateEventParams) => {
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
        attendees: attendees?.map((email: string) => ({ email })),
        reminders: reminders
          ? {
              useDefault: false,
              overrides: reminders,
            }
          : undefined,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to create calendar event: ${errorMessage}`,
      };
    }
  },
};

// Update event tool
export const updateCalendarEvent = {
  description:
    'Update an existing calendar event. Use this to modify event details, reschedule meetings, or update attendees.',
  parameters: {
    type: 'object',
    properties: {
      ...calendarEventParameters.properties,
      calendarId: {
        type: 'string',
        default: 'primary',
        description: 'Calendar ID (default: primary calendar)',
      },
      eventId: { type: 'string', description: 'ID of the event to update' },
      sendUpdates: {
        type: 'string',
        enum: ['all', 'externalOnly', 'none'],
        default: 'all',
        description: 'Whether to send notifications to attendees',
      },
    },
    required: ['eventId'],
  },
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
  }: UpdateEventParams) => {
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
        updateData.attendees = attendees.map((email: string) => ({ email }));
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to update calendar event: ${errorMessage}`,
      };
    }
  },
};

// Delete event tool
export const deleteCalendarEvent = {
  description:
    'Delete a calendar event. Use this to cancel meetings, remove appointments, or clear your schedule.',
  parameters: {
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        default: 'primary',
        description: 'Calendar ID (default: primary calendar)',
      },
      eventId: { type: 'string', description: 'ID of the event to delete' },
      sendUpdates: {
        type: 'string',
        enum: ['all', 'externalOnly', 'none'],
        default: 'all',
        description: 'Whether to send cancellation notifications to attendees',
      },
    },
    required: ['eventId'],
  },
  execute: async ({
    calendarId = 'primary',
    eventId,
    sendUpdates = 'all',
  }: DeleteEventParams) => {
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to delete calendar event: ${errorMessage}`,
      };
    }
  },
};

// Find free time slots tool
export const findFreeTimeSlots = {
  description:
    'Find available time slots in the calendar. Use this to help schedule meetings by finding when the user is free.',
  parameters: {
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        default: 'primary',
        description: 'Calendar ID (default: primary calendar)',
      },
      timeMin: {
        type: 'string',
        description: 'Start date/time to search from in ISO 8601 format',
      },
      timeMax: {
        type: 'string',
        description: 'End date/time to search until in ISO 8601 format',
      },
      duration: {
        type: 'number',
        description: 'Duration of the desired time slot in minutes',
      },
      workingHoursOnly: {
        type: 'boolean',
        default: true,
        description: 'Only consider working hours (9 AM - 5 PM)',
      },
      timeZone: {
        type: 'string',
        default: 'America/New_York',
        description: 'Time zone for the search',
      },
    },
    required: ['timeMin', 'timeMax', 'duration'],
  },
  execute: async ({
    calendarId = 'primary',
    timeMin,
    timeMax,
    duration,
    workingHoursOnly = true,
    timeZone = 'America/New_York',
  }: FindFreeTimeSlotsParams) => {
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
          const eventStart = new Date(
            event.start?.dateTime || event.start?.date || '',
          );
          const eventEnd = new Date(
            event.end?.dateTime || event.end?.date || '',
          );

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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to find free time slots: ${errorMessage}`,
        freeSlots: [],
      };
    }
  },
};

// Get event details tool
export const getCalendarEvent = {
  description: 'Get detailed information about a specific calendar event.',
  parameters: {
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        default: 'primary',
        description: 'Calendar ID (default: primary calendar)',
      },
      eventId: { type: 'string', description: 'ID of the event to retrieve' },
    },
    required: ['eventId'],
  },
  execute: async ({ calendarId = 'primary', eventId }: GetEventParams) => {
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
          attendees: event.attendees?.map((a) => ({
            email: a?.email ?? undefined,
            displayName: a?.displayName ?? undefined,
            responseStatus: a?.responseStatus ?? undefined,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get calendar event: ${errorMessage}`,
      };
    }
  },
};
