import { z } from 'zod';
import { measurement } from './measurement.js';

/** 5 · Cloud / Infra — S3, Aurora, Fargate, CloudWatch, เส้นทางเน็ตเวิร์ก */
export const hopStatus = z.enum(['ok', 'degraded', 'down', 'unknown']);
export type HopStatus = z.infer<typeof hopStatus>;

/**
 * เส้นทางจาก AWS Singapore ไปเว็บไทย ตามที่วาดไว้ในไดอะแกรม
 * ต้องเห็นเป็น "ช่วง" เพราะพังคนละช่วงคนละคนแก้
 */
export const networkHop = z.object({
  id: z.string(),
  label: z.string(),
  status: hopStatus,
  detail: z.string().optional(),
});
export type NetworkHop = z.infer<typeof networkHop>;

export const NETWORK_PATH = [
  { id: 'fargate', label: 'Fargate (VPC private)' },
  { id: 'transit-gateway', label: 'Transit Gateway' },
  { id: 'firewall-aws', label: 'Firewall (AWS)' },
  { id: 'vpn', label: 'site-to-site VPN' },
  { id: 'dc-thailand', label: 'Corporate DC Thailand' },
  { id: 'proxy-kbank', label: 'Proxy Server (KBank)' },
  { id: 'firewall-corp', label: 'Firewall Corporate' },
  { id: 'internet', label: 'Internet' },
  { id: 'target', label: 'เว็บเป้าหมาย' },
] as const;

export const infraMetrics = z.object({
  s3: z.object({
    objects: measurement(z.number().int().nonnegative()),
    bytes: measurement(z.number().int().nonnegative()),
    monthlyCostUsd: measurement(z.number().nonnegative()),
  }),
  aurora: z.object({
    rows: measurement(z.number().int().nonnegative()),
    replicaLagMs: measurement(z.number().nonnegative()),
    connections: measurement(z.number().int().nonnegative()),
  }),
  fargate: z.object({
    tasksRunning: measurement(z.number().int().nonnegative()),
    tasksFailed: measurement(z.number().int().nonnegative()),
    cpuPct: measurement(z.number().min(0).max(1)),
    memoryPct: measurement(z.number().min(0).max(1)),
  }),
  cloudwatchAlarms: z.array(
    z.object({
      name: z.string(),
      state: z.enum(['ok', 'alarm', 'insufficient_data']),
      since: z.string(),
    }),
  ),
  networkPath: z.array(networkHop),
  /** total storage ยังไม่ได้นิยาม → unavailable ไม่ใช่ 0 */
  storageAvailability: measurement(z.number().min(0).max(1)),
});
export type InfraMetrics = z.infer<typeof infraMetrics>;
