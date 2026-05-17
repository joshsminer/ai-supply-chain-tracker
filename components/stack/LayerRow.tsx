import type { Bottleneck, Layer } from '@/lib/types';
import { BottleneckChip } from './BottleneckChip';

interface LayerRowProps {
  layer: Layer;
  bottlenecks: Bottleneck[];
  totalCount: number;
}

export function LayerRow({ layer, bottlenecks, totalCount }: LayerRowProps) {
  return (
    <div className="grid grid-cols-[170px_1fr_70px] items-start gap-4 border-b-[0.5px] border-neutral-200 px-1 py-4 last:border-b-0">
      <div className="flex flex-col leading-tight">
        <span className="text-h3 text-neutral-900">{layer.name}</span>
        <span className="text-micro text-neutral-500">
          Layer {layer.number} · {layer.subtitle.toLowerCase()}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {bottlenecks.length > 0 ? (
          bottlenecks.map((b) => <BottleneckChip key={b.slug} bottleneck={b} />)
        ) : (
          <span className="text-caption text-neutral-400">—</span>
        )}
      </div>
      <div className="text-right text-micro tabular-nums text-neutral-500">
        {bottlenecks.length}
        {totalCount !== bottlenecks.length ? (
          <span className="text-neutral-400"> / {totalCount}</span>
        ) : null}
      </div>
    </div>
  );
}
