import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { emergingConstraint, fastestEscalating } from '@/lib/forecast';
import { severityLabel } from '@/lib/severity';
import { cn } from '@/lib/utils';

export function ForecastTeaser() {
  const emerging = emergingConstraint();
  const escalating = fastestEscalating(3);
  if (!emerging) return null;

  return (
    <Link
      href="/forecast"
      className="group flex flex-col gap-2 rounded-md border-[0.5px] border-severity-tight bg-severity-tight-bg/40 px-4 py-3.5 transition-colors hover:bg-severity-tight-bg/70 md:flex-row md:items-center md:gap-5"
    >
      <div className="flex items-start gap-3 md:flex-1">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-severity-tight/20 text-severity-tight-fg">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-micro font-medium uppercase tracking-wider text-severity-tight-fg">
            Next emerging constraint · forecast
          </span>
          <span className="text-caption text-neutral-900">
            <span className="font-medium">{emerging.name}</span> — forward risk{' '}
            <span className="tabular-nums">{emerging.forwardScore}/100</span> (
            <span className="tabular-nums">+{emerging.escalation}</span> vs now),
            currently {severityLabel[emerging.severity].toLowerCase()} →{' '}
            {emerging.projectedStatus} by {emerging.forwardYear}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-10 md:pl-0">
        {escalating.length > 0 ? (
          <div className="hidden items-center gap-2 lg:flex">
            {escalating.map((e) => (
              <span
                key={e.slug}
                className="inline-flex items-center gap-1 rounded-full border-[0.5px] border-neutral-200 bg-white px-2 py-0.5 text-micro text-neutral-600"
                title={`${e.name}: +${e.escalation} escalation`}
              >
                {e.shortName}
                <span className="tabular-nums text-severity-critical-fg">
                  +{e.escalation}
                </span>
              </span>
            ))}
          </div>
        ) : null}
        <span
          className={cn(
            'inline-flex items-center gap-1 text-caption font-medium text-neutral-700',
            'transition-transform group-hover:translate-x-0.5'
          )}
        >
          View forecast
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
