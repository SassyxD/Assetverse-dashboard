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
      ? unavailable('Never collected data for this site')
      : trustworthy
        ? ok(v, total)
        : insufficient(v, total, `Computed from ${total} rows — too few to conclude`);

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

const PROPERTY_TYPES = ['House', 'Condo', 'Townhouse', 'Commercial'];
const SELL_STATES = ['For sale', 'Sold'];

/** baania: 15 จังหวัด แต่ 3 จังหวัดมีไม่ถึง 10 แถว = ยังนับว่ามีข้อมูลไม่ได้ */
const BAANIA_AREAS: [string, number][] = [
  ['Bangkok', 20_897], ['Nonthaburi', 10_837], ['Samut Prakan', 7_963],
  ['Pathum Thani', 6_335], ['Phuket', 3_485], ['Rayong', 2_105], ['Nakhon Pathom', 1_567],
  ['Samut Sakhon', 1_334], ['Nakhon Ratchasima', 1_282], ['Khon Kaen', 933],
  ['Udon Thani', 430], ['Lamphun', 393], ['Chonburi', 5], ['Chiang Mai', 4], ['Nakhon Nayok', 1],
];

export const buildSnapshot = (seed: Seed): SiteSnapshot => {
  const { site, status, records, listed, dlq, frontier } = seed;
  const trustworthy = records >= TRUST_MIN_RECORDS;
  const table = fillTable(site);
  const none = records === 0;

  const m = <T>(v: T): Measurement<T> =>
    none ? unavailable('Never collected data for this site')
    : trustworthy ? ok(v, records)
    : insufficient(v, records, `Computed from ${records} rows`);

  const areas = site === 'baania'
    ? BAANIA_AREAS.map(([area, n]) => ({
        area, records: n, belowUsableThreshold: n < USABLE_AREA_MIN_RECORDS,
      }))
    : [];

  // baania มีข้อมูลแค่ บ้าน × ขายอยู่ = 1 ใน 8 ช่อง — ยอดรวม 57,571 ไม่บอกเรื่องนี้
  const cells = PROPERTY_TYPES.flatMap((propertyType) =>
    SELL_STATES.map((sellState) => {
      const filled = site === 'baania' && propertyType === 'House' && sellState === 'For sale';
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
      frontierDepth: none ? unavailable('Never seeded') : ok(frontier),
      parsingDepth: none ? unavailable('Never seeded') : ok(0),
      deadLetterDepth: none ? unavailable('Never seeded') : ok(dlq),
      deadLetterReasons: dlq > 0
        ? [{ reason: 'HTTP 523 source down (Cloudflare cannot reach origin)', count: dlq }]
        : [],
      inFlight: none ? unavailable('Never seeded') : ok(0),
      avgWaitSeconds: unavailable('Enqueue time is not stamped yet'),
      purged: none ? unavailable('Never seeded') : ok(0),
      tq2qConfiguredMs: site === 'baania' ? 4000 : 2000,
      tq2qObservedMs: unavailable('Not measured yet'),
    },
    crawler: {
      crawlCompleteness: listed === null
        ? unavailable('Denominator unknown — needs a survey pass (--plan) first')
        : m(Number((records / listed).toFixed(4))),
      savedRecords: none ? unavailable('Never collected') : ok(records),
      listedOnMarketplace: listed === null
        ? unavailable('Total listing count has not been surveyed')
        : ok(listed),
      newUrlRatio: none ? unavailable('Never collected') : ok(1),
      delistedUrls: unavailable('No historical snapshots kept yet'),
      retryRate: status === 'source_down' ? ok(1) : none ? unavailable('Never collected') : ok(0),
      totalCrawlerSeconds: none ? unavailable('Never collected') : ok(site === 'baania' ? 8040 : 120),
      throughputPagesPerMin: unavailable('Per-page duration is not measured yet'),
      statusCounts: status === 'source_down' ? [{ status: 523, count: 15 }] : [],
      pageKind: { listing: none ? 0 : site === 'baania' ? 100 : 2, detail: records },
    },
    extractor: {
      primFieldsSuccessRate: none ? unavailable('Never collected') : ok(1, records),
      primFieldsNullRate: m(0),
      fallbackFieldsNullRate: m(0),
      totalExtractorSeconds: none ? unavailable('Never collected') : ok(90),
      extractedRecords: none ? unavailable('Never collected') : ok(records),
    },
    llmRecovery: {
      invocations: unavailable('LLM Gateway is not wired up yet'),
      recoveryRate: unavailable('LLM Gateway is not wired up yet'),
      iterations: unavailable('LLM Gateway is not wired up yet'),
      ratePerIteration: [],
      scriptsGenerated: unavailable('LLM Gateway is not wired up yet'),
      scriptsAccepted: unavailable('LLM Gateway is not wired up yet'),
      tokensUsed: unavailable('LLM Gateway is not wired up yet'),
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
          { id: 'land-gt-10rai', field: 'land_area', label: 'Land area over 10 rai',
            expectation: 'Urban houses and townhouses are normally 30-200 sq wa',
            records: 50, severity: 'warn' },
          { id: 'land-dup-slots', field: 'land_area',
            label: 'Source packs one number into all three rai/ngan/wa slots',
            expectation: 'Unit is unknowable, system leaves it empty instead of guessing (computing it is off by 501x)',
            records: 826, severity: 'info' },
          { id: 'coord-far', field: 'latitude,longitude',
            label: 'Coordinates over 150 km from the province centre',
            expectation: 'lat/long may be swapped, or the province is wrong', records: 14, severity: 'warn' },
          { id: 'coord-outside-th', field: 'latitude,longitude',
            label: 'Coordinates outside Thailand',
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
      pagesChecked: unavailable('The owning team has not sent data yet'),
      pagesChanged: unavailable('The owning team has not sent data yet'),
      recrawlsTriggered: unavailable('The owning team has not sent data yet'),
      changeKind: {
        content: unavailable('The owning team has not sent data yet'),
        structure: unavailable('The owning team has not sent data yet'),
      },
    },
    pii: {
      owner: 'other_team',
      scanned: unavailable('The owning team has not sent data yet'),
      found: unavailable('The owning team has not sent data yet'),
      kinds: [],
      action: 'unknown',
      stage: 'unknown',
    },
    captcha: {
      owner: 'other_team',
      solveAttempts: unavailable('No captcha solving in place yet'),
      solveSuccessRate: unavailable('No captcha solving in place yet'),
      costUsd: unavailable('No captcha solving in place yet'),
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
        message: 'Nothing to do — source returns 523 (baania server is down), the system waits and retries on its own',
      },
      {
        id: 'baania-2026-08-house', site, cycle: '2026-08', phase: 'done' as const,
        status: 'ok' as const, startedAt: '2026-08-31T12:56:00Z',
        finishedAt: '2026-08-31T15:10:00Z', pagesDone: 100, itemsSaved: records,
        pagesSkipped: 3, message: 'Skipped 3 pages (source returned 5xx) — totals are unaffected',
      },
    ];
  }
  return [
    {
      id: `${site}-2026-09-sample`, site, cycle: CYCLE, phase: 'done' as const,
      status: 'ok' as const, startedAt: '2026-08-19T16:30:00Z',
      finishedAt: '2026-08-19T16:32:00Z', pagesDone: 2, itemsSaved: records,
      pagesSkipped: 0, message: 'Test run — not a full collection',
    },
  ];
};
