import type { Measurement } from '@assetverse/contracts';

/** "not measured" คือยังไม่รู้ · "0" คือวัดแล้วได้ศูนย์ ห้ามปนกัน */
export const NO_DATA = 'Not measured';

const known = (m: Measurement<number>): m is Measurement<number> & { value: number } =>
  m.state !== 'unavailable' && m.value !== null;

export const showNum = (m: Measurement<number>, opts?: { digits?: number }): string =>
  known(m)
    ? m.value.toLocaleString('en-US', {
        minimumFractionDigits: opts?.digits ?? 0,
        maximumFractionDigits: opts?.digits ?? 0,
      })
    : NO_DATA;

export const showPct = (m: Measurement<number>, digits = 1): string =>
  known(m) ? `${(m.value * 100).toFixed(digits)}%` : NO_DATA;

export const showBytes = (m: Measurement<number>): string => {
  if (!known(m)) return NO_DATA;
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = m.value;
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
};

export const showSeconds = (m: Measurement<number>): string => {
  if (!known(m)) return NO_DATA;
  const s = m.value;
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
};

export const num = (n: number): string => n.toLocaleString('en-US');

export const pct = (n: number, digits = 1): string => `${(n * 100).toFixed(digits)}%`;
