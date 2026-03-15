import { getWeather } from './get-weather';
import { webSearch } from './web-search';
import { readWebsiteContent } from './read-website-content';
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  findFreeTimeSlots,
  getCalendarEvent,
} from './google-calendar';

export const allTools = {
  getWeather,
  webSearch,
  readWebsiteContent,
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  findFreeTimeSlots,
  getCalendarEvent,
};

export type ToolName = keyof typeof allTools;

export function getTools(toolNames?: ToolName[]) {
  if (!toolNames) {
    return {
      tools: allTools,
      experimental_activeTools: Object.keys(allTools) as ToolName[],
    };
  }

  const tools: Record<string, any> = {};
  const experimental_activeTools: ToolName[] = [];

  for (const name of toolNames) {
    if (allTools[name]) {
      tools[name] = allTools[name];
      experimental_activeTools.push(name);
    }
  }

  return {
    tools,
    experimental_activeTools,
  };
}
