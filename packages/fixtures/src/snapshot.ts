import type {
  SiteSnapshot, SiteId, SourceStatus, TierSummary, TierName, Measurement,
} from '@assetverse/contracts';
import { TIERS, ownerOf, ok, insufficient, unavailable, USABLE_AREA_MIN_RECORDS }
  from '@assetverse/contracts';
import { buildFields, fillTable } from './kbmf-fill.js';

const CYCLE = '2026-09';

/** เกณฑ์: น้อยกว่านี้ตัวเลข % เชื่อไม่ได้ (scb มี 20 แถวจาก 4,031) */
const TRUST_MIN_RECORDS = 500;

const tierOf = (
  tier: TierName,
  total: number,
  table: Record<string, number>,
  trustworthy: boolean,
): TierSummary => {
  const fields = buildFields(tier, total, table);
  const fillRate = fields.reduce((s, f) => s + f.fillRate, 0) / fields.length;
  const structuralGaps = fields.filter((f) => f.gap === 'structural').map((f) => f.field);
  // มี field ว่างทุกแถวแม้ตัวเดียว → ไม่มีแถวไหน complete ได้เลย
  const recordComplete = structuralGaps.length > 0
    ? 0
    : fields.reduce((s, f) => Math.min(s, f.fillRate), 1);

  const wrap = <T>(v: T): Measurement<T> =>
    total === 0
      ? unavailable('ยังไม่เคยเก็บข้อมูลเว็บนี้')
      : trustworthy
        ? ok(v, total)
        : insufficient(v, total, `คำนวณจาก ${total} แถว น้อยเกินจะสรุป`);

  return {
    tier,
    threshold: TIERS[tier].threshold,
    fillRate: wrap(Number(fillRate.toFixed(4))),
    recordCompleteRate: wrap(Number(recordComplete.toFixed(4))),
    passes: fillRate >= TIERS[tier].threshold,
    structuralGaps,
    fields,
  };
};

type Seed = {
  site: SiteId;
  status: SourceStatus;
  records: number;
  listed: number | null;
  dlq: number;
  frontier: number;
};

/** baania / scb = เลขจริงที่วัดได้ · ที่เหลือยังไม่เคยรัน ไม่แต่งตัวเลขให้ */
export const SEEDS: Seed[] = [
  { site: 'baania', status: 'source_down', records: 57_571, listed: null, dlq: 3, frontier: 704 },
  { site: 'scb', status: 'ok', records: 20, listed: 4_031, dlq: 0, frontier: 0 },
  ...(['ghb', 'kbank', 'ktb', 'sam', 'taladnudbaan', 'baanfinder', 'ddproperty',
    'hipflat', 'livinginsider', 'propertyhub', 'zmyhome', 'fazwaz', 'homenayoo',
    'led'] as SiteId[]).map((site) => ({
    site, status: 'never_run' as SourceStatus, records: 0, listed: null, dlq: 0, frontier: 0,
  })),
];

const PROPERTY_TYPES = ['บ้าน', 'คอนโด', 'ทาวน์เฮาส์', 'พาณิชย์'];
const SELL_STATES = ['ขายอยู่', 'ขายแล้ว'];

/** baania: 15 จังหวัด แต่ 3 จังหวัดมีไม่ถึง 10 แถว = ยังนับว่ามีข้อมูลไม่ได้ */
const BAANIA_AREAS: [string, number][] = [
  ['กรุงเทพมหานคร', 20_897], ['นนทบุรี', 10_837], ['สมุทรปราการ', 7_963],
  ['ปทุมธานี', 6_335], ['ภูเก็ต', 3_485], ['ระยอง', 2_105], ['นครปฐม', 1_567],
  ['สมุทรสาคร', 1_334], ['นครราชสีมา', 1_282], ['ขอนแก่น', 933],
  ['อุดรธานี', 430], ['ลำพูน', 393], ['ชลบุรี', 5], ['เชียงใหม่', 4], ['นครนายก', 1],
];

