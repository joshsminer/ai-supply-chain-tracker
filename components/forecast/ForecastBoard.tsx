import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Minus, Radio } from 'lucide-react';
import { rankByForwardRisk, emergingConstraint, type ForecastResult } from '@/lib/forecast';
import { positionedSummary } from '@/lib/companyMap';
import { severityBadgeClass, severityDotClass, severityLabel } from '@/lib/severity';
import { cn } from '@/lib/utils';

function scoreColor(score: number): string {
  if (score >= 80) return 'text-severity-critical-fg';
  if (score >= 60) return 'text-severity-tight-fg';
  if (score >= 40) return 'text-severity-balanced-fg';
  return 'text-neutral-500';
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-severity-critical'
      : score >= 60
        ? 'bg-severity-tight'
        : score >= 40
          ? 'bg-severity-balanced'
          : 'bg-neutral-300';
  return (
    <div className="relative h-2 w-full overflow-hidden rounded bg-neutral-100">
      <div
        className={cn('absolute inset-y-0 left-0 rounded', color)}
        style={{ width: `${score}%` }}
        aria-hidden
      />
    </div>
  );
}

function EscalationTag({ escalation }: { escalation: number }) {
  if (escalation > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-severity-critical-fg">
        <ArrowUpRight className="h-3 w-3" />+{escalation}
      </span>
    );
  }
  if (escalation < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-severity-balanced-fg">
        <ArrowUpRight className="h-3 w-3 rotate-90" />
        {escalation}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-neutral-400">
      <Minus className="h-3 w-3" />0
    </span>
  );
}

function EmergingCallout({ f }: { f: ForecastResult }) {
  const pos = positionedSummary(f.slug);
  return (
    <section className="rounded-lg border-[0.5px] border-severity-tight bg-severity-tight-bg/50 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-severity-tight/20 text-severity-tight-fg">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-micro font-medium uppercase tracking-wider text-severity-tight-fg">
              Next emerging constraint
            </span>
          </div>
          <Link
            href={`/bottleneck/${f.slug}`}
            className="text-h3 text-neutral-900 underline-offset-2 hover:underline"
          >
            {f.name}
          </Link>
          <p className="max-w-[80ch] text-caption leading-snug text-neutral-700">
            Forward constraint-risk{' '}
            <span className="font-medium tabular-nums">{f.forwardScore}/100</span>{' '}
            (up <span className="font-medium tabular-nums">+{f.escalation}</span>{' '}
            from {f.currentScore} today) — currently {severityLabel[f.severity].toLowerCase()},
            projected <span className="font-medium">{f.projectedStatus}</span> by{' '}
            {f.forwardYear}. {f.drivers.slice(0, 3).join(' · ')}.
          </p>
          {f.hasLiveSignal ? (
            <p className="flex items-center gap-1.5 text-micro text-severity-balanced-fg">
              <Radio className="h-3 w-3" />
              Filing signals: {f.signalDrivers.join(' · ')}
            </p>
          ) : null}
          {pos.incumbents.length > 0 ? (
            <p className="text-micro text-neutral-500">
              Positioned: {pos.incumbents.join(', ')}
              {pos.challengers.length
                ? ` · challengers: ${pos.challengers.join(', ')}`
                : ''}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Row({ f, rank }: { f: ForecastResult; rank: number }) {
  const pos = positionedSummary(f.slug);
  return (
    <div className="grid grid-cols-[28px_1fr_120px_88px_88px] items-center gap-3 border-b-[0.5px] border-neutral-200 px-4 py-3 last:border-b-0">
      <span className="text-micro font-mono tabular-nums text-neutral-400">
        {rank}
      </span>
      <div className="flex min-w-0 flex-col gap-1 leading-tight">
        <div className="flex flex-wrap items-baseline gap-2">
          <Link
            href={`/bottleneck/${f.slug}`}
            className="text-caption font-medium text-neutral-900 underline-offset-2 hover:underline"
          >
            {f.name}
          </Link>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-micro font-medium',
              severityBadgeClass[f.severity]
            )}
          >
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', severityDotClass[f.severity])} />
            {severityLabel[f.severity]}
          </span>
          <span className="text-micro text-neutral-400">L{f.layerNumber}</span>
          {f.hasLiveSignal ? (
            <span
              className="inline-flex items-center gap-1 rounded bg-severity-balanced-bg px-1.5 py-0.5 text-micro font-medium text-severity-balanced-fg"
              title={`Filing-extracted: ${f.signalDrivers.join(' · ')}`}
            >
              <Radio className="h-2.5 w-2.5" />
              live
            </span>
          ) : null}
        </div>
        <span className="truncate text-micro text-neutral-500">
          {f.hasLiveSignal ? f.signalDrivers.join(' · ') : f.drivers[0]}
          {pos.incumbents.length ? ` · ${pos.incumbents.slice(0, 2).join(', ')}` : ''}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <ScoreBar score={f.forwardScore} />
        <span className="text-micro text-neutral-400">
          {f.currentYear} → {f.forwardYear}
        </span>
      </div>
      <div className="text-right">
        <span className={cn('text-caption font-medium tabular-nums', scoreColor(f.forwardScore))}>
          {f.forwardScore}
        </span>
        <div className="text-micro text-neutral-400">now {f.currentScore}</div>
      </div>
      <div className="text-right text-caption tabular-nums">
        <EscalationTag escalation={f.escalation} />
      </div>
    </div>
  );
}

export function ForecastBoard() {
  const ranked = rankByForwardRisk();
  const emerging = emergingConstraint();

  return (
    <div className="space-y-5">
      {emerging ? <EmergingCallout f={emerging} /> : null}

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-h3">Constraint-risk ranking · 2–4 quarters out</h2>
          <span className="text-micro text-neutral-500">
            forward score = gap trajectory + forward status + concentration
          </span>
        </div>
        <div className="rounded-lg border-[0.5px] border-neutral-200">
          <div className="grid grid-cols-[28px_1fr_120px_88px_88px] gap-3 border-b-[0.5px] border-neutral-200 px-4 py-2 text-micro font-medium uppercase tracking-wider text-neutral-500">
            <span>#</span>
            <span>Stage · driver · positioned</span>
            <span>Trajectory</span>
            <span className="text-right">Fwd / now</span>
            <span className="text-right">Escal.</span>
          </div>
          {ranked.map((f, i) => (
            <Row key={f.slug} f={f} rank={i + 1} />
          ))}
        </div>
      </section>

      <section className="space-y-2 text-micro leading-relaxed text-neutral-500">
        <h3 className="font-medium uppercase tracking-wider text-neutral-400">
          Methodology
        </h3>
        <p className="max-w-[90ch]">
          Forward constraint-risk score (0–100) = 45% supply–demand gap in the
          forward period (demand index − supply index, from each stage&rsquo;s
          projection) + 35% editorial forward status + 20% top-supplier
          concentration, with additive nudges for worsening lead-time metrics and
          any structured signals extracted from filings (utilization, pricing,
          capex guide). &ldquo;Now&rdquo; score uses the current period and live
          severity. Escalation = forward − now. The flagged emerging constraint is
          the highest forward-risk stage that is <em>not already</em> critical
          today. This is a transparent heuristic, not a statistical forecast —
          every score decomposes into the named drivers shown per row.
        </p>
      </section>
    </div>
  );
}
