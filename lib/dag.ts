import type { Bottleneck, Layer, Supplier } from './types';

export interface DagNode {
  slug: string;
  shortName: string;
  layerId: string;
  layerNumber: number;
  severity: Bottleneck['severity'];
  topSupplier: { name: string; sharePct: number; ticker?: string } | null;
  x: number;
  y: number;
  width: number;
}

export interface DagEdge {
  from: string;
  to: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface DagLayout {
  width: number;
  height: number;
  rowHeight: number;
  labelX: number;
  labelWidth: number;
  nodes: DagNode[];
  edges: DagEdge[];
  ghostEdges: { fromSlug: string; toLabel: string }[]; // references to slugs that aren't tracked
  layers: Layer[];
}

// Manual x-positions per slug, chosen to minimise crossings for the current set.
const X_OFFSETS: Record<string, number> = {
  // Compute trunk on the left
  'raw-materials': 480,
  'high-na-euv': 220,
  'leading-edge-logic': 220,
  'abf-substrates': 360,
  'dram-wafer-capacity': 200,
  'hbm-memory': 380,
  'cowos': 420,
  'datacenter-silicon': 540,
  // Optical side branch
  'cpo-ramp': 1020,
  'indium-phosphide': 1170,
  'transceivers-1-6t': 1320,
  // Thermal side branch
  'thermal-rack': 900,
  // Power / labour cluster on the right
  'human-capital': 760,
  'large-power-transformers': 680,
  'gas-turbines': 860,
  'interconnection-queues': 760,
};

const ROW_HEIGHT = 92;
const TOP_PADDING = 36;
const LABEL_X = 16;
const LABEL_WIDTH = 170;
const NODE_HEIGHT = 48;
const VIEW_WIDTH = 1440;
const NODE_WIDTH = 240;

function pickTopSupplier(b: Bottleneck): DagNode['topSupplier'] {
  if (!b.supplyStructure || b.supplyStructure.length === 0) return null;
  const ranked = [...b.supplyStructure].sort((a, b) => b.sharePct - a.sharePct);
  const top = ranked[0];
  return {
    name: top.name,
    sharePct: top.sharePct,
    ticker: top.ticker,
  };
}

export function buildDagLayout(
  bottlenecks: Bottleneck[],
  layers: Layer[]
): DagLayout {
  const layerById = new Map(layers.map((l) => [l.id, l]));
  const orderedLayers = [...layers].sort((a, b) => b.number - a.number);

  const nodes: DagNode[] = bottlenecks
    .map((b) => {
      const layer = layerById.get(b.layerId);
      if (!layer) return null;
      const x = X_OFFSETS[b.slug];
      if (x == null) return null;
      const rowIdx = orderedLayers.findIndex((l) => l.id === layer.id);
      return {
        slug: b.slug,
        shortName: b.shortName,
        layerId: b.layerId,
        layerNumber: layer.number,
        severity: b.severity,
        topSupplier: pickTopSupplier(b),
        x,
        y: TOP_PADDING + rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
        width: NODE_WIDTH,
      } as DagNode;
    })
    .filter((n): n is DagNode => n !== null);

  const nodeBySlug = new Map(nodes.map((n) => [n.slug, n]));

  // Collect unique edges from both upstreamSlugs and downstreamSlugs.
  const edgeSet = new Map<string, DagEdge>();
  const ghosts: { fromSlug: string; toLabel: string }[] = [];

  const addEdge = (fromSlug: string, toSlug: string) => {
    const from = nodeBySlug.get(fromSlug);
    const to = nodeBySlug.get(toSlug);
    if (!from || !to) return;
    const key = `${fromSlug}->${toSlug}`;
    if (edgeSet.has(key)) return;
    edgeSet.set(key, {
      from: fromSlug,
      to: toSlug,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
    });
  };

  for (const b of bottlenecks) {
    for (const u of b.upstreamSlugs ?? []) {
      if (nodeBySlug.has(u)) addEdge(u, b.slug);
      else ghosts.push({ fromSlug: b.slug, toLabel: u });
    }
    for (const d of b.downstreamSlugs ?? []) {
      if (nodeBySlug.has(d)) addEdge(b.slug, d);
      else ghosts.push({ fromSlug: b.slug, toLabel: d });
    }
  }

  return {
    width: VIEW_WIDTH,
    height: TOP_PADDING * 2 + orderedLayers.length * ROW_HEIGHT,
    rowHeight: ROW_HEIGHT,
    labelX: LABEL_X,
    labelWidth: LABEL_WIDTH,
    nodes,
    edges: Array.from(edgeSet.values()),
    ghostEdges: ghosts,
    layers: orderedLayers,
  };
}

export const NODE_HEIGHT_PX = NODE_HEIGHT;

// -------------- Critical companies extraction --------------

const SEVERITY_WEIGHT: Record<Bottleneck['severity'], number> = {
  critical: 3,
  tight: 1.5,
  balanced: 0.5,
  monitoring: 0.25,
};

export interface CriticalCompanyRow {
  name: string;
  ticker: string | null;
  totalScore: number; // sum of (sharePct/100) * severity weight across gated bottlenecks
  gates: {
    bottleneckSlug: string;
    bottleneckName: string;
    severity: Bottleneck['severity'];
    sharePct: number;
  }[];
  maxShare: number;
  isPrivate: boolean;
}

export function topCriticalCompanies(
  bottlenecks: Bottleneck[],
  threshold = 30
): CriticalCompanyRow[] {
  // Aggregate by company name (preserve case). Treat suppliers and "companies"
  // separately — the supplier list is the supply structure we care about most.
  const map = new Map<string, CriticalCompanyRow>();

  for (const b of bottlenecks) {
    for (const s of b.supplyStructure) {
      if (s.sharePct < threshold) continue;
      const key = s.name.toLowerCase();
      const existing = map.get(key) ?? {
        name: s.name,
        ticker: s.ticker ?? null,
        totalScore: 0,
        gates: [],
        maxShare: 0,
        isPrivate: !s.ticker,
      };
      const weight = SEVERITY_WEIGHT[b.severity] ?? 1;
      existing.totalScore += (s.sharePct / 100) * weight;
      existing.gates.push({
        bottleneckSlug: b.slug,
        bottleneckName: b.name,
        severity: b.severity,
        sharePct: s.sharePct,
      });
      existing.maxShare = Math.max(existing.maxShare, s.sharePct);
      // Pick up ticker from any mention
      if (s.ticker && !existing.ticker) existing.ticker = s.ticker;
      map.set(key, existing);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.totalScore - a.totalScore || b.maxShare - a.maxShare
  );
}

export interface SupplierMention {
  bottleneck: Bottleneck;
  supplier: Supplier;
}
