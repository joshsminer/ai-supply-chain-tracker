import type { Bottleneck, Severity } from './types';

export interface Filters {
  severities: Severity[];
  singleSource: boolean;
  longLeadTime: boolean;
  layerId: string | null;
}

export const emptyFilters: Filters = {
  severities: [],
  singleSource: false,
  longLeadTime: false,
  layerId: null,
};

const ALL_SEVERITIES: Severity[] = ['critical', 'tight', 'balanced', 'monitoring'];

export function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const sevRaw = params.severity;
  const sev = (Array.isArray(sevRaw) ? sevRaw.join(',') : sevRaw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Severity => ALL_SEVERITIES.includes(s as Severity));
  const layerRaw = params.layer;
  const layer = Array.isArray(layerRaw) ? layerRaw[0] : layerRaw;
  return {
    severities: sev,
    singleSource: params.singleSource === 'true',
    longLeadTime: params.leadTime === 'true',
    layerId: layer && layer.trim() ? layer.trim() : null,
  };
}

export function hasAnyFilter(f: Filters): boolean {
  return (
    f.severities.length > 0 ||
    f.singleSource ||
    f.longLeadTime ||
    f.layerId !== null
  );
}

export function activeFilterCount(f: Filters): number {
  return (
    f.severities.length +
    (f.singleSource ? 1 : 0) +
    (f.longLeadTime ? 1 : 0) +
    (f.layerId ? 1 : 0)
  );
}

export function isSingleSource(b: Bottleneck): boolean {
  if (b.supplyStructure.length === 0) return false;
  const top = Math.max(...b.supplyStructure.map((s) => s.sharePct));
  return top >= 50;
}

const LEAD_TIME_THRESHOLD_WEEKS = 18 * 4.345;

export function hasLongLeadTime(b: Bottleneck): boolean {
  for (const m of b.metrics) {
    if (!/lead time/i.test(m.label)) continue;
    const match = m.value.match(/(\d+(?:\.\d+)?)\s*(wk|week|weeks|mo|mos|month|months|d|day|days)/i);
    if (!match) continue;
    const n = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    let weeks = n;
    if (unit.startsWith('mo')) weeks = n * 4.345;
    else if (unit.startsWith('d')) weeks = n / 7;
    if (weeks >= LEAD_TIME_THRESHOLD_WEEKS) return true;
  }
  return false;
}

export function matchesFilters(b: Bottleneck, f: Filters): boolean {
  if (f.layerId && b.layerId !== f.layerId) return false;
  if (f.severities.length > 0 && !f.severities.includes(b.severity)) return false;
  if (f.singleSource && !isSingleSource(b)) return false;
  if (f.longLeadTime && !hasLongLeadTime(b)) return false;
  return true;
}
