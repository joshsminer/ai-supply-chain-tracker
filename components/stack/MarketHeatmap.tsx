import Link from 'next/link';
import {
  buildHeatmap,
  heatmapFill,
  heatmapText,
  type HeatmapCell,
  type HeatmapGroup,
  type HeatmapLayout,
} from '@/lib/heatmap';
import { formatCompactNumber, formatRelativeTime } from '@/lib/utils';
import { liveDataSummary } from '@/lib/refreshed';
import { displayTicker, yahooFinanceUrl, YFINANCE_HOME } from '@/lib/external-links';

const W = 1200;
const H = 640;

function formatPct(p: number | null): string {
  if (p == null) return '—';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(1)}%`;
}

function Cell({ cell }: { cell: HeatmapCell }) {
  const fill = heatmapFill(cell.ltmPct);
  const fg = heatmapText(cell.ltmPct);
  const showTicker = cell.width > 28 && cell.height > 18;
  const showPct = cell.width > 50 && cell.height > 34;
  const tickerFs = cell.width > 100 && cell.height > 60 ? 16 : cell.width > 60 && cell.height > 32 ? 13 : 10;
  return (
    <Link
      href={yahooFinanceUrl(cell.ticker)}
      target="_blank"
      rel="noreferrer"
      title={`${cell.name} (${cell.ticker}) · mcap $${formatCompactNumber(cell.marketCapUsd)} · LTM ${formatPct(cell.ltmPct)} · ${cell.bottleneckName}`}
    >
      <g className="cursor-pointer">
        <rect
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
          fill={fill}
          stroke="white"
          strokeWidth={1}
          className="transition-opacity hover:opacity-90"
        />
        {showTicker ? (
          <text
            x={cell.x + cell.width / 2}
            y={cell.y + cell.height / 2 - (showPct ? 3 : -4)}
            textAnchor="middle"
            fontSize={tickerFs}
            fontWeight={600}
            fontFamily="Inter, system-ui, sans-serif"
            fill={fg}
          >
            {displayTicker(cell.ticker)}
          </text>
        ) : null}
        {showPct ? (
          <text
            x={cell.x + cell.width / 2}
            y={cell.y + cell.height / 2 + tickerFs - 2}
            textAnchor="middle"
            fontSize={Math.max(10, tickerFs - 3)}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill={fg}
          >
            {formatPct(cell.ltmPct)}
          </text>
        ) : null}
      </g>
    </Link>
  );
}

function GroupOutline({ group }: { group: HeatmapGroup }) {
  const showLabel = group.width > 90;
  return (
    <g>
      <rect
        x={group.x}
        y={group.y}
        width={group.width}
        height={group.height}
        fill="none"
        stroke="#171717"
        strokeWidth={0.5}
      />
      {showLabel ? (
        <text
          x={group.x + 8}
          y={group.y + 14}
          fontSize={11}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
          fill="#171717"
          className="pointer-events-none"
        >
          {group.bottleneckName.length > Math.floor(group.width / 7)
            ? group.bottleneckName.slice(0, Math.floor(group.width / 7) - 1) + '…'
            : group.bottleneckName}
        </text>
      ) : null}
    </g>
  );
}

function ColorLegend() {
  // Show diverging color scale stops with anchor percent labels.
  const stops = [-100, -50, -10, 0, 10, 50, 100];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-micro text-neutral-500">
      <span className="font-medium uppercase tracking-wider text-neutral-400">
        LTM
      </span>
      {stops.map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span
            aria-hidden
            className="h-2.5 w-3.5 rounded-sm"
            style={{ background: heatmapFill(s) }}
          />
          {s > 0 ? '+' : ''}
          {s}%
        </span>
      ))}
      <span className="ml-2 flex items-center gap-1">
        <span
          aria-hidden
          className="h-2.5 w-3.5 rounded-sm"
          style={{ background: heatmapFill(null) }}
        />
        n/a
      </span>
    </div>
  );
}

export function MarketHeatmap() {
  const layout: HeatmapLayout = buildHeatmap(W, H);
  const live = liveDataSummary();
  if (layout.cells.length === 0) return null;

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-h3">Live market heatmap</h2>
            <span className="text-micro text-neutral-500">
              size = √(market cap USD) · color = LTM total return · each
              ticker attributed to its primary bottleneck
            </span>
          </div>
          <p className="text-micro text-neutral-400">
            {layout.cells.length} tickers across {layout.groups.length} bottlenecks
            · refreshed {formatRelativeTime(live.latestFetchAt)} ·{' '}
            <a
              href={YFINANCE_HOME}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:text-neutral-900 hover:underline"
            >
              source: Yahoo Finance
            </a>
          </p>
        </div>
        <ColorLegend />
      </header>
      <div className="overflow-x-auto rounded-lg border-[0.5px] border-neutral-200 bg-white p-2">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          className="block"
        >
          <g>
            {layout.cells.map((c) => (
              <Cell key={c.ticker} cell={c} />
            ))}
          </g>
          <g>
            {layout.groups.map((g) => (
              <GroupOutline key={g.bottleneckSlug} group={g} />
            ))}
          </g>
        </svg>
      </div>
    </section>
  );
}
