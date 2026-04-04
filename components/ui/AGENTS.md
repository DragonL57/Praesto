# components/ui/

Base shadcn/ui components using Radix UI primitives + Tailwind CSS.

## Files
- 52 components in components/ui/
- Pattern: cva variants with class-variance-authority

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