import clsx from 'clsx';
import type { TierSummary } from '@assetverse/contracts';
import { showPct } from '@/lib/format';
import { Bar, Panel, Pill } from '@/components/ui';

const TIER_LABEL: Record<string, string> = {
  primary: 'primary — ต้องมีถึงจะประเมินราคาได้',
  fallback1: 'fallback1 — ที่ตั้ง + โครงสร้าง',
  fallback2: 'fallback2 — ของประกอบ',
};

export const KbmfTiers = ({ tiers }: { tiers: TierSummary[] }) => (
  <>
    {tiers.map((t) => (
      <Panel
        key={t.tier}
        title={TIER_LABEL[t.tier] ?? t.tier}
        hint={`${t.fields.length} field · เกณฑ์ fill > ${(t.threshold * 100).toFixed(0)}%`}
      >
        {/* 2 เลขที่คนอ่านสับสน — วางคู่กันพร้อมคำอธิบายว่าทำไมไม่ขัดกัน */}
        <div className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <div className="rounded-md border border-line-soft px-3 py-2.5">
            <div className="text-[11px] text-faint">fill rate</div>
            <div className="flex items-center gap-2 text-[22px] font-semibold leading-tight text-ok">
              {showPct(t.fillRate)}
              <Pill tone={t.passes ? 'ok' : 'bad'}>
                {t.passes ? 'ผ่านเกณฑ์' : 'ต่ำกว่าเกณฑ์'}
              </Pill>
            </div>
            <p className="mt-1.5 text-[11px] text-dim">ช่องที่มีของ ÷ ช่องทั้งหมด</p>
          </div>
          <div className="rounded-md border border-line-soft px-3 py-2.5">
            <div className="text-[11px] text-faint">record complete</div>
            <div className="text-[22px] font-semibold leading-tight text-dead">
              {showPct(t.recordCompleteRate)}
            </div>
            <p className="mt-1.5 text-[11px] text-dim">
              {t.structuralGaps.length > 0 ? (
                <>
                  <b>ไม่ขัดกัน</b> — field{' '}
                  <code className="font-mono">{t.structuralGaps.join(', ')}</code>{' '}
                  ว่างทุกแถว ทุกแถวจึงขาดอย่างน้อย 1 ช่อง แม้ช่องอื่นเต็มหมด
                </>
              ) : (
                'แถวที่ครบทุกช่อง ÷ แถวทั้งหมด'
              )}
            </p>
          </div>
        </div>

        {t.structuralGaps.length > 0 ? (
          <FieldGroup
            heading="ว่างทุกแถว — ปัญหาโครงสร้าง"
            note="ต้นทางไม่ส่ง field นี้มาเลย แก้ที่สเปก/เปลี่ยนแหล่ง · crawl ซ้ำไม่ช่วย"
            fields={t.fields.filter((f) => f.gap === 'structural')}
            dead
          />
        ) : null}

        <FieldGroup
          heading="ว่างบางแถว — ผู้ประกาศไม่กรอก"
          note="crawl ซ้ำก็ไม่เพิ่ม เพราะต้นทางไม่มีข้อมูลนั้นจริง"
          fields={t.fields.filter((f) => f.gap === 'sparse')}
        />

        {t.fields.some((f) => f.gap === 'none') ? (
          <FieldGroup heading="ครบทุกแถว" fields={t.fields.filter((f) => f.gap === 'none')} />
        ) : null}
      </Panel>
    ))}
  </>
);

const FieldGroup = ({
  heading, note, fields, dead,
}: {
  heading: string;
  note?: string;
  fields: { field: string; fillRate: number }[];
  dead?: boolean;
}) => {
  if (fields.length === 0) return null;
  return (
    <div className="mb-[18px] last:mb-0">
      <h3 className="flex items-center gap-2 text-xs font-semibold">
        {dead ? <span className="h-2 w-2 rounded-full bg-dead" /> : null}
        {heading}
      </h3>
      {note ? <p className="mb-2 mt-0.5 text-[11.5px] text-dim">{note}</p> : null}
      {fields.map((f) => (
        <div key={f.field} className="grid grid-cols-[170px_1fr_58px] items-center gap-3 py-1">
          <span className={clsx('font-mono text-[11.5px]', dead && 'text-dead')}>{f.field}</span>
          <Bar value={f.fillRate} low={f.fillRate < 0.5} />
          <span className={clsx('tnum text-right text-[11.5px]', dead && 'font-bold text-dead')}>
            {(f.fillRate * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};
