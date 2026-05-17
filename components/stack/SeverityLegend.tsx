import type { Severity } from '@/lib/types';
import { severityDotClass, severityLabel } from '@/lib/severity';
import { cn } from '@/lib/utils';

const ORDER: Severity[] = ['critical', 'tight', 'balanced', 'monitoring'];

export function SeverityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {ORDER.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 rounded-full', severityDotClass[s])}
          />
          <span className="text-micro text-neutral-500">{severityLabel[s]}</span>
        </div>
      ))}
    </div>
  );
}
