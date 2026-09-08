import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border-transparent',
        secondary: 'bg-secondary text-secondary-foreground border-transparent',
        destructive: 'bg-destructive text-destructive-foreground border-transparent',
        outline: 'text-foreground',
        /* 4 ตัวล่างผูกกับ "ใครต้องทำอะไร" ไม่ใช่ความรุนแรงของตัวเลข */
        ok: 'bg-ok-soft text-ok border-transparent',
        wait: 'bg-wait-soft text-wait border-transparent',
        gap: 'bg-gap-soft text-gap border-transparent',
        bad: 'bg-bad-soft text-bad border-transparent',
        muted: 'bg-muted text-muted-foreground border-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
