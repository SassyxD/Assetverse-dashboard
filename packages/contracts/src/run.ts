import { z } from 'zod';
import { siteId, sourceStatus } from './site.js';

/**
 * รอบทำงานเป็นรายเดือน (รัน 1 · อัป script 5/10 · retry 12)
 * ไม่ใช่ realtime — แกนเวลาเริ่มต้นของ dashboard จึงเป็น "รอบเดือนนี้"
 */
export const cyclePhase = z.enum([
  'idle',
  'crawling',      // วันที่ 1
  'script_upload', // วันที่ 5, 10
  'retry',         // วันที่ 12
  'done',
]);
export type CyclePhase = z.infer<typeof cyclePhase>;

export const MONTHLY_CALENDAR = [
  { day: 1, phase: 'crawling', label: 'รัน crawl รอบเดือน' },
  { day: 5, phase: 'script_upload', label: 'อัปโหลด script ใหม่' },
  { day: 10, phase: 'script_upload', label: 'อัปโหลด script ใหม่' },
  { day: 12, phase: 'retry', label: 'retry' },
] as const;

export const run = z.object({
  id: z.string(),
  site: siteId,
  /** YYYY-MM — รอบเดือน */
  cycle: z.string().regex(/^\d{4}-\d{2}$/),
  phase: cyclePhase,
  status: sourceStatus,
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  pagesDone: z.number().int().nonnegative(),
  itemsSaved: z.number().int().nonnegative(),
  pagesSkipped: z.number().int().nonnegative(),
  /** ข้อความที่บอกคนอ่านว่าต้องทำอะไร (หรือไม่ต้องทำอะไร) */
  message: z.string().optional(),
});
export type Run = z.infer<typeof run>;
