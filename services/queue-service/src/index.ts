import { createService } from '@assetverse/service-kit';
import { snapshots } from '@assetverse/fixtures';

const { app, listen } = createService({ name: 'queue-service', port: 4101 });

app.get('/queue', (c) =>
  c.json(snapshots().map((s) => ({ site: s.site, ...s.queue }))));

app.get('/queue/:site', (c) => {
  const found = snapshots().find((s) => s.site === c.req.param('site'));
  return found ? c.json(found.queue) : c.json({ error: { message: 'ไม่รู้จักเว็บนี้' } }, 404);
});

/** DLQ แยกออกมาเป็น endpoint ของตัวเอง เพราะเป็น leading indicator ที่ต้องดูบ่อยสุด */
app.get('/dead-letter', (c) =>
  c.json(
    snapshots()
      .filter((s) => (s.queue.deadLetterDepth.value ?? 0) > 0)
      .map((s) => ({
        site: s.site,
        depth: s.queue.deadLetterDepth,
        reasons: s.queue.deadLetterReasons,
      })),
  ));

listen();
