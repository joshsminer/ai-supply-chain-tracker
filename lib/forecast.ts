import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { bottlenecks, layers } from '@/data';
import type { Bottleneck, Severity, SupplyDemandYear } from './types';

/**
 * Deterministic constraint-risk scoring model.
 *
 * This is NOT a black-box statistical forecast — we don't yet have the quarterly
 * indicator time-series that would require. Instead it's a transparent, auditable
 * scoring function over the data we do have:
 *   - supplyDemand[] gap trajectory (demand index − supply index, projected out)
 *   - the editorial forward `status` on each projection year
 *   - supplier concentration (single-source fragility)
 *   - current severity
 *   - lead-time metric direction (worsening signal)
 *   - optional structured signals from the LLM-extraction layer (data/refreshed/signals)
 *
 * Every score decomposes into named drivers so a human can audit why a stage ranks
 * where it does. As the extraction layer accumulates real indicator series, the
 * model inputs sharpen without changing this contract.
 */

const SEVERITY_BASE: Record<Severity, number> = {
  critical: 1.0,
  tight: 0.65,
  balanced: 0.35,
  monitoring: 0.15,
};

const STATUS_BASE: Record<Exclude<Severity, 'monitoring'>, number> = {
  critical: 1.0,
  tight: 0.65,
  balanced: 0.35,
};

const SIGNALS_DIR = path.join(process.cwd(), 'data', 'refreshed', 'signals');

export interface StructuredSignal {
  slug: string;
  leadTimeWeeks?: number | null;
  leadTimeDeltaWeeks?: number | null;
  utilizationPct?: number | null;
  pricingDeltaPct?: number | null;
  capexGuidancePct?: number | null;
  nodeMixNote?: string | null;
  fetchedAt?: string;
  source?: string;
}

