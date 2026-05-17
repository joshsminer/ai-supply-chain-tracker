import { bottlenecks } from '@/data';
import { secData, type SecSnapshot } from '@/lib/refreshed';
import { formatCompactNumber, formatDate, formatRelativeTime } from '@/lib/utils';
import { secCompanyUrl } from '@/lib/external-links';

function relevantSnaps(slug: string): SecSnapshot[] {
  const b = bottlenecks.find((x) => x.slug === slug);
  if (!b) return [];
  const tickers = new Set<string>();
  for (const s of b.supplyStructure) if (s.ticker) tickers.add(s.ticker);
  for (const c of b.companies) if (c.ticker) tickers.add(c.ticker);
  const out: SecSnapshot[] = [];
  Array.from(tickers).forEach((t) => {
    const snap = secData[t];
    if (snap) out.push(snap);
  });
  return out.sort((a, b) => b.latestFiling.filedAt.localeCompare(a.latestFiling.filedAt));
}

export function FilingFootnote({ slug }: { slug: string }) {
  const snaps = relevantSnaps(slug);
  if (snaps.length === 0) return null;
  return (
    <section className="space-y-2.5">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Latest SEC filings
      </h3>
      <ul className="space-y-1">
        {snaps.map((s) => {
          const rev = s.latestRevenue;
          return (
            <li
              key={s.ticker}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-caption text-neutral-600"
            >
              <a
                href={secCompanyUrl(s.cik)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
                title={`Open ${s.ticker} EDGAR filings`}
              >
                {s.ticker}
              </a>
              <a
                href={s.latestFiling.url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-neutral-900 underline-offset-2 hover:underline"
              >
                {s.latestFiling.form}
              </a>
              <span>filed {formatDate(s.latestFiling.filedAt)}</span>
              {rev ? (
                <span className="text-neutral-500">
                  · {formatCompactNumber(rev.value)} {rev.currency} revenue (
                  {rev.periodEnd})
                </span>
              ) : null}
              <span className="ml-auto text-micro text-neutral-400">
                {formatRelativeTime(s.fetchedAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
