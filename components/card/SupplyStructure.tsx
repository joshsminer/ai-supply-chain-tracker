import type { Supplier } from '@/lib/types';
import { cn } from '@/lib/utils';
import { yahooFinanceUrl } from '@/lib/external-links';

const RAMP = ['bg-supplier-1', 'bg-supplier-2', 'bg-supplier-3', 'bg-supplier-4'];

function rampClass(index: number): string {
  return RAMP[Math.min(index, RAMP.length - 1)];
}

function SupplierRow({
  supplier,
  rank,
  maxShare,
}: {
  supplier: Supplier;
  rank: number;
  maxShare: number;
}) {
  const fillWidth = Math.max(2, (supplier.sharePct / maxShare) * 100);
  return (
    <div className="grid grid-cols-[170px_1fr_50px] items-center gap-3">
      <div className="flex flex-col leading-tight">
        {supplier.ticker ? (
          <a
            href={yahooFinanceUrl(supplier.ticker)}
            target="_blank"
            rel="noreferrer"
            className="truncate text-caption text-neutral-900 underline-offset-2 hover:underline"
            title={`Open ${supplier.ticker} on Yahoo Finance`}
          >
            {supplier.name}
          </a>
        ) : (
          <span className="truncate text-caption text-neutral-900">{supplier.name}</span>
        )}
        <span className="text-micro text-neutral-500">
          {supplier.location}
          {supplier.ticker ? (
            <span className="ml-1.5 font-mono text-neutral-400">{supplier.ticker}</span>
          ) : null}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded bg-neutral-100">
        <div
          className={cn('absolute inset-y-0 left-0 rounded', rampClass(rank))}
          style={{ width: `${fillWidth}%` }}
          aria-hidden
        />
      </div>
      <span className="text-right text-caption tabular-nums text-neutral-700">
        {supplier.sharePct}%
      </span>
    </div>
  );
}

export function SupplyStructure({ suppliers }: { suppliers: Supplier[] }) {
  const ranked = [...suppliers].sort((a, b) => b.sharePct - a.sharePct);
  const maxShare = Math.max(...ranked.map((s) => s.sharePct), 1);

  return (
    <section className="space-y-2.5">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Supply structure
      </h3>
      <div className="space-y-1.5">
        {ranked.map((s, i) => (
          <SupplierRow key={s.name} supplier={s} rank={i} maxShare={maxShare} />
        ))}
      </div>
      {ranked.some((s) => s.note) ? (
        <ul className="ml-2 list-disc space-y-0.5 pl-3 text-micro text-neutral-500">
          {ranked
            .filter((s) => s.note)
            .map((s) => (
              <li key={s.name}>
                <span className="font-medium text-neutral-700">{s.name}:</span> {s.note}
              </li>
            ))}
        </ul>
      ) : null}
    </section>
  );
}
