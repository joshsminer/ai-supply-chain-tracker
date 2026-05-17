import type { Metric, MetricDirection } from '@/lib/types';
import { cn } from '@/lib/utils';

const SUB_COLOR: Record<MetricDirection, string> = {
  'up-bad': 'text-severity-critical-fg',
  'down-bad': 'text-severity-critical-fg',
  'up-good': 'text-severity-balanced-fg',
  'down-good': 'text-severity-balanced-fg',
  neutral: 'text-neutral-500',
};

const ARROW: Record<MetricDirection, string | null> = {
  'up-bad': '▲',
  'up-good': '▲',
  'down-bad': '▼',
  'down-good': '▼',
  neutral: null,
};

function MetricCard({ metric }: { metric: Metric }) {
  const dir = metric.direction;
  const subColor = dir ? SUB_COLOR[dir] : 'text-neutral-500';
  const arrow = dir ? ARROW[dir] : null;
  return (
    <div className="rounded-md bg-neutral-50/80 px-3.5 py-3">
      <div className="text-micro uppercase tracking-wider text-neutral-500">
        {metric.label}
      </div>
      <div className="mt-1.5 text-[22px] font-medium leading-tight tracking-tight tabular-nums text-neutral-900">
        {metric.value}
      </div>
      {metric.sub ? (
        <div className={cn('mt-1 flex items-center gap-1 text-micro tabular-nums', subColor)}>
          {arrow ? <span aria-hidden className="text-[9px]">{arrow}</span> : null}
          <span>{metric.sub}</span>
        </div>
      ) : null}
    </div>
  );
}

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} metric={m} />
      ))}
    </div>
  );
}
