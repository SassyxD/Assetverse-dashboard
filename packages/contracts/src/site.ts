import { z } from 'zod';

/** 17 เว็บเป้าหมายตาม Assetverse Phase 2 — id ใช้เป็น key ทุกที่ */
export const SITES = [
  { id: 'scb', domain: 'asset.home.scb', label: 'SCB (ทรัพย์ธนาคาร/NPA)' },
  { id: 'ghb', domain: 'ghbhomecenter.com', label: 'ธอส. Home Center' },
  { id: 'kbank', domain: 'kasikornbank.com', label: 'กสิกรไทย' },
  { id: 'ktb', domain: 'npa.krungthai.com', label: 'กรุงไทย NPA' },
  { id: 'sam', domain: 'sam.or.th', label: 'บสส. (SAM)' },
  { id: 'taladnudbaan', domain: 'taladnudbaan.com', label: 'ตลาดนัดบ้าน' },
  { id: 'baanfinder', domain: 'baanfinder.com', label: 'BaanFinder' },
  { id: 'baania', domain: 'search.baania.com', label: 'Baania' },
  { id: 'ddproperty', domain: 'ddproperty.com', label: 'DDproperty' },
  { id: 'hipflat', domain: 'hipflat.co.th', label: 'Hipflat' },
  { id: 'livinginsider', domain: 'livinginsider.com', label: 'LivingInsider' },
  { id: 'propertyhub', domain: 'propertyhub.in.th', label: 'PropertyHub' },
  { id: 'zmyhome', domain: 'th.zmyhome.com', label: 'ZmyHome' },
  { id: 'fazwaz', domain: 'fazwaz.co.th', label: 'FazWaz' },
  { id: 'homenayoo', domain: 'homenayoo.com', label: 'HomeNaYoo' },
  { id: 'led', domain: 'asset.led.go.th', label: 'กรมบังคับคดี' },
] as const;

export const siteId = z.enum(SITES.map((s) => s.id) as [string, ...string[]]);
export type SiteId = (typeof SITES)[number]['id'];

export const site = z.object({
  id: siteId,
  domain: z.string(),
  label: z.string(),
});
export type Site = z.infer<typeof site>;

/**
 * "เข้าเว็บไม่ได้" มี 3 สาเหตุที่คนละคนแก้ ห้ามรวมเป็นก้อนเดียว
 * (ทีมเขียน painpoint นี้ไว้เองในไดอะแกรมว่า "Cannot reach the Thai websites")
 */
export const sourceStatus = z.enum([
  'ok',
  /** ต้นทางล่มเอง (5xx/52x) — ไม่มีใครแก้ได้ ต้องรอ · ห้ามใช้สีแดง */
  'source_down',
  /** เราถูกบล็อก (403/429) — ทีมเราแก้ ต้องลด rate */
  'throttled',
  /** เส้นทางเราพัง (VPN/proxy/firewall) — ทีม infra แก้ */
  'network_path_down',
  /** งานหยุด/พังจริง — ต้องมีคนจัดการ */
  'failed',
  'never_run',
]);
export type SourceStatus = z.infer<typeof sourceStatus>;

/** ใครต้องลงมือ — มาจาก sourceStatus โดยตรง ไม่ให้ UI เดาเอง */
export const owner = z.enum(['nobody_wait', 'us', 'infra', 'unknown']);
export type Owner = z.infer<typeof owner>;

export const ownerOf = (s: SourceStatus): Owner =>
  s === 'source_down' ? 'nobody_wait'
  : s === 'throttled' || s === 'failed' ? 'us'
  : s === 'network_path_down' ? 'infra'
  : 'unknown';
