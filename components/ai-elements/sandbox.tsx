"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Sandbox = CollapsiblePrimitive.Root;

const SandboxHeader = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> & {
    state?: string;
    title?: string;
  }
>(({ className, children, state, title, ...props }, ref) => (
  <CollapsiblePrimitive.Trigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between rounded-t-xl border-x border-t bg-muted/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      {title && <span className="text-muted-foreground">{title}</span>}
      {children}
    </div>
    {state && (
      <div className="flex items-center gap-2">
        <div className={cn(
          "size-2 rounded-full",
          state === 'input-streaming' || state === 'input-available' ? "bg-yellow-500 animate-pulse" :
          state === 'output-available' ? "bg-green-500" :
          state === 'output-error' ? "bg-red-500" : "bg-gray-500"
        )} />
        <span className="text-xs capitalize text-muted-foreground">{state.replace('-', ' ')}</span>
      </div>
    )}
  </CollapsiblePrimitive.Trigger>
));
SandboxHeader.displayName = "SandboxHeader";

const SandboxContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden rounded-b-xl border transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  />
));
SandboxContent.displayName = "SandboxContent";

const SandboxTabs = TabsPrimitive.Root;

const SandboxTabsBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between border-b bg-muted/30 px-1",
      className
    )}
    {...props}
  />
));
SandboxTabsBar.displayName = "SandboxTabsBar";

const SandboxTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("flex h-9 items-center gap-1 p-1", className)}
    {...props}
  />
));
SandboxTabsList.displayName = "SandboxTabsList";

const SandboxTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
));
SandboxTabsTrigger.displayName = "SandboxTabsTrigger";

const SandboxTabContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
SandboxTabContent.displayName = "SandboxTabContent";

export {
  Sandbox,
  SandboxHeader,
  SandboxContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
  SandboxTabContent,
};
