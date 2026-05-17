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
  return (
    <div className="grid grid-cols-[70px_1fr_70px] items-center gap-3">
      <span className="text-caption tabular-nums text-neutral-700">{row.year}</span>
      <div
        className="relative h-3.5 overflow-hidden rounded bg-neutral-100"
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
    <section className="space-y-2.5">
      <header className="flex items-baseline justify-between">
        <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          Supply vs. demand · {yearRange}
        </h3>
        <div className="flex items-center gap-3 text-micro text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="supply-stripes h-2 w-3 rounded-sm" />
            Supply
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-3 rounded-sm bg-demand" />
            Demand
          </span>
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
