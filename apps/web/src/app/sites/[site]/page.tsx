'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Database, Layers, Percent } from 'lucide-react';
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

export default function SitePipelinePage() {
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
        <p className="text-muted-foreground text-sm">กำลังโหลด</p>
      </Shell>
    );
  if (error)
    return (
      <Shell title={site}>
        <p className="text-bad text-sm">โหลดไม่ได้: {error.message}</p>
      </Shell>
    );

  const d = data;
  const primary = d.tiers.find((t) => t.tier === 'primary');
  const llm = [
    d.llmRecovery.invocations,
    d.llmRecovery.recoveryRate,
    d.llmRecovery.iterations,
    d.llmRecovery.scriptsGenerated,
    d.llmRecovery.scriptsAccepted,
    d.llmRecovery.tokensUsed,
  ];
  const change = [d.changeDetection.pagesChecked, d.changeDetection.changeKind.structure];
  const pii = [d.pii.scanned, d.pii.found];
  const captcha = [d.captcha.solveAttempts, d.captcha.costUsd];

  return (
    <Shell
      title={site}
      hint={ownerLabel(d.owner)}
      actions={
        <>
          <StatusBadge status={d.status} />
          {!d.trustworthy && d.status !== 'never_run' ? (
            <Badge variant="gap">ยันไม่ได้</Badge>
          ) : null}
        </>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="%crawl_Completeness"
          value={showPct(d.crawler.crawlCompleteness)}
          icon={Percent}
          missing={d.crawler.crawlCompleteness.state === 'unavailable'}
          note={d.crawler.crawlCompleteness.note}
        />
        <DashboardMetricCard
          title="saved_records"
          value={showNum(d.crawler.savedRecords)}
          icon={Database}
          missing={d.crawler.savedRecords.state === 'unavailable'}
          note={d.crawler.savedRecords.note}
        />
        <DashboardMetricCard
          title="dlq_count"
          value={showNum(d.queue.deadLetterDepth)}
          icon={AlertTriangle}
          missing={d.queue.deadLetterDepth.state === 'unavailable'}
          note="โผล่ก่อน completeness ตก"
        />
        <DashboardMetricCard
          title="primary fill rate"
          value={primary ? showPct(primary.fillRate) : NO_DATA}
          icon={Layers}
          missing={!primary || primary.fillRate.state === 'unavailable'}
          note={
            primary && primary.recordCompleteRate.value !== null
              ? `record complete ${showPct(primary.recordCompleteRate)}`
              : undefined
          }
        />
      </div>

      <Panel
        title="สายงานรอบนี้"
        hint="เรียงตามการไหลจริง ช่องลายทแยงคือยังไม่ได้วัด ไม่ใช่ศูนย์"
        className="mb-5"
      >
        <PipelineStages stages={stagesOf(d, summary?.infra)} />
      </Panel>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel title="Queue และ DLQ" hint="ack หลังเซฟสำเร็จ ของที่ค้างจึงนับเป็น in-flight">
          <FieldGrid className="lg:grid-cols-3">
            <Field name="queue_depth (frontier)" m={d.queue.frontierDepth} />
            <Field name="queue_depth (parsing)" m={d.queue.parsingDepth} />
            <Field name="dlq_count" m={d.queue.deadLetterDepth} />
            <Field name="in_flight" m={d.queue.inFlight} />
            <Field name="avg_queue_wait_time" m={d.queue.avgWaitSeconds} format={showSeconds} />
            <Field name="purged_messages" m={d.queue.purged} />
            <Field
              name="Tq2q ที่วัดได้"
              m={d.queue.tq2qObservedMs}
              hint={`ตั้งไว้ ${d.queue.tq2qConfiguredMs} ms`}
            />
          </FieldGrid>
          {d.queue.deadLetterReasons.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                เหตุผลที่เข้า DLQ
              </h3>
              <Breakdown
                rows={d.queue.deadLetterReasons.map((r) => ({ label: r.reason, value: r.count }))}
              />
            </div>
          ) : null}
        </Panel>

        <Panel title="Fetcher" hint="ตัวหารคือจำนวนประกาศที่เว็บนั้น list ไว้">
          <FieldGrid className="lg:grid-cols-3">
            <Field
              name="%crawl_Completeness"
              m={d.crawler.crawlCompleteness}
              format={(m) => showPct(m)}
            />
            <Field name="saved_records" m={d.crawler.savedRecords} />
            <Field name="listed_on_marketplace" m={d.crawler.listedOnMarketplace} />
            <Field name="retry_Rate" m={d.crawler.retryRate} format={(m) => showPct(m)} />
            <Field name="ratio_newURL" m={d.crawler.newUrlRatio} format={(m) => showPct(m)} />
            <Field name="no_delisted_URLs" m={d.crawler.delistedUrls} />
            <Field
              name="total_crawler_time"
              m={d.crawler.totalCrawlerSeconds}
              format={showSeconds}
            />
            <Field name="throughput /นาที" m={d.crawler.throughputPagesPerMin} />
          </FieldGrid>
          {d.crawler.statusCounts.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                http status ที่เจอ
              </h3>
              <Breakdown
                rows={d.crawler.statusCounts.map((s) => ({
                  label: String(s.status),
                  value: s.count,
                  hint: s.status >= 500 ? 'ต้นทางล่ม รอได้' : 'เราถูกบล็อก ต้องลด rate',
                }))}
              />
            </div>
          ) : null}
        </Panel>

        <Panel title="Extractor" hint="null rate จับค่าที่หาย ไม่จับค่าที่ผิด ดูคู่กับหน้าคุณภาพ">
          <FieldGrid className="lg:grid-cols-3">
            <Field
              name="txn_prim_Fields_SuccessRate"
              m={d.extractor.primFieldsSuccessRate}
              format={(m) => showPct(m)}
            />
            <Field
              name="%prim_Fields_Nullrate"
              m={d.extractor.primFieldsNullRate}
              format={(m) => showPct(m)}
            />
            <Field
              name="%fallbacks_Fields_Nullrate"
              m={d.extractor.fallbackFieldsNullRate}
              format={(m) => showPct(m)}
            />
            <Field name="extracted_records" m={d.extractor.extractedRecords} />
            <Field
              name="total_extractor_time"
              m={d.extractor.totalExtractorSeconds}
              format={showSeconds}
            />
          </FieldGrid>
          {d.tiers.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                fill rate ต่อ tier
              </h3>
              <Breakdown
                rows={d.tiers.map((t) => ({
                  label: t.tier,
                  value: Math.round((t.fillRate.value ?? 0) * 100),
                  display: showPct(t.fillRate, 0),
                  hint: t.passes ? `ผ่านเกณฑ์ ${t.threshold * 100}%` : `ต่ำกว่า ${t.threshold * 100}%`,
                }))}
              />
            </div>
          ) : null}
        </Panel>

        <Panel title="LLM recovery" hint="ลูปในไดอะแกรมไม่มีเงื่อนไขหยุด ต้องเห็นรอบที่วน">
          {allMissing(llm) ? (
            <NotWired ms={llm} />
          ) : (
            <FieldGrid className="lg:grid-cols-3">
              <Field name="llm_gateway_calls" m={d.llmRecovery.invocations} />
              <Field
                name="recovery_rate"
                m={d.llmRecovery.recoveryRate}
                format={(m) => showPct(m)}
              />
              <Field name="loop_iterations" m={d.llmRecovery.iterations} />
              <Field name="scripts_generated" m={d.llmRecovery.scriptsGenerated} />
              <Field name="scripts_accepted" m={d.llmRecovery.scriptsAccepted} />
              <Field name="token_cost" m={d.llmRecovery.tokensUsed} />
            </FieldGrid>
          )}
          {d.llmRecovery.ratePerIteration.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <Breakdown
                rows={d.llmRecovery.ratePerIteration.map((r) => ({
                  label: `รอบ ${r.iteration}`,
                  value: Math.round(r.recovered * 100),
                }))}
              />
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel title="งานรอบนี้" className="mt-5">
        {d.runs.length === 0 ? (
          <p className="text-muted-foreground text-sm">ยังไม่เคยรันเว็บนี้</p>
        ) : (
          <ul className="divide-y">
            {d.runs.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="tnum text-sm font-medium">{r.cycle}</span>
                  <span className="text-muted-foreground text-[11px]">{r.phase}</span>
                  <span className="tnum text-muted-foreground ml-auto text-[11px]">
                    {r.itemsSaved.toLocaleString('th-TH')} รายการ · ข้าม {r.pagesSkipped} หน้า
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

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Panel title="Change detection" hint="อยู่ขั้น Seeding นับ URL ที่เข้า frontier">
          {allMissing(change) ? (
            <NotWired ms={change} />
          ) : (
            <FieldGrid className="grid-cols-1">
              <Field name="pages_checked" m={d.changeDetection.pagesChecked} />
              <Field name="structure_changed" m={d.changeDetection.changeKind.structure} />
            </FieldGrid>
          )}
        </Panel>
        <Panel title="PII detector" hint="ถ้าอยู่หลังเซฟ S3 แปลว่า PII ค้างใน S3 ก่อนถูกตรวจ">
          {allMissing(pii) ? (
            <NotWired ms={pii} />
          ) : (
            <FieldGrid className="grid-cols-1">
              <Field name="scanned" m={d.pii.scanned} />
              <Field name="found" m={d.pii.found} />
            </FieldGrid>
          )}
          <p className="text-muted-foreground mt-2.5 text-[11px]">
            ขั้นที่ตรวจ: {d.pii.stage === 'unknown' ? 'ยังไม่ทราบ' : d.pii.stage}
          </p>
        </Panel>
        <Panel title="2captcha" hint="ที่เจอจริงคือ HTTP 523 คนละเรื่องกับ captcha">
          {allMissing(captcha) ? (
            <NotWired ms={captcha} />
          ) : (
            <FieldGrid className="grid-cols-1">
              <Field name="2captcha_Count" m={d.captcha.solveAttempts} />
              <Field name="cost_usd" m={d.captcha.costUsd} />
            </FieldGrid>
          )}
        </Panel>
      </div>
    </Shell>
  );
}

const stagesOf = (d: SiteSnapshot, infra?: InfraMetrics): Stage[] => {
  const miss = (m: { state: string }) => m.state === 'unavailable';
  return [
    {
      num: 'S1',
      name: 'Seeding',
      value: showNum(d.crawler.listedOnMarketplace),
      sub: 'URL ที่ต้องเก็บ',
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
      sub: 'หน้า/นาที',
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
    {
      num: 'S6',
      name: 'Parsing queue',
      value: showNum(d.queue.parsingDepth),
      sub: `รอ ${showSeconds(d.queue.avgWaitSeconds)}`,
      missing: miss(d.queue.parsingDepth),
    },
    {
      num: 'S7',
      name: 'Extractor',
      value: showPct(d.extractor.primFieldsSuccessRate),
      sub: `null ${showPct(d.extractor.primFieldsNullRate)}`,
      missing: miss(d.extractor.primFieldsSuccessRate),
    },
    {
      num: 'S8',
      name: 'LLM recovery',
      value: showPct(d.llmRecovery.recoveryRate),
      sub: `รอบที่วน ${showNum(d.llmRecovery.iterations)}`,
      missing: miss(d.llmRecovery.recoveryRate),
    },
  ];
};
