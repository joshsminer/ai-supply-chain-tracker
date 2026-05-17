import Link from 'next/link';
import { bottlenecks } from '@/data';
import { topCriticalCompanies, type CriticalCompanyRow } from '@/lib/dag';
import { severityBadgeClass, severityDotClass, severityLabel } from '@/lib/severity';
import { yahooFinanceUrl } from '@/lib/external-links';
import { cn } from '@/lib/utils';

function Row({ row, rank }: { row: CriticalCompanyRow; rank: number }) {
  return (
    <li className="grid grid-cols-[36px_1fr_240px_60px] items-baseline gap-3 border-b-[0.5px] border-neutral-200 py-2.5 last:border-b-0">
      <span className="text-micro font-mono tabular-nums text-neutral-400">
        #{rank}
      </span>
      <div className="flex flex-col leading-tight">
        <div className="flex flex-wrap items-baseline gap-2">
          {row.ticker ? (
            <a
              href={yahooFinanceUrl(row.ticker)}
              target="_blank"
              rel="noreferrer"
              className="text-caption font-medium text-neutral-900 underline-offset-2 hover:underline"
            >
              {row.name}
            </a>
          ) : (
            <span className="text-caption font-medium text-neutral-900">
              {row.name}
            </span>
          )}
          {row.ticker ? (
            <span className="font-mono text-micro text-neutral-500">
              {row.ticker}
            </span>
          ) : row.isPrivate ? (
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-micro text-neutral-600">
              Private
            </span>
          ) : null}
        </div>
        <span className="text-micro text-neutral-500">
          Gates {row.gates.length}{' '}
          {row.gates.length === 1 ? 'bottleneck' : 'bottlenecks'} · max share{' '}
          <span className="font-medium text-neutral-700">{row.maxShare}%</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {row.gates
          .sort((a, b) => b.sharePct - a.sharePct)
          .map((g) => (
            <Link
              key={g.bottleneckSlug}
              href={`/bottleneck/${g.bottleneckSlug}`}
              title={`${g.bottleneckName} · ${severityLabel[g.severity]} · ${g.sharePct}% share`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-micro hover:opacity-80',
                severityBadgeClass[g.severity]
              )}
            >
              <span
                aria-hidden
                className={cn('h-1.5 w-1.5 rounded-full', severityDotClass[g.severity])}
              />
              <span>{g.bottleneckSlug}</span>
              <span className="font-mono text-micro opacity-70">
                {g.sharePct}%
              </span>
            </Link>
          ))}
      </div>
      <span className="text-right font-mono text-micro tabular-nums text-neutral-700">
        {row.totalScore.toFixed(2)}
      </span>
    </li>
  );
}

export function CriticalCompaniesPanel() {
  const rows = topCriticalCompanies(bottlenecks, 30).slice(0, 18);
  if (rows.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-h3">Most critical companies</h3>
        <p className="text-micro text-neutral-500">
          Single-point-of-failure score = Σ (share% × severity weight) across
          tracked bottlenecks where the company holds ≥30% share. Higher score =
          more concentrated exposure to the AI supply chain across more
          critical positions.
        </p>
      </header>
      <div className="rounded-lg border-[0.5px] border-neutral-200">
        <div className="grid grid-cols-[36px_1fr_240px_60px] gap-3 border-b-[0.5px] border-neutral-200 px-4 py-2 text-micro font-medium uppercase tracking-wider text-neutral-500">
          <span></span>
          <span>Company</span>
          <span>Gates which bottlenecks</span>
          <span className="text-right">Score</span>
        </div>
        <ul className="px-4">
          {rows.map((r, i) => (
            <Row key={r.name} row={r} rank={i + 1} />
          ))}
        </ul>
      </div>
    </section>
  );
}
