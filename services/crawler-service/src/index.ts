import { createService } from '@assetverse/service-kit';
import { snapshots } from '@assetverse/fixtures';

const { app, listen } = createService({ name: 'crawler-service', port: 4102 });

app.get('/crawler', (c) =>
  c.json(snapshots().map((s) => ({ site: s.site, ...s.crawler }))));

app.get('/crawler/:site', (c) => {
  const found = snapshots().find((s) => s.site === c.req.param('site'));
  return found ? c.json(found.crawler) : c.json({ error: { message: 'Unknown site' } }, 404);
});

app.get('/coverage/:site', (c) => {
  const found = snapshots().find((s) => s.site === c.req.param('site'));
  return found ? c.json(found.coverage) : c.json({ error: { message: 'Unknown site' } }, 404);
});

app.get('/runs/:site', (c) => {
  const found = snapshots().find((s) => s.site === c.req.param('site'));
  return found ? c.json(found.runs) : c.json({ error: { message: 'Unknown site' } }, 404);
});

listen();
