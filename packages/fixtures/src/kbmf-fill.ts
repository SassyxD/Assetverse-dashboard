import type { FieldFill, TierName } from '@assetverse/contracts';
import { TIERS } from '@assetverse/contracts';

/**
 * fill rate จริงที่วัดจาก data/raw/baania 57,571 ไฟล์ (3 ก.ย. 2026)
 * ไม่ได้แต่งตัวเลข — field ที่ไม่อยู่ในนี้คือ 100%
 */
const BAANIA_FILL: Record<string, number> = {
  land_area: 0.877,
  usable_area: 0.84,
  num_floors: 0.919,
  num_bathrooms: 0.95,
  num_bedrooms: 0.966,
  subdistrict: 0.99,
  district: 0.999,
  parking: 0.592,
  fcs_gym_f: 0.883,
  fcs_pool_f: 0.883,
  fcs_grdn_f: 0.883,
  fcs_scr_f: 0.883,
  images: 0.998,
  // 4 ตัวนี้ว่างทุกแถว — สำรวจ key ในข้อมูลดิบแล้ว listing API ไม่ส่งมาจริง
  year: 0,
  fcs_club_f: 0,
  land_width: 0,
  description: 0,
};

const SCB_FILL: Record<string, number> = {
  land_area: 0.75,
  num_bedrooms: 0.85,
  parking: 0.75,
  year: 0,
  fcs_gym_f: 0, fcs_pool_f: 0, fcs_grdn_f: 0, fcs_club_f: 0, fcs_scr_f: 0,
  land_width: 0,
};

export const fillTable = (site: string): Record<string, number> =>
  site === 'baania' ? BAANIA_FILL : site === 'scb' ? SCB_FILL : {};

export const buildFields = (
  tier: TierName,
  total: number,
  table: Record<string, number>,
): FieldFill[] =>
  TIERS[tier].fields.map((field) => {
    const rate = table[field] ?? 1;
    const filled = Math.round(total * rate);
    return {
      field,
      tier,
      fillRate: rate,
      filled,
      total,
      // ว่างทุกแถว = โครงสร้าง · ว่างบางแถว = คนไม่กรอก · คนละปัญหา คนละคนแก้
      gap: filled === 0 ? 'structural' : filled < total ? 'sparse' : 'none',
    };
  });