export const buildSnapshot = (seed: Seed): SiteSnapshot => {
  const { site, status, records, listed, dlq, frontier } = seed;
  const trustworthy = records >= TRUST_MIN_RECORDS;
  const table = fillTable(site);
  const none = records === 0;

  const m = <T>(v: T): Measurement<T> =>
    none ? unavailable('ยังไม่เคยเก็บข้อมูลเว็บนี้')
    : trustworthy ? ok(v, records)
    : insufficient(v, records, `คำนวณจาก ${records} แถว`);

  const areas = site === 'baania'
    ? BAANIA_AREAS.map(([area, n]) => ({
        area, records: n, belowUsableThreshold: n < USABLE_AREA_MIN_RECORDS,
      }))
    : [];

  // baania มีข้อมูลแค่ บ้าน × ขายอยู่ = 1 ใน 8 ช่อง — ยอดรวม 57,571 ไม่บอกเรื่องนี้
  const cells = PROPERTY_TYPES.flatMap((propertyType) =>
    SELL_STATES.map((sellState) => {
      const filled = site === 'baania' && propertyType === 'บ้าน' && sellState === 'ขายอยู่';
      return {
        propertyType,
        sellState,
        records: filled ? records : 0,
        areasCovered: filled ? areas.filter((a) => !a.belowUsableThreshold).length : 0,
        areasTotal: 74,
      };
    }),
  );

  return {
    site,
    cycle: CYCLE,
    status,
    owner: ownerOf(status),
    trustworthy,
    queue: {
      frontierDepth: none ? unavailable('ยังไม่เคย seed') : ok(frontier),
      parsingDepth: none ? unavailable('ยังไม่เคย seed') : ok(0),
      deadLetterDepth: none ? unavailable('ยังไม่เคย seed') : ok(dlq),
      deadLetterReasons: dlq > 0
        ? [{ reason: 'HTTP 523 ต้นทางล่ม (Cloudflare ต่อ origin ไม่ได้)', count: dlq }]
        : [],
      inFlight: none ? unavailable('ยังไม่เคย seed') : ok(0),
      avgWaitSeconds: unavailable('ยังไม่ stamp เวลาตอน enqueue'),
      purged: none ? unavailable('ยังไม่เคย seed') : ok(0),
      tq2qConfiguredMs: site === 'baania' ? 4000 : 2000,
      tq2qObservedMs: unavailable('ยังไม่วัด'),
    },
    crawler: {
      crawlCompleteness: listed === null
        ? unavailable('ยังไม่รู้ตัวหาร ต้องสำรวจ (--plan) ก่อน')
        : m(Number((records / listed).toFixed(4))),
      savedRecords: none ? unavailable('ยังไม่เคยเก็บ') : ok(records),
      listedOnMarketplace: listed === null
        ? unavailable('ยังไม่ได้สำรวจจำนวนประกาศทั้งหมด')
        : ok(listed),
      newUrlRatio: none ? unavailable('ยังไม่เคยเก็บ') : ok(1),
      delistedUrls: unavailable('ยังไม่เก็บ snapshot ย้อนหลัง'),
      retryRate: status === 'source_down' ? ok(1) : none ? unavailable('ยังไม่เคยเก็บ') : ok(0),
      totalCrawlerSeconds: none ? unavailable('ยังไม่เคยเก็บ') : ok(site === 'baania' ? 8040 : 120),
      throughputPagesPerMin: unavailable('ยังไม่วัด duration ต่อหน้า'),
      statusCounts: status === 'source_down' ? [{ status: 523, count: 15 }] : [],
      pageKind: { listing: none ? 0 : site === 'baania' ? 100 : 2, detail: records },
    },
    extractor: {
      primFieldsSuccessRate: none ? unavailable('ยังไม่เคยเก็บ') : ok(1, records),
      primFieldsNullRate: m(0),
      fallbackFieldsNullRate: m(0),
      totalExtractorSeconds: none ? unavailable('ยังไม่เคยเก็บ') : ok(90),
      extractedRecords: none ? unavailable('ยังไม่เคยเก็บ') : ok(records),
    },
    llmRecovery: {
      invocations: unavailable('ยังไม่ได้ต่อ LLM Gateway'),
      recoveryRate: unavailable('ยังไม่ได้ต่อ LLM Gateway'),
      iterations: unavailable('ยังไม่ได้ต่อ LLM Gateway'),
      ratePerIteration: [],
      scriptsGenerated: unavailable('ยังไม่ได้ต่อ LLM Gateway'),
      scriptsAccepted: unavailable('ยังไม่ได้ต่อ LLM Gateway'),
      tokensUsed: unavailable('ยังไม่ได้ต่อ LLM Gateway'),
    },
    tiers: (['primary', 'fallback1', 'fallback2'] as TierName[])
      .map((t) => tierOf(t, records, table, trustworthy)),
    missingCombos: site === 'baania'
      ? [
          { fields: ['usable_area'], records: 5_242, share: 0.425 },
          { fields: ['land_area', 'usable_area'], records: 3_956, share: 0.321 },
          { fields: ['land_area'], records: 3_122, share: 0.253 },
          { fields: ['appraisal_price', 'land_area'], records: 10, share: 0.001 },
        ]
      : [],
    rangeChecks: site === 'baania'
      ? [
          { id: 'land-gt-10rai', field: 'land_area', label: 'เนื้อที่ดินเกิน 10 ไร่',
            expectation: 'บ้าน/ทาวน์เฮาส์ในเมืองปกติ 30-200 ตร.ว.',
            records: 50, severity: 'warn' },
          { id: 'land-dup-slots', field: 'land_area',
            label: 'ต้นทางส่งเลขตัวเดียวยัดช่องไร่/งาน/วา ทั้งสามช่อง',
            expectation: 'บอกหน่วยไม่ได้ ระบบปล่อยว่างแทนที่จะเดา (ถ้าคำนวณจะเพี้ยน 501 เท่า)',
            records: 826, severity: 'info' },
          { id: 'coord-far', field: 'latitude,longitude',
            label: 'พิกัดห่างจากกลางจังหวัดเกิน 150 กม.',
            expectation: 'อาจสลับ lat/long หรือจังหวัดผิด', records: 14, severity: 'warn' },
          { id: 'coord-outside-th', field: 'latitude,longitude',
            label: 'พิกัดนอกขอบเขตประเทศไทย',
            expectation: 'lat 5.5-20.6 · lon 97.3-105.7', records: 0, severity: 'info' },
        ]
      : [],
    coverage: {
      cells,
      areas,
      scopesTotal: 8,
      scopesWithData: cells.filter((c) => c.records > 0).length,
    },
    changeDetection: {
      owner: 'other_team',
      pagesChecked: unavailable('ทีมอื่นยังไม่ส่งข้อมูลมา'),
      pagesChanged: unavailable('ทีมอื่นยังไม่ส่งข้อมูลมา'),
      recrawlsTriggered: unavailable('ทีมอื่นยังไม่ส่งข้อมูลมา'),
      changeKind: {
        content: unavailable('ทีมอื่นยังไม่ส่งข้อมูลมา'),
        structure: unavailable('ทีมอื่นยังไม่ส่งข้อมูลมา'),
      },
    },
    pii: {
      owner: 'other_team',
      scanned: unavailable('ทีมอื่นยังไม่ส่งข้อมูลมา'),
      found: unavailable('ทีมอื่นยังไม่ส่งข้อมูลมา'),
      kinds: [],
      action: 'unknown',
      stage: 'unknown',
    },
    captcha: {
      owner: 'other_team',
      solveAttempts: unavailable('ยังไม่มีระบบ solve captcha'),
      solveSuccessRate: unavailable('ยังไม่มีระบบ solve captcha'),
      costUsd: unavailable('ยังไม่มีระบบ solve captcha'),
    },
    runs: buildRuns(seed),
  };
};

