import type { Bottleneck, Layer } from '@/lib/types';
import { BottleneckChip } from './BottleneckChip';

interface LayerRowProps {
  layer: Layer;
  bottlenecks: Bottleneck[];
}

export function LayerRow({ layer, bottlenecks }: LayerRowProps) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-5 border-b-[0.5px] border-neutral-200 px-4 py-4 transition-colors hover:bg-neutral-50/60 last:border-b-0">
      <div className="flex flex-col leading-tight">
        <span className="text-micro font-mono uppercase tracking-wider text-neutral-400">
          L{layer.number} · {layer.subtitle.toLowerCase()}
        </span>
        <span className="text-h3 text-neutral-900">{layer.name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {bottlenecks.length > 0 ? (
          bottlenecks.map((b) => <BottleneckChip key={b.slug} bottleneck={b} />)
        ) : (
          <span className="text-caption text-neutral-400">—</span>
        )}
      </div>
    </div>
  );
}
