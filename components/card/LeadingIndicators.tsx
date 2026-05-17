import type { Cadence, Indicator } from '@/lib/types';
import { cn } from '@/lib/utils';

const CADENCE_LABEL: Record<Cadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  event: 'Event',
};

const CADENCE_COLOR: Record<Cadence, string> = {
  monthly: 'text-emerald-700 bg-emerald-50',
  quarterly: 'text-sky-700 bg-sky-50',
  annual: 'text-amber-700 bg-amber-50',
  event: 'text-violet-700 bg-violet-50',
};

function IndicatorCard({ indicator }: { indicator: Indicator }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border-[0.5px] border-neutral-200 px-3 py-2.5">
      <span
        className={cn(
          'self-start rounded px-1.5 py-0.5 text-micro font-medium uppercase tracking-wider',
          CADENCE_COLOR[indicator.cadence]
        )}
      >
        {CADENCE_LABEL[indicator.cadence]}
      </span>
      <span className="text-caption font-medium leading-snug text-neutral-900">
        {indicator.name}
      </span>
      {indicator.url ? (
        <a
          href={indicator.url}
          target="_blank"
          rel="noreferrer"
          className="text-micro text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
        >
          {indicator.source}
        </a>
      ) : (
        <span className="text-micro text-neutral-500">{indicator.source}</span>
      )}
    </div>
  );
}

export function LeadingIndicators({ indicators }: { indicators: Indicator[] }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Leading indicators
      </h3>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {indicators.map((i) => (
          <IndicatorCard key={i.name} indicator={i} />
        ))}
      </div>
    </section>
  );
}
