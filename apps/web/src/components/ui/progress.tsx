import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0 ถึง 100 */
  value?: number;
  indicatorClassName?: string;
}

/** เวอร์ชัน div ล้วน ไม่ต้องพึ่ง radix เพราะ bar ในตารางไม่ต้องรับ focus */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn('bg-secondary relative h-1.5 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <div
        className={cn('bg-primary h-full rounded-full transition-all', indicatorClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  ),
);
Progress.displayName = 'Progress';

export { Progress };
