import { bottlenecks, layers } from '@/data';
import { severityOrder } from '@/lib/severity';
import { matchesFilters, hasAnyFilter, type Filters } from '@/lib/filters';
import { LayerRow } from './LayerRow';

interface StackViewProps {
  filters: Filters;
}

export function StackView({ filters }: StackViewProps) {
  const orderedLayers = [...layers].sort((a, b) => b.number - a.number);
  const totalMatching = bottlenecks.filter((b) => matchesFilters(b, filters)).length;
  const filterActive = hasAnyFilter(filters);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <p className="text-caption text-neutral-500">
          Showing <span className="font-medium text-neutral-900">{totalMatching}</span> of{' '}
          <span className="font-medium text-neutral-900">{bottlenecks.length}</span>{' '}
          bottlenecks
          {filterActive ? ' · filter active' : ''}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border-[0.5px] border-neutral-200 bg-white">
        {orderedLayers.map((layer) => {
          const filtered = bottlenecks
            .filter((b) => b.layerId === layer.id)
            .filter((b) => matchesFilters(b, filters))
            .sort(
              (a, b) =>
                severityOrder[a.severity] - severityOrder[b.severity] ||
                a.shortName.localeCompare(b.shortName)
            );
          return (
            <LayerRow key={layer.id} layer={layer} bottlenecks={filtered} />
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
