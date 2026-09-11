'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { MONTHLY_CALENDAR, type SiteOverview } from '@assetverse/contracts';

import { api, qk } from '@/lib/api';
import { showPct, num } from '@/lib/format';
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
const TITLE = 'Fetcher';

export default function FetcherOverviewPage() {
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
  const [q1, q2] = d.headlines;
  const top = d.sites.slice(0, 3);
  const buckets = [
    { key: 'us', label: 'Our team', rows: d.sites.filter((s) => s.owner === 'us') },
    { key: 'infra', label: 'Infra team', rows: d.sites.filter((s) => s.owner === 'infra') },
    {
      key: 'wait',
      label: 'Waiting on source',
      rows: d.sites.filter((s) => s.owner === 'nobody_wait'),
    },
  ];
  const firstNeedy = buckets.flatMap((b) => (b.key === 'wait' ? [] : b.rows))[0];
  const next = MONTHLY_CALENDAR.find((c) => c.day > d.cycleDay);
  const active = d.sites.filter((s) => s.status !== 'never_run');
  const pending = d.sites.filter((s) => s.status === 'never_run');
  const dlq = d.sites.reduce((n, s) => n + (s.deadLetterDepth.value ?? 0), 0);
  const dlqSites = d.sites.filter((s) => (s.deadLetterDepth.value ?? 0) > 0);

  return (
    <Shell
      title={`${TITLE} — all ${d.sites.length} sites`}
      hint="The fetch stage — sorted by severity. Click a site name to drill into it."
    >
      <BentoGrid className="mb-5 xl:grid-cols-4">
        <BentoCard
          tag="Q1"
          name={q1?.question ?? 'How far along is this cycle?'}
          description={q1?.detail}
        >
          <div className="space-y-3">
            <div className="tnum text-2xl leading-none font-bold">{q1?.answer}</div>
            <div>
              <Progress value={(d.cycleDay / 30) * 100} />
              <div className="text-muted-foreground mt-1.5 flex justify-between font-mono text-[10px]">
                <span>Today D{d.cycleDay}</span>
                <span>{next ? `Next D${next.day} · ${next.label}` : 'Cycle complete'}</span>
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          tag="Q2"
          name={q2?.question ?? 'Is anything broken?'}
          {...(firstNeedy
            ? { href: `/fetcher/${firstNeedy.site}`, cta: 'Open the first one' }
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

        <BentoCard
          tag="S3"
          name="How much is stuck in the DLQ?"
          description="The DLQ fills up before completeness drops — treat it as the early warning"
        >
          <div className="space-y-2.5">
            <div>
              <div
                className={cn('tnum text-2xl leading-none font-bold', dlq > 0 && 'text-gap')}
              >
                {num(dlq)}
              </div>
              <div className="text-muted-foreground mt-1 text-[11px]">
                messages in the dead-letter queue
              </div>
            </div>
            <div className="flex items-baseline gap-2 border-t pt-2.5">
              <span className="tnum text-base font-semibold">{dlqSites.length}</span>
              <span className="text-muted-foreground text-[11px]">
                sites with something stuck
              </span>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          tag="TOP"
          name="Which site first?"
          {...(top[0] ? { href: `/fetcher/${top[0].site}`, cta: 'Open the top one' } : {})}
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
        title="How much each site yielded"
        hint="No Δ against the previous cycle yet — historical snapshots are not kept"
        action={<Badge variant="muted">Sorted by severity</Badge>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">saved_records</TableHead>
              <TableHead className="text-right">%crawl_Completeness</TableHead>
              <TableHead className="text-right">dlq_count</TableHead>
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
  const comp = s.crawlCompleteness.value;

  return (
    <TableRow>
      <TableCell className="max-w-[190px]">
        <SiteCell s={s} stage="fetcher" />
      </TableCell>

      <TableCell>
        <StatusBadge status={s.status} />
      </TableCell>

      <TableCell className="text-right">
        <Cell m={s.savedRecords} />
      </TableCell>

      <TableCell className="text-right">
        <Cell m={s.crawlCompleteness} format={(m) => showPct(m)} />
        {comp !== null ? (
          <Progress
            value={comp * 100}
            className="mt-1.5 ml-auto h-1 w-16"
            indicatorClassName={comp < 0.8 ? 'bg-gap' : 'bg-ok'}
          />
        ) : null}
      </TableCell>

      <TableCell
        className={cn(
          'text-right',
          (s.deadLetterDepth.value ?? 0) > 0 && 'text-gap font-semibold',
        )}
      >
        <Cell m={s.deadLetterDepth} />
      </TableCell>

      <TableCell className="max-w-[280px]">
        <div className="truncate text-[12px]">{s.symptom}</div>
        <div className="text-muted-foreground text-[11px]">{ownerLabel(s.owner)}</div>
      </TableCell>
    </TableRow>
  );
};
