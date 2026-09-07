import { z } from 'zod';
import { measurement } from './measurement.js';
import { siteId, sourceStatus, owner } from './site.js';
import { tierSummary, rangeCheck, missingCombo } from './kbmf.js';
import { coverage } from './coverage.js';
import {
  queueMetrics, crawlerMetrics, extractorMetrics, llmRecoveryMetrics,
} from './pipeline.js';
import { infraMetrics } from './infra.js';
import { changeDetection, piiDetector, captchaMetrics } from './integrations.js';
import { run } from './run.js';

/** ข้อมูลทุกอย่างของ 1 เว็บ — dropdown เลือกเว็บแล้วได้ก้อนนี้ */
export const siteSnapshot = z.object({
  site: siteId,
  cycle: z.string(),
  status: sourceStatus,
  owner,
  /** เชื่อตัวเลขของเว็บนี้ได้ไหม — false เมื่อ sample เล็กเกิน (scb 20 แถว) */
  trustworthy: z.boolean(),
  queue: queueMetrics,
  crawler: crawlerMetrics,
  extractor: extractorMetrics,
  llmRecovery: llmRecoveryMetrics,
  tiers: z.array(tierSummary),
  missingCombos: z.array(missingCombo),
  rangeChecks: z.array(rangeCheck),
  coverage,
  changeDetection,
  pii: piiDetector,
  captcha: captchaMetrics,
  runs: z.array(run),
});
export type SiteSnapshot = z.infer<typeof siteSnapshot>;

/** แถวเดียวต่อเว็บ สำหรับหน้าภาพรวม 17 เว็บ — ต้องเรียงตามความรุนแรงได้ */
export const siteOverview = z.object({
  site: siteId,
  domain: z.string(),
  label: z.string(),
  status: sourceStatus,
  owner,
  trustworthy: z.boolean(),
  savedRecords: measurement(z.number().int().nonnegative()),
  crawlCompleteness: measurement(z.number().min(0).max(1)),
  primaryFillRate: measurement(z.number().min(0).max(1)),
  deadLetterDepth: measurement(z.number().int().nonnegative()),
  scopesWithData: z.number().int().nonnegative(),
  scopesTotal: z.number().int().positive(),
  /** คะแนนความรุนแรง มาก = ควรไปดูก่อน คำนวณที่ backend ไม่ให้ UI คิดเอง */
  severity: z.number().int(),
});
export type SiteOverview = z.infer<typeof siteOverview>;

/** 4 คำถามที่หน้าแรกต้องตอบใน 10 วินาที — ตอบเป็นคำ ไม่ใช่แค่เลข */
export const headline = z.object({
  question: z.string(),
  answer: z.string(),
  tone: z.enum(['ok', 'wait', 'gap', 'bad']),
  detail: z.string(),
});
export type Headline = z.infer<typeof headline>;

export const dashboardSummary = z.object({
  cycle: z.string(),
  cycleDay: z.number().int().min(1).max(31),
  phase: z.string(),
  generatedAt: z.string(),
  headlines: z.array(headline),
  sites: z.array(siteOverview),
  infra: infraMetrics,
  totals: z.object({
    sitesDone: z.number().int().nonnegative(),
    sitesRunning: z.number().int().nonnegative(),
    sitesPending: z.number().int().nonnegative(),
    sitesBlocked: z.number().int().nonnegative(),
    storageBytes: measurement(z.number().int().nonnegative()),
    records: measurement(z.number().int().nonnegative()),
  }),
});
export type DashboardSummary = z.infer<typeof dashboardSummary>;
