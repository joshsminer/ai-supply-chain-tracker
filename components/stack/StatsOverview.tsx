import { dashboardStats } from '@/lib/dashboardStats';
import { severityDotClass, severityLabel } from '@/lib/severity';
import { cn, formatCompactNumber } from '@/lib/utils';

function Card({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-2 rounded-md border-[0.5px] border-neutral-200 bg-white px-4 py-3.5',
        className
      )}
    >
      <span className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <div className="text-[24px] font-medium leading-none tracking-tight tabular-nums text-neutral-900">
        {value}
      </div>
      {sub ? (
        <div className="text-micro leading-snug text-neutral-500">{sub}</div>
      ) : null}
    </div>
  );
}

function severityChip(sev: 'critical' | 'tight' | 'balanced' | 'monitoring', n: number) {
  return (
    <span key={sev} className="inline-flex items-center gap-1">
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', severityDotClass[sev])} />
      <span className="tabular-nums">{n}</span>
      <span className="text-neutral-400">{severityLabel[sev].toLowerCase()}</span>
    </span>
  );
}

function formatPct(p: number | null, decimals = 1): string {
  if (p == null) return '—';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(decimals)}%`;
}

export function StatsOverview() {
  const s = dashboardStats();
  const trillions = s.totalTrackedMcapUsd / 1e12;
  const mcapLabel =
    trillions >= 1
      ? `$${trillions.toFixed(2)}T`
      : `$${(s.totalTrackedMcapUsd / 1e9).toFixed(0)}B`;

  return (
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <Card
        label="Bottlenecks"
        value={s.totalBottlenecks}
        sub={
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {(['critical', 'tight', 'balanced', 'monitoring'] as const).map((sev) =>
              s.bySeverity[sev] > 0 ? severityChip(sev, s.bySeverity[sev]) : null
            )}
          </div>
        }
      />
      <Card
        label="Companies tracked"
        value={s.publicCompanies + s.privateCompanies}
        sub={
          <span>
            <span className="tabular-nums text-neutral-700">{s.publicCompanies}</span>{' '}
            public ·{' '}
            <span className="tabular-nums text-neutral-700">{s.privateCompanies}</span>{' '}
            private
          </span>
        }
      />
      <Card
        label="Total tracked mcap"
        value={mcapLabel}
        sub={<>USD-equivalent, ex-private</>}
      />
      <Card
        label="LTM cohort avg"
        value={
          <span
            className={cn(
              s.ltmAveragePct == null
                ? 'text-neutral-900'
                : s.ltmAveragePct >= 0
                  ? 'text-severity-balanced-fg'
                  : 'text-severity-critical-fg'
            )}
          >
            {formatPct(s.ltmAveragePct)}
          </span>
        }
        sub={
          <>
            median{' '}
            <span className="tabular-nums text-neutral-700">
              {formatPct(s.ltmMedianPct)}
            </span>{' '}
            across{' '}
            <span className="tabular-nums text-neutral-700">
              {formatCompactNumber(s.publicCompanies)}
            </span>{' '}
            publics
          </>
        }
      />
    </section>
  );
}
