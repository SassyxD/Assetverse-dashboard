import { createService, fetchJson } from '@assetverse/service-kit';
import { dashboard, snapshots } from '@assetverse/fixtures';
import { SITES } from '@assetverse/contracts';

const { app, listen } = createService({ name: 'gateway', port: 4100 });

/**
 * BFF — frontend เรียกที่นี่ที่เดียว ไม่ต้องรู้ว่ามี service ย่อยกี่ตัว
 *
 * ตอนนี้อ่านจาก fixture ตรงๆ (โหมด mock) พอ service ย่อยต่อของจริงแล้ว
 * ให้เปิด USE_SERVICES=1 เพื่อสลับไปรวมจาก service จริงแทน
 * โครง response เหมือนกันทั้งสองโหมด — frontend ไม่ต้องแก้
 */
const useServices = process.env['USE_SERVICES'] === '1';

const SVC = {
  queue: process.env['QUEUE_SERVICE_URL'] ?? 'http://localhost:4101',
  crawler: process.env['CRAWLER_SERVICE_URL'] ?? 'http://localhost:4102',
  extractor: process.env['EXTRACTOR_SERVICE_URL'] ?? 'http://localhost:4103',
  infra: process.env['INFRA_SERVICE_URL'] ?? 'http://localhost:4104',
  integrations: process.env['INTEGRATIONS_SERVICE_URL'] ?? 'http://localhost:4105',
};

app.get('/api/sites', (c) => c.json(SITES));

app.get('/api/dashboard', async (c) => {
  if (!useServices) return c.json(dashboard());
  const base = dashboard();
  // service เดียวล่มไม่ควรทำให้ทั้งหน้าว่าง — คงส่วนที่ได้ ที่เหลือใช้ค่าเดิม
  const infra = await fetchJson<typeof base.infra>(`${SVC.infra}/infra`).catch(() => base.infra);
  return c.json({ ...base, infra });
});

app.get('/api/sites/:site', async (c) => {
  const site = c.req.param('site');
  const local = snapshots().find((s) => s.site === site);
  if (!local) return c.json({ error: { message: `ไม่รู้จักเว็บ ${site}` } }, 404);
  if (!useServices) return c.json(local);

  const [queue, crawler, extractor, kbmf, ranges, llm, integrations] = await Promise.all([
    fetchJson<typeof local.queue>(`${SVC.queue}/queue/${site}`).catch(() => local.queue),
    fetchJson<typeof local.crawler>(`${SVC.crawler}/crawler/${site}`).catch(() => local.crawler),
    fetchJson<typeof local.extractor>(`${SVC.extractor}/extractor/${site}`)
      .catch(() => local.extractor),
    fetchJson<{ tiers: typeof local.tiers; missingCombos: typeof local.missingCombos }>(
      `${SVC.extractor}/kbmf/${site}`,
    ).catch(() => ({ tiers: local.tiers, missingCombos: local.missingCombos })),
    fetchJson<typeof local.rangeChecks>(`${SVC.extractor}/range-checks/${site}`)
      .catch(() => local.rangeChecks),
    fetchJson<typeof local.llmRecovery>(`${SVC.extractor}/llm-recovery/${site}`)
      .catch(() => local.llmRecovery),
    fetchJson<{
      changeDetection: typeof local.changeDetection;
      pii: typeof local.pii;
      captcha: typeof local.captcha;
    }>(`${SVC.integrations}/integrations/${site}`).catch(() => ({
      changeDetection: local.changeDetection, pii: local.pii, captcha: local.captcha,
    })),
  ]);

  return c.json({
    ...local, queue, crawler, extractor,
    tiers: kbmf.tiers, missingCombos: kbmf.missingCombos,
    rangeChecks: ranges, llmRecovery: llm, ...integrations,
  });
});

/** DLQ ข้ามทุกเว็บ — เอาไว้ทำ badge เตือนบน nav */
app.get('/api/dead-letter', (c) =>
  c.json(
    snapshots()
      .filter((s) => (s.queue.deadLetterDepth.value ?? 0) > 0)
      .map((s) => ({
        site: s.site,
        depth: s.queue.deadLetterDepth.value ?? 0,
        reasons: s.queue.deadLetterReasons,
      })),
  ));

listen();
