'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ScanSearch, Workflow } from 'lucide-react';

import { api, qk } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * นำทางด้วย "ขั้นของ pipeline" ไม่ใช่ด้วยเว็บ — เลือก Fetcher/Extractor ก่อน
 * แล้วค่อยเจาะลงเว็บ เพราะคนที่เปิดดูมาพร้อมคำถามว่า "ขั้นไหนพัง"
 * ไม่ได้มาพร้อมชื่อเว็บ
 */
export type Stage = 'fetcher' | 'extractor';

const STAGES = [
  { key: 'fetcher', num: '01', label: 'Fetcher', icon: Workflow },
  { key: 'extractor', num: '02', label: 'Extractor', icon: ScanSearch },
] as const;

const ALL = '__all';

export const stageOf = (pathname: string): Stage =>
  pathname.startsWith('/extractor') ? 'extractor' : 'fetcher';

export const Shell = ({
  title,
  hint,
  actions,
  children,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const stage = stageOf(pathname);

  const { data: sites } = useQuery({
    queryKey: qk.sites,
    queryFn: api.sites,
    staleTime: Infinity,
  });
  const { data: summary } = useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });

  // ว่าง = อยู่หน้ารวม — ใช้แค่บอก dropdown ว่าค้างอยู่ที่เว็บไหน
  const site = typeof params['site'] === 'string' ? params['site'] : '';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/85 sticky top-0 z-20 border-b backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 lg:gap-5 lg:px-6">
          <div className="hidden min-w-0 shrink-0 leading-tight sm:block">
            <div className="truncate text-[13px] font-semibold">Assetverse</div>
            <div className="text-muted-foreground truncate text-[11px]">Monitoring</div>
          </div>

          {/* ปุ่มสลับขั้นพากลับหน้ารวมเสมอ ไม่พาเว็บที่ค้างอยู่ไปด้วย */}
          <nav className="bg-secondary flex shrink-0 items-center gap-0.5 rounded-lg p-1">
            {STAGES.map((s) => (
              <Link
                key={s.key}
                href={`/${s.key}`}
                aria-current={stage === s.key ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                  stage === s.key
                    ? 'bg-background text-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <s.icon className="size-4 shrink-0" />
                {s.label}
                <span className="text-muted-foreground/70 hidden font-mono text-[10px] lg:inline">
                  {s.num}
                </span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-3">
            <select
              aria-label="Select a site"
              value={site || ALL}
              onChange={(e) =>
                router.push(
                  e.target.value === ALL ? `/${stage}` : `/${stage}/${e.target.value}`,
                )
              }
              className="border-input bg-background focus-visible:ring-ring h-8 max-w-[190px] rounded-md border px-2 text-[12px] focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value={ALL}>All sites ({sites?.length ?? 0})</option>
              {(sites ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.domain}
                </option>
              ))}
            </select>

            {summary ? (
              <div className="text-muted-foreground hidden text-[11px] leading-tight xl:block">
                <div className="flex items-baseline gap-1.5">
                  <span>Cycle</span>
                  <span className="tnum text-foreground font-medium">{summary.cycle}</span>
                  <span>D{summary.cycleDay}</span>
                </div>
                <p>Monthly cycle, not realtime</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-12 items-center gap-3 border-t px-4 py-2 lg:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            {hint ? <p className="text-muted-foreground truncate text-[11px]">{hint}</p> : null}
          </div>
          {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>

      <main className="min-w-0 flex-1 p-4 pb-16 lg:p-6">{children}</main>
    </div>
  );
};
