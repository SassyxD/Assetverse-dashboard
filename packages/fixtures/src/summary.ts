import type {
  DashboardSummary, Headline, SiteOverview, SiteSnapshot, InfraMetrics,
} from '@assetverse/contracts';
import { SITES, ok, unavailable, NETWORK_PATH } from '@assetverse/contracts';
import { SEEDS, buildSnapshot } from './snapshot.js';

export const snapshots = (): SiteSnapshot[] => SEEDS.map(buildSnapshot);

/**
 * severity มาก = ควรไปดูก่อน คิดที่ backend ไม่ให้ UI เดาลำดับเอง
 * "รอต้นทาง" ได้คะแนนน้อยกว่า "พังจริง" เพราะไม่ต้องทำอะไร
 */
const severityOf = (s: SiteSnapshot): number => {
  let n = 0;
  if (s.status === 'failed') n += 100;
  if (s.status === 'network_path_down') n += 90;
  if (s.status === 'throttled') n += 80;
  if (s.status === 'source_down') n += 30;
  if (s.status === 'never_run') n += 20;
  if (!s.trustworthy && s.status !== 'never_run') n += 40;
  n += (s.queue.deadLetterDepth.value ?? 0) * 2;
  n += (s.coverage.scopesTotal - s.coverage.scopesWithData) * 3;
  return n;
};

const n = (v: number) => v.toLocaleString('en-US');

/** "1 sources" อ่านแล้วสะดุด ตัวเลขที่เป็น 1 ได้ต้องผ่านตัวนี้ */
const plural = (c: number, w: string) => `${n(c)} ${w}${c === 1 ? '' : 's'}`;

/** อาการสั้นที่สุดที่ยังบอกได้ว่าเกิดอะไร ไม่ใช่ประโยคอธิบาย */
const symptomOf = (s: SiteSnapshot): string => {
  if (s.status === 'never_run') return 'No seed configured';
  if (s.status === 'source_down') return 'Source returns 523 — the system waits and retries';
  if (s.status === 'network_path_down') return 'Our path does not reach the target';
  if (s.status === 'throttled') return 'Blocked — we need to lower the rate';
  if (s.status === 'failed') return 'Job stopped mid-cycle';
  if (!s.trustworthy) {
    const got = s.crawler.savedRecords.value ?? 0;
    const listed = s.crawler.listedOnMarketplace.value;
    return listed === null ? `Saved ${n(got)} rows` : `Saved ${n(got)} of ${n(listed)} rows`;
  }
  const gaps = s.coverage.scopesTotal - s.coverage.scopesWithData;
  return gaps > 0 ? `${plural(gaps, 'scope')} still empty` : 'Normal';
};

export const overview = (): SiteOverview[] =>
  snapshots()
    .map((s) => {
      const meta = SITES.find((x) => x.id === s.site)!;
      const primary = s.tiers.find((t) => t.tier === 'primary')!;
      return {
        site: s.site,
        domain: meta.domain,
        label: meta.label,
        kind: meta.kind,
        status: s.status,
        owner: s.owner,
        trustworthy: s.trustworthy,
        savedRecords: s.crawler.savedRecords,
        crawlCompleteness: s.crawler.crawlCompleteness,
        primaryFillRate: primary.fillRate,
        deadLetterDepth: s.queue.deadLetterDepth,
        outOfRangeRecords: s.status === 'never_run'
          ? unavailable<number>('Never collected data for this site')
          : ok(s.rangeChecks.reduce((sum, r) => sum + r.records, 0)),
        symptom: symptomOf(s),
        scopesWithData: s.coverage.scopesWithData,
        scopesTotal: s.coverage.scopesTotal,
        severity: severityOf(s),
      };
    })
    .sort((a, b) => b.severity - a.severity);

