'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { MONTHLY_CALENDAR, SITE_KIND_LABEL, type SiteOverview } from '@assetverse/contracts';

import { api, qk } from '@/lib/api';
import { showNum, showPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Shell } from '@/components/shell';
import { Cell, Panel, StatusBadge, ownerLabel } from '@/components/measure';
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function FleetPage() {
  const { data, isPending, error } = useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });
  const [showPending, setShowPending] = useState(false);

  if (isPending)
    return (
      <Shell title="ภาพรวม 17 เว็บ">
        <p className="text-muted-foreground text-sm">กำลังโหลด</p>
      </Shell>
    );
  if (error)
    return (
      <Shell title="ภาพรวม 17 เว็บ">
        <p className="text-bad text-sm">โหลดไม่ได้: {error.message}</p>
      </Shell>
    );

  const d = data;
  const [q1, q2, q3, q4] = d.headlines;
  const top = d.sites.slice(0, 3);
  const buckets = [
    { key: 'us', label: 'ทีมเรา', rows: d.sites.filter((s) => s.owner === 'us') },
    { key: 'infra', label: 'ทีม infra', rows: d.sites.filter((s) => s.owner === 'infra') },
    { key: 'wait', label: 'รอต้นทาง', rows: d.sites.filter((s) => s.owner === 'nobody_wait') },
  ];
  const gapScopes = d.sites.reduce((n, s) => n + (s.scopesTotal - s.scopesWithData), 0);
  const totalScopes = d.sites.reduce((n, s) => n + s.scopesTotal, 0);
  const firstNeedy = buckets.flatMap((b) => (b.key === 'wait' ? [] : b.rows))[0];
  const next = MONTHLY_CALENDAR.find((c) => c.day > d.cycleDay);
  const active = d.sites.filter((s) => s.status !== 'never_run');
  const pending = d.sites.filter((s) => s.status === 'never_run');

  return (
    <Shell title="ภาพรวม 17 เว็บ" hint="เรียงตามความรุนแรง คลิกแถวเพื่อเข้าหน้าเว็บนั้น">
      <BentoGrid className="mb-5 xl:grid-cols-4">
        <BentoCard tag="Q1" name={q1?.question ?? 'รอบนี้ไปถึงไหน'} description={q1?.detail}>
          <div className="space-y-3">
            <div className="tnum text-2xl leading-none font-bold">{q1?.answer}</div>
            <div>
              <Progress value={(d.cycleDay / 30) * 100} />
              <div className="text-muted-foreground mt-1.5 flex justify-between font-mono text-[10px]">
                <span>วันนี้ D{d.cycleDay}</span>
                <span>{next ? `ถัดไป D${next.day} ${next.label}` : 'จบรอบ'}</span>
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          tag="Q2"
          name={q2?.question ?? 'มีอะไรต้องแก้ไหม'}
          {...(firstNeedy
            ? { href: `/sites/${firstNeedy.site}`, cta: 'เปิดเว็บที่ต้องแก้' }
            : {})}
        >
          <div className="space-y-1">
            {buckets.map((b) => (
              <div key={b.key} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="border-border/60 mx-1 flex-1 border-b border-dashed" />
                <span className="tnum font-semibold">{b.rows.length}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard tag="Q3" name="เก็บได้แค่ไหน" description={q3?.detail}>
          <div className="space-y-2.5">
            <div>
              <div className="tnum text-2xl leading-none font-bold">
                {showNum(d.totals.records)}
              </div>
              <div className="text-muted-foreground mt-1 text-[11px]">record ที่เก็บได้</div>
            </div>
            <div className="flex items-baseline gap-2 border-t pt-2.5">
              <span className="tnum text-gap text-base font-semibold">
                {gapScopes} / {totalScopes}
              </span>
              <span className="text-muted-foreground text-[11px]">ขอบเขตที่ยังว่าง</span>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          tag="Q4"
          name="ดูเว็บไหนก่อน"
          {...(top[0] ? { href: `/sites/${top[0].site}`, cta: 'เปิดอันดับ 1' } : {})}
        >
          <ol className="space-y-1.5">
            {top.map((s, i) => (
              <li key={s.site} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-mono text-[10px]">{i + 1}</span>
                <span className="truncate font-medium">{s.domain}</span>
                <span className="ml-auto shrink-0">
                  <StatusBadge status={s.status} />
                </span>
              </li>
            ))}
          </ol>
        </BentoCard>
      </BentoGrid>

      <Panel
        title="17 เว็บ"
        hint="Δ เทียบรอบก่อนยังไม่มี เพราะยังไม่เก็บ snapshot ย้อนหลัง"
        action={<Badge variant="muted">เรียงตาม severity</Badge>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เว็บ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">record</TableHead>
              <TableHead className="text-right">crawl comp.</TableHead>
              <TableHead className="text-right">primary fill</TableHead>
              <TableHead className="text-right">dlq</TableHead>
              <TableHead className="text-right">out of range</TableHead>
              <TableHead className="text-right">ขอบเขต</TableHead>
              <TableHead>อาการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((s) => (
              <Row key={s.site} s={s} />
            ))}

            {pending.length > 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="py-2">
                  <button
                    type="button"
                    onClick={() => setShowPending((v) => !v)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[12px]"
                  >
                    <ChevronDown
                      className={cn('size-3.5 transition-transform', showPending && 'rotate-180')}
                    />
                    อีก {pending.length} เว็บยังไม่ตั้ง seed
                  </button>
                </TableCell>
              </TableRow>
            ) : null}

            {showPending ? pending.map((s) => <Row key={s.site} s={s} />) : null}
          </TableBody>
        </Table>
      </Panel>
    </Shell>
  );
}

const Row = ({ s }: { s: SiteOverview }) => {
  const missingScopes = s.scopesTotal - s.scopesWithData;
  const fill = s.primaryFillRate.value;

  return (
    <TableRow>
      <TableCell className="max-w-[190px]">
        <Link href={`/sites/${s.site}`} className="text-sm font-medium hover:underline">
          {s.domain}
        </Link>
        <div className="text-muted-foreground truncate text-[11px]">
          {SITE_KIND_LABEL[s.kind]}
        </div>
      </TableCell>

      <TableCell>
        <StatusBadge status={s.status} />
      </TableCell>

      <TableCell className="text-right">
        <Cell m={s.savedRecords} />
      </TableCell>

      <TableCell className="text-right">
        <Cell m={s.crawlCompleteness} format={(m) => showPct(m)} />
      </TableCell>

      <TableCell className="text-right">
        <Cell m={s.primaryFillRate} format={(m) => showPct(m)} />
        {fill !== null ? (
          <Progress
            value={fill * 100}
            className="mt-1.5 ml-auto h-1 w-16"
            indicatorClassName={fill < 0.8 ? 'bg-gap' : 'bg-ok'}
          />
        ) : null}
      </TableCell>

      <TableCell
        className={cn('text-right', (s.deadLetterDepth.value ?? 0) > 0 && 'text-gap font-semibold')}
      >
        <Cell m={s.deadLetterDepth} />
      </TableCell>

      <TableCell className="text-right">
        <Cell m={s.outOfRangeRecords} />
      </TableCell>

      <TableCell className="text-right">
        <span
          className={cn(
            'tnum inline-block rounded px-1.5 py-0.5 text-sm',
            missingScopes === s.scopesTotal && 'hatch text-gap font-semibold',
          )}
        >
          {s.scopesWithData} / {s.scopesTotal}
        </span>
      </TableCell>

      <TableCell className="max-w-[240px]">
        <div className="truncate text-[12px]">{s.symptom}</div>
        <div className="text-muted-foreground text-[11px]">{ownerLabel(s.owner)}</div>
      </TableCell>
    </TableRow>
  );
};
