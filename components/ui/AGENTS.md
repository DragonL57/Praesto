# components/ui/

Base shadcn/ui components using Radix UI primitives + Tailwind CSS.

## Purpose
Reusable, accessible UI building blocks. All components follow the cva variant pattern.

## File Structure
```
components/ui/
├── button.tsx
├── input.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── ... (52+ shadcn/ui components)
└── AGENTS.md
```

## Conventions
```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const variants = cva('base-classes', {
  variants: {
    variant: { default: '...', secondary: '...' },
    size: { default: '...', sm: '...' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface Props
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof variants> {}

export function Component({ className, variant, size, ...props }: Props) {
  return <div className={cn(variants({ variant, size }), className)} {...props} />;
}
```

## Anti-Patterns
- ❌ Inline styles (use Tailwind)
- ❌ Skip defaultVariants
- ❌ Forget cn() wrapper
- ❌ Add business logic to UI components
- ❌ Skip accessibility attributes
