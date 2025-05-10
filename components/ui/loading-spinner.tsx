'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  "inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      variant: {
        primary: "text-primary",
        secondary: "text-secondary",
        accent: "text-accent",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "primary",
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
  VariantProps<typeof spinnerVariants> {
  srText?: string;
}

export function LoadingSpinner({
  className,
  size,
  variant,
  srText = "Loading...",
  ...props
}: LoadingSpinnerProps) {
  return (
    <span role="status" {...props}>
      <span
        className={cn(spinnerVariants({ size, variant }), className)}
        aria-hidden="true"
      />
      <span className="sr-only">{srText}</span>
    </span>
  );
}