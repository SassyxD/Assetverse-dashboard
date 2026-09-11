import { createService } from '@assetverse/service-kit';
import { snapshots } from '@assetverse/fixtures';

const { app, listen } = createService({ name: 'integrations-service', port: 4105 });

const bySite = (site: string) => snapshots().find((s) => s.site === site);

/** 3 องค์ประกอบที่ทีมอื่นทำ — ยังไม่ส่งข้อมูลมา สถานะจึงเป็น unavailable ไม่ใช่ 0 */
app.get('/integrations/:site', (c) => {
  const f = bySite(c.req.param('site'));
  return f
    ? c.json({ changeDetection: f.changeDetection, pii: f.pii, captcha: f.captcha })
    : c.json({ error: { message: 'Unknown site' } }, 404);
});

listen();
