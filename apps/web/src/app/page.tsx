'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import clsx from 'clsx';
import { api, qk } from '@/lib/api';
import { showBytes, showNum, showPct } from '@/lib/format';
import { Panel, Pill, Stat, StatusPill, OwnerTag, Bar, type Tone } from '@/components/ui';

export default function OverviewPage() {
  const { data, isPending, error } = useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });

  if (isPending) return <Shell><p className="text-dim">กำลังโหลด…</p></Shell>;
  if (error) return <Shell><p className="text-bad">โหลดไม่ได้: {error.message}</p></Shell>;

  const d = data;

  return (
    <Shell cycle={`รอบ ${d.cycle} · วันที่ ${d.cycleDay}`} storage={showBytes(d.totals.storageBytes)}>
      {/* 4 คำถามที่ต้องตอบใน 10 วินาที — ตอบเป็นคำ ไม่ใช่แค่เลข */}
      <div className="mb-[22px] grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
        {d.headlines.map((h) => (
          <section key={h.question} className="bg-white px-4 py-3.5">
            <div className="mb-1.5 text-[11px] text-faint">{h.question}</div>
            <div className="flex items-center gap-2 text-[15px] font-semibold">
              <span className={clsx('h-2 w-2 shrink-0 rounded-full', dot(h.tone))} />
              {h.answer}
            </div>
            <div className="mt-1.5 text-[11.5px] text-dim">{h.detail}</div>
          </section>
        ))}
      </div>

      <Panel
        title={`17 เว็บ — เรียงตามความรุนแรง`}
        hint="ตัวที่ควรไปดูก่ออยู่บนสุด ไม่ได้เรียงตามตัวอักษร"
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10.5px] text-faint">
              <th className="px-2 py-1.5 text-left font-semibold">เว็บ</th>
              <th className="px-2 py-1.5 text-left font-semibold">สถานะ</th>
              <th className="px-2 py-1.5 text-left font-semibold">ใครต้องทำ</th>
              <th className="px-2 py-1.5 text-right font-semibold">record</th>
              <th className="px-2 py-1.5 text-right font-semibold">crawl completeness</th>
              <th className="px-2 py-1.5 text-right font-semibold">primary fill</th>
              <th className="px-2 py-1.5 text-right font-semibold">DLQ</th>
              <th className="px-2 py-1.5 text-right font-semibold">ขอบเขตที่มีข้อมูล</th>
            </tr>
          </thead>
          <tbody>
            {d.sites.map((s) => {
              const missing = s.scopesTotal - s.scopesWithData;
              return (
                <tr key={s.site} className="border-b border-line-soft last:border-0">
                  <td className="px-2 py-1.5">
                    <Link href={`/sites/${s.site}`} className="font-semibold text-[#1f5fbf] hover:underline">
                      {s.domain}
                    </Link>
                    <div className="text-[10.5px] text-dim">{s.label}</div>
                  </td>
                  <td className="px-2 py-1.5"><StatusPill status={s.status} /></td>
                  <td className="px-2 py-1.5"><OwnerTag owner={s.owner} /></td>
                  <td className="tnum px-2 py-1.5 text-right">
                    {showNum(s.savedRecords)}
                    {!s.trustworthy && s.status !== 'never_run' ? (
                      <span className="ml-1"><Pill tone="gap">น้อยเกิน</Pill></span>
                    ) : null}
                  </td>
                  <td className="tnum px-2 py-1.5 text-right">{showPct(s.crawlCompleteness)}</td>
                  <td className="tnum px-2 py-1.5 text-right">
                    {showPct(s.primaryFillRate)}
                    {s.primaryFillRate.value !== null ? (
                      <span className="mt-1 block"><Bar value={s.primaryFillRate.value} low={s.primaryFillRate.value < 0.8} /></span>
                    ) : null}
                  </td>
                  <td className={clsx('tnum px-2 py-1.5 text-right',
                    (s.deadLetterDepth.value ?? 0) > 0 && 'font-semibold text-gap')}>
                    {showNum(s.deadLetterDepth)}
                  </td>
                  <td className={clsx('tnum px-2 py-1.5 text-right',
                    missing === s.scopesTotal && 'gap-hatch font-semibold text-gap')}>
                    {s.scopesWithData} / {s.scopesTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel title="เส้นทางเน็ตเวิร์ก" hint="พังช่วงไหนบอกว่าใครต้องแก้ — infra หรือรอเว็บเป้าหมาย">
        <div className="flex flex-wrap items-center gap-1.5">
          {d.infra.networkPath.map((h, i) => (
            <span key={h.id} className="flex items-center gap-1.5">
              <span
                className={clsx(
                  'rounded border px-2 py-1 text-[11px]',
                  h.status === 'ok' && 'border-ok/30 bg-ok-bg text-ok',
                  h.status === 'down' && 'border-wait/30 bg-wait-bg text-wait',
                  h.status === 'degraded' && 'border-gap/30 bg-gap-bg text-gap',
                  h.status === 'unknown' && 'border-line bg-line-soft text-dim',
                )}
                title={h.detail}
              >
                {h.label}
              </span>
              {i < d.infra.networkPath.length - 1 ? <span className="text-faint">→</span> : null}
            </span>
          ))}
        </div>
        {d.infra.networkPath.filter((h) => h.detail).map((h) => (
          <p key={h.id} className="mt-2.5 text-[11.5px] text-dim">
            <b>{h.label}</b> — {h.detail}
          </p>
        ))}
      </Panel>

      <Panel title="Cloud" hint="ช่อง — คือยังไม่ได้ต่อ ไม่ใช่ศูนย์">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="S3 objects" text={showNum(d.infra.s3.objects)} m={d.infra.s3.objects} />
          <Stat label="S3 ขนาด" text={showBytes(d.infra.s3.bytes)} m={d.infra.s3.bytes} />
          <Stat label="Aurora rows" text={showNum(d.infra.aurora.rows)} m={d.infra.aurora.rows} />
          <Stat label="Fargate task ที่รัน" text={showNum(d.infra.fargate.tasksRunning)} m={d.infra.fargate.tasksRunning} />
          <Stat label="Fargate task ที่ตาย" text={showNum(d.infra.fargate.tasksFailed)} m={d.infra.fargate.tasksFailed} />
          <Stat label="storage availability" text={showPct(d.infra.storageAvailability)} m={d.infra.storageAvailability} />
        </div>
      </Panel>
    </Shell>
  );
}

const dot = (t: Tone | string) =>
  t === 'ok' ? 'bg-ok' : t === 'wait' ? 'bg-wait' : t === 'bad' ? 'bg-bad' : 'bg-gap';

const Shell = ({
  children, cycle, storage,
}: { children: React.ReactNode; cycle?: string; storage?: string }) => (
  <main className="mx-auto max-w-[1240px] px-5 pb-16 pt-4">
    <header className="flex flex-wrap items-baseline gap-3.5 border-b border-line pb-3.5">
      <h1 className="text-base font-semibold tracking-[0.2px]">Assetverse — Monitoring</h1>
      <Pill tone="mute">mock data · ยังไม่ต่อ S3/Aurora</Pill>
      <span className="ml-auto text-xs text-dim">
        {cycle} {storage ? <>· storage <b className="tnum">{storage}</b></> : null}
      </span>
    </header>
    <div className="pt-4">{children}</div>
  </main>
);
