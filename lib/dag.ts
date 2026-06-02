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

// X-positions per slug. The DAG now collapses to 3 rows (L1/L2/L3 of the AI
// 5-layer cake), so we have multiple nodes per row and need to spread them
// horizontally without overlap. Order left->right reflects supply-chain flow
// within each row where possible.
const X_OFFSETS: Record<string, number> = {
  // L3 — Compute & silicon (7 nodes)
  'abf-substrates': 130,
  'high-na-euv': 320,
  'leading-edge-logic': 510,
  'dram-wafer-capacity': 700,
  'hbm-memory': 890,
  'cowos': 1080,
  'datacenter-silicon': 1280,
  // L2 — Datacenter & networking (4 nodes)
  'thermal-rack': 280,
  'indium-phosphide': 620,
  'cpo-ramp': 960,
  'transceivers-1-6t': 1280,
  // L1 — Energy, site & upstream (5 nodes)
  'raw-materials': 200,
  'human-capital': 450,
  'large-power-transformers': 700,
  'gas-turbines': 950,
  'interconnection-queues': 1280,
};

const ROW_HEIGHT = 140;
const TOP_PADDING = 40;
const LABEL_X = 16;
const LABEL_WIDTH = 170;
const NODE_HEIGHT = 52;
const VIEW_WIDTH = 1500;
const NODE_WIDTH = 200;

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
