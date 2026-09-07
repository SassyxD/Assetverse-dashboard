import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

export type ServiceOptions = {
  name: string;
  /** พอร์ตเริ่มต้น — env PORT ทับได้ */
  port: number;
};

/**
 * Hono app ที่ทุก service ใช้ร่วมกัน — /healthz กับรูปแบบ error เหมือนกันหมด
 * ไม่ให้แต่ละ service ประดิษฐ์เอง เพราะ gateway ต้องอ่านได้แบบเดียว
 */
export const createService = ({ name, port }: ServiceOptions) => {
  const app = new Hono();

  app.use('*', logger());
  app.use('*', cors());

  app.get('/healthz', (c) => c.json({ service: name, ok: true, at: new Date().toISOString() }));

  app.onError((err, c) => {
    console.error(`[${name}]`, err);
    return c.json({ error: { service: name, message: err.message } }, 500);
  });

  app.notFound((c) => c.json({ error: { service: name, message: 'not found' } }, 404));

  const listen = () => {
    const p = Number(process.env['PORT'] ?? port);
    serve({ fetch: app.fetch, port: p });
    console.log(`[${name}] listening on http://localhost:${p}`);
  };

  return { app, listen };
};

/** ดึงจาก service อื่นแบบมี timeout — gateway ใช้ ห้ามค้างเพราะ service เดียวช้า */
export const fetchJson = async <T>(url: string, timeoutMs = 4000): Promise<T> => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
};
