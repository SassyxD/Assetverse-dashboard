'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Database, Gauge, Percent } from 'lucide-react';
import type { InfraMetrics, SiteSnapshot } from '@assetverse/contracts';

import { api, qk } from '@/lib/api';
import { NO_DATA, showNum, showPct, showSeconds } from '@/lib/format';
import { Shell } from '@/components/shell';
import {
  Breakdown,
  Field,
  FieldGrid,
  NotWired,
  Panel,
  StatusBadge,
  allMissing,
  ownerLabel,
} from '@/components/measure';
import { PipelineStages, type Stage } from '@/components/pipeline-stages';
import { DashboardMetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';

const OWNER_LABEL = { our_team: 'Owned by us', other_team: 'Owned by another team' } as const;

export default function FetcherSitePage() {
  const site = String(useParams()['site'] ?? '');
  const { data, isPending, error } = useQuery({
    queryKey: qk.site(site),
    queryFn: () => api.site(site),
    enabled: site.length > 0,
  });
  const { data: summary } = useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });

  if (isPending)
    return (
      <Shell title={site}>
        <p className="text-muted-foreground text-sm">Loading</p>
      </Shell>
    );
  if (error)
    return (
      <Shell title={site}>
        <p className="text-bad text-sm">Could not load: {error.message}</p>
      </Shell>
    );

  const d = data;
  const change = [
    d.changeDetection.pagesChecked,
    d.changeDetection.pagesChanged,
    d.changeDetection.recrawlsTriggered,
    d.changeDetection.changeKind.content,
    d.changeDetection.changeKind.structure,
  ];
  const captcha = [d.captcha.solveAttempts, d.captcha.solveSuccessRate, d.captcha.costUsd];
  const kind = d.crawler.pageKind;

  return (
    <Shell
      title={`Fetcher · ${site}`}
      hint={ownerLabel(d.owner)}
      actions={
        <>
          <StatusBadge status={d.status} />
          {!d.trustworthy && d.status !== 'never_run' ? (
            <Badge variant="gap">Low confidence</Badge>
          ) : null}
        </>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          desc="Share of the site's listings we actually fetched"
          title="%crawl_Completeness"
          value={showPct(d.crawler.crawlCompleteness)}
          icon={Percent}
          missing={d.crawler.crawlCompleteness.state === 'unavailable'}
          note={d.crawler.crawlCompleteness.note}
        />
        <DashboardMetricCard
          desc="Rows written to storage this cycle"
          title="saved_records"
          value={showNum(d.crawler.savedRecords)}
          icon={Database}
          missing={d.crawler.savedRecords.state === 'unavailable'}
          note={d.crawler.savedRecords.note}
        />
        <DashboardMetricCard
          desc="Messages that failed every retry"
          title="dlq_count"
          value={showNum(d.queue.deadLetterDepth)}
          icon={AlertTriangle}
          missing={d.queue.deadLetterDepth.state === 'unavailable'}
          note="Fills up before completeness drops"
        />
        <DashboardMetricCard
          desc="Pages fetched per minute"
          title="throughput_per_min"
          value={showNum(d.crawler.throughputPagesPerMin)}
          icon={Gauge}
          missing={d.crawler.throughputPagesPerMin.state === 'unavailable'}
          note={d.crawler.throughputPagesPerMin.note}
        />
      </div>

      <Panel
        title="Fetch-side pipeline"
        hint="In real flow order · a hatched box means not measured, not zero"
        className="mb-5"
      >
        <PipelineStages stages={stagesOf(d, summary?.infra)} />
      </Panel>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel title="Fetcher" hint="The denominator is how many listings the site says it has">
          <FieldGrid className="lg:grid-cols-3">
            <Field
              desc="Saved rows divided by the listings the site advertises"
              name="%crawl_Completeness"
              m={d.crawler.crawlCompleteness}
              format={(m) => showPct(m)}
            />
            <Field
              desc="Rows written to storage this cycle"
              name="saved_records"
              m={d.crawler.savedRecords}
            />
            <Field
              desc="Listings the site says it has — the denominator"
              name="listed_on_marketplace"
              m={d.crawler.listedOnMarketplace}
            />
            <Field
              desc="Share of fetches that had to be retried"
              name="retry_Rate"
              m={d.crawler.retryRate}
              format={(m) => showPct(m)}
            />
            <Field
              desc="Share of fetched URLs never seen before"
              name="ratio_newURL"
              m={d.crawler.newUrlRatio}
              format={(m) => showPct(m)}
            />
            <Field
              desc="URLs that disappeared from the source since last cycle"
              name="no_delisted_URLs"
              m={d.crawler.delistedUrls}
            />
            <Field
              desc="Wall-clock time the fetcher ran"
              name="total_crawler_time"
              m={d.crawler.totalCrawlerSeconds}
              format={showSeconds}
            />
            <Field
              desc="Pages fetched per minute"
              name="throughput_per_min"
              m={d.crawler.throughputPagesPerMin}
            />
          </FieldGrid>

          {d.crawler.statusCounts.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                HTTP statuses seen
              </h3>
              <Breakdown
                rows={d.crawler.statusCounts.map((s) => ({
                  label: String(s.status),
                  value: s.count,
                  hint:
                    s.status >= 500
                      ? 'Source is down — safe to wait'
                      : 'We are blocked — lower the rate',
                }))}
              />
            </div>
          ) : null}

          {kind.listing + kind.detail > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                Page types fetched
              </h3>
              <Breakdown
                rows={[
                  {
                    label: 'listing',
                    value: kind.listing,
                    hint: 'Index pages, used to discover more URLs',
                  },
                  {
                    label: 'detail',
                    value: kind.detail,
                    hint: 'Detail pages, the ones that become records',
                  },
                ]}
              />
            </div>
          ) : null}
        </Panel>

        <Panel
          title="Queue and DLQ"
          hint="Ack happens after a successful save, so anything pending counts as in-flight"
        >
          <FieldGrid className="lg:grid-cols-3">
            <Field
              desc="URLs waiting to be fetched"
              name="queue_depth (frontier)"
              m={d.queue.frontierDepth}
            />
            <Field
              desc="Fetched pages waiting to be parsed"
              name="queue_depth (parsing)"
              m={d.queue.parsingDepth}
            />
            <Field
              desc="Messages that failed every retry"
              name="dlq_count"
              m={d.queue.deadLetterDepth}
            />
            <Field desc="Picked up but not yet acked" name="in_flight" m={d.queue.inFlight} />
            <Field
              desc="How long a message sits before pickup"
              name="avg_queue_wait_time"
              m={d.queue.avgWaitSeconds}
              format={showSeconds}
            />
            <Field
              desc="Messages dropped from the queue by hand"
              name="purged_messages"
              m={d.queue.purged}
            />
            <Field
              desc="Measured gap between queue hops"
              name="tq2q_observed"
              m={d.queue.tq2qObservedMs}
              hint={`Configured at ${d.queue.tq2qConfiguredMs} ms`}
            />
          </FieldGrid>
          {d.queue.deadLetterReasons.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                Why messages landed in the DLQ
              </h3>
              <Breakdown
                rows={d.queue.deadLetterReasons.map((r) => ({
                  label: r.reason,
                  value: r.count,
                }))}
              />
            </div>
          ) : null}
        </Panel>

        <Panel
          title="Change detection"
          hint="Runs at the seeding stage — counts URLs entering the frontier"
          action={<Badge variant="muted">{OWNER_LABEL[d.changeDetection.owner]}</Badge>}
        >
          {allMissing(change) ? (
            <NotWired ms={change} />
          ) : (
            <FieldGrid className="lg:grid-cols-3">
              <Field
                desc="Pages re-checked for changes"
                name="pages_checked"
                m={d.changeDetection.pagesChecked}
              />
              <Field
                desc="Pages whose content differed"
                name="pages_changed"
                m={d.changeDetection.pagesChanged}
              />
              <Field
                desc="Re-crawls queued as a result"
                name="recrawls_triggered"
                m={d.changeDetection.recrawlsTriggered}
              />
              <Field
                desc="Text changed — a re-fetch brings new data"
                name="content_changed"
                m={d.changeDetection.changeKind.content}
              />
              <Field
                desc="HTML structure changed — existing selectors break"
                name="structure_changed"
                m={d.changeDetection.changeKind.structure}
                className="col-span-2 lg:col-span-2"
              />
            </FieldGrid>
          )}
        </Panel>

        <Panel
          title="2captcha"
          hint="What we actually hit is HTTP 523, which is a different problem from captchas"
          action={<Badge variant="muted">{OWNER_LABEL[d.captcha.owner]}</Badge>}
        >
          {allMissing(captcha) ? (
            <NotWired ms={captcha} />
          ) : (
            <FieldGrid className="lg:grid-cols-3">
              <Field
                desc="Captcha solve attempts sent"
                name="2captcha_Count"
                m={d.captcha.solveAttempts}
              />
              <Field
                desc="Share of attempts that came back solved"
                name="solve_success_rate"
                m={d.captcha.solveSuccessRate}
                format={(m) => showPct(m)}
              />
              <Field desc="Spend on captcha solving" name="cost_usd" m={d.captcha.costUsd} />
            </FieldGrid>
          )}
        </Panel>
      </div>

      <Panel title="Runs this cycle" className="mt-5">
        {d.runs.length === 0 ? (
          <p className="text-muted-foreground text-sm">This site has never been run</p>
        ) : (
          <ul className="divide-y">
            {d.runs.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="tnum text-sm font-medium">{r.cycle}</span>
                  <span className="text-muted-foreground text-[11px]">{r.phase}</span>
                  <span className="tnum text-muted-foreground ml-auto text-[11px]">
                    {r.itemsSaved.toLocaleString('en-US')} items · {r.pagesSkipped} pages
                    skipped
                  </span>
                </div>
                {r.message ? (
                  <p className="text-muted-foreground mt-1.5 text-[12px]">{r.message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Shell>
  );
}

/** S1–S5 คือช่วงที่ fetcher รับผิดชอบ จบที่ของลง S3 · ที่เหลือไปต่อหน้า Extractor */
const stagesOf = (d: SiteSnapshot, infra?: InfraMetrics): Stage[] => {
  const miss = (m: { state: string }) => m.state === 'unavailable';
  return [
    {
      num: 'S1',
      name: 'Seeding',
      value: showNum(d.crawler.listedOnMarketplace),
      sub: 'URLs to collect',
      missing: miss(d.crawler.listedOnMarketplace),
      team: 'change detection',
    },
    {
      num: 'S2',
      name: 'Frontier queue',
      value: showNum(d.queue.frontierDepth),
      sub: `in-flight ${showNum(d.queue.inFlight)}`,
      missing: miss(d.queue.frontierDepth),
    },
    {
      num: 'S3',
      name: 'DLQ',
      value: showNum(d.queue.deadLetterDepth),
      sub: `retry ${showPct(d.crawler.retryRate)}`,
      missing: miss(d.queue.deadLetterDepth),
    },
    {
      num: 'S4',
      name: 'Fetcher',
      value: showNum(d.crawler.throughputPagesPerMin),
      sub: 'pages/min',
      missing: miss(d.crawler.throughputPagesPerMin),
      team: '2captcha',
    },
    {
      num: 'S5',
      name: 'S3 + Aurora',
      value: infra ? showNum(infra.s3.objects) : NO_DATA,
      sub: `Aurora ${infra ? showNum(infra.aurora.rows) : NO_DATA}`,
      missing: !infra || miss(infra.s3.objects),
      team: 'PII detector',
    },
  ];
};