const infra = (): InfraMetrics => ({
  s3: {
    objects: ok(57_591),
    bytes: ok(262_144_000),
    monthlyCostUsd: unavailable('Cost Explorer is not wired up yet'),
  },
  aurora: {
    rows: unavailable('Aurora is not wired up — the crawler writes to disk for now'),
    replicaLagMs: unavailable('Aurora is not wired up yet'),
    connections: unavailable('Aurora is not wired up yet'),
  },
  fargate: {
    tasksRunning: ok(1),
    tasksFailed: ok(0),
    cpuPct: unavailable('CloudWatch is not wired up yet'),
    memoryPct: unavailable('CloudWatch is not wired up yet'),
  },
  cloudwatchAlarms: [],
  // เว็บเป้าหมายล่ม แต่เส้นทางของเราปกติ — แยกให้เห็นว่าไม่ใช่ปัญหาของ infra
  networkPath: NETWORK_PATH.map((h) => ({
    id: h.id,
    label: h.label,
    status: h.id === 'target' ? ('down' as const) : ('ok' as const),
    ...(h.id === 'target'
      ? { detail: 'baania returns 523 · Cloudflare cannot reach the origin (cf-cache-status: STALE)' }
      : {}),
  })),
  storageAvailability: unavailable('Total storage size is not defined yet'),
});

const headlines = (rows: SiteOverview[], snaps: SiteSnapshot[]): Headline[] => {
  const withData = rows.filter((r) => r.status !== 'never_run');
  const trusted = withData.filter((r) => r.trustworthy);
  const needsUs = rows.filter((r) => r.owner === 'us' || r.owner === 'infra');
  const waiting = rows.filter((r) => r.owner === 'nobody_wait');
  const gaps = snaps.reduce((s, x) => s + (x.coverage.scopesTotal - x.coverage.scopesWithData), 0);
  const total = snaps.reduce((s, x) => s + x.coverage.scopesTotal, 0);

  return [
    {
      question: 'How far along is this cycle?',
      answer: `${withData.length} / ${rows.length} sites done`,
      tone: withData.length < rows.length / 2 ? 'gap' : 'ok',
      detail: `${plural(rows.length - withData.length, 'site')} have not run`,
    },
    {
      question: 'Is anything broken?',
      answer: needsUs.length === 0 ? 'Nothing' : plural(needsUs.length, 'site'),
      tone: needsUs.length === 0 ? 'wait' : 'bad',
      detail:
        needsUs.length === 0
          ? `Waiting on ${plural(waiting.length, 'source')} — the system retries on its own`
          : needsUs.map((r) => r.domain).join(' · '),
    },
    {
      question: 'Can we trust the numbers?',
      answer: `${trusted.length} / ${withData.length} sites`,
      tone: trusted.length === withData.length ? 'ok' : 'gap',
      detail:
        withData
          .filter((r) => !r.trustworthy)
          .map((r) => `${r.domain} ${n(r.savedRecords.value ?? 0)} rows`)
          .join(' · ') || 'Sample size is sufficient everywhere',
    },
    {
      question: 'What is still missing?',
      answer: `${gaps} / ${total} scopes missing`,
      tone: 'gap',
      detail: 'Scope = property type × sell state',
    },
  ];
};

export const dashboard = (): DashboardSummary => {
  const snaps = snapshots();
  const rows = overview();
  const withData = rows.filter((r) => r.status !== 'never_run');
  return {
    cycle: '2026-09',
    cycleDay: 7,
    phase: 'script_upload',
    generatedAt: new Date().toISOString(),
    headlines: headlines(rows, snaps),
    sites: rows,
    infra: infra(),
    totals: {
      sitesDone: rows.filter((r) => r.status === 'ok').length,
      sitesRunning: 0,
      sitesPending: rows.filter((r) => r.status === 'never_run').length,
      sitesBlocked: rows.filter((r) => r.owner === 'us' || r.owner === 'infra').length,
      storageBytes: ok(605_028_352),
      records: ok(withData.reduce((s, r) => s + (r.savedRecords.value ?? 0), 0)),
    },
  };
};
