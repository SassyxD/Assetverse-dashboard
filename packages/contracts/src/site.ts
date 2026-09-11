import { z } from 'zod';

/** ชนิดต้นทาง — คนละชนิดคนละพฤติกรรม (ธนาคารเปิดกว้าง marketplace บล็อก) */
export const siteKind = z.enum(['marketplace', 'bank_npa', 'gov']);
export type SiteKind = z.infer<typeof siteKind>;

/** 17 เว็บเป้าหมายตาม Assetverse Phase 2 — id ใช้เป็น key ทุกที่ */
export const SITES = [
  { id: 'scb', domain: 'asset.home.scb', label: 'SCB (bank-owned / NPA)', kind: 'bank_npa' },
  { id: 'ghb', domain: 'ghbhomecenter.com', label: 'GHB Home Center', kind: 'bank_npa' },
  { id: 'kbank', domain: 'kasikornbank.com', label: 'Kasikornbank', kind: 'bank_npa' },
  { id: 'ktb', domain: 'npa.krungthai.com', label: 'Krungthai NPA', kind: 'bank_npa' },
  { id: 'sam', domain: 'sam.or.th', label: 'SAM (Sukhumvit Asset Management)', kind: 'bank_npa' },
  { id: 'taladnudbaan', domain: 'taladnudbaan.com', label: 'Talad Nud Baan', kind: 'marketplace' },
  { id: 'baanfinder', domain: 'baanfinder.com', label: 'BaanFinder', kind: 'marketplace' },
  { id: 'baania', domain: 'search.baania.com', label: 'Baania', kind: 'marketplace' },
  { id: 'ddproperty', domain: 'ddproperty.com', label: 'DDproperty', kind: 'marketplace' },
  { id: 'hipflat', domain: 'hipflat.co.th', label: 'Hipflat', kind: 'marketplace' },
  { id: 'livinginsider', domain: 'livinginsider.com', label: 'LivingInsider', kind: 'marketplace' },
  { id: 'propertyhub', domain: 'propertyhub.in.th', label: 'PropertyHub', kind: 'marketplace' },
  { id: 'zmyhome', domain: 'th.zmyhome.com', label: 'ZmyHome', kind: 'marketplace' },
  { id: 'fazwaz', domain: 'fazwaz.co.th', label: 'FazWaz', kind: 'marketplace' },
  { id: 'homenayoo', domain: 'homenayoo.com', label: 'HomeNaYoo', kind: 'marketplace' },
  { id: 'led', domain: 'asset.led.go.th', label: 'Legal Execution Department', kind: 'gov' },
] as const;

export const siteId = z.enum(SITES.map((s) => s.id) as [string, ...string[]]);
export type SiteId = (typeof SITES)[number]['id'];

export const site = z.object({
  id: siteId,
  domain: z.string(),
  label: z.string(),
  kind: siteKind,
});
export type Site = z.infer<typeof site>;

export const SITE_KIND_LABEL: Record<SiteKind, string> = {
  marketplace: 'Marketplace',
  bank_npa: 'Bank / NPA',
  gov: 'Government',
};

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
