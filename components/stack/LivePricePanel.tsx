import { bottlenecks } from '@/data';
import { getMarket, type MarketSnapshot } from '@/lib/refreshed';
import { cn, formatCompactNumber, formatRelativeTime } from '@/lib/utils';
import { yahooFinanceUrl, YFINANCE_HOME } from '@/lib/external-links';

interface TickerCell {
  ticker: string;
  name: string;
  snap: MarketSnapshot | undefined;
  bottleneckSlug: string;
}

function collectTickers(): TickerCell[] {
  const seen = new Map<string, TickerCell>();
  for (const b of bottlenecks) {
    for (const s of b.supplyStructure) {
      if (!s.ticker || seen.has(s.ticker)) continue;
      seen.set(s.ticker, {
        ticker: s.ticker,
        name: s.name,
        snap: getMarket(s.ticker),
        bottleneckSlug: b.slug,
      });
    }
    for (const c of b.companies) {
      if (!c.ticker || seen.has(c.ticker)) continue;
      seen.set(c.ticker, {
        ticker: c.ticker,
        name: c.name,
        snap: getMarket(c.ticker),
        bottleneckSlug: b.slug,
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function formatPrice(snap: MarketSnapshot | undefined): string {
  if (!snap?.price) return '—';
  const cur = snap.currency ?? '';
  if (cur === 'USD') return `$${snap.price.toFixed(2)}`;
  if (cur === 'KRW' || cur === 'JPY') return `${snap.price.toLocaleString()} ${cur}`;
  return `${snap.price.toFixed(2)} ${cur}`;
}

function formatChange(snap: MarketSnapshot | undefined): {
  text: string;
  color: string;
} {
  if (snap?.dayChangePct == null) return { text: '', color: 'text-neutral-400' };
  const pct = snap.dayChangePct;
  const sign = pct >= 0 ? '+' : '';
  const color =
    pct >= 0 ? 'text-severity-balanced-fg' : 'text-severity-critical-fg';
  return { text: `${sign}${pct.toFixed(2)}%`, color };
}

export function LivePricePanel() {
  const cells = collectTickers();
  const fresh = cells.filter((c) => c.snap);
  if (fresh.length === 0) return null;

  return (
    <section className="rounded-lg border-[0.5px] border-neutral-200">
      <header className="flex items-center justify-between border-b-[0.5px] border-neutral-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-severity-balanced"
          />
          <h2 className="text-h3">Live market data</h2>
        </div>
        <span className="text-micro text-neutral-500">
          {fresh.length} of {cells.length} tickers refreshed ·{' '}
          <a
            href={YFINANCE_HOME}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            source: Yahoo Finance
          </a>
        </span>
      </header>
      <div className="grid grid-cols-1 divide-y-[0.5px] divide-neutral-200 md:grid-cols-2 md:divide-x-[0.5px] md:divide-y-0 lg:grid-cols-4">
        {fresh.map((cell) => {
          const change = formatChange(cell.snap);
          return (
            <div
              key={cell.ticker}
              className="flex flex-col gap-1 px-4 py-3 leading-tight"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-caption font-medium text-neutral-900">
                  {cell.name}
                </span>
                <a
                  href={yahooFinanceUrl(cell.ticker)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-micro text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
                  title={`Open ${cell.ticker} on Yahoo Finance`}
                >
                  {cell.ticker}
                </a>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-h3 tabular-nums">
                  {formatPrice(cell.snap)}
                </span>
                <span className={cn('text-caption tabular-nums', change.color)}>
                  {change.text}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-micro text-neutral-500">
                <span>
                  {cell.snap?.marketCap
                    ? `mcap ${formatCompactNumber(cell.snap.marketCap)} ${cell.snap.currency}`
                    : ''}
                </span>
                <span>{formatRelativeTime(cell.snap?.fetchedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
