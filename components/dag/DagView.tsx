import Link from 'next/link';
import type { Severity } from '@/lib/types';
import { buildDagLayout, NODE_HEIGHT_PX, type DagEdge, type DagLayout, type DagNode } from '@/lib/dag';
import { bottlenecks, layers } from '@/data';

const SEVERITY_FILL: Record<Severity, string> = {
  critical: '#FCEBEB',
  tight: '#FAEEDA',
  balanced: '#EAF3DE',
  monitoring: '#F1EFE8',
};

const SEVERITY_STROKE: Record<Severity, string> = {
  critical: '#E24B4A',
  tight: '#EF9F27',
  balanced: '#639922',
  monitoring: '#B4B2A9',
};

const SEVERITY_TEXT: Record<Severity, string> = {
  critical: '#791F1F',
  tight: '#633806',
  balanced: '#3B6D11',
  monitoring: '#5F5E5A',
};

function edgePath(e: DagEdge): string {
  const halfH = NODE_HEIGHT_PX / 2;
  const sx = e.fromX;
  const sy = e.fromY + halfH;
  const tx = e.toX;
  const ty = e.toY - halfH;
  const dy = ty - sy;
  const c1y = sy + dy * 0.4;
  const c2y = ty - dy * 0.4;
  return `M ${sx} ${sy} C ${sx} ${c1y}, ${tx} ${c2y}, ${tx} ${ty}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function Node({ node }: { node: DagNode }) {
  const halfW = node.width / 2;
  const halfH = NODE_HEIGHT_PX / 2;
  const supplier = node.topSupplier;
  return (
    <Link href={`/bottleneck/${node.slug}`}>
      <g className="cursor-pointer">
        <rect
          x={node.x - halfW}
          y={node.y - halfH}
          width={node.width}
          height={NODE_HEIGHT_PX}
          rx={8}
          fill={SEVERITY_FILL[node.severity]}
          stroke={SEVERITY_STROKE[node.severity]}
          strokeWidth={0.75}
          className="transition-opacity hover:opacity-80"
        />
        <circle
          cx={node.x - halfW + 14}
          cy={node.y - 9}
          r={3}
          fill={SEVERITY_STROKE[node.severity]}
        />
        <text
          x={node.x - halfW + 24}
          y={node.y - 5}
          fontSize={12}
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={600}
          fill={SEVERITY_TEXT[node.severity]}
        >
          {truncate(node.shortName, 26)}
        </text>
        {supplier ? (
          <text
            x={node.x - halfW + 24}
            y={node.y + 12}
            fontSize={11}
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight={400}
            fill={SEVERITY_TEXT[node.severity]}
            opacity={0.85}
          >
            <tspan fontWeight={500}>{truncate(supplier.name, 22)}</tspan>
            <tspan dx={4} fontFamily="ui-monospace, SFMono-Regular, monospace">
              {supplier.sharePct}%
            </tspan>
          </text>
        ) : (
          <text
            x={node.x - halfW + 24}
            y={node.y + 12}
            fontSize={11}
            fontFamily="Inter, system-ui, sans-serif"
            fill={SEVERITY_TEXT[node.severity]}
            opacity={0.7}
            fontStyle="italic"
          >
            diverse supply
          </text>
        )}
      </g>
    </Link>
  );
}

export function DagView() {
  const layout: DagLayout = buildDagLayout(bottlenecks, layers);

  return (
    <div className="overflow-x-auto rounded-lg border-[0.5px] border-neutral-200 bg-neutral-50/40">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        className="block"
      >
        {/* Layer rows + labels */}
        {layout.layers.map((layer, i) => {
          const rowY = 36 + i * layout.rowHeight;
          return (
            <g key={layer.id}>
              <line
                x1={layout.labelX + layout.labelWidth}
                x2={layout.width - 16}
                y1={rowY + layout.rowHeight}
                y2={rowY + layout.rowHeight}
                stroke="#E5E5E5"
                strokeWidth={0.5}
                strokeDasharray="2 4"
              />
              <text
                x={layout.labelX}
                y={rowY + layout.rowHeight / 2 - 4}
                fontSize={12}
                fontWeight={500}
                fontFamily="Inter, system-ui, sans-serif"
                fill="#171717"
              >
                {layer.name}
              </text>
              <text
                x={layout.labelX}
                y={rowY + layout.rowHeight / 2 + 12}
                fontSize={11}
                fontFamily="Inter, system-ui, sans-serif"
                fill="#737373"
              >
                Layer {layer.number} · {layer.subtitle.toLowerCase()}
              </text>
            </g>
          );
        })}

        {/* Edges */}
        <g fill="none">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#737373" />
            </marker>
          </defs>
          {layout.edges.map((e) => (
            <path
              key={`${e.from}->${e.to}`}
              d={edgePath(e)}
              stroke="#A3A3A3"
              strokeWidth={1}
              opacity={0.75}
              markerEnd="url(#arrow)"
            />
          ))}
        </g>

        {/* Nodes (drawn last so they sit above edges) */}
        <g>
          {layout.nodes.map((n) => (
            <Node key={n.slug} node={n} />
          ))}
        </g>
      </svg>
    </div>
  );
}
