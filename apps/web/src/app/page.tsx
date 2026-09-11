import { redirect } from 'next/navigation';

/**
 * ไม่มีหน้าแรกของตัวเองแล้ว — การนำทางเริ่มที่ "ขั้นของ pipeline"
 * Fetcher มาก่อนตามลำดับการไหลจริง จึงเป็นหน้าเริ่มต้น
 */
export default function RootPage() {
  redirect('/fetcher');
}
