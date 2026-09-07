import { z } from 'zod';

/**
 * ค่าที่ "ยังไม่ได้วัด" ต่างจาก "วัดแล้วได้ศูนย์" — และเป็นความต่างที่ทำให้
 * ตัดสินใจผิดง่ายที่สุด ทำเป็น type บังคับไว้ เพื่อให้ลืมไม่ได้
 *
 *   unavailable  ระบบยังวัดไม่ได้เลย (ไม่มี instrument) → UI แสดง "—"
 *   insufficient วัดได้แต่กลุ่มตัวอย่างเล็กเกินจะสรุป   → UI ต้องติดธง
 *   ok           เชื่อได้
 */
export const measurementState = z.enum(['ok', 'insufficient', 'unavailable']);
export type MeasurementState = z.infer<typeof measurementState>;

export const measurement = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    state: measurementState,
    /** null เมื่อ state = 'unavailable' — ห้ามใส่ 0 แทน */
    value: value.nullable(),
    /** จำนวนตัวอย่างที่ใช้คำนวณ ไว้ให้ UI ตัดสินว่าเชื่อได้ไหม */
    sampleSize: z.number().int().nonnegative().optional(),
    /** เหตุผลที่วัดไม่ได้ / เชื่อไม่ได้ — โชว์ให้คนอ่านตรงๆ ไม่ต้องเดา */
    note: z.string().optional(),
  });

/**
 * ต้องเขียน `| undefined` ให้ชัด — ใต้ exactOptionalPropertyTypes คำว่า `sampleSize?: number`
 * หมายถึง "มีแล้วเป็น number หรือไม่มีเลย" ซึ่ง type ที่ zod infer
 * (`sampleSize?: number | undefined`) assign เข้ามาไม่ได้
 */
export type Measurement<T> = {
  state: MeasurementState;
  value: T | null;
  sampleSize?: number | undefined;
  note?: string | undefined;
};

export const ok = <T>(value: T, sampleSize?: number): Measurement<T> =>
  sampleSize === undefined ? { state: 'ok', value } : { state: 'ok', value, sampleSize };

export const insufficient = <T>(
  value: T,
  sampleSize: number,
  note: string,
): Measurement<T> => ({ state: 'insufficient', value, sampleSize, note });

export const unavailable = <T>(note: string): Measurement<T> => ({
  state: 'unavailable',
  value: null,
  note,
});
