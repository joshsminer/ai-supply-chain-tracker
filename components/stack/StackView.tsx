import { bottlenecks, layers } from '@/data';
import { severityOrder } from '@/lib/severity';
import { matchesFilters, type Filters } from '@/lib/filters';
import { LayerRow } from './LayerRow';

interface StackViewProps {
  filters: Filters;
}

export function StackView({ filters }: StackViewProps) {
  const orderedLayers = [...layers].sort((a, b) => b.number - a.number);
  const totalMatching = bottlenecks.filter((b) => matchesFilters(b, filters)).length;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border-[0.5px] border-neutral-200">
        {orderedLayers.map((layer) => {
          const all = bottlenecks.filter((b) => b.layerId === layer.id);
          const filtered = all
            .filter((b) => matchesFilters(b, filters))
            .sort(
              (a, b) =>
                severityOrder[a.severity] - severityOrder[b.severity] ||
                a.shortName.localeCompare(b.shortName)
            );
          return (
            <LayerRow
              key={layer.id}
              layer={layer}
              bottlenecks={filtered}
              totalCount={all.length}
            />
          );
        })}
      </div>
      {totalMatching === 0 ? (
        <p className="px-1 text-caption text-neutral-500">
          No bottlenecks match the current filters. Try clearing one or two
          above.
        </p>
      ) : null}
    </div>
  );
}
