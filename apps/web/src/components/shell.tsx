'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Network, ScanSearch, Workflow } from 'lucide-react';

import { api, qk } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Section = 'fleet' | 'pipeline' | 'quality' | 'infra';

const sectionOf = (pathname: string): Section =>
  pathname === '/' ? 'fleet'
  : pathname.startsWith('/infra') ? 'infra'
  : pathname.endsWith('/quality') ? 'quality'
  : 'pipeline';

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
  const section = sectionOf(pathname);

  const { data: sites } = useQuery({ queryKey: qk.sites, queryFn: api.sites, staleTime: Infinity });
  const { data: summary } = useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });

  const routeSite = typeof params['site'] === 'string' ? params['site'] : '';
  const site = routeSite || sites?.[0]?.id || '';

  const nav = [
    { key: 'fleet', num: '01', label: 'ภาพรวม', icon: LayoutGrid, href: '/' },
    { key: 'pipeline', num: '02', label: 'เว็บนี้', icon: Workflow, href: `/sites/${site}` },
    { key: 'quality', num: '03', label: 'คุณภาพ', icon: ScanSearch, href: `/sites/${site}/quality` },
    { key: 'infra', num: '04', label: 'Infra', icon: Network, href: '/infra' },
  ] as const;

  const goSite = (id: string) =>
    router.push(section === 'quality' ? `/sites/${id}/quality` : `/sites/${id}`);

  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md font-mono text-[11px] font-bold">
            AV
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-semibold">Assetverse</div>
            <div className="text-muted-foreground truncate text-[11px]">Monitoring</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                section === n.key
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )}
            >
              <n.icon className="size-4 shrink-0" />
              {n.label}
              <span className="text-muted-foreground/70 ml-auto font-mono text-[10px]">{n.num}</span>
            </Link>
          ))}
        </nav>

        {summary ? (
          <div className="text-muted-foreground border-t p-3 text-[11px]">
            <div className="flex items-baseline gap-2">
              <span>รอบ</span>
              <span className="tnum text-foreground font-medium">{summary.cycle}</span>
              <span className="ml-auto">D{summary.cycleDay}</span>
            </div>
            <p className="mt-1">รายรอบเดือน ไม่ใช่ realtime</p>
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 sticky top-0 z-20 border-b backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{title}</h1>
              {hint ? (
                <p className="text-muted-foreground truncate text-[11px]">{hint}</p>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {actions}
              {section === 'infra' ? (
                <Badge variant="muted">ทั้ง 17 เว็บ</Badge>
              ) : (
                <select
                  aria-label="เลือกเว็บ"
                  value={section === 'fleet' ? '__all' : site}
                  onChange={(e) =>
                    e.target.value === '__all' ? router.push('/') : goSite(e.target.value)
                  }
                  className="border-input bg-background focus-visible:ring-ring h-8 rounded-md border px-2 text-[12px] focus-visible:ring-2 focus-visible:outline-none"
                >
                  <option value="__all">ทุกเว็บ ({sites?.length ?? 0})</option>
                  {(sites ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.domain}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1.5 lg:hidden">
            {nav.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[12px] whitespace-nowrap',
                  section === n.key ? 'bg-accent font-medium' : 'text-muted-foreground',
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-16 lg:p-6">{children}</main>
      </div>
    </div>
  );
};
