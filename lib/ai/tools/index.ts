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
      activeToolNames: Object.keys(allTools) as ToolName[],
    };
  }

  const tools: Record<string, unknown> = {};
  const activeToolNames: ToolName[] = [];

  for (const name of toolNames) {
    const toolName = name as ToolName;
    if (allTools[toolName]) {
      tools[toolName] = allTools[toolName];
      activeToolNames.push(toolName);
    }
  }

  return {
    tools,
    activeToolNames,
  };
}
