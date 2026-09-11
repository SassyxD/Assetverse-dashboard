'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import type { SiteOverview } from '@assetverse/contracts';

import { api, qk } from '@/lib/api';
import { showNum, showPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Shell } from '@/components/shell';
import { SiteCell } from '@/components/site-cell';
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

/** จำนวนเว็บมาจากข้อมูลจริง ไม่ฮาร์ดโค้ด — SITES เพิ่ม/ลดแล้วหัวข้อจะไม่โกหก */
const TITLE = 'Extractor';

export default function ExtractorOverviewPage() {
  const { data, isPending, error } = useQuery({
    queryKey: qk.dashboard,
    queryFn: api.dashboard,
  });
  const [showPending, setShowPending] = useState(false);

  if (isPending)
    return (
      <Shell title={TITLE}>
        <p className="text-muted-foreground text-sm">Loading</p>
      </Shell>
    );
  if (error)
    return (
      <Shell title={TITLE}>
        <p className="text-bad text-sm">Could not load: {error.message}</p>
      </Shell>
    );

  const d = data;
  const q3 = d.headlines[2];
  const q4 = d.headlines[3];
  const active = d.sites.filter((s) => s.status !== 'never_run');
  const pending = d.sites.filter((s) => s.status === 'never_run');
  const gapScopes = d.sites.reduce((n, s) => n + (s.scopesTotal - s.scopesWithData), 0);
  const totalScopes = d.sites.reduce((n, s) => n + s.scopesTotal, 0);
  const outOfRange = d.sites.reduce((n, s) => n + (s.outOfRangeRecords.value ?? 0), 0);

  // fill ต่ำสุดก่อน — เว็บที่ยังไม่รันไม่มี fill จริง ตัดออกไม่ให้ปนอันดับ
  const worstFill = active
    .filter((s) => s.primaryFillRate.value !== null)
    .sort((a, b) => (a.primaryFillRate.value ?? 0) - (b.primaryFillRate.value ?? 0))
    .slice(0, 3);
  const untrusted = active.filter((s) => !s.trustworthy);

  return (
    <Shell
      title={`${TITLE} — all ${d.sites.length} sites`}
      hint="The parse stage — click a site name to see its per-field tier breakdown."
    >
      <BentoGrid className="mb-5 xl:grid-cols-4">
        <BentoCard
          tag="Q3"
          name={q3?.question ?? 'Can we trust the numbers?'}
          description={q3?.detail}
        >
          <div className="space-y-2.5">
            <div className="tnum text-2xl leading-none font-bold">{q3?.answer}</div>
            <div className="flex items-baseline gap-2 border-t pt-2.5">
              <span
                className={cn(
                  'tnum text-base font-semibold',
                  untrusted.length > 0 && 'text-gap',
                )}
              >
                {untrusted.length}
              </span>
              <span className="text-muted-foreground text-[11px]">
                sites whose sample is too small to conclude from
              </span>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          tag="Q4"
          name={q4?.question ?? 'What is still missing?'}
          description={q4?.detail}
        >
          <div className="space-y-2.5">
            <div className="tnum text-gap text-2xl leading-none font-bold">
              {gapScopes} / {totalScopes}
            </div>
            <div className="text-muted-foreground text-[11px]">scopes with no data at all</div>
            <Progress
              value={((totalScopes - gapScopes) / Math.max(1, totalScopes)) * 100}
              indicatorClassName="bg-gap"
            />
          </div>
        </BentoCard>

        <BentoCard
          tag="OUT"
          name="Values present but out of range"
          description="Null rate only catches missing values — this catches values that exist but cannot be real"
        >
          <div className="space-y-2.5">
            <div>
              <div className="tnum text-2xl leading-none font-bold">
                {outOfRange.toLocaleString('th-TH')}
              </div>
              <div className="text-muted-foreground mt-1 text-[11px]">
                rows worth checking by hand
              </div>
            </div>
            <div className="flex items-baseline gap-2 border-t pt-2.5">
              <span className="tnum text-base font-semibold">{showNum(d.totals.records)}</span>
              <span className="text-muted-foreground text-[11px]">
                records collected in total
              </span>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          tag="LOW"
          name="Lowest primary fill"
          {...(worstFill[0]
            ? { href: `/extractor/${worstFill[0].site}`, cta: 'Open the lowest one' }
            : {})}
        >
          <ol className="space-y-1.5">
            {worstFill.map((s, i) => (
              <li key={s.site} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-mono text-[10px]">{i + 1}</span>
                <span className="truncate font-medium">{s.domain}</span>
                <span className="tnum ml-auto shrink-0 font-semibold">
                  {showPct(s.primaryFillRate, 0)}
                </span>
              </li>
            ))}
          </ol>
        </BentoCard>
      </BentoGrid>

      <Panel
        title="How completely each site parsed"
        hint="High fill with empty scopes means we parsed what we fetched well — not that we covered the market"
        action={<Badge variant="muted">Sorted by severity</Badge>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">primary fill</TableHead>
              <TableHead className="text-right">out of range</TableHead>
              <TableHead className="text-right">scopes</TableHead>
              <TableHead>Symptom · owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((s) => (
              <Row key={s.site} s={s} />
            ))}

            {pending.length > 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-2">
                  <button
                    type="button"
                    onClick={() => setShowPending((v) => !v)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[12px]"
                  >
                    <ChevronDown
                      className={cn(
                        'size-3.5 transition-transform',
                        showPending && 'rotate-180',
                      )}
                    />
                    {pending.length} more {pending.length === 1 ? 'site has' : 'sites have'} no
                    seed configured
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
        <SiteCell s={s} stage="extractor" />
      </TableCell>

      <TableCell>
        <StatusBadge status={s.status} />
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

      <TableCell className="max-w-[280px]">
        <div className="truncate text-[12px]">{s.symptom}</div>
        <div className="text-muted-foreground text-[11px]">{ownerLabel(s.owner)}</div>
      </TableCell>
    </TableRow>
  );
};
