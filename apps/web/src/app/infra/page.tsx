'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { SiteOverview, SourceStatus } from '@assetverse/contracts';

import { api, qk } from '@/lib/api';
import { showBytes, showNum, showPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Shell } from '@/components/shell';
import { Field, FieldGrid, NotWired, Panel, allMissing } from '@/components/measure';
import { Badge } from '@/components/ui/badge';

const HOP_STYLE = {
  ok: 'bg-ok-soft text-ok border-transparent',
  degraded: 'bg-gap-soft text-gap border-transparent',
  down: 'bg-wait-soft text-wait border-transparent',
  unknown: 'hatch text-muted-foreground border-dashed',
} as const;

export default function InfraPage() {
  const { data, isPending, error } = useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });

  if (isPending)
    return (
      <Shell title="Infra">
        <p className="text-muted-foreground text-sm">กำลังโหลด</p>
      </Shell>
    );
  if (error)
    return (
      <Shell title="Infra">
        <p className="text-bad text-sm">โหลดไม่ได้: {error.message}</p>
      </Shell>
    );

  const { infra, sites } = data;
  const aurora = [infra.aurora.rows, infra.aurora.replicaLagMs, infra.aurora.connections];
  const by = (s: SourceStatus) => sites.filter((x) => x.status === s);

  const causes = [
    {
      id: 'blocked',
      title: 'เราถูกบล็อก',
      detect: '403 / 429',
      owner: 'ทีมเรา ลด rate',
      rows: by('throttled'),
      tone: 'bad' as const,
    },
    {
      id: 'path',
      title: 'เส้นทางเราพัง',
      detect: 'timeout ที่ hop ภายใน',
      owner: 'ทีม infra',
      rows: by('network_path_down'),
      tone: 'bad' as const,
    },
    {
      id: 'origin',
      title: 'เว็บเป้าหมายล่ม',
      detect: '5xx / 52x',
      owner: 'ไม่มีใครแก้ได้ รอ',
      rows: by('source_down'),
      tone: 'wait' as const,
    },
  ];

  return (
    <Shell title="Infra" hint="ไม่ผูกกับเว็บใดเว็บหนึ่ง เป็นของร่วมทั้ง 17 เว็บ">
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {causes.map((c) => (
          <Cause key={c.id} {...c} />
        ))}
      </div>

      <Panel
        title="เส้นทางจาก AWS Singapore ไปเว็บเป้าหมาย"
        hint="พังคนละช่วงคนละคนแก้ ช่องลายทแยงคือไม่มี metric ส่งมา"
        className="mb-5"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {infra.networkPath.map((h, i) => (
            <div
              key={h.id}
              className={cn('min-w-0 rounded-md border p-2.5', HOP_STYLE[h.status])}
              title={h.detail}
            >
              <div className="font-mono text-[10px] opacity-70">H{i + 1}</div>
              <div className="mt-0.5 text-[11.5px] leading-tight font-medium">{h.label}</div>
            </div>
          ))}
        </div>
        {infra.networkPath
          .filter((h) => h.detail)
          .map((h) => (
            <p key={h.id} className="text-muted-foreground mt-3 text-[12px]">
              <span className="text-foreground font-medium">{h.label}</span> {h.detail}
            </p>
          ))}
      </Panel>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel title="S3" hint="raw html + ที่ extract แล้ว อยู่ bucket เดียวกัน">
          <FieldGrid className="lg:grid-cols-3">
            <Field name="objects" m={infra.s3.objects} />
            <Field name="ขนาด" m={infra.s3.bytes} format={showBytes} />
            <Field name="cost_usd / เดือน" m={infra.s3.monthlyCostUsd} />
            <Field
              name="%storage_availibility"
              m={infra.storageAvailability}
              format={(m) => showPct(m)}
              className="col-span-2 lg:col-span-3"
            />
          </FieldGrid>
        </Panel>

        <Panel title="Aurora" hint="ยังไม่ได้ต่อ ตอนนี้ crawler เขียนลงดิสก์">
          {allMissing(aurora) ? (
            <NotWired ms={aurora} />
          ) : (
            <FieldGrid className="lg:grid-cols-3">
              <Field name="row_count" m={infra.aurora.rows} />
              <Field
                name="replica_lag"
                m={infra.aurora.replicaLagMs}
                format={(m) => showNum(m, { digits: 0 })}
              />
              <Field name="connections" m={infra.aurora.connections} />
            </FieldGrid>
          )}
        </Panel>

        <Panel title="Fargate" hint="task ที่ตายคือสัญญาณเดียวกับ data sparse">
          <FieldGrid>
            <Field name="tasks_running" m={infra.fargate.tasksRunning} />
            <Field name="tasks_failed" m={infra.fargate.tasksFailed} />
            <Field name="cpu" m={infra.fargate.cpuPct} format={(m) => showPct(m)} />
            <Field name="memory" m={infra.fargate.memoryPct} format={(m) => showPct(m)} />
          </FieldGrid>
        </Panel>

        <Panel title="CloudWatch alarm" hint="alarm ที่ยิงเสียงแล้วไม่มีคนรับ แย่กว่าไม่มี alarm">
          {infra.cloudwatchAlarms.length === 0 ? (
            <p className="text-muted-foreground text-sm">ยังไม่ได้ตั้ง alarm</p>
          ) : (
            <ul className="divide-y">
              {infra.cloudwatchAlarms.map((a) => (
                <li key={a.name} className="flex items-center gap-3 py-2 first:pt-0">
                  <span className="truncate font-mono text-[11px]">{a.name}</span>
                  <span className="text-muted-foreground ml-auto text-[11px]">{a.since}</span>
                  <Badge variant={a.state === 'alarm' ? 'bad' : a.state === 'ok' ? 'ok' : 'muted'}>
                    {a.state}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Shell>
  );
}

const Cause = ({
  title,
  detect,
  owner,
  rows,
  tone,
}: {
  title: string;
  detect: string;
  owner: string;
  rows: SiteOverview[];
  tone: 'bad' | 'wait';
}) => (
  <div className="bg-card rounded-lg border p-4 shadow-sm">
    <div className="flex items-baseline gap-2">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      <span
        className={cn(
          'tnum ml-auto text-2xl font-bold',
          rows.length > 0 && (tone === 'bad' ? 'text-bad' : 'text-wait'),
        )}
      >
        {rows.length}
      </span>
    </div>
    <p className="text-muted-foreground mt-1 font-mono text-[10px]">{detect}</p>
    <p className="mt-2.5 text-[12px]">
      <span className="text-muted-foreground">ใครแก้ </span>
      {owner}
    </p>
    {rows.length > 0 ? (
      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t pt-2.5">
        {rows.map((r) => (
          <Link
            key={r.site}
            href={`/sites/${r.site}`}
            className="bg-secondary rounded px-1.5 py-0.5 text-[11px] hover:underline"
          >
            {r.domain}
          </Link>
        ))}
      </div>
    ) : null}
  </div>
);
