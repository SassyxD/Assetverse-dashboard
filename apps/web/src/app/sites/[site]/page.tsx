'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import { api, qk } from '@/lib/api';
import { showNum, showPct, showSeconds } from '@/lib/format';
import { Panel, Pill, Stat, StatusPill, OwnerTag } from '@/components/ui';
import { SitePicker } from '@/components/site-picker';
import { KbmfTiers } from '@/components/kbmf-tiers';

export default function SitePage() {
  const site = String(useParams()['site'] ?? '');
  const { data, isPending, error } = useQuery({
    queryKey: qk.site(site),
    queryFn: () => api.site(site),
    enabled: site.length > 0,
  });

  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-16 pt-4">
      <header className="flex flex-wrap items-center gap-3.5 border-b border-line pb-3.5">
        <SitePicker current={site} />
        {data ? (
          <>
            <StatusPill status={data.status} />
            <OwnerTag owner={data.owner} />
            {!data.trustworthy && data.status !== 'never_run' ? (
              <Pill tone="gap">ข้อมูลน้อยเกินจะสรุป</Pill>
            ) : null}
          </>
        ) : null}
        <span className="ml-auto text-xs text-dim">รอบ {data?.cycle ?? '—'}</span>
      </header>

      <div className="pt-4">
        {isPending ? <p className="text-dim">กำลังโหลด…</p> : null}
        {error ? <p className="text-bad">โหลดไม่ได้: {error.message}</p> : null}
        {data ? (
          <>
            <Panel title="งานรอบนี้">
              {data.runs.length === 0 ? (
                <p className="text-dim">ยังไม่เคยรันเว็บนี้</p>
              ) : (
                data.runs.map((r) => (
                  <div key={r.id} className="border-b border-line-soft py-2.5 last:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={r.status} />
                      <b>{r.cycle}</b>
                      <span className="text-[11px] text-dim">{r.phase}</span>
                      <span className="tnum ml-auto text-[11px] text-faint">
                        {r.itemsSaved.toLocaleString()} รายการ · ข้าม {r.pagesSkipped} หน้า
                      </span>
                    </div>
                    {r.message ? (
                      <p className={clsx('mt-2 rounded px-2.5 py-1.5 text-[11.5px]',
                        r.status === 'source_down' ? 'bg-wait-bg text-wait' : 'bg-line-soft text-dim')}>
                        {r.message}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </Panel>

            <Panel title="Queue" hint="DLQ คือสัญญาณเตือนล่วงหน้า — โผล่ก่อน completeness ตก">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="frontier depth" text={showNum(data.queue.frontierDepth)} m={data.queue.frontierDepth} />
                <Stat label="parsing depth" text={showNum(data.queue.parsingDepth)} m={data.queue.parsingDepth} />
                <Stat label="dead letter (DLQ)" text={showNum(data.queue.deadLetterDepth)} m={data.queue.deadLetterDepth} />
                <Stat label="in-flight (ยังไม่ ack)" text={showNum(data.queue.inFlight)} m={data.queue.inFlight} />
                <Stat label="avg queue wait" text={showSeconds(data.queue.avgWaitSeconds)} m={data.queue.avgWaitSeconds} />
                <Stat label="purged" text={showNum(data.queue.purged)} m={data.queue.purged} />
                <div>
                  <div className="text-[10.5px] text-faint">Tq2q ตั้งไว้ / วัดได้</div>
                  <div className="tnum mt-px text-base font-semibold">
                    {data.queue.tq2qConfiguredMs} ms
                    <span className="text-faint"> / —</span>
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-dim">invariant: fetch2fetch &lt; Tq2q</div>
                </div>
              </div>
              {data.queue.deadLetterReasons.length > 0 ? (
                <div className="mt-4">
                  <h3 className="mb-1.5 text-xs font-semibold">เหตุผลที่เข้า DLQ</h3>
                  {data.queue.deadLetterReasons.map((r) => (
                    <div key={r.reason} className="flex justify-between border-b border-line-soft py-1 text-[11.5px] last:border-0">
                      <span>{r.reason}</span>
                      <span className="tnum font-semibold">{r.count}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </Panel>

            <Panel title="Fetcher (Crawler)">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="crawl completeness" text={showPct(data.crawler.crawlCompleteness)} m={data.crawler.crawlCompleteness} />
                <Stat label="record ที่เก็บได้" text={showNum(data.crawler.savedRecords)} m={data.crawler.savedRecords} />
                <Stat label="ประกาศทั้งหมดบนเว็บ" text={showNum(data.crawler.listedOnMarketplace)} m={data.crawler.listedOnMarketplace} />
                <Stat label="retry rate" text={showPct(data.crawler.retryRate)} m={data.crawler.retryRate} />
                <Stat label="URL ใหม่ที่ต้องเก็บ" text={showPct(data.crawler.newUrlRatio)} m={data.crawler.newUrlRatio} />
                <Stat label="ประกาศที่หายไป" text={showNum(data.crawler.delistedUrls)} m={data.crawler.delistedUrls} />
                <Stat label="เวลาที่ใช้" text={showSeconds(data.crawler.totalCrawlerSeconds)} m={data.crawler.totalCrawlerSeconds} />
                <Stat label="throughput" text={showNum(data.crawler.throughputPagesPerMin)} m={data.crawler.throughputPagesPerMin} />
              </div>
            </Panel>

            <CoveragePanel coverage={data.coverage} />

            <Panel title="Extractor">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="extract success rate" text={showPct(data.extractor.primFieldsSuccessRate)} m={data.extractor.primFieldsSuccessRate} />
                <Stat label="primary null rate" text={showPct(data.extractor.primFieldsNullRate)} m={data.extractor.primFieldsNullRate} />
                <Stat label="fallback null rate" text={showPct(data.extractor.fallbackFieldsNullRate)} m={data.extractor.fallbackFieldsNullRate} />
                <Stat label="เวลาที่ใช้" text={showSeconds(data.extractor.totalExtractorSeconds)} m={data.extractor.totalExtractorSeconds} />
              </div>
            </Panel>

            <KbmfTiers tiers={data.tiers} />

            {data.missingCombos.length > 0 ? (
              <Panel title="สาเหตุที่แถวตก primary" hint="บอกว่าควรไปแก้ field ไหนก่อน">
                {data.missingCombos.map((c) => (
                  <div key={c.fields.join(',')} className="flex items-center gap-3 border-b border-line-soft py-1.5 text-[11.5px] last:border-0">
                    <code className="font-mono">{c.fields.join(' + ')}</code>
                    <span className="tnum ml-auto">{c.records.toLocaleString()}</span>
                    <span className="tnum w-14 text-right text-dim">{(c.share * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </Panel>
            ) : null}

            {data.rangeChecks.length > 0 ? (
              <Panel title="ค่าที่มีแต่น่าสงสัย" hint="null rate จับได้แต่ค่าที่หาย ไม่จับค่าที่ผิด">
                {data.rangeChecks.map((r) => (
                  <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line-soft py-1.5 last:border-0">
                    <div>
                      <div className="text-[12px]"><b>{r.field}</b> — {r.label}</div>
                      <div className="text-[11px] text-dim">{r.expectation}</div>
                    </div>
                    <span className={clsx('tnum text-right text-xs',
                      r.records > 0 && r.severity === 'warn' && 'font-semibold text-gap')}>
                      {r.records.toLocaleString()} แถว
                    </span>
                  </div>
                ))}
              </Panel>
            ) : null}

            <Panel title="LLM recovery" hint="ลูปในไดอะแกรมไม่มีเงื่อนไขหยุด — ต้องเห็นรอบที่วน">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="เรียก LLM Gateway" text={showNum(data.llmRecovery.invocations)} m={data.llmRecovery.invocations} />
                <Stat label="recovery rate" text={showPct(data.llmRecovery.recoveryRate)} m={data.llmRecovery.recoveryRate} />
                <Stat label="รอบที่วนไปแล้ว" text={showNum(data.llmRecovery.iterations)} m={data.llmRecovery.iterations} />
                <Stat label="token ที่ใช้" text={showNum(data.llmRecovery.tokensUsed)} m={data.llmRecovery.tokensUsed} />
              </div>
            </Panel>

            <Panel title="องค์ประกอบของทีมอื่น" hint="change detection · PII · 2captcha">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold">Change detection <Pill tone="mute">ทีมอื่น</Pill></h3>
                  <Stat label="หน้าที่ตรวจ" text={showNum(data.changeDetection.pagesChecked)} m={data.changeDetection.pagesChecked} />
                  <div className="mt-2"><Stat label="โครง html เปลี่ยน" text={showNum(data.changeDetection.changeKind.structure)} m={data.changeDetection.changeKind.structure} /></div>
                </div>
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold">PII detector <Pill tone="mute">ทีมอื่น</Pill></h3>
                  <Stat label="สแกนแล้ว" text={showNum(data.pii.scanned)} m={data.pii.scanned} />
                  <p className="mt-2 text-[11px] text-dim">
                    ทำ detect ที่ขั้น: <b>{data.pii.stage === 'unknown' ? 'ยังไม่ทราบ' : data.pii.stage}</b>
                    {data.pii.stage === 'unknown' ? ' — ต้องเคาะกับทีมนั้น ถ้าอยู่หลังเซฟ S3 แปลว่า PII ค้างใน S3 ก่อนถูกตรวจ' : null}
                  </p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold">2captcha <Pill tone="mute">ทีมอื่น</Pill></h3>
                  <Stat label="ครั้งที่เรียก" text={showNum(data.captcha.solveAttempts)} m={data.captcha.solveAttempts} />
                  <p className="mt-2 text-[11px] text-dim">ยังไม่มีระบบนี้ — ที่เจอคือ HTTP 523 (origin ล่ม) ไม่ใช่ captcha</p>
                </div>
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </main>
  );
}

const CoveragePanel = ({ coverage }: { coverage: import('@assetverse/contracts').Coverage }) => (
  <Panel
    title="ครอบคลุมอะไรบ้าง"
    hint={`${coverage.scopesWithData} / ${coverage.scopesTotal} ขอบเขต — ยอดรวมไม่บอกเรื่องนี้`}
  >
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[10.5px] text-faint">
          <th className="px-2 py-1.5 text-left font-semibold">ประเภททรัพย์</th>
          <th className="px-2 py-1.5 text-right font-semibold">ขายอยู่</th>
          <th className="px-2 py-1.5 text-right font-semibold">ขายแล้ว</th>
          <th className="px-2 py-1.5 text-right font-semibold">จังหวัด</th>
        </tr>
      </thead>
      <tbody>
        {[...new Set(coverage.cells.map((c) => c.propertyType))].map((pt) => {
          const row = coverage.cells.filter((c) => c.propertyType === pt);
          const best = row.reduce((a, b) => (b.records > a.records ? b : a));
          return (
            <tr key={pt} className="border-b border-line-soft last:border-0">
              <td className="px-2 py-1.5">{pt}</td>
              {['ขายอยู่', 'ขายแล้ว'].map((ss) => {
                const cell = row.find((c) => c.sellState === ss);
                const n = cell?.records ?? 0;
                return (
                  <td key={ss} className={clsx('tnum px-2 py-1.5 text-right',
                    n === 0 ? 'gap-hatch text-center font-bold text-gap' : 'text-dim')}>
                    {n === 0 ? 'ยังไม่เก็บ' : n.toLocaleString()}
                  </td>
                );
              })}
              <td className={clsx('tnum px-2 py-1.5 text-right',
                best.areasCovered === 0 && 'font-semibold text-gap')}>
                {best.areasCovered} / {best.areasTotal}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {coverage.areas.length > 0 ? (
      <div className="mt-4">
        <h3 className="mb-1.5 text-xs font-semibold">
          จังหวัดที่มีข้อมูล
          <span className="ml-2 font-normal text-dim">
            (สีส้ม = มีไม่ถึง 10 แถว นับว่ามีข้อมูลไม่ได้)
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-x-6 md:grid-cols-3">
          {coverage.areas.map((a) => (
            <div key={a.area} className="flex justify-between border-b border-line-soft py-1 text-[11.5px]">
              <span>{a.area}</span>
              <span className={clsx('tnum', a.belowUsableThreshold ? 'font-semibold text-gap' : 'text-dim')}>
                {a.records.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : null}
  </Panel>
);