const buildRuns = ({ site, status, records }: Seed) => {
  if (status === 'never_run') return [];
  if (site === 'baania') {
    return [
      {
        id: 'baania-2026-09-condo', site, cycle: CYCLE, phase: 'crawling' as const,
        status: 'source_down' as const, startedAt: '2026-09-02T20:00:45Z',
        finishedAt: null, pagesDone: 0, itemsSaved: 0, pagesSkipped: 3,
        message: 'ไม่ต้องทำอะไร ต้นทางตอบ 523 (เซิร์ฟเวอร์ baania ล่ม) ระบบรอแล้วลองใหม่เอง',
      },
      {
        id: 'baania-2026-08-house', site, cycle: '2026-08', phase: 'done' as const,
        status: 'ok' as const, startedAt: '2026-08-31T12:56:00Z',
        finishedAt: '2026-08-31T15:10:00Z', pagesDone: 100, itemsSaved: records,
        pagesSkipped: 3, message: 'ข้ามไป 3 หน้า (ต้นทางตอบ 5xx) ไม่กระทบยอดรวม',
      },
    ];
  }
  return [
    {
      id: `${site}-2026-09-sample`, site, cycle: CYCLE, phase: 'done' as const,
      status: 'ok' as const, startedAt: '2026-08-19T16:30:00Z',
      finishedAt: '2026-08-19T16:32:00Z', pagesDone: 2, itemsSaved: records,
      pagesSkipped: 0, message: 'รอบทดสอบ ยังไม่ได้เก็บเต็ม',
    },
  ];
};
