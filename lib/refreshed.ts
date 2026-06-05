import 'server-only';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REFRESHED_DIR = path.join(process.cwd(), 'data', 'refreshed');

export interface MarketSnapshot {
  ticker: string;
  name?: string | null;
  exchange?: string | null;
  currency?: string | null;
  price?: number | null;
  previousClose?: number | null;
  dayChangePct?: number | null;
  marketCap?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  trailingPE?: number | null;
  fetchedAt: string;
  source: string;
}

export interface SecRevenue {
  tag: string;
  value: number;
  currency: string;
  periodEnd: string;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
}

export interface SecFiling {
  form: string;
  filedAt: string;
  periodOfReport: string | null;
  accessionNumber: string;
  primaryDocument: string | null;
  url: string | null;
  entityName?: string | null;
  sicDescription?: string | null;
}

export interface SecSnapshot {
  ticker: string;
  cik: string;
  entityName?: string | null;
  sicDescription?: string | null;
  latestFiling: SecFiling;
  latestRevenue: SecRevenue | null;
  fetchedAt: string;
  source: string;
}

function loadDir<T>(subdir: string): Record<string, T> {
  const dir = path.join(REFRESHED_DIR, subdir);
  if (!existsSync(dir)) return {};
  const out: Record<string, T> = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const key = f.replace(/\.json$/, '');
    try {
      const raw = readFileSync(path.join(dir, f), 'utf-8');
      out[key] = JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[refreshed] failed to read ${subdir}/${f}:`, err);
    }
  }
  return out;
}

export const marketData: Record<string, MarketSnapshot> = loadDir('market');
export const secData: Record<string, SecSnapshot> = loadDir('sec');

export interface KoreaPartnerRow {
  partner: string;
  partnerCode: number;
  valueUsd: number | null;
  netWeightKg: number | null;
}

export interface KoreaPeriodRow {
  period: string; // YYYYMM
  totalUsd: number | null;
  byPartner: KoreaPartnerRow[];
}

export interface KoreaTradeSnapshot {
  reporter: string;
  hsCode: string;
  hsLabel: string;
  flow: string;
  byPeriod: KoreaPeriodRow[];
  fetchedAt: string;
  source: string;
}

export interface ExtractFinding {
  category: string;
  claim: string;
  sourceQuote: string;
  topicTags?: string[];
}

export interface ExtractSnapshot {
  ticker: string;
  entityName?: string | null;
  filing: SecFiling;
  findings: ExtractFinding[];
  summary?: string;
  model?: string;
  fetchedAt: string;
  source: string;
}

export const koreaTradeData: Record<string, KoreaTradeSnapshot> =
  loadDir('korea_trade');

export const extractsData: Record<string, ExtractSnapshot> = loadDir('extracts');

export function getKoreaTrade(key = 'dram_exports'): KoreaTradeSnapshot | undefined {
  return koreaTradeData[key];
}

export function getExtract(ticker: string | undefined): ExtractSnapshot | undefined {
  if (!ticker) return undefined;
  return extractsData[ticker];
}

export function getMarket(ticker: string | undefined): MarketSnapshot | undefined {
  if (!ticker) return undefined;
  return marketData[ticker];
}

export function getSec(ticker: string | undefined): SecSnapshot | undefined {
  if (!ticker) return undefined;
  return secData[ticker];
}

export interface LiveDataSummary {
  marketTickerCount: number;
  secTickerCount: number;
  latestFetchAt: string | null;
}

export function liveDataSummary(): LiveDataSummary {
  // latestFetchAt scans every live-data source so the "last refreshed" stamp in
  // the UI reflects the freshest data we hold — not a hard-coded editorial date.
  // It updates automatically each time any refresh tool runs.
  const allTimes: string[] = [];
  for (const m of Object.values(marketData)) {
    if (m.fetchedAt) allTimes.push(m.fetchedAt);
  }
  for (const s of Object.values(secData)) {
    if (s.fetchedAt) allTimes.push(s.fetchedAt);
  }
  for (const k of Object.values(koreaTradeData)) {
    if (k.fetchedAt) allTimes.push(k.fetchedAt);
  }
  for (const e of Object.values(extractsData)) {
    if (e.fetchedAt) allTimes.push(e.fetchedAt);
  }
  for (const sig of Object.values(loadDir<{ fetchedAt?: string }>('signals'))) {
    if (sig.fetchedAt) allTimes.push(sig.fetchedAt);
  }
  allTimes.sort();
  return {
    marketTickerCount: Object.keys(marketData).length,
    secTickerCount: Object.keys(secData).length,
    latestFetchAt: allTimes.at(-1) ?? null,
  };
}
