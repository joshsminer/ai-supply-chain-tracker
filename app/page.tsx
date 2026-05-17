import { bottlenecks, layers } from '@/data';
import { FilterBar } from '@/components/stack/FilterBar';
import { LivePricePanel } from '@/components/stack/LivePricePanel';
import { SeverityLegend } from '@/components/stack/SeverityLegend';
import { StackView } from '@/components/stack/StackView';
import { parseFilters } from '@/lib/filters';

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default function StackViewPage({ searchParams }: PageProps) {
  const filters = parseFilters(searchParams);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-2">
        <h1 className="text-h1">Stack view</h1>
        <p className="text-caption text-neutral-500">
          {layers.length} layers · {bottlenecks.length} bottlenecks tracked
        </p>
      </section>
      <FilterBar />
      <SeverityLegend />
      <StackView filters={filters} />
      <LivePricePanel />
    </div>
  );
}
