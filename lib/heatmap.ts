import 'server-only';
import { hierarchy, treemap, type HierarchyRectangularNode } from 'd3-hierarchy';
import { bottlenecks } from '@/data';
import { marketData } from './refreshed';
import { priceMove } from './history';

/**
 * Approximate FX rates to USD, pegged to mid-May 2026.
 * Used only for sizing the treemap cells comparably across currencies.
 * Refresh manually when rates drift materially.
 */
const FX_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.1,
  GBP: 1.27,
  GBp: 0.0127, // London quotes pence
  JPY: 0.0067,
  KRW: 0.00072,
  CNY: 0.14,
  HKD: 0.128,
  TWD: 0.031,
  AUD: 0.66,
};

function fxToUsd(amount: number, currency: string): number {
  const rate = FX_TO_USD[currency] ?? 1;
  return amount * rate;
}

export interface HeatmapCell {
  ticker: string;
  name: string;
  bottleneckSlug: string;
  bottleneckName: string;
  marketCapUsd: number;
  currency: string;
  price: number | null;
  ltmPct: number | null;
  dayPct: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HeatmapGroup {
  bottleneckSlug: string;
  bottleneckName: string;
  totalMcapUsd: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HeatmapLayout {
  width: number;
  height: number;
  groups: HeatmapGroup[];
  cells: HeatmapCell[];
}

interface TickerLeaf {
  type: 'ticker';
  ticker: string;
  name: string;
  marketCapUsd: number;
  currency: string;
  price: number | null;
  ltmPct: number | null;
  dayPct: number | null;
  value: number;
}

interface GroupNode {
  type: 'group';
  bottleneckSlug: string;
  bottleneckName: string;
  children: TickerLeaf[];
}

interface RootNode {
  type: 'root';
  children: GroupNode[];
}

type AnyNode = RootNode | GroupNode | TickerLeaf;

const GROUP_LABEL_HEIGHT = 22;

export function buildHeatmap(width: number, height: number): HeatmapLayout {
  // 1. Decide each ticker's *primary* bottleneck. A ticker can be listed in
  //    multiple bottleneck JSONs; we attribute it once, to the bottleneck where
  //    it has the highest supplier share. If it never appears as a supplier
  //    (only in companies arrays), it goes to the first bottleneck that lists
  //    it. This dedup makes the heatmap a clean attribution view rather than a
  //    mega-cap-double-counted-everywhere view.
  const primary = new Map<string, string>(); // ticker -> bottleneck slug
  const bestShare = new Map<string, number>();
  for (const b of bottlenecks) {
    for (const s of b.supplyStructure) {
      if (!s.ticker) continue;
      const cur = bestShare.get(s.ticker) ?? -1;
      if (s.sharePct > cur) {
        bestShare.set(s.ticker, s.sharePct);
        primary.set(s.ticker, b.slug);
      }
    }
  }
  for (const b of bottlenecks) {
    for (const c of b.companies) {
      if (!c.ticker || primary.has(c.ticker)) continue;
      primary.set(c.ticker, b.slug);
    }
  }

  // 2. Aggregate tickers per bottleneck using the primary assignment.
  const groupNodes: GroupNode[] = [];
  for (const b of bottlenecks) {
    const seen = new Set<string>();
    const leaves: TickerLeaf[] = [];
    const addTicker = (ticker: string | undefined) => {
      if (!ticker || seen.has(ticker)) return;
      if (primary.get(ticker) !== b.slug) return; // not our ticker
      seen.add(ticker);
      const snap = marketData[ticker];
      if (!snap || !snap.marketCap) return;
      const mcapUsd = fxToUsd(snap.marketCap, snap.currency ?? 'USD');
      if (mcapUsd <= 0) return;
      const move = priceMove(ticker, 365);
      leaves.push({
        type: 'ticker',
        ticker,
        name: snap.name ?? ticker,
        marketCapUsd: mcapUsd,
        currency: snap.currency ?? 'USD',
        price: snap.price ?? null,
        ltmPct: move?.changePct ?? null,
        dayPct: snap.dayChangePct ?? null,
        // sqrt compresses mega-cap dominance so small caps remain visible.
        // Real mcap is preserved on the cell for tooltip/sorting.
        value: Math.sqrt(mcapUsd),
      });
    };
    for (const s of b.supplyStructure) addTicker(s.ticker);
    for (const c of b.companies) addTicker(c.ticker);
    if (leaves.length === 0) continue;
    groupNodes.push({
      type: 'group',
      bottleneckSlug: b.slug,
      bottleneckName: b.name,
      children: leaves,
    });
  }

  const root: RootNode = { type: 'root', children: groupNodes };

  // 2. Apply d3 treemap.
  const h = hierarchy<AnyNode>(root, (n) => {
    if (n.type === 'root' || n.type === 'group') return n.children;
    return null;
  }).sum((n) => (n.type === 'ticker' ? n.value : 0));

  const laid = treemap<AnyNode>()
    .size([width, height])
    .paddingOuter(4)
    .paddingTop(GROUP_LABEL_HEIGHT)
    .paddingInner(2)
    .round(true)(h) as HierarchyRectangularNode<AnyNode>;

  const groups: HeatmapGroup[] = [];
  const cells: HeatmapCell[] = [];

  laid.children?.forEach((groupNode) => {
    const g = groupNode.data as GroupNode;
    const trueTotalMcap = g.children.reduce((s, c) => s + c.marketCapUsd, 0);
    groups.push({
      bottleneckSlug: g.bottleneckSlug,
      bottleneckName: g.bottleneckName,
      totalMcapUsd: trueTotalMcap,
      x: groupNode.x0,
      y: groupNode.y0,
      width: groupNode.x1 - groupNode.x0,
      height: groupNode.y1 - groupNode.y0,
    });
    groupNode.children?.forEach((leafNode) => {
      const leaf = leafNode.data as TickerLeaf;
      cells.push({
        ticker: leaf.ticker,
        name: leaf.name,
        bottleneckSlug: g.bottleneckSlug,
        bottleneckName: g.bottleneckName,
        marketCapUsd: leaf.marketCapUsd,
        currency: leaf.currency,
        price: leaf.price,
        ltmPct: leaf.ltmPct,
        dayPct: leaf.dayPct,
        x: leafNode.x0,
        y: leafNode.y0,
        width: leafNode.x1 - leafNode.x0,
        height: leafNode.y1 - leafNode.y0,
      });
    });
  });

  return { width, height, groups, cells };
}

/**
 * Return the fill colour for a given LTM percent change.
 * Diverging palette: red <-> neutral grey <-> green, saturation tied to magnitude
 * clipped at ±100% for the bottom of the colour scale and ±300% for the top.
 */
export function heatmapFill(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return '#E5E5E5'; // neutral grey

  if (pct === 0) return '#D4D4D4';

  // Cap saturation. LTM moves can be very large in AI cycle (e.g. AXTI +8000%).
  // We want clear color signal without all green cells looking identical.
  const cap = 100;
  const t = Math.min(Math.abs(pct) / cap, 1);

  if (pct > 0) {
    // Green: from neutral grey to deep green
    // Light green #DDEBC8 -> deep green #2C5E15
    const r = Math.round(221 - (221 - 44) * t);
    const g = Math.round(235 - (235 - 94) * t);
    const b = Math.round(200 - (200 - 21) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Red: from neutral grey to deep red
    // Light red #F4D5D4 -> deep red #791F1F
    const r = Math.round(244 - (244 - 121) * t);
    const g = Math.round(213 - (213 - 31) * t);
    const b = Math.round(212 - (212 - 31) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Text color that maintains contrast against the heatmap fill.
 */
export function heatmapText(pct: number | null): string {
  if (pct == null || Math.abs(pct) < 30) return '#171717';
  return '#FFFFFF';
}
