import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bottlenecks, getBottleneck, layers } from '@/data';
import { BottleneckHeader } from '@/components/card/BottleneckHeader';
import { MetricGrid } from '@/components/card/MetricGrid';
import { StackPosition } from '@/components/card/StackPosition';
import { SupplyStructure } from '@/components/card/SupplyStructure';
import { SupplyDemandGap } from '@/components/card/SupplyDemandGap';
import { LeadingIndicators } from '@/components/card/LeadingIndicators';
import { InvestmentLandscape } from '@/components/card/InvestmentLandscape';
import { InsightPanel } from '@/components/card/InsightPanel';
import { DebatesPanel } from '@/components/card/DebatesPanel';
import { FilingFootnote } from '@/components/card/FilingFootnote';
import { KoreaTradePanel } from '@/components/card/KoreaTradePanel';
import { RecentDisclosures } from '@/components/card/RecentDisclosures';
import { RelatedBottlenecks } from '@/components/card/RelatedBottlenecks';
import { SourcesSection } from '@/components/card/SourcesSection';
import { getExtract, getKoreaTrade } from '@/lib/refreshed';

export function generateStaticParams() {
  return bottlenecks.map((b) => ({ slug: b.slug }));
}

function Divider() {
  return <hr className="border-0 border-t-[0.5px] border-neutral-200" />;
}

export default function BottleneckPage({ params }: { params: { slug: string } }) {
  const bottleneck = getBottleneck(params.slug);
  if (!bottleneck) notFound();

  const layer = layers.find((l) => l.id === bottleneck.layerId);

  const showKoreaTrade =
    bottleneck.slug === 'hbm-memory' && getKoreaTrade() != null;
  const tickersForCard = new Set<string>();
  for (const s of bottleneck.supplyStructure) {
    if (s.ticker) tickersForCard.add(s.ticker);
  }
  for (const c of bottleneck.companies) {
    if (c.ticker) tickersForCard.add(c.ticker);
  }
  const hasExtracts = Array.from(tickersForCard).some((t) => getExtract(t) != null);

  return (
    <article className="space-y-5">
      <nav className="text-caption text-neutral-500">
        <Link href="/" className="hover:text-neutral-900 hover:underline">
          Stack
        </Link>
        <span className="px-1.5">›</span>
        {layer ? (
          <Link
            href={`/?layer=${layer.id}`}
            className="hover:text-neutral-900 hover:underline"
          >
            {layer.name}
          </Link>
        ) : (
          <span>{bottleneck.layerId}</span>
        )}
        <span className="px-1.5">›</span>
        <span className="text-neutral-900">{bottleneck.name}</span>
      </nav>

      <BottleneckHeader bottleneck={bottleneck} />

      <Divider />
      <MetricGrid metrics={bottleneck.metrics} />

      <Divider />
      <StackPosition markdown={bottleneck.stackPosition} />

      <Divider />
      <SupplyStructure suppliers={bottleneck.supplyStructure} />

      <Divider />
      <SupplyDemandGap rows={bottleneck.supplyDemand} />

      <Divider />
      <LeadingIndicators indicators={bottleneck.indicators} />

      <Divider />
      <InvestmentLandscape companies={bottleneck.companies} />

      <Divider />
      <FilingFootnote slug={bottleneck.slug} />

      {showKoreaTrade ? (
        <>
          <Divider />
          <KoreaTradePanel />
        </>
      ) : null}

      {hasExtracts ? (
        <>
          <Divider />
          <RecentDisclosures slug={bottleneck.slug} />
        </>
      ) : null}

      <Divider />
      <InsightPanel markdown={bottleneck.insight} />

      {bottleneck.debates && bottleneck.debates.length > 0 ? (
        <>
          <Divider />
          <DebatesPanel slug={bottleneck.slug} debates={bottleneck.debates} />
        </>
      ) : null}

      {(bottleneck.upstreamSlugs?.length ?? 0) +
        (bottleneck.downstreamSlugs?.length ?? 0) >
      0 ? (
        <>
          <Divider />
          <RelatedBottlenecks
            upstreamSlugs={bottleneck.upstreamSlugs}
            downstreamSlugs={bottleneck.downstreamSlugs}
          />
        </>
      ) : null}

      <Divider />
      <SourcesSection bottleneck={bottleneck} />
    </article>
  );
}
