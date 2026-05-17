import type { Company, CompanyTier } from '@/lib/types';
import { getMarket, type MarketSnapshot } from '@/lib/refreshed';
import { getPriceSeries, priceMove } from '@/lib/history';
import { cn, formatCompactNumber, formatRelativeTime } from '@/lib/utils';
import { yahooFinanceUrl } from '@/lib/external-links';
import { Sparkline } from './Sparkline';

const TIER_LABEL: Record<CompanyTier, string> = {
  'public-primary': 'Public · primary',
  'public-enabler': 'Public · enabler',
  'public-device': 'Public · device',
  'public-epi': 'Public · epi',
  'public-materials': 'Public · materials',
  private: 'Private',
};

const TIER_COLOR: Record<CompanyTier, string> = {
  'public-primary': 'text-violet-700 bg-violet-50',
  'public-enabler': 'text-sky-700 bg-sky-50',
  'public-device': 'text-emerald-700 bg-emerald-50',
  'public-epi': 'text-amber-700 bg-amber-50',
  'public-materials': 'text-rose-700 bg-rose-50',
  private: 'text-neutral-700 bg-neutral-100',
};

function formatPrice(snap: MarketSnapshot): string {
  if (snap.price == null) return '—';
  const cur = snap.currency ?? '';
  if (cur === 'USD') return `$${snap.price.toFixed(2)}`;
  if (cur === 'KRW' || cur === 'JPY') {
    return `${snap.price.toLocaleString()} ${cur}`;
  }
  return `${snap.price.toFixed(2)} ${cur}`;
}

function LivePrice({ snap }: { snap: MarketSnapshot }) {
  const pct = snap.dayChangePct;
  const sign = pct == null ? '' : pct >= 0 ? '+' : '';
  const pctColor =
    pct == null
      ? 'text-neutral-400'
      : pct >= 0
        ? 'text-severity-balanced-fg'
        : 'text-severity-critical-fg';
  const series = getPriceSeries(snap.ticker);
  const move = priceMove(snap.ticker, 30);
  const moveSign = move && move.changePct >= 0 ? '+' : '';
  const moveColor =
    move == null
      ? 'text-neutral-400'
      : move.changePct >= 0
        ? 'text-severity-balanced-fg'
        : 'text-severity-critical-fg';
  return (
    <div className="mt-1 space-y-1 border-t-[0.5px] border-neutral-200 pt-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col leading-tight">
          <span className="text-caption font-medium tabular-nums text-neutral-900">
            {formatPrice(snap)}
          </span>
          {snap.marketCap ? (
            <span className="text-micro text-neutral-500">
              mcap {formatCompactNumber(snap.marketCap)} {snap.currency}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col items-end leading-tight">
          {pct != null ? (
            <span className={cn('text-caption tabular-nums', pctColor)}>
              {sign}
              {pct.toFixed(2)}%
            </span>
          ) : null}
          <span className="text-micro text-neutral-400">
            {formatRelativeTime(snap.fetchedAt)}
          </span>
        </div>
      </div>
      {series.length >= 2 ? (
        <div className="flex items-center justify-between gap-2">
          <Sparkline series={series} />
          {move ? (
            <span className={cn('text-micro tabular-nums', moveColor)}>
              30d {moveSign}
              {move.changePct.toFixed(1)}%
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const snap = getMarket(company.ticker);
  return (
    <div className="flex flex-col gap-1.5 rounded-md border-[0.5px] border-neutral-200 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-micro font-medium uppercase tracking-wider',
            TIER_COLOR[company.tier]
          )}
        >
          {TIER_LABEL[company.tier]}
        </span>
        {company.ticker ? (
          <a
            href={yahooFinanceUrl(company.ticker)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-micro text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
            title={`Open ${company.ticker} on Yahoo Finance`}
          >
            {company.ticker}
          </a>
        ) : null}
      </div>
      {company.url ? (
        <a
          href={company.url}
          target="_blank"
          rel="noreferrer"
          className="text-caption font-medium leading-snug text-neutral-900 underline-offset-2 hover:underline"
        >
          {company.name}
        </a>
      ) : (
        <span className="text-caption font-medium leading-snug text-neutral-900">
          {company.name}
        </span>
      )}
      <span className="text-micro leading-snug text-neutral-500">{company.note}</span>
      {company.funding ? (
        <span className="text-micro leading-snug text-neutral-500">
          <span className="font-medium text-neutral-700">Funding:</span>{' '}
          {company.funding}
        </span>
      ) : null}
      {company.investors ? (
        <span className="text-micro leading-snug text-neutral-400">
          Investors: {company.investors}
        </span>
      ) : null}
      {snap ? <LivePrice snap={snap} /> : null}
    </div>
  );
}

export function InvestmentLandscape({ companies }: { companies: Company[] }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Investment landscape
      </h3>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <CompanyCard key={c.name} company={c} />
        ))}
      </div>
    </section>
  );
}
