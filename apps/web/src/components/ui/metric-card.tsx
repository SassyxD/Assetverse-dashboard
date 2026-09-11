'use client';

import type React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type IconType = React.ElementType | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

export type TrendType = 'up' | 'down' | 'neutral';

export interface DashboardMetricCardProps {
  /** ค่าที่ format แล้ว ถ้ายังไม่ได้วัดให้ส่ง missing มา อย่าส่ง 0 */
  value: string;
  /** การ์ดนี้วัดอะไร อ่านก่อนชื่อตัวแปร */
  desc: string;
  /** ชื่อตัวแปรตามที่ระบบใช้จริง อยู่ใต้ desc */
  title: string;
  icon?: IconType | undefined;
  trendChange?: string | undefined;
  trendType?: TrendType | undefined;
  /** เหตุผลที่ค่านี้ยังไม่มี หรือเชื่อได้แค่ไหน */
  note?: string | undefined;
  /** ยังไม่ได้วัด ต่างจากวัดแล้วได้ศูนย์ */
  missing?: boolean | undefined;
  className?: string | undefined;
}

const TREND_ICON = { up: ArrowUp, down: ArrowDown, neutral: Minus } as const;
const TREND_COLOR = {
  up: 'text-ok',
  down: 'text-bad',
  neutral: 'text-muted-foreground',
} as const;

const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  value,
  desc,
  title,
  icon: IconComponent,
  trendChange,
  trendType = 'neutral',
  note,
  missing,
  className,
}) => {
  const TrendIcon = TREND_ICON[trendType];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn('rounded-lg', className)}
    >
      <Card className={cn('h-full transition-shadow hover:shadow-md', missing && 'hatch')}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
          <div className="min-w-0">
            <CardTitle className="text-[12px] leading-snug font-semibold">{desc}</CardTitle>
            <p className="text-muted-foreground mt-0.5 font-mono text-[11px] leading-snug tracking-tight">
              {title}
            </p>
          </div>
          {IconComponent ? (
            <IconComponent
              className="text-muted-foreground h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          ) : null}
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div
            className={cn(
              'tnum text-foreground text-2xl font-bold',
              missing && 'text-muted-foreground text-base font-medium',
            )}
          >
            {value}
          </div>
          {trendChange ? (
            <p
              className={cn(
                'mt-2 flex items-center gap-1 text-xs font-medium',
                TREND_COLOR[trendType],
              )}
            >
              <TrendIcon className="h-3 w-3" aria-hidden="true" />
              {trendChange}
            </p>
          ) : null}
          {note ? (
            <p className="text-muted-foreground mt-2 text-[11px] leading-snug">{note}</p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export { DashboardMetricCard };
