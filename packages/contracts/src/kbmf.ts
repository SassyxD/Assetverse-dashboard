import { z } from 'zod';
import { measurement } from './measurement.js';

/** นิยาม tier ตรงกับ app/validate.py ของ crawler — แก้ที่นั่นต้องแก้ที่นี่ด้วย */
export const PRIMARY_FIELDS = [
  'property_type', 'appraisal_price', 'land_area', 'latitude',
  'longitude', 'usable_area', 'hs_nm', 'posting_date',
] as const;

export const FALLBACK1_FIELDS = [
  'num_floors', 'source_link', 'address', 'province', 'district',
  'subdistrict', 'year', 'num_bedrooms', 'num_bathrooms',
] as const;

export const FALLBACK2_FIELDS = [
  'fcs_gym_f', 'fcs_pool_f', 'fcs_grdn_f', 'fcs_club_f', 'fcs_scr_f',
  'parking', 'images', 'land_width', 'scrape_date', 'title', 'description',
] as const;

export const TIERS = {
  primary: { fields: PRIMARY_FIELDS, threshold: 0.8 },
  fallback1: { fields: FALLBACK1_FIELDS, threshold: 0.6 },
  fallback2: { fields: FALLBACK2_FIELDS, threshold: 0.4 },
} as const;

export const tierName = z.enum(['primary', 'fallback1', 'fallback2']);
export type TierName = z.infer<typeof tierName>;

/**
 * field ว่าง "ทุกแถว" กับ "บางแถว" เป็นปัญหาคนละชนิด แก้คนละที่
 *   structural  ต้นทางไม่ส่ง field นี้มาเลย → แก้ที่สเปก/เปลี่ยนแหล่ง crawl ซ้ำไม่ช่วย
 *   sparse      ผู้ประกาศไม่กรอกบางราย     → crawl ซ้ำก็ไม่เพิ่ม
 */
export const fieldGap = z.enum(['none', 'sparse', 'structural']);
export type FieldGap = z.infer<typeof fieldGap>;

export const fieldFill = z.object({
  field: z.string(),
  tier: tierName,
  fillRate: z.number().min(0).max(1),
  filled: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  gap: fieldGap,
});
export type FieldFill = z.infer<typeof fieldFill>;

export const tierSummary = z.object({
  tier: tierName,
  threshold: z.number(),
  /** ช่องที่มีของ ÷ ช่องทั้งหมด */
  fillRate: measurement(z.number().min(0).max(1)),
  /** แถวที่ครบทุกช่อง ÷ แถวทั้งหมด — เป็น 0 ได้ทั้งที่ fillRate ผ่านเกณฑ์ */
  recordCompleteRate: measurement(z.number().min(0).max(1)),
  passes: z.boolean(),
  /** field ที่ว่างทุกแถว = ตัวที่ทำให้ recordCompleteRate เป็น 0 */
  structuralGaps: z.array(z.string()),
  fields: z.array(fieldFill),
});
export type TierSummary = z.infer<typeof tierSummary>;

/** สาเหตุที่แถวตก tier — เรียงจากที่พบมากสุด ใช้บอกว่าควรไปแก้ field ไหนก่อน */
export const missingCombo = z.object({
  fields: z.array(z.string()),
  records: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});
export type MissingCombo = z.infer<typeof missingCombo>;

/**
 * ค่าที่ "มี" แต่ผิด — %prim_Fields_Nullrate จับได้แต่ค่าที่หาย
 * ของจริงเคยได้ 16,157 ไร่ ต่อบ้านหลังเดียว โดยไม่มีอะไรเตือน
 */
export const rangeCheck = z.object({
  id: z.string(),
  field: z.string(),
  label: z.string(),
  /** อธิบายว่าช่วงที่สมเหตุสมผลคืออะไร ไม่ใช่แค่บอกว่าผิด */
  expectation: z.string(),
  records: z.number().int().nonnegative(),
  severity: z.enum(['info', 'warn', 'error']),
});
export type RangeCheck = z.infer<typeof rangeCheck>;
