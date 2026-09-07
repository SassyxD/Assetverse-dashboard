import type { Measurement } from '@assetverse/contracts';

/**
 * "—" คือยังไม่รู้ · "0" คือวัดแล้วได้ศูนย์ — ห้ามปนกัน
 * บังคับให้ทุกที่ที่แสดง Measurement ผ่านฟังก์ชันนี้
 */
export const showNum = (m: Measurement<number>, opts?: { digits?: number }): string =>
  m.state === 'unavailable' || m.value === null
    ? '—'
    : m.value.toLocaleString('th-TH', {
        minimumFractionDigits: opts?.digits ?? 0,
        maximumFractionDigits: opts?.digits ?? 0,
      });

export const showPct = (m: Measurement<number>, digits = 1): string =>
  m.state === 'unavailable' || m.value === null
    ? '—'
    : `${(m.value * 100).toFixed(digits)}%`;

export const showBytes = (m: Measurement<number>): string => {
  if (m.state === 'unavailable' || m.value === null) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = m.value;
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
};

export const showSeconds = (m: Measurement<number>): string => {
  if (m.state === 'unavailable' || m.value === null) return '—';
  const s = m.value;
  if (s < 60) return `${Math.round(s)} วิ`;
  if (s < 3600) return `${Math.round(s / 60)} นาที`;
  return `${Math.floor(s / 3600)} ชม. ${Math.round((s % 3600) / 60)} น.`;
};
