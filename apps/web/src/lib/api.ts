import type { DashboardSummary, SiteSnapshot, Site } from '@assetverse/contracts';

const get = async <T>(path: string): Promise<T> => {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return (await r.json()) as T;
};

export const api = {
  dashboard: () => get<DashboardSummary>('/api/dashboard'),
  sites: () => get<Site[]>('/api/sites'),
  site: (id: string) => get<SiteSnapshot>(`/api/sites/${id}`),
};

/** queryKey รวมไว้ที่เดียว กัน key พิมพ์ผิดแล้ว cache ไม่ชนกันเงียบๆ */
export const qk = {
  dashboard: ['dashboard'] as const,
  sites: ['sites'] as const,
  site: (id: string) => ['site', id] as const,
};
