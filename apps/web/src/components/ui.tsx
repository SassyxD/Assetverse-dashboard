import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { Measurement, Owner, SourceStatus } from '@assetverse/contracts';

/** โทนสีผูกกับ "ใครต้องทำอะไร" ไม่ใช่ผูกกับความรุนแรงของตัวเลข */
export type Tone = 'ok' | 'wait' | 'gap' | 'bad' | 'mute' | 'dead';

const TONE: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok',
  wait: 'bg-wait-bg text-wait',
  gap: 'bg-gap-bg text-gap',
  bad: 'bg-bad-bg text-bad',
  mute: 'bg-line-soft text-dim',
  dead: 'bg-line-soft text-dead',
};

export const Pill = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
      TONE[tone],
    )}
  >
    {children}
  </span>
);

export const Panel = ({
  title, hint, children,
}: { title: string; hint?: string; children: ReactNode }) => (
  <section className="mb-[18px] rounded-lg border border-line bg-white">
    <h2 className="flex items-center gap-2.5 border-b border-line-soft px-4 py-2.5 text-[13px] font-semibold">
      {title}
      {hint ? <span className="ml-auto text-[11.5px] font-normal text-dim">{hint}</span> : null}
    </h2>
    <div className="p-4">{children}</div>
  </section>
);

/**
 * แสดง Measurement ให้ถูก — "—" เมื่อยังไม่รู้, ติดธงเมื่อ sample เล็กเกิน
 * ห้ามแสดง 0 แทนค่าที่ยังไม่ได้วัด
 */
export const Stat = ({
  label, text, m, tone = 'ok',
}: { label: string; text: string; m?: Measurement<number>; tone?: Tone }) => (
  <div>
    <div className="text-[10.5px] text-faint">{label}</div>
    <div className="mt-px flex items-baseline gap-1.5">
      <span
        className={clsx(
          'tnum text-base font-semibold',
          m?.state === 'unavailable' && 'text-faint',
          m?.state === 'insufficient' && 'text-gap',
        )}
      >
        {text}
      </span>
      {m?.state === 'insufficient' ? <Pill tone="gap">ยันไม่ได้</Pill> : null}
    </div>
    {m?.note ? <div className="mt-0.5 text-[10.5px] text-dim">{m.note}</div> : null}
    {tone === 'ok' && m?.state === 'ok' && m.sampleSize !== undefined ? (
      <div className="mt-0.5 text-[10.5px] text-faint">จาก {m.sampleSize.toLocaleString()} แถว</div>
    ) : null}
  </div>
);

export const Bar = ({ value, low }: { value: number; low?: boolean }) => (
  <span className="block h-1 overflow-hidden rounded-sm bg-line-soft">
    <span
      className={clsx('block h-full', low ? 'bg-gap' : 'bg-ok')}
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
    />
  </span>
);

const STATUS_LABEL: Record<SourceStatus, { text: string; tone: Tone }> = {
  ok: { text: 'ปกติ', tone: 'ok' },
  // ต้นทางล่มเอง = สถานะปกติที่ไม่ต้องทำอะไร ห้ามใช้แดง ไม่งั้นคนชินแล้วเลิกสนใจ
  source_down: { text: 'รอต้นทาง', tone: 'wait' },
  throttled: { text: 'ถูกบล็อก — ลด rate', tone: 'bad' },
  network_path_down: { text: 'เส้นทางเน็ตเวิร์กพัง', tone: 'bad' },
  failed: { text: 'งานพัง', tone: 'bad' },
  never_run: { text: 'ยังไม่เคยรัน', tone: 'mute' },
};

export const StatusPill = ({ status }: { status: SourceStatus }) => {
  const s = STATUS_LABEL[status];
  return <Pill tone={s.tone}>{s.text}</Pill>;
};

const OWNER_LABEL: Record<Owner, string> = {
  nobody_wait: 'ไม่ต้องทำอะไร — รอ',
  us: 'ทีมเรา',
  infra: 'ทีม infra',
  unknown: '—',
};

export const OwnerTag = ({ owner }: { owner: Owner }) => (
  <span className="text-[11px] text-dim">{OWNER_LABEL[owner]}</span>
);
