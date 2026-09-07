import { z } from 'zod';
import { measurement } from './measurement.js';

/** 1 · Queue — SQS frontier + parsing + DLQ */
export const queueMetrics = z.object({
  frontierDepth: measurement(z.number().int().nonnegative()),
  parsingDepth: measurement(z.number().int().nonnegative()),
  /** DLQ = leading indicator ทั้ง 2 painpoint (crawler ตาย / html เปลี่ยน) โผล่ที่นี่ก่อน */
  deadLetterDepth: measurement(z.number().int().nonnegative()),
  deadLetterReasons: z.array(
    z.object({ reason: z.string(), count: z.number().int().nonnegative() }),
  ),
  /** หยิบไปแล้วแต่ยังไม่ ack เพราะดีไซน์คือ ack หลังเซฟสำเร็จ */
  inFlight: measurement(z.number().int().nonnegative()),
  avgWaitSeconds: measurement(z.number().nonnegative()),
  purged: measurement(z.number().int().nonnegative()),
  /** Tq2q ที่ตั้งไว้ vs ที่วัดได้จริง — invariant: fetch2fetch < Tq2q */
  tq2qConfiguredMs: z.number().int().positive(),
  tq2qObservedMs: measurement(z.number().nonnegative()),
});
export type QueueMetrics = z.infer<typeof queueMetrics>;

/** 2 · Fetcher (Crawler Machine) */
export const crawlerMetrics = z.object({
  crawlCompleteness: measurement(z.number().min(0).max(1)),
  savedRecords: measurement(z.number().int().nonnegative()),
  /** ตัวหาร — จำนวนประกาศทั้งหมดที่เว็บนั้น list ไว้ null = ยังไม่ได้สำรวจ */
  listedOnMarketplace: measurement(z.number().int().nonnegative()),
  newUrlRatio: measurement(z.number().min(0).max(1)),
  delistedUrls: measurement(z.number().int().nonnegative()),
  retryRate: measurement(z.number().min(0).max(1)),
  totalCrawlerSeconds: measurement(z.number().nonnegative()),
  throughputPagesPerMin: measurement(z.number().nonnegative()),
  statusCounts: z.array(
    z.object({ status: z.number().int(), count: z.number().int().nonnegative() }),
  ),
  pageKind: z.object({
    listing: z.number().int().nonnegative(),
    detail: z.number().int().nonnegative(),
  }),
});
export type CrawlerMetrics = z.infer<typeof crawlerMetrics>;

/** 3 · Extractor (Parsing Workers) */
export const extractorMetrics = z.object({
  primFieldsSuccessRate: measurement(z.number().min(0).max(1)),
  primFieldsNullRate: measurement(z.number().min(0).max(1)),
  fallbackFieldsNullRate: measurement(z.number().min(0).max(1)),
  totalExtractorSeconds: measurement(z.number().nonnegative()),
  extractedRecords: measurement(z.number().int().nonnegative()),
});
export type ExtractorMetrics = z.infer<typeof extractorMetrics>;

/**
 * 4 · LLM recovery — ในไดอะแกรมเป็นลูปที่ไม่มีเงื่อนไขหยุดเขียนไว้
 * ต้องเห็นรอบที่วน + rate ต่อรอบ ไม่งั้นกินเวลา/token ไปเรื่อยๆ
 */
export const llmRecoveryMetrics = z.object({
  invocations: measurement(z.number().int().nonnegative()),
  recoveryRate: measurement(z.number().min(0).max(1)),
  iterations: measurement(z.number().int().nonnegative()),
  /** recovery rate แต่ละรอบ — ถ้าลดลงเรื่อยๆ คือถึงเวลาหยุด */
  ratePerIteration: z.array(
    z.object({ iteration: z.number().int().positive(), recovered: z.number().min(0).max(1) }),
  ),
  scriptsGenerated: measurement(z.number().int().nonnegative()),
  scriptsAccepted: measurement(z.number().int().nonnegative()),
  tokensUsed: measurement(z.number().int().nonnegative()),
});
export type LlmRecoveryMetrics = z.infer<typeof llmRecoveryMetrics>;
