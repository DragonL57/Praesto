'use client';

import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

// Calendar event interface
interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees?: string[];
  status?: string;
  htmlLink?: string;
  colorId?: string;
  creator?: string;
  organizer?: string;
}

// Calendar tool result types
interface ListEventsResult {
  success: boolean;
  message: string;
  events: CalendarEvent[];
}

interface CreateEventResult {
  success: boolean;
  message: string;
  event?: {
    id: string;
    summary: string;
    start: string;
    end: string;
    htmlLink?: string;
  };
}

interface UpdateEventResult {
  success: boolean;
  message: string;
  event?: {
    id: string;
    summary: string;
    start: string;
    end: string;
    htmlLink?: string;
  };
}

interface DeleteEventResult {
  success: boolean;
  message: string;
  deletedEvent?: {
    id: string;
    summary: string;
  };
}

interface FindFreeSlotsResult {
  success: boolean;
  message: string;
  freeSlots: Array<{
    start: string;
    end: string;
  }>;
  duration?: number;
  timeZone?: string;
}

interface GetEventResult {
  success: boolean;
  message: string;
  event?: CalendarEvent;
  error?: string;
}

type CalendarResult =
  | ListEventsResult
  | CreateEventResult
  | UpdateEventResult
  | DeleteEventResult
  | FindFreeSlotsResult
  | GetEventResult;

interface CalendarProps {
  result?: CalendarResult;
}

export function Calendar({ result }: CalendarProps) {
  if (!result) {
    return (
      <div className="w-full bg-muted rounded-lg p-3 sm:p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="size-4" />
          <div className="h-4 bg-muted-foreground/20 rounded w-24" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted-foreground/20 rounded w-full" />
          <div className="h-3 bg-muted-foreground/20 rounded w-2/3" />
        </div>
      </div>
    );
  }

  // Error state
  if (!result.success && 'error' in result) {
    return (
      <div className="w-full bg-destructive/10 border-destructive/20 border rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <CalendarIcon className="size-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm text-destructive">
              Calendar Error
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // List events result
  if ('events' in result) {
    const listResult = result as ListEventsResult;

    return (
      <div className="w-full bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-primary/5 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Calendar Events
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">
            {listResult.message}
          </p>
        </div>

        {listResult.events.length > 0 ? (
          <div className="divide-y divide-border">
            {listResult.events.map((event) => (
              <div
                key={event.id}
                className="p-2.5 sm:p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground mb-1.5 truncate">
                      {event.summary}
                    </h4>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3 shrink-0" />
                        <span className="break-all sm:truncate">
                          {format(new Date(event.start), 'MMM d, p')} -{' '}
                          {format(new Date(event.end), 'p')}
                        </span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="size-3 shrink-0" />
                          <span className="truncate">
                            {event.attendees.length} attendee
                            {event.attendees.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline shrink-0 sm:self-start"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 sm:p-6 text-center text-muted-foreground">
            <CalendarIcon className="size-6 sm:size-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No events found</p>
          </div>
        )}
      </div>
    );
  }

  // Create/Update event result
  if ('event' in result && result.event && 'message' in result) {
    const eventResult = result as CreateEventResult | UpdateEventResult;
    const isCreate = result.message.toLowerCase().includes('created');
    const event = eventResult.event;

    return (
      <div className="w-full bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-green-500/10 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-sm text-foreground">
              {isCreate ? 'Event Created' : 'Event Updated'}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">
            {result.message}
          </p>
        </div>

        <div className="p-2.5 sm:p-3">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground break-words">
              {event?.summary ?? ''}
            </h4>

            {event && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3 shrink-0 mt-0.5" />
                <span className="break-words">
                  {event.start && event.end
                    ? `${format(new Date(event.start), 'MMM d, p')} - ${format(new Date(event.end), 'p')}`
                    : ''}
                </span>
              </div>
            )}

            {event?.htmlLink && (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                View in Calendar
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Delete event result
  if ('deletedEvent' in result) {
    const deleteResult = result as DeleteEventResult;

    return (
      <div className="w-full bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-orange-500/10 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Trash2 className="size-4 text-orange-600 dark:text-orange-400" />
            <h3 className="font-semibold text-sm text-foreground">
              Event Deleted
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">
            {result.message}
          </p>
        </div>

        {deleteResult.deletedEvent && (
          <div className="p-2.5 sm:p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {deleteResult.deletedEvent.summary}
              </span>{' '}
              removed from calendar.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Find free slots result
  if ('freeSlots' in result) {
    const slotsResult = result as FindFreeSlotsResult;

    return (
      <div className="w-full bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-blue-500/10 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-foreground">
              Available Times
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">
            {result.message}
          </p>
        </div>

        {slotsResult.freeSlots.length > 0 ? (
          <div className="p-2.5 sm:p-3">
            <div className="space-y-2">
              {slotsResult.freeSlots.map((slot) => (
                <div
                  key={`${slot.start}-${slot.end}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 p-2 bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground break-words">
                      {format(new Date(slot.start), 'MMM d, p')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-3.5 sm:pl-0">
                    {format(new Date(slot.end), 'p')}
                  </span>
                </div>
              ))}
            </div>

            {slotsResult.duration && (
              <p className="text-xs text-muted-foreground mt-2">
                {slotsResult.duration}-min slots
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-6 text-center text-muted-foreground">
            <Clock className="size-6 sm:size-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No available slots</p>
          </div>
        )}
      </div>
    );
  }

  // Default/fallback
  return (
    <div className="w-full bg-card border border-border rounded-lg p-2.5 sm:p-3">
      <div className="flex items-center gap-2">
        <CalendarIcon className="size-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Calendar</h3>
      </div>
      <p className="text-xs text-muted-foreground mt-1 break-words">
        {'message' in result ? result.message : 'Calendar operation completed'}
      </p>
    </div>
  );
}
