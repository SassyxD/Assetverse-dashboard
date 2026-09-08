import { cn } from '@/lib/utils';

export type Stage = {
  num: string;
  name: string;
  value: string;
  sub: string;
  missing?: boolean;
  /** ขั้นที่ทีมอื่นทำ ต้องเห็นว่าอยู่ตรงไหนของสาย ไม่ใช่ก้อนแยก */
  team?: string;
};

/**
 * สายงานทั้งเส้นในแถวเดียว เห็นทีเดียวว่าคอขวดอยู่ขั้นไหน
 * เรียงตามการไหลจริง ไม่ได้เรียงตามความสำคัญของ metric
 */
export const PipelineStages = ({ stages }: { stages: Stage[] }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
    {stages.map((s) => (
      <div
        key={s.num}
        className={cn(
          'flex min-w-0 flex-col gap-1.5 rounded-md border p-2.5',
          s.missing ? 'hatch border-dashed' : 'bg-card',
        )}
      >
        <div className="text-muted-foreground font-mono text-[10px]">{s.num}</div>
        <div className="text-[12px] leading-tight font-semibold">{s.name}</div>
        <div
          className={cn(
            'tnum truncate text-[15px] leading-none font-semibold',
            s.missing && 'text-muted-foreground text-[12px] font-medium',
          )}
        >
          {s.value}
        </div>
        <div className="text-muted-foreground mt-auto pt-1.5 text-[11px] leading-snug">{s.sub}</div>
        {s.team ? (
          <div className="bg-secondary text-muted-foreground truncate rounded px-1.5 py-0.5 text-[10px]">
            {s.team}
          </div>
        ) : null}
      </div>
    ))}
  </div>
);
