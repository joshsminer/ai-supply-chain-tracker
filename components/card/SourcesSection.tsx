import type { Bottleneck } from '@/lib/types';
import { extractsData, koreaTradeData, secData, marketData } from '@/lib/refreshed';
import {
  COMTRADE_HOME,
  EDGAR_HOME,
  YFINANCE_HOME,
  comtradeHsUrl,
  secCompanyUrl,
  vendorIrUrl,
} from '@/lib/external-links';

interface SourceLink {
  label: string;
  url: string;
  hint?: string;
}

function buildSources(b: Bottleneck): {
  live: SourceLink[];
  vendor: SourceLink[];
  indicators: SourceLink[];
} {
  const live: SourceLink[] = [];
  const vendor: SourceLink[] = [];

  const tickers = new Set<string>();
  for (const s of b.supplyStructure) if (s.ticker) tickers.add(s.ticker);
  for (const c of b.companies) if (c.ticker) tickers.add(c.ticker);

  let anyMarket = false;
  let anySec = false;
  for (const t of Array.from(tickers)) {
    if (marketData[t]) anyMarket = true;
    if (secData[t]) anySec = true;
  }
  if (anyMarket) {
    live.push({
      label: 'Yahoo Finance — live prices',
      url: YFINANCE_HOME,
      hint: 'Used for price, market cap, day change, 30-day sparkline',
    });
  }
  if (anySec) {
    live.push({
      label: 'SEC EDGAR — filings',
      url: EDGAR_HOME,
      hint: 'Latest 10-Q/10-K/20-F/6-K + revenue tag',
    });
    // Per-ticker EDGAR pages
    for (const t of Array.from(tickers).sort()) {
      const snap = secData[t];
      if (!snap) continue;
      live.push({
        label: `EDGAR · ${t} (${snap.entityName ?? t})`,
        url: secCompanyUrl(snap.cik),
      });
    }
  }
  if (b.slug === 'hbm-memory' && koreaTradeData['dram_exports']) {
    live.push({
      label: 'UN Comtrade — Korea memory IC exports (HS 854232)',
      url: comtradeHsUrl('854232'),
      hint: 'Monthly Korean exports of electronic IC memories',
    });
  }
  if (Object.values(extractsData).some((e) => e.ticker && tickers.has(e.ticker))) {
    live.push({
      label: 'Anthropic Claude — auto-extracted filing findings',
      url: 'https://www.anthropic.com/claude',
      hint: 'Tool-use extraction from SEC filings; quotes preserved verbatim',
    });
  }

  // Vendor IR / official pages — best effort per ticker
  for (const t of Array.from(tickers).sort()) {
    const ir = vendorIrUrl(t);
    if (!ir) continue;
    vendor.push({
      label: `${t} IR`,
      url: ir,
    });
  }

  // Indicators with explicit url field
  const indicators: SourceLink[] = (b.indicators ?? [])
    .filter((i) => !!i.url)
    .map((i) => ({
      label: `${i.cadence} · ${i.name}`,
      url: i.url as string,
      hint: i.source,
    }));

  return { live, vendor, indicators };
}

function LinkRow({ link }: { link: SourceLink }) {
  return (
    <li className="flex flex-col gap-0.5 border-b-[0.5px] border-neutral-200 py-1.5 last:border-b-0">
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="text-caption font-medium text-neutral-900 underline-offset-2 hover:underline"
      >
        {link.label}
      </a>
      {link.hint ? (
        <span className="text-micro text-neutral-500">{link.hint}</span>
      ) : null}
    </li>
  );
}

export function SourcesSection({ bottleneck }: { bottleneck: Bottleneck }) {
  const { live, vendor, indicators } = buildSources(bottleneck);
  if (live.length === 0 && vendor.length === 0 && indicators.length === 0)
    return null;

  return (
    <section className="space-y-3">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Data sources
      </h3>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {live.length > 0 ? (
          <div>
            <h4 className="mb-1 text-micro font-medium uppercase tracking-wider text-neutral-400">
              Live data
            </h4>
            <ul>
              {live.map((l) => (
                <LinkRow key={l.label} link={l} />
              ))}
            </ul>
          </div>
        ) : null}
        {vendor.length > 0 ? (
          <div>
            <h4 className="mb-1 text-micro font-medium uppercase tracking-wider text-neutral-400">
              Company IR
            </h4>
            <ul>
              {vendor.map((l) => (
                <LinkRow key={l.label} link={l} />
              ))}
            </ul>
          </div>
        ) : null}
        {indicators.length > 0 ? (
          <div>
            <h4 className="mb-1 text-micro font-medium uppercase tracking-wider text-neutral-400">
              Indicator references
            </h4>
            <ul>
              {indicators.map((l) => (
                <LinkRow key={l.label} link={l} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <p className="text-micro text-neutral-400">
        Editorial content (description, stack position, insight, debates) is
        hand-curated by Maverick Silicon research. Sources cited inline above
        and via <a href={COMTRADE_HOME} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">UN Comtrade</a>,{' '}
        <a href={EDGAR_HOME} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">SEC EDGAR</a>, and{' '}
        <a href={YFINANCE_HOME} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">Yahoo Finance</a> for the live data layer.
      </p>
    </section>
  );
}
