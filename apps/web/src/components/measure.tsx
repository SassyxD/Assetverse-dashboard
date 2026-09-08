import type { ReactNode } from 'react';
import type { Measurement, Owner, SourceStatus } from '@assetverse/contracts';

import { cn } from '@/lib/utils';
import { NO_DATA, showNum } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Fmt = (m: Measurement<number>) => string;

/**
 * ช่องแสดง metric 1 ตัว บังคับกฎเดียวกันทุกที่:
 *   unavailable  ลายทแยง + คำว่ายังไม่วัด ห้ามโชว์ 0
 *   insufficient ติดป้ายยันไม่ได้ เพราะกลุ่มตัวอย่างเล็กเกิน
 */
export const Field = ({
  name,
  m,
  format = showNum,
  hint,
  className,
}: {
  name: string;
  m: Measurement<number>;
  format?: Fmt | undefined;
  hint?: string | undefined;
  className?: string | undefined;
}) => {
  const missing = m.state === 'unavailable' || m.value === null;
  const weak = m.state === 'insufficient';

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        missing ? 'hatch border-dashed' : 'bg-card',
        className,
      )}
    >
      <div className="text-muted-foreground font-mono text-[10px] leading-snug tracking-tight">
        {name}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
        <span
          className={cn(
            'tnum text-lg leading-none font-semibold',
            missing && 'text-muted-foreground text-sm font-medium',
            weak && 'text-gap',
          )}
        >
          {format(m)}
        </span>
        {weak ? <Badge variant="gap">ยันไม่ได้</Badge> : null}
      </div>
      {m.note ? (
        <p className="text-muted-foreground mt-1.5 text-[11px] leading-snug">{m.note}</p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1.5 text-[11px] leading-snug">{hint}</p>
      ) : null}
    </div>
  );
};

export const FieldGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('grid grid-cols-2 gap-2.5 lg:grid-cols-4', className)}>{children}</div>
);

/** ทั้งกลุ่มยังไม่ได้วัดเลย บอกครั้งเดียวพอ ไม่ต้องซ้ำทุกช่อง */
export const allMissing = (ms: Measurement<number>[]) =>
  ms.length > 0 && ms.every((m) => m.state === 'unavailable' || m.value === null);

export const NotWired = ({ ms }: { ms: Measurement<number>[] }) => (
  <div className="hatch text-muted-foreground rounded-md border border-dashed px-3 py-4 text-[12px]">
    {ms.find((m) => m.note)?.note ?? 'ยังไม่ได้ต่อแหล่งข้อมูล'}
  </div>
);

/** ค่าตัวเดียวในตาราง ไม่มีกรอบ */
export const Cell = ({
  m,
  format = showNum,
  sub,
}: {
  m: Measurement<number>;
  format?: Fmt;
  sub?: string;
}) => {
  const missing = m.state === 'unavailable' || m.value === null;
  return (
    <div className="text-right">
      <div
        className={cn(
          'tnum text-sm font-medium',
          missing && 'text-muted-foreground/60 text-[11px] font-normal',
          m.state === 'insufficient' && 'text-gap',
        )}
      >
        {missing ? NO_DATA : format(m)}
      </div>
      {sub ? <div className="text-muted-foreground text-[11px]">{sub}</div> : null}
    </div>
  );
};

/** แจกแจงสัดส่วน เทียบกันเองในกลุ่ม ไม่ได้เทียบกับตัวเลขรวมของหน้า */
export const Breakdown = ({
  rows,
  className,
}: {
  rows: { label: string; value: number; hint?: string; display?: string }[];
  className?: string;
}) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={cn('space-y-2', className)}>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[minmax(0,1fr)_minmax(4rem,9rem)_4.5rem] items-center gap-3"
        >
          <div className="min-w-0">
            <div className="truncate text-[12px]">{r.label}</div>
            {r.hint ? (
              <div className="text-muted-foreground truncate text-[11px]">{r.hint}</div>
            ) : null}
          </div>
          <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-foreground/70 h-full rounded-full"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <div className="tnum text-right text-[12px] font-medium">
            {r.display ?? r.value.toLocaleString('th-TH')}
          </div>
        </div>
      ))}
    </div>
  );
};

/** panel มาตรฐานของหน้า มี title + hint สั้น 1 บรรทัด */
export const Panel = ({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4 pb-3">
      <div className="min-w-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        {hint ? (
          <p className="text-muted-foreground mt-1 text-[11px] leading-snug">{hint}</p>
        ) : null}
      </div>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </CardHeader>
    <CardContent className="p-4 pt-0">{children}</CardContent>
  </Card>
);

const STATUS: Record<
  SourceStatus,
  { label: string; variant: 'ok' | 'wait' | 'bad' | 'muted' | 'gap' }
> = {
  ok: { label: 'ปกติ', variant: 'ok' },
  // ต้นทางล่มเองคือสถานะปกติที่ไม่ต้องทำอะไร ห้ามใช้แดง ไม่งั้นคนชินแล้วเลิกสนใจ
  source_down: { label: 'รอต้นทาง', variant: 'wait' },
  throttled: { label: 'ถูกบล็อก', variant: 'bad' },
  network_path_down: { label: 'เส้นทางพัง', variant: 'bad' },
  failed: { label: 'งานพัง', variant: 'bad' },
  never_run: { label: 'ยังไม่รัน', variant: 'muted' },
};

export const StatusBadge = ({ status }: { status: SourceStatus }) => (
  <Badge variant={STATUS[status].variant}>{STATUS[status].label}</Badge>
);

const OWNER: Record<Owner, string> = {
  nobody_wait: 'รอต้นทาง',
  us: 'ทีมเรา',
  infra: 'ทีม infra',
  unknown: 'ยังไม่รู้',
};

export const ownerLabel = (o: Owner) => OWNER[o];
