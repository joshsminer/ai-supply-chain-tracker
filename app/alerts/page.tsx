import Link from 'next/link';
import { bottlenecks } from '@/data';
import {
  allPriceMoves,
  historyLatestDate,
  recentPriorMoves,
  recentSeverityChanges,
} from '@/lib/history';
import { severityBadgeClass, severityLabel } from '@/lib/severity';
import { cn } from '@/lib/utils';
import { secData, marketData } from '@/lib/refreshed';
import { Sparkline } from '@/components/card/Sparkline';
import { getPriceSeries } from '@/lib/history';
import { formatDate, formatRelativeTime } from '@/lib/utils';

const bottleneckBySlug = Object.fromEntries(bottlenecks.map((b) => [b.slug, b]));

export const metadata = {
  title: 'Alerts · AI Supply Chain Tracker',
};

interface TickerToBottleneck {
  ticker: string;
  bottleneckSlug: string;
  bottleneckName: string;
}

function tickerToBottleneckMap(): Map<string, TickerToBottleneck> {
  const m = new Map<string, TickerToBottleneck>();
  for (const b of bottlenecks) {
    for (const s of b.supplyStructure) {
      if (s.ticker && !m.has(s.ticker)) {
        m.set(s.ticker, {
          ticker: s.ticker,
          bottleneckSlug: b.slug,
          bottleneckName: b.name,
        });
      }
    }
    for (const c of b.companies) {
      if (c.ticker && !m.has(c.ticker)) {
        m.set(c.ticker, {
          ticker: c.ticker,
          bottleneckSlug: b.slug,
          bottleneckName: b.name,
        });
      }
    }
  }
  return m;
}

function priceColor(pct: number): string {
  return pct >= 0 ? 'text-severity-balanced-fg' : 'text-severity-critical-fg';
}

