import type { ComponentProps } from 'react';

import { type SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Button } from './ui/button';
import { LuPanelLeftClose, LuPanelLeftOpen} from 'react-icons/lu';

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
          className="md:px-2 md:h-fit"
          aria-label="Toggle Sidebar"
        >
          {open ? <LuPanelLeftClose size={16} /> : <LuPanelLeftOpen size={16} />}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start">Toggle Sidebar</TooltipContent>
    </Tooltip>
  );
}
