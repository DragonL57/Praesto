import type { ComponentProps } from 'react';

import { type SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Button } from '../ui/button';
import { LuPanelLeftClose, LuPanelLeftOpen } from 'react-icons/lu';

export function SidebarToggle({
  // Use destructuring to ignore the className prop without renaming it
  ..._props
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleSidebar}
          variant="outline"
          className="size-8 md:h-10 md:w-auto p-0 md:px-3"
          aria-label="Toggle Sidebar"
        >
          {open ? (
            <LuPanelLeftClose size={18} className="md:size-5" />
          ) : (
            <LuPanelLeftOpen size={18} className="md:size-5" />
          )}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start">Toggle Sidebar</TooltipContent>
    </Tooltip>
  );
}
