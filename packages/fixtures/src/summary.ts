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

const n = (v: number) => v.toLocaleString('th-TH');

/** อาการสั้นที่สุดที่ยังบอกได้ว่าเกิดอะไร ไม่ใช่ประโยคอธิบาย */
const symptomOf = (s: SiteSnapshot): string => {
  if (s.status === 'never_run') return 'ยังไม่ตั้ง seed';
  if (s.status === 'source_down') return 'ต้นทางตอบ 523 ระบบรอแล้วลองใหม่เอง';
  if (s.status === 'network_path_down') return 'เส้นทางเราไม่ถึงปลายทาง';
  if (s.status === 'throttled') return 'ถูกบล็อก ต้องลด rate';
  if (s.status === 'failed') return 'งานหยุดกลางรอบ';
  if (!s.trustworthy) {
    const got = s.crawler.savedRecords.value ?? 0;
    const listed = s.crawler.listedOnMarketplace.value;
    return listed === null ? `เก็บได้ ${n(got)} แถว` : `เก็บได้ ${n(got)} จาก ${n(listed)} แถว`;
  }
  const gaps = s.coverage.scopesTotal - s.coverage.scopesWithData;
  return gaps > 0 ? `ยังว่าง ${gaps} ขอบเขต` : 'ปกติ';
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
          ? unavailable<number>('ยังไม่เคยเก็บข้อมูลเว็บนี้')
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
    monthlyCostUsd: unavailable('ยังไม่ต่อ Cost Explorer'),
  },
  aurora: {
    rows: unavailable('ยังไม่ได้ต่อ Aurora ตอนนี้เขียนลงดิสก์'),
    replicaLagMs: unavailable('ยังไม่ได้ต่อ Aurora'),
    connections: unavailable('ยังไม่ได้ต่อ Aurora'),
  },
  fargate: {
    tasksRunning: ok(1),
    tasksFailed: ok(0),
    cpuPct: unavailable('ยังไม่ต่อ CloudWatch'),
    memoryPct: unavailable('ยังไม่ต่อ CloudWatch'),
  },
  cloudwatchAlarms: [],
  // เว็บเป้าหมายล่ม แต่เส้นทางของเราปกติ — แยกให้เห็นว่าไม่ใช่ปัญหาของ infra
  networkPath: NETWORK_PATH.map((h) => ({
    id: h.id,
    label: h.label,
    status: h.id === 'target' ? ('down' as const) : ('ok' as const),
    ...(h.id === 'target'
      ? { detail: 'baania ตอบ 523 · Cloudflare ต่อ origin ไม่ได้ (cf-cache-status: STALE)' }
      : {}),
  })),
  storageAvailability: unavailable('ยังไม่ได้นิยาม total storage size'),
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
      question: 'รอบนี้ไปถึงไหน',
      answer: `เสร็จ ${withData.length} / ${rows.length} เว็บ`,
      tone: withData.length < rows.length / 2 ? 'gap' : 'ok',
      detail: `ยังไม่รัน ${rows.length - withData.length} เว็บ`,
    },
    {
      question: 'มีอะไรต้องแก้ไหม',
      answer: needsUs.length === 0 ? 'ไม่มี' : `${needsUs.length} เว็บ`,
      tone: needsUs.length === 0 ? 'wait' : 'bad',
      detail:
        needsUs.length === 0
          ? `รอต้นทาง ${waiting.length} เว็บ ระบบลองใหม่เอง`
          : needsUs.map((r) => r.domain).join(' · '),
    },
    {
      question: 'เชื่อตัวเลขได้ไหม',
      answer: `${trusted.length} / ${withData.length} เว็บ`,
      tone: trusted.length === withData.length ? 'ok' : 'gap',
      detail:
        withData
          .filter((r) => !r.trustworthy)
          .map((r) => `${r.domain} ${n(r.savedRecords.value ?? 0)} แถว`)
          .join(' · ') || 'ตัวอย่างพอสรุปทุกเว็บ',
    },
    {
      question: 'ยังขาดตรงไหน',
      answer: `ขาด ${gaps} / ${total} ขอบเขต`,
      tone: 'gap',
      detail: 'ขอบเขต = ประเภททรัพย์ × สถานะขาย',
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
