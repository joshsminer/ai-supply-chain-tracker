import type { SupplyDemandYear } from '@/lib/types';
import { severityBadgeClass, severityLabel } from '@/lib/severity';
import { cn } from '@/lib/utils';

function StatusPill({ status }: { status: SupplyDemandYear['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-micro font-medium',
        severityBadgeClass[status]
      )}
    >
      {severityLabel[status]}
    </span>
  );
}

function GapRow({ row }: { row: SupplyDemandYear }) {
  const supplyPct = Math.max(0, Math.min(100, row.supplyIndex));
  const demandPct = Math.max(0, Math.min(100, row.demandIndex));
  const gap = demandPct - supplyPct;
  return (
    <div className="grid grid-cols-[60px_1fr_70px_72px] items-center gap-3">
      <span className="text-caption tabular-nums text-neutral-700">{row.year}</span>
      <div
        className="relative h-4 overflow-hidden rounded bg-neutral-100"
        role="img"
        aria-label={`${row.year}: supply ${supplyPct}, demand ${demandPct}`}
      >
        <div
          className="supply-stripes absolute inset-y-0 left-0 rounded-l"
          style={{ width: `${supplyPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-l bg-demand mix-blend-multiply"
          style={{ width: `${demandPct}%` }}
        />
      </div>
      <span
        className={cn(
          'text-right text-micro tabular-nums',
          gap > 0 ? 'text-severity-critical-fg' : 'text-severity-balanced-fg'
        )}
      >
        {gap > 0 ? `+${gap}` : gap} idx
      </span>
      <div className="flex justify-end">
        <StatusPill status={row.status} />
      </div>
    </div>
  );
}

export function SupplyDemandGap({ rows }: { rows: SupplyDemandYear[] }) {
  const yearRange = rows.length
    ? `${rows[0].year}–${rows[rows.length - 1].year}`
    : '';
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          Supply vs. demand · {yearRange}
        </h3>
        <div className="flex items-center gap-3 text-micro text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="supply-stripes h-2.5 w-4 rounded-sm" />
            Supply
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-4 rounded-sm bg-demand" />
            Demand
          </span>
          <span className="text-neutral-400">|</span>
          <span className="text-neutral-400">Gap = demand − supply</span>
        </div>
      </header>
      <div className="space-y-2">
        {rows.map((r) => (
          <GapRow key={r.year} row={r} />
        ))}
      </div>
    </section>
  );
}