function loadSignal(slug: string): StructuredSignal | null {
  const p = path.join(SIGNALS_DIR, `${slug}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as StructuredSignal;
  } catch {
    return null;
  }
}

function parseYear(year: string): number {
  const n = parseInt(year.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function gapOf(y: SupplyDemandYear): number {
  return y.demandIndex - y.supplyIndex;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function topSupplierShare(b: Bottleneck): number {
  if (!b.supplyStructure.length) return 0;
  return Math.max(...b.supplyStructure.map((s) => s.sharePct));
}

function hasWorseningLeadTime(b: Bottleneck): boolean {
  return b.metrics.some(
    (m) => /lead time/i.test(m.label) && m.direction === 'up-bad'
  );
}

export interface ForecastResult {
  slug: string;
  name: string;
  shortName: string;
  layerId: string;
  layerNumber: number;
  layerName: string;
  severity: Severity;
  currentYear: string;
  forwardYear: string;
  currentGap: number; // demand − supply, current period
  forwardGap: number; // demand − supply, ~2-4 quarters out
  gapMomentum: number; // forwardGap − currentGap
  concentrationPct: number;
  projectedStatus: SupplyDemandYear['status'] | null;
  currentScore: number; // 0-100, how binding NOW
  forwardScore: number; // 0-100, how binding in 2-4 quarters
  escalation: number; // forwardScore − currentScore
  drivers: string[]; // projection-derived drivers (gap, momentum, concentration, status)
  signalDrivers: string[]; // filing-extracted drivers ("(extracted)")
  hasLiveSignal: boolean;
  signal: StructuredSignal | null;
}

function pickIndices(rows: SupplyDemandYear[], nowYear: number): { cur: number; fwd: number } {
  if (rows.length === 0) return { cur: 0, fwd: 0 };
  // current = latest row whose year <= nowYear; fall back to first row
  let cur = 0;
  for (let i = 0; i < rows.length; i++) {
    if (parseYear(rows[i].year) <= nowYear) cur = i;
  }
  const fwd = Math.min(cur + 1, rows.length - 1);
  return { cur, fwd };
}

export function forecastBottleneck(b: Bottleneck): ForecastResult {
  const nowYear = new Date().getFullYear();
  const rows = b.supplyDemand ?? [];
  const { cur, fwd } = pickIndices(rows, nowYear);
  const current = rows[cur];
  const forward = rows[fwd];

  const currentGap = current ? gapOf(current) : 0;
  const forwardGap = forward ? gapOf(forward) : currentGap;
  const gapMomentum = forwardGap - currentGap;
  const concentration = topSupplierShare(b) / 100;
  const signal = loadSignal(b.slug);
  const leadTimeWorsening = hasWorseningLeadTime(b);

  const layer = layers.find((l) => l.id === b.layerId);

  // --- Current severity score (0-100) ---
  const curGapNorm = clamp(currentGap, 0, 50) / 50;
  let currentScore =
    100 * (0.45 * curGapNorm + 0.35 * SEVERITY_BASE[b.severity] + 0.2 * concentration);

  // --- Forward constraint-risk score (0-100) ---
  const fwdGapNorm = clamp(forwardGap, 0, 50) / 50;
  const fwdStatusBase = forward ? STATUS_BASE[forward.status] : SEVERITY_BASE[b.severity];
  let forwardScore =
    100 * (0.45 * fwdGapNorm + 0.35 * fwdStatusBase + 0.2 * concentration);

  const drivers: string[] = [];
  drivers.push(
    `Supply–demand gap ${forwardGap >= 0 ? '+' : ''}${forwardGap} idx in ${forward?.year ?? '—'}`
  );
  if (Math.abs(gapMomentum) >= 1) {
    drivers.push(
      `Gap ${gapMomentum > 0 ? 'widening' : 'narrowing'} ${gapMomentum > 0 ? '+' : ''}${gapMomentum} idx vs ${current?.year ?? '—'}`
    );
  }
  drivers.push(`Top-supplier concentration ${Math.round(concentration * 100)}%`);
  if (forward) drivers.push(`Forward status: ${forward.status}`);

  // Lead-time worsening nudges the forward score up (capacity not catching demand).
  if (leadTimeWorsening) {
    forwardScore += 5;
    drivers.push('Lead time rising (up-bad metric)');
  }

  // Structured signal overrides / augments when present. These come from the
  // LLM-extraction layer parsing real filings, kept separate so the UI can flag
  // that a stage's score is fed by live filing data.
  const signalDrivers: string[] = [];
  if (signal) {
    if (signal.leadTimeWeeks != null) {
      signalDrivers.push(`Lead time ${signal.leadTimeWeeks}wk`);
    }
    if (signal.leadTimeDeltaWeeks && signal.leadTimeDeltaWeeks > 0) {
      forwardScore += clamp(signal.leadTimeDeltaWeeks / 2, 0, 8);
      signalDrivers.push(`Lead time +${signal.leadTimeDeltaWeeks}wk`);
    }
    if (signal.utilizationPct != null && signal.utilizationPct >= 90) {
      forwardScore += 4;
      signalDrivers.push(`Utilization ${signal.utilizationPct}%`);
    }
    if (signal.pricingDeltaPct != null && signal.pricingDeltaPct > 0) {
      forwardScore += clamp(signal.pricingDeltaPct / 5, 0, 6);
      signalDrivers.push(`Pricing +${signal.pricingDeltaPct}%`);
    }
    if (signal.capexGuidancePct != null) {
      forwardScore += clamp(signal.capexGuidancePct / 40, 0, 5);
      signalDrivers.push(
        `Capex ${signal.capexGuidancePct > 0 ? '+' : ''}${signal.capexGuidancePct}%`
      );
    }
  }

  currentScore = clamp(currentScore, 0, 100);
  forwardScore = clamp(forwardScore, 0, 100);

  return {
    slug: b.slug,
    name: b.name,
    shortName: b.shortName,
    layerId: b.layerId,
    layerNumber: layer?.number ?? 0,
    layerName: layer?.name ?? b.layerId,
    severity: b.severity,
    currentYear: current?.year ?? '—',
    forwardYear: forward?.year ?? '—',
    currentGap,
    forwardGap,
    gapMomentum,
    concentrationPct: Math.round(concentration * 100),
    projectedStatus: forward?.status ?? null,
    currentScore: Math.round(currentScore),
    forwardScore: Math.round(forwardScore),
    escalation: Math.round(forwardScore - currentScore),
    drivers,
    signalDrivers,
    hasLiveSignal: signalDrivers.length > 0,
    signal,
  };
}

export function forecastAll(): ForecastResult[] {
  return bottlenecks.map(forecastBottleneck);
}

/** Stages ranked by forward (2-4 quarter) constraint-risk score, descending. */
export function rankByForwardRisk(): ForecastResult[] {
  return forecastAll().sort(
    (a, b) => b.forwardScore - a.forwardScore || b.escalation - a.escalation
  );
}

/**
 * The "next emerging binding constraint": the highest-forward-risk stage that
 * is NOT already critical today, broken ties by escalation. This is the stage
 * the dashboard should flag as the one to watch beyond the already-binding set.
 */
export function emergingConstraint(): ForecastResult | null {
  const candidates = forecastAll()
    .filter((f) => f.severity !== 'critical')
    .sort(
      (a, b) =>
        b.forwardScore - a.forwardScore || b.escalation - a.escalation
    );
  return candidates[0] ?? null;
}

/** Stages escalating the fastest (largest forward-minus-current jump). */
export function fastestEscalating(limit = 5): ForecastResult[] {
  return forecastAll()
    .filter((f) => f.escalation > 0)
    .sort((a, b) => b.escalation - a.escalation)
    .slice(0, limit);
}
