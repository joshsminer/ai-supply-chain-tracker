import { FilterBar } from '@/components/stack/FilterBar';
import { MarketHeatmap } from '@/components/stack/MarketHeatmap';
import { SeverityLegend } from '@/components/stack/SeverityLegend';
import { StackView } from '@/components/stack/StackView';
import { StatsOverview } from '@/components/stack/StatsOverview';
import { TodaysSignals } from '@/components/stack/TodaysSignals';
import { ForecastTeaser } from '@/components/forecast/ForecastTeaser';
import { parseFilters } from '@/lib/filters';

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default function StackViewPage({ searchParams }: PageProps) {
  const filters = parseFilters(searchParams);

  return (
    <div className="space-y-7">
      <section className="space-y-1">
        <h1 className="text-h1">AI supply chain dashboard</h1>
        <p className="text-caption text-neutral-500">
          Live tracking of bottlenecks across the bottom three layers of the AI cake
          — compute, datacenter, and energy/site.
        </p>
      </section>

      <StatsOverview />

      <ForecastTeaser />

      <section className="space-y-2">
        <h2 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          Today&rsquo;s signals
        </h2>
        <TodaysSignals />
      </section>

      <section className="space-y-3">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-h3">Stack view</h2>
          <SeverityLegend />
        </header>
        <FilterBar />
        <StackView filters={filters} />
      </section>

      <MarketHeatmap />
    </div>
  );
}