export default function AlertsPage() {
  const lookup = tickerToBottleneckMap();
  const moves = allPriceMoves(30)
    .filter((m) => lookup.has(m.ticker))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const topMoves = moves.slice(0, 15);

  const recentFilings = Object.values(secData)
    .filter((s) => s.latestFiling)
    .sort((a, b) =>
      (b.latestFiling.filedAt ?? '').localeCompare(a.latestFiling.filedAt ?? '')
    )
    .slice(0, 12);

  const latestPriceDate = historyLatestDate();
  const severityChanges = recentSeverityChanges();
  const priorMoves = recentPriorMoves();

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-h1">Alerts</h1>
        <p className="max-w-[72ch] text-caption text-neutral-500">
          Material moves derived from live data. Price moves are 30-day total
          return per ticker (close-to-close), ranked by absolute magnitude.
          Filings are the most recent 10-Q / 10-K / 20-F / 6-K landings across
          tracked bottleneck tickers.
        </p>
        <p className="text-micro text-neutral-400">
          History up to {latestPriceDate ?? '—'} · {moves.length} tickers in
          window
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          Top 30-day price moves
        </h3>
        <div className="rounded-lg border-[0.5px] border-neutral-200">
          <div className="grid grid-cols-[1fr_120px_140px_90px] border-b-[0.5px] border-neutral-200 px-4 py-2 text-micro font-medium uppercase tracking-wider text-neutral-500">
            <span>Bottleneck · company</span>
            <span className="text-right">Window</span>
            <span className="text-right">Sparkline</span>
            <span className="text-right">30d %</span>
          </div>
          {topMoves.map((m) => {
            const ref = lookup.get(m.ticker)!;
            const snap = marketData[m.ticker];
            const series = getPriceSeries(m.ticker);
            return (
              <Link
                key={m.ticker}
                href={`/bottleneck/${ref.bottleneckSlug}`}
                className="grid grid-cols-[1fr_120px_140px_90px] items-center border-b-[0.5px] border-neutral-200 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-neutral-50"
              >
                <div className="flex flex-col leading-tight">
                  <span className="text-caption font-medium text-neutral-900">
                    {snap?.name ?? m.ticker}{' '}
                    <span className="font-mono text-micro text-neutral-500">
                      {m.ticker}
                    </span>
                  </span>
                  <span className="text-micro text-neutral-500">
                    {ref.bottleneckName}
                  </span>
                </div>
                <span className="text-right text-micro text-neutral-500 tabular-nums">
                  {formatDate(m.startDate)} → {formatDate(m.endDate)}
                </span>
                <div className="flex justify-end">
                  <Sparkline series={series} width={120} height={22} />
                </div>
                <span
                  className={`text-right text-caption tabular-nums ${priceColor(m.changePct)}`}
                >
                  {m.changePct >= 0 ? '+' : ''}
                  {m.changePct.toFixed(1)}%
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          Severity changes
        </h3>
        {severityChanges.length === 0 ? (
          <p className="text-caption text-neutral-400">
            No severity transitions captured yet. Edit a bottleneck&rsquo;s
            severity and re-run <code>python tools/snapshot_severities.py</code>{' '}
            to start the history.
          </p>
        ) : (
          <ul className="space-y-1">
            {severityChanges.map((c) => {
              const b = bottleneckBySlug[c.slug];
              return (
                <li
                  key={c.slug}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-caption text-neutral-600"
                >
                  <Link
                    href={`/bottleneck/${c.slug}`}
                    className="font-medium text-neutral-900 underline-offset-2 hover:underline"
                  >
                    {b?.name ?? c.slug}
                  </Link>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-micro font-medium',
                      severityBadgeClass[c.previous.severity]
                    )}
                  >
                    {severityLabel[c.previous.severity]}
                  </span>
                  <span aria-hidden>→</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-micro font-medium',
                      severityBadgeClass[c.current.severity]
                    )}
                  >
                    {severityLabel[c.current.severity]}
                  </span>
                  <span className="ml-auto text-micro text-neutral-400">
                    {formatDate(c.current.lastUpdated)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          Prior updates
        </h3>
        {priorMoves.length === 0 ? (
          <p className="text-caption text-neutral-400">
            No probability moves yet. When you edit a debate&rsquo;s
            probability, re-run <code>python tools/snapshot_priors.py</code> and
            updates will surface here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {priorMoves.map((m) => {
              const b = bottleneckBySlug[m.slug];
              const sign = m.delta >= 0 ? '+' : '';
              const color =
                m.delta === 0
                  ? 'text-neutral-500'
                  : m.delta > 0
                    ? 'text-severity-balanced-fg'
                    : 'text-severity-critical-fg';
              return (
                <li
                  key={`${m.slug}::${m.question}`}
                  className="flex flex-col gap-0.5 border-b-[0.5px] border-neutral-200 pb-1.5 last:border-b-0"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Link
                      href={`/bottleneck/${m.slug}`}
                      className="text-caption font-medium text-neutral-900 underline-offset-2 hover:underline"
                    >
                      {b?.shortName ?? m.slug}
                    </Link>
                    <span className="text-caption text-neutral-600">
                      {m.question}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 text-micro tabular-nums text-neutral-500">
                    <span>
                      {Math.round(m.previous.probability * 100)}% →{' '}
                      {Math.round(m.current.probability * 100)}%
                    </span>
                    <span className={cn(color)}>
                      {sign}
                      {(m.delta * 100).toFixed(0)}pp
                    </span>
                    <span className="ml-auto text-neutral-400">
                      {formatDate(m.current.lastUpdated)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          Most recent SEC filings
        </h3>
        <ul className="space-y-1">
          {recentFilings.map((s) => {
            const ref = lookup.get(s.ticker);
            return (
              <li
                key={s.ticker}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-caption text-neutral-600"
              >
                <span className="font-mono text-neutral-500">{s.ticker}</span>
                <a
                  href={s.latestFiling.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  {s.latestFiling.form}
                </a>
                <span>filed {formatDate(s.latestFiling.filedAt)}</span>
                {ref ? (
                  <Link
                    href={`/bottleneck/${ref.bottleneckSlug}`}
                    className="text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
                  >
                    {ref.bottleneckName}
                  </Link>
                ) : null}
                <span className="ml-auto text-micro text-neutral-400">
                  {formatRelativeTime(s.fetchedAt)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
