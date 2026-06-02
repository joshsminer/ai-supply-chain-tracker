import 'server-only';
import { bottlenecks } from '@/data';
import { marketData, secData } from './refreshed';
import { allPriceMoves, recentPriorMoves, type PriorMove } from './history';

const FX_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.1,
  GBP: 1.27,
  GBp: 0.0127,
  JPY: 0.0067,
  KRW: 0.00072,
  CNY: 0.14,
  HKD: 0.128,
  TWD: 0.031,
  AUD: 0.66,
};

function fxToUsd(amount: number, currency: string): number {
  return amount * (FX_TO_USD[currency] ?? 1);
}

export interface DayMove {
  ticker: string;
  name: string | null;
  dayChangePct: number;
}

export interface DashboardStats {
  totalBottlenecks: number;
  bySeverity: { critical: number; tight: number; balanced: number; monitoring: number };
  publicCompanies: number;
  privateCompanies: number;
  totalTrackedMcapUsd: number;
  ltmAveragePct: number | null;
  ltmMedianPct: number | null;
  topDayGainer: DayMove | null;
  topDayLoser: DayMove | null;
  latestFiling: {
    ticker: string;
    entityName: string | null;
    form: string;
    filedAt: string;
    url: string | null;
  } | null;
  latestPriorMove: PriorMove | null;
}

export function dashboardStats(): DashboardStats {
  // Severity buckets
  const bySev = { critical: 0, tight: 0, balanced: 0, monitoring: 0 };
  for (const b of bottlenecks) bySev[b.severity] += 1;

  // Public / private company counts (dedup across bottlenecks by name)
  const publicNames = new Set<string>();
  const privateNames = new Set<string>();
  for (const b of bottlenecks) {
    for (const c of b.companies) {
      if (c.tier === 'private') privateNames.add(c.name.toLowerCase());
      else publicNames.add(c.name.toLowerCase());
    }
  }

  // Total tracked market cap (dedup tickers, sum USD-equivalent)
  const tickers = new Set<string>();
  for (const b of bottlenecks) {
    for (const s of b.supplyStructure) if (s.ticker) tickers.add(s.ticker);
    for (const c of b.companies) if (c.ticker) tickers.add(c.ticker);
  }
  let totalMcap = 0;
  for (const t of Array.from(tickers)) {
    const snap = marketData[t];
    if (!snap || !snap.marketCap) continue;
    totalMcap += fxToUsd(snap.marketCap, snap.currency ?? 'USD');
  }

  // LTM cohort summary (still surfaced in the stats overview)
  const moves = allPriceMoves(365).filter((m) => tickers.has(m.ticker));
  const ltmPcts = moves.map((m) => m.changePct).filter((n) => Number.isFinite(n));
  const ltmAvg =
    ltmPcts.length > 0 ? ltmPcts.reduce((a, b) => a + b, 0) / ltmPcts.length : null;
  const sorted = [...ltmPcts].sort((a, b) => a - b);
  const ltmMedian =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

  // Day-of movers from the live market snapshots (dayChangePct)
  const dayMoves: DayMove[] = Array.from(tickers)
    .map((t) => {
      const snap = marketData[t];
      if (!snap || snap.dayChangePct == null || !Number.isFinite(snap.dayChangePct)) {
        return null;
      }
      return {
        ticker: t,
        name: snap.name ?? null,
        dayChangePct: snap.dayChangePct,
      };
    })
    .filter((m): m is DayMove => m !== null)
    .sort((a, b) => b.dayChangePct - a.dayChangePct);
  const topDayGainer = dayMoves[0] && dayMoves[0].dayChangePct > 0 ? dayMoves[0] : null;
  const topDayLoser =
    dayMoves[dayMoves.length - 1] && dayMoves[dayMoves.length - 1].dayChangePct < 0
      ? dayMoves[dayMoves.length - 1]
      : null;

  // Latest filing
  const filings = Object.values(secData)
    .filter((s) => s.latestFiling?.filedAt)
    .sort((a, b) => (b.latestFiling.filedAt ?? '').localeCompare(a.latestFiling.filedAt ?? ''));
  const lf = filings[0] ?? null;
  const latestFiling = lf
    ? {
        ticker: lf.ticker,
        entityName: lf.entityName ?? null,
        form: lf.latestFiling.form,
        filedAt: lf.latestFiling.filedAt,
        url: lf.latestFiling.url,
      }
    : null;

  // Latest prior move
  const latestPriorMove = recentPriorMoves(1)[0] ?? null;

  return {
    totalBottlenecks: bottlenecks.length,
    bySeverity: bySev,
    publicCompanies: publicNames.size,
    privateCompanies: privateNames.size,
    totalTrackedMcapUsd: totalMcap,
    ltmAveragePct: ltmAvg,
    ltmMedianPct: ltmMedian,
    topDayGainer,
    topDayLoser,
    latestFiling,
    latestPriorMove,
  };
}
