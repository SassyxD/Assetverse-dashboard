'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Braces, Database, Layers, Percent } from 'lucide-react';
import type { Coverage, FieldFill, SiteSnapshot, TierSummary } from '@assetverse/contracts';

import { api, qk } from '@/lib/api';
import { NO_DATA, num, pct, showNum, showPct, showSeconds } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Shell } from '@/components/shell';
import {
  Breakdown,
  Field,
  FieldGrid,
  NotWired,
  Panel,
  StatusBadge,
  allMissing,
  ownerLabel,
} from '@/components/measure';
import { PipelineStages, type Stage } from '@/components/pipeline-stages';
import { DashboardMetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const OWNER_LABEL = { our_team: 'Owned by us', other_team: 'Owned by another team' } as const;

const PII_STAGE_LABEL: Record<string, string> = {
  before_s3: 'Before saving to S3',
  after_s3: 'After saving to S3',
  at_parse: 'At parse time',
  unknown: 'Not known yet',
};

const PII_ACTION_LABEL: Record<string, string> = {
  mask: 'Mask the value',
  drop: 'Drop the row',
  flag_only: 'Flag only',
  unknown: 'Not known yet',
};

export default function ExtractorSitePage() {
  const site = String(useParams()['site'] ?? '');
  const { data, isPending, error } = useQuery({
    queryKey: qk.site(site),
    queryFn: () => api.site(site),
    enabled: site.length > 0,
  });

  if (isPending)
    return (
      <Shell title={site}>
        <p className="text-muted-foreground text-sm">Loading</p>
      </Shell>
    );
  if (error)
    return (
      <Shell title={site}>
        <p className="text-bad text-sm">Could not load: {error.message}</p>
      </Shell>
    );

  const d = data;
  const primary = d.tiers.find((t) => t.tier === 'primary');
  const llm = [
    d.llmRecovery.invocations,
    d.llmRecovery.recoveryRate,
    d.llmRecovery.iterations,
    d.llmRecovery.scriptsGenerated,
    d.llmRecovery.scriptsAccepted,
    d.llmRecovery.tokensUsed,
  ];
  const pii = [d.pii.scanned, d.pii.found];

  return (
    <Shell
      title={`Extractor · ${site}`}
      hint={ownerLabel(d.owner)}
      actions={
        <>
          <StatusBadge status={d.status} />
          {!d.trustworthy && d.status !== 'never_run' ? (
            <Badge variant="gap">Low confidence</Badge>
          ) : null}
        </>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          desc="Share of rows where every primary field parsed"
          title="txn_prim_Fields_SuccessRate"
          value={showPct(d.extractor.primFieldsSuccessRate)}
          icon={Percent}
          missing={d.extractor.primFieldsSuccessRate.state === 'unavailable'}
          note={d.extractor.primFieldsSuccessRate.note}
        />
        <DashboardMetricCard
          desc="Share of primary cells that came out empty"
          title="%prim_Fields_Nullrate"
          value={showPct(d.extractor.primFieldsNullRate)}
          icon={Braces}
          missing={d.extractor.primFieldsNullRate.state === 'unavailable'}
          note="Catches missing values only, not wrong ones"
        />
        <DashboardMetricCard
          desc="Rows the parser produced"
          title="extracted_records"
          value={showNum(d.extractor.extractedRecords)}
          icon={Database}
          missing={d.extractor.extractedRecords.state === 'unavailable'}
          note={d.extractor.extractedRecords.note}
        />
        <DashboardMetricCard
          desc="Primary cells with a value, out of all primary cells"
          title="primary_fill_rate"
          value={primary ? showPct(primary.fillRate) : NO_DATA}
          icon={Layers}
          missing={!primary || primary.fillRate.state === 'unavailable'}
          note={
            primary && primary.recordCompleteRate.value !== null
              ? `record complete ${showPct(primary.recordCompleteRate)}`
              : undefined
          }
        />
      </div>

      <Panel
        title="Parse-side pipeline"
        hint="Picks up where the fetch stage ends · a hatched box means not measured, not zero"
        className="mb-5"
      >
        <PipelineStages stages={stagesOf(d)} />
      </Panel>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel
          title="Extractor"
          hint="Null rate catches missing values — wrong ones show up in the out-of-range table"
        >
          <FieldGrid className="lg:grid-cols-3">
            <Field
              desc="Share of rows where every primary field parsed"
              name="txn_prim_Fields_SuccessRate"
              m={d.extractor.primFieldsSuccessRate}
              format={(m) => showPct(m)}
            />
            <Field
              desc="Share of primary cells that came out empty"
              name="%prim_Fields_Nullrate"
              m={d.extractor.primFieldsNullRate}
              format={(m) => showPct(m)}
            />
            <Field
              desc="Share of fallback cells that came out empty"
              name="%fallbacks_Fields_Nullrate"
              m={d.extractor.fallbackFieldsNullRate}
              format={(m) => showPct(m)}
            />
            <Field
              desc="Rows the parser produced"
              name="extracted_records"
              m={d.extractor.extractedRecords}
            />
            <Field
              desc="Wall-clock time the parser ran"
              name="total_extractor_time"
              m={d.extractor.totalExtractorSeconds}
              format={showSeconds}
            />
          </FieldGrid>
          {d.tiers.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                Fill rate per tier
              </h3>
              <Breakdown
                rows={d.tiers.map((t) => ({
                  label: t.tier,
                  value: Math.round((t.fillRate.value ?? 0) * 100),
                  display: showPct(t.fillRate, 0),
                  hint: t.passes
                    ? `Above the ${t.threshold * 100}% threshold`
                    : `Below the ${t.threshold * 100}% threshold`,
                }))}
              />
            </div>
          ) : null}
        </Panel>

        <Panel
          title="LLM recovery"
          hint="The loop has no stop condition in the design, so the iteration count has to be visible"
        >
          {allMissing(llm) ? (
            <NotWired ms={llm} />
          ) : (
            <FieldGrid className="lg:grid-cols-3">
              <Field
                desc="Requests sent to the LLM gateway"
                name="llm_gateway_calls"
                m={d.llmRecovery.invocations}
              />
              <Field
                desc="Share of failed rows the LLM recovered"
                name="recovery_rate"
                m={d.llmRecovery.recoveryRate}
                format={(m) => showPct(m)}
              />
              <Field
                desc="Times the recovery loop ran"
                name="loop_iterations"
                m={d.llmRecovery.iterations}
              />
              <Field
                desc="Parser scripts the LLM wrote"
                name="scripts_generated"
                m={d.llmRecovery.scriptsGenerated}
              />
              <Field
                desc="Generated scripts that passed review"
                name="scripts_accepted"
                m={d.llmRecovery.scriptsAccepted}
              />
              <Field
                desc="Tokens spent on recovery"
                name="token_cost"
                m={d.llmRecovery.tokensUsed}
              />
            </FieldGrid>
          )}
          {d.llmRecovery.ratePerIteration.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                Recovery rate per iteration
              </h3>
              <Breakdown
                rows={d.llmRecovery.ratePerIteration.map((r) => ({
                  label: `Iteration ${r.iteration}`,
                  value: Math.round(r.recovered * 100),
                  display: pct(r.recovered, 0),
                }))}
              />
            </div>
          ) : null}
        </Panel>

        <Panel
          title="Parsing queue"
          hint="The queue feeding the extractor — a long wait means the bottleneck is here"
        >
          <FieldGrid className="lg:grid-cols-2">
            <Field
              desc="Fetched pages waiting to be parsed"
              name="queue_depth (parsing)"
              m={d.queue.parsingDepth}
            />
            <Field
              desc="How long a page waits before parsing"
              name="avg_queue_wait_time"
              m={d.queue.avgWaitSeconds}
              format={showSeconds}
            />
          </FieldGrid>
        </Panel>

        <Panel
          title="PII detector"
          hint="If it runs after the S3 save, PII sits in S3 before anything checks it"
          action={<Badge variant="muted">{OWNER_LABEL[d.pii.owner]}</Badge>}
        >
          {allMissing(pii) ? (
            <NotWired ms={pii} />
          ) : (
            <FieldGrid className="lg:grid-cols-2">
              <Field
                desc="Records screened for personal data"
                name="scanned"
                m={d.pii.scanned}
              />
              <Field desc="Records that contained personal data" name="found" m={d.pii.found} />
            </FieldGrid>
          )}
          {d.pii.kinds.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2.5 font-mono text-[10px] tracking-wide uppercase">
                Kinds found
              </h3>
              <Breakdown rows={d.pii.kinds.map((k) => ({ label: k.kind, value: k.count }))} />
            </div>
          ) : null}
          <div className="text-muted-foreground mt-2.5 flex flex-wrap gap-x-4 text-[11px]">
            <span>Runs at: {PII_STAGE_LABEL[d.pii.stage] ?? d.pii.stage}</span>
            <span>On a hit: {PII_ACTION_LABEL[d.pii.action] ?? d.pii.action}</span>
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <CoveragePanel coverage={d.coverage} />

        <Panel
          title="Values present but suspect"
          hint="Null rate catches missing values — this table catches values that exist but fall out of range"
        >
          {d.rangeChecks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Not enough data to check yet</p>
          ) : (
            <ul className="divide-y">
              {d.rangeChecks.map((r) => (
                <li key={r.id} className="grid grid-cols-[1fr_auto] gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[11px]">{r.field}</code>
                      {r.records > 0 && r.severity === 'warn' ? (
                        <Badge variant="gap">Check this</Badge>
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
          title="Why rows fail primary"
          hint="Tells you which field to fix first"
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

/** S6–S8 คือช่วงที่ extractor รับผิดชอบ รับต่อจาก S5 ที่ของลง S3 แล้ว */
const stagesOf = (d: SiteSnapshot): Stage[] => {
  const miss = (m: { state: string }) => m.state === 'unavailable';
  return [
    {
      num: 'S6',
      name: 'Parsing queue',
      value: showNum(d.queue.parsingDepth),
      sub: `waiting ${showSeconds(d.queue.avgWaitSeconds)}`,
      missing: miss(d.queue.parsingDepth),
      team: 'PII detector',
    },
    {
      num: 'S7',
      name: 'Extractor',
      value: showPct(d.extractor.primFieldsSuccessRate),
      sub: `null ${showPct(d.extractor.primFieldsNullRate)}`,
      missing: miss(d.extractor.primFieldsSuccessRate),
    },
    {
      num: 'S8',
      name: 'LLM recovery',
      value: showPct(d.llmRecovery.recoveryRate),
      sub: `${showNum(d.llmRecovery.iterations)} iterations`,
      missing: miss(d.llmRecovery.recoveryRate),
    },
  ];
};

const CoveragePanel = ({ coverage }: { coverage: Coverage }) => {
  const types = [...new Set(coverage.cells.map((c) => c.propertyType))];
  const states = [...new Set(coverage.cells.map((c) => c.sellState))];
  const usable = coverage.areas.filter((a) => !a.belowUsableThreshold).length;
  const thin = coverage.areas.filter((a) => a.belowUsableThreshold);

  return (
    <Panel
      title="What is actually covered"
      hint="Totals can lie — what matters is which cell the rows pile up in"
      action={
        <Badge variant={coverage.scopesWithData < coverage.scopesTotal ? 'gap' : 'ok'}>
          {coverage.scopesWithData} / {coverage.scopesTotal} scopes
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
          <h3 className="font-mono text-[10px] tracking-wide uppercase">Provinces</h3>
          <Badge variant={usable === 0 ? 'gap' : 'muted'}>
            {usable} / {coverage.cells[0]?.areasTotal ?? 74}
          </Badge>
        </div>
        {coverage.areas.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data yet</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {coverage.areas.map((a) => (
              <span
                key={a.area}
                className={cn(
                  'rounded border px-1.5 py-0.5 text-[11px]',
                  a.belowUsableThreshold
                    ? 'hatch text-gap border-dashed font-medium'
                    : 'bg-card',
                )}
              >
                {a.area} <span className="tnum text-muted-foreground">{num(a.records)}</span>
              </span>
            ))}
          </div>
        )}
        {thin.length > 0 ? (
          <p className="text-muted-foreground mt-2 text-[11px]">
            {thin.length} {thin.length === 1 ? 'province has' : 'provinces have'} fewer than 10
            rows, which does not count as coverage
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
          className={cn('rounded-md border p-2.5', n === 0 ? 'hatch border-dashed' : 'bg-card')}
        >
          {n === 0 ? (
            <div className="text-muted-foreground text-[11px]">Not collected</div>
          ) : (
            <>
              <div className="tnum text-sm font-semibold">{num(n)}</div>
              <div className="text-muted-foreground text-[11px]">
                {cell?.areasCovered} / {cell?.areasTotal} provinces
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
    title={tier.tier}
    hint={`${tier.fields.length} fields · passes when fill > ${tier.threshold * 100}%`}
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
        <code className="text-foreground font-mono">{tier.structuralGaps.join(', ')}</code> is
        empty on every row, so every row is missing at least one cell even when the rest are
        full
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
