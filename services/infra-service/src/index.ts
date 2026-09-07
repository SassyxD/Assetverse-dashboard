import { createService } from '@assetverse/service-kit';
import { dashboard } from '@assetverse/fixtures';

const { app, listen } = createService({ name: 'infra-service', port: 4104 });

app.get('/infra', (c) => c.json(dashboard().infra));

/**
 * เส้นทางเน็ตเวิร์กแยก endpoint เพราะต้องตอบคำถาม "พังช่วงไหน"
 * ซึ่งบอกว่าใครต้องแก้ — infra หรือรอเว็บเป้าหมาย
 */
app.get('/network-path', (c) => c.json(dashboard().infra.networkPath));

listen();
