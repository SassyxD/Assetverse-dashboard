import { z } from 'zod';
import { measurement } from './measurement.js';

/** 6-7 · องค์ประกอบที่ทีมอื่นทำ — ต้องแยกให้เห็นว่าใครเป็นเจ้าของ */
export const integrationOwner = z.enum(['our_team', 'other_team']);

export const changeDetection = z.object({
  owner: integrationOwner,
  pagesChecked: measurement(z.number().int().nonnegative()),
  pagesChanged: measurement(z.number().int().nonnegative()),
  recrawlsTriggered: measurement(z.number().int().nonnegative()),
  /**
   * เนื้อหาเปลี่ยน กับ โครง html/selector เปลี่ยน เป็นคนละเรื่อง
   * อันที่สองคือ painpoint "Endpoints change html styles" ที่ทีมเขียนไว้เอง
   */
  changeKind: z.object({
    content: measurement(z.number().int().nonnegative()),
    structure: measurement(z.number().int().nonnegative()),
  }),
});
export type ChangeDetection = z.infer<typeof changeDetection>;

export const piiDetector = z.object({
  owner: integrationOwner,
  scanned: measurement(z.number().int().nonnegative()),
  found: measurement(z.number().int().nonnegative()),
  kinds: z.array(
    z.object({ kind: z.string(), count: z.number().int().nonnegative() }),
  ),
  action: z.enum(['mask', 'drop', 'flag_only', 'unknown']),
  /**
   * ทำ detect ที่ขั้นไหนของ pipeline — ถ้าอยู่หลังเซฟ S3 แปลว่า PII
   * ค้างใน S3 แล้วก่อนถูกตรวจ ซึ่งเป็นเรื่อง compliance ไม่ใช่แค่ UI
   * ยังไม่ได้คำตอบจากทีมนั้น จึงมี 'unknown'
   */
  stage: z.enum(['before_s3', 'after_s3', 'at_parse', 'unknown']),
});
export type PiiDetector = z.infer<typeof piiDetector>;

export const captchaMetrics = z.object({
  owner: integrationOwner,
  solveAttempts: measurement(z.number().int().nonnegative()),
  solveSuccessRate: measurement(z.number().min(0).max(1)),
  costUsd: measurement(z.number().nonnegative()),
});
export type CaptchaMetrics = z.infer<typeof captchaMetrics>;
