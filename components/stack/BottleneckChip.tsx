import Link from 'next/link';
import type { Bottleneck, Severity } from '@/lib/types';
import { severityDotClass } from '@/lib/severity';
import { cn } from '@/lib/utils';

const HOVER_TINT: Record<Severity, string> = {
  critical: 'hover:border-severity-critical/40 hover:bg-severity-critical-bg/40',
  tight: 'hover:border-severity-tight/40 hover:bg-severity-tight-bg/40',
  balanced: 'hover:border-severity-balanced/40 hover:bg-severity-balanced-bg/40',
  monitoring:
    'hover:border-severity-monitoring/40 hover:bg-severity-monitoring-bg/40',
};

export function BottleneckChip({ bottleneck }: { bottleneck: Bottleneck }) {
  return (
    <Link
      href={`/bottleneck/${bottleneck.slug}`}
      title={`${bottleneck.name} · ${bottleneck.severityNote}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-neutral-200 bg-white px-2.5 py-1 text-caption font-medium text-neutral-800 transition-colors',
        HOVER_TINT[bottleneck.severity]
      )}
    >
      <span
        aria-hidden
        className={cn('h-1.5 w-1.5 rounded-full', severityDotClass[bottleneck.severity])}
      />
      <span>{bottleneck.shortName}</span>
    </Link>
  );
}
