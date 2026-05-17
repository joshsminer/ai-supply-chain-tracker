import type { Metric, MetricDirection } from '@/lib/types';
import { cn } from '@/lib/utils';

const SUB_COLOR: Record<MetricDirection, string> = {
  'up-bad': 'text-red-900',
  'down-bad': 'text-red-900',
  'up-good': 'text-green-800',
  'down-good': 'text-green-800',
  neutral: 'text-neutral-500',
};

function MetricCard({ metric }: { metric: Metric }) {
  const subColor = metric.direction ? SUB_COLOR[metric.direction] : 'text-neutral-500';
  return (
    <div className="rounded-md bg-neutral-50 px-3 py-2.5">
      <div className="text-caption text-neutral-500">{metric.label}</div>
      <div className="mt-1 text-[20px] font-medium leading-tight tabular-nums text-neutral-900">
        {metric.value}
      </div>
      {metric.sub ? (
        <div className={cn('mt-0.5 text-micro tabular-nums', subColor)}>
          {metric.sub}
        </div>
      ) : null}
    </div>
  );
}

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} metric={m} />
      ))}
    </div>
  );
}
