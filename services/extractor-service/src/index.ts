import { createService } from '@assetverse/service-kit';
import { snapshots } from '@assetverse/fixtures';

const { app, listen } = createService({ name: 'extractor-service', port: 4103 });

const bySite = (site: string) => snapshots().find((s) => s.site === site);

app.get('/extractor/:site', (c) => {
  const f = bySite(c.req.param('site'));
  return f ? c.json(f.extractor) : c.json({ error: { message: 'Unknown site' } }, 404);
});

app.get('/kbmf/:site', (c) => {
  const f = bySite(c.req.param('site'));
  return f
    ? c.json({ tiers: f.tiers, missingCombos: f.missingCombos })
    : c.json({ error: { message: 'Unknown site' } }, 404);
});

/** ค่าที่ "มี" แต่ผิด — คนละเรื่องกับ nullrate ที่จับได้แต่ค่าที่หาย */
app.get('/range-checks/:site', (c) => {
  const f = bySite(c.req.param('site'));
  return f ? c.json(f.rangeChecks) : c.json({ error: { message: 'Unknown site' } }, 404);
});

app.get('/llm-recovery/:site', (c) => {
  const f = bySite(c.req.param('site'));
  return f ? c.json(f.llmRecovery) : c.json({ error: { message: 'Unknown site' } }, 404);
});

listen();
