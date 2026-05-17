import Link from 'next/link';
import type { Bottleneck } from '@/lib/types';
import { severityDotClass } from '@/lib/severity';
import { cn } from '@/lib/utils';

export function BottleneckChip({ bottleneck }: { bottleneck: Bottleneck }) {
  return (
    <Link
      href={`/bottleneck/${bottleneck.slug}`}
      title={`${bottleneck.name} · ${bottleneck.severityNote}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-neutral-200',
        'bg-white px-2.5 py-1 text-caption text-neutral-800',
        'transition-colors hover:border-neutral-300 hover:bg-neutral-50'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          severityDotClass[bottleneck.severity]
        )}
      />
      <span>{bottleneck.shortName}</span>
    </Link>
  );
}
