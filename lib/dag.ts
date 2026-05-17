import type { Bottleneck, Layer } from './types';

export interface DagNode {
  slug: string;
  shortName: string;
  layerId: string;
  layerNumber: number;
  severity: Bottleneck['severity'];
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
// Add new slugs here when you add new bottlenecks.
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

const ROW_HEIGHT = 64;
const TOP_PADDING = 32;
const LABEL_X = 16;
const LABEL_WIDTH = 170;
const NODE_HEIGHT = 30;
const VIEW_WIDTH = 1440;

function nodeWidth(shortName: string): number {
  // ~7.2px per character, plus dot + padding.
  return Math.min(220, Math.max(120, shortName.length * 8 + 28));
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
        x,
        y: TOP_PADDING + rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
        width: nodeWidth(b.shortName),
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
