import 'server-only';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'market.jsonl');
const PRIORS_FILE = path.join(HISTORY_DIR, 'priors.jsonl');
const SEVERITIES_FILE = path.join(HISTORY_DIR, 'severities.jsonl');

// mtime-keyed caches: re-parse only when the file changes on disk.
// Important for dev — JSONL files get appended outside the Next.js process,
// and we don't want to ship stale data after a refresh.
function mtimeCache<T>(file: string, parse: (raw: string) => T, empty: T) {
  let cachedMtime = 0;
  let cached: T = empty;
  return (): T => {
    if (!existsSync(file)) return empty;
    const m = statSync(file).mtimeMs;
    if (m === cachedMtime) return cached;
    cached = parse(readFileSync(file, 'utf-8'));
    cachedMtime = m;
    return cached;
  };
}

export interface PricePoint {
  ticker: string;
  date: string; // YYYY-MM-DD
  close: number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  source?: string;
}

interface History {
  byTicker: Record<string, PricePoint[]>;
  latest: string | null;
}

function parseHistory(raw: string): History {
  const byTicker: Record<string, PricePoint[]> = {};
  let latest: string | null = null;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as PricePoint;
      if (typeof row.close !== 'number') continue;
      (byTicker[row.ticker] ||= []).push(row);
      if (!latest || row.date > latest) latest = row.date;
    } catch {
      continue;
    }
  }
  for (const t of Object.keys(byTicker)) {
    byTicker[t].sort((a, b) => a.date.localeCompare(b.date));
  }
  return { byTicker, latest };
}

const getHistory = mtimeCache(HISTORY_FILE, parseHistory, {
  byTicker: {},
  latest: null,
} as History);

export function getPriceSeries(ticker: string | undefined): PricePoint[] {
  if (!ticker) return [];
  return getHistory().byTicker[ticker] ?? [];
}

export function historyLatestDate(): string | null {
  return getHistory().latest;
}

export interface PriceMove {
  ticker: string;
  startDate: string;
  endDate: string;
  startClose: number;
  endClose: number;
  changePct: number;
}

export function priceMove(
  ticker: string,
  windowDays = 30
): PriceMove | null {
  const series = getPriceSeries(ticker);
  if (series.length < 2) return null;
  const end = series[series.length - 1];
  // Find the closest point at least windowDays earlier.
  const target = new Date(end.date);
  target.setUTCDate(target.getUTCDate() - windowDays);
  const targetIso = target.toISOString().slice(0, 10);
  let start: PricePoint | null = null;
  for (const p of series) {
    if (p.date <= targetIso) start = p;
    else if (!start) start = p;
    if (p.date > targetIso) break;
  }
  if (!start) start = series[0];
  if (!start || start.date === end.date) return null;
  const changePct = ((end.close - start.close) / start.close) * 100;
  return {
    ticker,
    startDate: start.date,
    endDate: end.date,
    startClose: start.close,
    endClose: end.close,
    changePct,
  };
}

export function allPriceMoves(windowDays = 30): PriceMove[] {
  const out: PriceMove[] = [];
  for (const t of Object.keys(getHistory().byTicker)) {
    const m = priceMove(t, windowDays);
    if (m) out.push(m);
  }
  return out;
}

// ---------------- Priors history ----------------

export interface PriorPoint {
  slug: string;
  question: string;
  probability: number;
  lastUpdated: string;
  snapshotAt: string;
}

interface PriorsIndex {
  byKey: Record<string, PriorPoint[]>; // key: `${slug}::${question}`
}

function parsePriors(raw: string): PriorsIndex {
  const out: PriorsIndex = { byKey: {} };
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as PriorPoint;
      const key = `${row.slug}::${row.question}`;
      (out.byKey[key] ||= []).push(row);
    } catch {
      continue;
    }
  }
  for (const k of Object.keys(out.byKey)) {
    out.byKey[k].sort((a, b) => a.snapshotAt.localeCompare(b.snapshotAt));
  }
  return out;
}

const getPriors = mtimeCache(PRIORS_FILE, parsePriors, { byKey: {} } as PriorsIndex);

export function getPriorSeries(slug: string, question: string): PriorPoint[] {
  return getPriors().byKey[`${slug}::${question}`] ?? [];
}

export interface PriorMove {
  slug: string;
  question: string;
  previous: PriorPoint;
  current: PriorPoint;
  delta: number;
}

export function recentPriorMoves(limit = 12): PriorMove[] {
  const out: PriorMove[] = [];
  for (const series of Object.values(getPriors().byKey)) {
    if (series.length < 2) continue;
    const current = series[series.length - 1];
    const previous = series[series.length - 2];
    if (current.probability === previous.probability) continue;
    out.push({
      slug: current.slug,
      question: current.question,
      previous,
      current,
      delta: current.probability - previous.probability,
    });
  }
  out.sort(
    (a, b) =>
      b.current.lastUpdated.localeCompare(a.current.lastUpdated) ||
      Math.abs(b.delta) - Math.abs(a.delta)
  );
  return out.slice(0, limit);
}

// ---------------- Severity history ----------------

export interface SeverityPoint {
  slug: string;
  severity: 'critical' | 'tight' | 'balanced' | 'monitoring';
  severityNote?: string | null;
  lastUpdated: string;
  snapshotAt: string;
}

interface SeverityIndex {
  bySlug: Record<string, SeverityPoint[]>;
}

function parseSeverities(raw: string): SeverityIndex {
  const out: SeverityIndex = { bySlug: {} };
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as SeverityPoint;
      (out.bySlug[row.slug] ||= []).push(row);
    } catch {
      continue;
    }
  }
  for (const k of Object.keys(out.bySlug)) {
    out.bySlug[k].sort((a, b) => a.snapshotAt.localeCompare(b.snapshotAt));
  }
  return out;
}

const getSeverities = mtimeCache(SEVERITIES_FILE, parseSeverities, {
  bySlug: {},
} as SeverityIndex);

export function getSeveritySeries(slug: string): SeverityPoint[] {
  return getSeverities().bySlug[slug] ?? [];
}

export interface SeverityChange {
  slug: string;
  previous: SeverityPoint;
  current: SeverityPoint;
}

export function recentSeverityChanges(limit = 8): SeverityChange[] {
  const out: SeverityChange[] = [];
  for (const series of Object.values(getSeverities().bySlug)) {
    if (series.length < 2) continue;
    const current = series[series.length - 1];
    const previous = series[series.length - 2];
    if (current.severity === previous.severity) continue;
    out.push({ slug: current.slug, previous, current });
  }
  out.sort((a, b) =>
    b.current.lastUpdated.localeCompare(a.current.lastUpdated)
  );
  return out.slice(0, limit);
}
