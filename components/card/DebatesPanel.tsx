import type { Debate } from '@/lib/types';
import { getPriorSeries } from '@/lib/history';
import { cn, formatDate } from '@/lib/utils';

function ProbabilityBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 overflow-hidden rounded bg-neutral-100">
        <div
          className="absolute inset-y-0 left-0 rounded bg-demand"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <span className="w-10 text-right text-caption tabular-nums text-neutral-700">
        {pct}%
      </span>
    </div>
  );
}

function PriorTrail({ slug, debate }: { slug: string; debate: Debate }) {
  const series = getPriorSeries(slug, debate.question);
  if (series.length < 2) return null;
  const first = series[0];
  const latest = series[series.length - 1];
  const delta = (latest.probability - first.probability) * 100;
  const sign = delta >= 0 ? '+' : '';
  const color =
    delta === 0
      ? 'text-neutral-500'
      : delta > 0
        ? 'text-severity-balanced-fg'
        : 'text-severity-critical-fg';
  return (
    <span className={cn('text-micro tabular-nums', color)}>
      {series.length} updates · {sign}
      {delta.toFixed(0)}pp from {Math.round(first.probability * 100)}%
    </span>
  );
}

function DebateRow({ slug, debate }: { slug: string; debate: Debate }) {
  return (
    <div className="space-y-1.5 border-b-[0.5px] border-neutral-200 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption font-medium leading-snug text-neutral-900">
          {debate.question}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-micro text-neutral-400">
            updated {formatDate(debate.lastUpdated)}
          </span>
          <PriorTrail slug={slug} debate={debate} />
        </div>
      </div>
      <p className="text-micro leading-snug text-neutral-500">
        {debate.currentBelief}
      </p>
      <ProbabilityBar value={debate.probability} />
    </div>
  );
}

export function DebatesPanel({
  slug,
  debates,
}: {
  slug: string;
  debates: Debate[];
}) {
  if (debates.length === 0) return null;
  return (
    <section className="space-y-2.5">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Open debates
      </h3>
      <div>
        {debates.map((d) => (
          <DebateRow key={d.question} slug={slug} debate={d} />
        ))}
      </div>
    </section>
  );
}
