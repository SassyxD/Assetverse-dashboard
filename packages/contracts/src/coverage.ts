import { z } from 'zod';

/**
 * ยอดรวมโกหกได้ — 57,571 แถวดูเยอะ แต่กระจุกใน 1 ใน 8 ช่อง
 * ต้องดูเป็น matrix และทำให้ช่องว่างเด่นกว่าช่องที่มีเลขเยอะ
 */
export const coverageCell = z.object({
  propertyType: z.string(),
  sellState: z.string(),
  records: z.number().int().nonnegative(),
  /** จังหวัดที่มีข้อมูล ÷ จังหวัดที่ควรมี */
  areasCovered: z.number().int().nonnegative(),
  areasTotal: z.number().int().nonnegative(),
});
export type CoverageCell = z.infer<typeof coverageCell>;

export const areaCoverage = z.object({
  area: z.string(),
  records: z.number().int().nonnegative(),
  /** มีไม่ถึงเกณฑ์ = นับว่ามีข้อมูลไม่ได้ ควรถือเป็นช่องว่าง */
  belowUsableThreshold: z.boolean(),
});
export type AreaCoverage = z.infer<typeof areaCoverage>;

/** จังหวัดที่มีน้อยกว่านี้ถือว่ายังไม่มีข้อมูล (ชลบุรี 5, เชียงใหม่ 4, นครนายก 1) */
export const USABLE_AREA_MIN_RECORDS = 10;

export const coverage = z.object({
  cells: z.array(coverageCell),
  areas: z.array(areaCoverage),
  scopesTotal: z.number().int().positive(),
  scopesWithData: z.number().int().nonnegative(),
});
export type Coverage = z.infer<typeof coverage>;
