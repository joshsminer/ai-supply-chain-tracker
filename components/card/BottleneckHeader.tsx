import type { Bottleneck } from '@/lib/types';
import { severityBadgeClass, severityDotClass, severityLabel } from '@/lib/severity';
import { cn, formatDate } from '@/lib/utils';

export function BottleneckHeader({ bottleneck }: { bottleneck: Bottleneck }) {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[28px] font-medium leading-tight tracking-[-0.01em] text-neutral-900">
          {bottleneck.name}
        </h1>
        <span className="text-micro text-neutral-400">
          Updated {formatDate(bottleneck.lastUpdated)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium',
            severityBadgeClass[bottleneck.severity]
          )}
        >
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 rounded-full', severityDotClass[bottleneck.severity])}
          />
          {severityLabel[bottleneck.severity]}
        </span>
        <span className="text-caption text-neutral-600">
          {bottleneck.severityNote}
        </span>
      </div>
      <p className="max-w-[72ch] text-body leading-relaxed text-neutral-700">
        {bottleneck.description}
      </p>
    </header>
  );
}
