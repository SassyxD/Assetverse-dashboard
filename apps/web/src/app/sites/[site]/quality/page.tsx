'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { Coverage, FieldFill, TierSummary } from '@assetverse/contracts';

import { api, qk } from '@/lib/api';
import { num, pct, showPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Shell } from '@/components/shell';
import { Breakdown, Panel, StatusBadge } from '@/components/measure';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const TIER_LABEL: Record<string, string> = {
  primary: 'primary',
  fallback1: 'fallback1',
  fallback2: 'fallback2',
};

export default function QualityPage() {
  const site = String(useParams()['site'] ?? '');
  const { data, isPending, error } = useQuery({
    queryKey: qk.site(site),
    queryFn: () => api.site(site),
    enabled: site.length > 0,
  });

  if (isPending)
    return (
      <Shell title="คุณภาพข้อมูล">
        <p className="text-muted-foreground text-sm">กำลังโหลด</p>
      </Shell>
    );
  if (error)
    return (
      <Shell title="คุณภาพข้อมูล">
        <p className="text-bad text-sm">โหลดไม่ได้: {error.message}</p>
      </Shell>
    );

  const d = data;

  return (
    <Shell
      title="คุณภาพข้อมูล"
      hint={site}
      actions={<StatusBadge status={d.status} />}
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <CoveragePanel coverage={d.coverage} />

        <Panel
          title="ค่าที่มีแต่น่าสงสัย"
          hint="null rate จับค่าที่หาย ตารางนี้จับค่าที่มีแต่หลุดช่วง"
        >
          {d.rangeChecks.length === 0 ? (
            <p className="text-muted-foreground text-sm">ยังไม่มีข้อมูลพอจะตรวจ</p>
          ) : (
            <ul className="divide-y">
              {d.rangeChecks.map((r) => (
                <li key={r.id} className="grid grid-cols-[1fr_auto] gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[11px]">{r.field}</code>
                      {r.records > 0 && r.severity === 'warn' ? (
                        <Badge variant="gap">ต้องดู</Badge>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[12px]">{r.label}</div>
                    <div className="text-muted-foreground text-[11px]">{r.expectation}</div>
                  </div>
                  <div
                    className={cn(
                      'tnum self-center text-sm font-medium',
                      r.records > 0 && r.severity === 'warn' && 'text-gap',
                    )}
                  >
                    {num(r.records)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {d.missingCombos.length > 0 ? (
        <Panel
          title="สาเหตุที่แถวตก primary"
          hint="บอกว่าควรไปแก้ field ไหนก่อน"
          className="mt-5"
        >
          <Breakdown
            rows={d.missingCombos.map((c) => ({
              label: c.fields.join(' + '),
              value: c.records,
              hint: pct(c.share),
            }))}
          />
        </Panel>
      ) : null}

      <div className="mt-5 grid gap-5">
        {d.tiers.map((t) => (
          <TierPanel key={t.tier} tier={t} />
        ))}
      </div>
    </Shell>
  );
}

const CoveragePanel = ({ coverage }: { coverage: Coverage }) => {
  const types = [...new Set(coverage.cells.map((c) => c.propertyType))];
  const states = [...new Set(coverage.cells.map((c) => c.sellState))];
  const usable = coverage.areas.filter((a) => !a.belowUsableThreshold).length;
  const thin = coverage.areas.filter((a) => a.belowUsableThreshold);

  return (
    <Panel
      title="ครอบคลุมอะไรบ้าง"
      hint="ยอดรวมโกหกได้ ต้องดูว่ากระจุกอยู่ช่องไหน"
      action={
        <Badge variant={coverage.scopesWithData < coverage.scopesTotal ? 'gap' : 'ok'}>
          {coverage.scopesWithData} / {coverage.scopesTotal} ขอบเขต
        </Badge>
      }
    >
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `7rem repeat(${states.length}, minmax(0,1fr))` }}
      >
        <div />
        {states.map((s) => (
          <div key={s} className="text-muted-foreground pb-1 font-mono text-[10px]">
            {s}
          </div>
        ))}

        {types.map((t) => (
          <Cells key={t} type={t} states={states} coverage={coverage} />
        ))}
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="font-mono text-[10px] tracking-wide uppercase">จังหวัด</h3>
          <Badge variant={usable === 0 ? 'gap' : 'muted'}>
            {usable} / {coverage.cells[0]?.areasTotal ?? 74}
          </Badge>
        </div>
        {coverage.areas.length === 0 ? (
          <p className="text-muted-foreground text-sm">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {coverage.areas.map((a) => (
              <span
                key={a.area}
                className={cn(
                  'rounded border px-1.5 py-0.5 text-[11px]',
                  a.belowUsableThreshold ? 'hatch text-gap border-dashed font-medium' : 'bg-card',
                )}
              >
                {a.area} <span className="tnum text-muted-foreground">{num(a.records)}</span>
              </span>
            ))}
          </div>
        )}
        {thin.length > 0 ? (
          <p className="text-muted-foreground mt-2 text-[11px]">
            {thin.length} จังหวัดมีไม่ถึง 10 แถว นับว่ายังไม่มีข้อมูล
          </p>
        ) : null}
      </div>
    </Panel>
  );
};

const Cells = ({
  type,
  states,
  coverage,
}: {
  type: string;
  states: string[];
  coverage: Coverage;
}) => (
  <>
    <div className="self-center text-[12px]">{type}</div>
    {states.map((s) => {
      const cell = coverage.cells.find((c) => c.propertyType === type && c.sellState === s);
      const n = cell?.records ?? 0;
      return (
        <div
          key={s}
          className={cn(
            'rounded-md border p-2.5',
            n === 0 ? 'hatch border-dashed' : 'bg-card',
          )}
        >
          {n === 0 ? (
            <div className="text-muted-foreground text-[11px]">ยังไม่เก็บ</div>
          ) : (
            <>
              <div className="tnum text-sm font-semibold">{num(n)}</div>
              <div className="text-muted-foreground text-[11px]">
                {cell?.areasCovered} / {cell?.areasTotal} จังหวัด
              </div>
            </>
          )}
        </div>
      );
    })}
  </>
);

const TierPanel = ({ tier }: { tier: TierSummary }) => (
  <Panel
    title={TIER_LABEL[tier.tier] ?? tier.tier}
    hint={`${tier.fields.length} field · เกณฑ์ fill > ${tier.threshold * 100}%`}
    action={
      <div className="flex items-center gap-2">
        <Badge variant={tier.passes ? 'ok' : 'bad'}>fill {showPct(tier.fillRate)}</Badge>
        <Badge variant={(tier.recordCompleteRate.value ?? 0) > 0 ? 'muted' : 'gap'}>
          record complete {showPct(tier.recordCompleteRate)}
        </Badge>
      </div>
    }
  >
    {tier.structuralGaps.length > 0 ? (
      <p className="text-muted-foreground mb-3 text-[12px]">
        <code className="text-foreground font-mono">{tier.structuralGaps.join(', ')}</code>{' '}
        ว่างทุกแถว ทุกแถวจึงขาดอย่างน้อย 1 ช่อง แม้ช่องอื่นเต็ม
      </p>
    ) : null}

    <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
      {tier.fields.map((f) => (
        <FillRow key={f.field} f={f} />
      ))}
    </div>
  </Panel>
);

const FillRow = ({ f }: { f: FieldFill }) => (
  <div className="grid grid-cols-[1fr_4rem_3rem] items-center gap-2 py-1">
    <code
      className={cn(
        'truncate font-mono text-[11px]',
        f.gap === 'structural' && 'text-gap font-semibold',
      )}
    >
      {f.field}
    </code>
    <Progress
      value={f.fillRate * 100}
      className="h-1"
      indicatorClassName={
        f.gap === 'structural' ? 'bg-gap' : f.fillRate < 0.5 ? 'bg-wait' : 'bg-ok'
      }
    />
    <span className="tnum text-right text-[11px]">{pct(f.fillRate, 0)}</span>
  </div>
);
