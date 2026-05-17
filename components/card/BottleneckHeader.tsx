import type { Bottleneck } from '@/lib/types';
import { severityBadgeClass, severityDotClass, severityLabel } from '@/lib/severity';
import { cn, formatDate } from '@/lib/utils';

export function BottleneckHeader({ bottleneck }: { bottleneck: Bottleneck }) {
  return (
    <header className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h1 text-neutral-900">{bottleneck.name}</h1>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-micro font-medium',
            severityBadgeClass[bottleneck.severity]
          )}
        >
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 rounded-full', severityDotClass[bottleneck.severity])}
          />
          {severityLabel[bottleneck.severity]} · {bottleneck.severityNote}
        </span>
        <span className="text-micro text-neutral-400">
          Updated {formatDate(bottleneck.lastUpdated)}
        </span>
      </div>
      <p className="max-w-[72ch] text-body leading-snug text-neutral-700">
        {bottleneck.description}
      </p>
    </header>
  );
}
