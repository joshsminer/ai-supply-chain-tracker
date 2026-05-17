import { bottlenecks } from '@/data';
import { buildDagLayout } from '@/lib/dag';
import { layers } from '@/data';
import { DagView } from '@/components/dag/DagView';
import { CriticalCompaniesPanel } from '@/components/dag/CriticalCompaniesPanel';
import { SeverityLegend } from '@/components/stack/SeverityLegend';

export const metadata = {
  title: 'Cross-layer DAG · AI Supply Chain Tracker',
};

export default function DagPage() {
  const layout = buildDagLayout(bottlenecks, layers);
  const ghostBySource = new Map<string, string[]>();
  for (const g of layout.ghostEdges) {
    const arr = ghostBySource.get(g.fromSlug) ?? [];
    arr.push(g.toLabel);
    ghostBySource.set(g.fromSlug, arr);
  }
  const orderedGhosts = Array.from(ghostBySource.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-2">
        <h1 className="text-h1">Cross-layer DAG</h1>
        <p className="max-w-[72ch] text-caption text-neutral-500">
          How tracked bottlenecks gate one another. Edges follow the
          upstream/downstream relationships declared in each bottleneck&rsquo;s
          JSON. Layer rows match the stack-view ordering (Layer 12 at top, Layer
          1 at bottom). Click any node to drill in.
        </p>
      </section>
      <SeverityLegend />
      <DagView />
      <CriticalCompaniesPanel />
      {orderedGhosts.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
            References to untracked bottlenecks
          </h3>
          <p className="max-w-[72ch] text-caption text-neutral-500">
            These slugs are referenced from existing bottlenecks but are not yet
            written. Add them as JSON files in <code>data/bottlenecks/</code>
            {' '}to surface in the DAG.
          </p>
          <ul className="space-y-1 text-caption">
            {orderedGhosts.map(([from, targets]) => (
              <li key={from} className="text-neutral-600">
                <span className="font-mono text-neutral-500">{from}</span>{' '}
                references{' '}
                {targets.map((t, i) => (
                  <span key={t}>
                    <span className="font-mono text-neutral-400">{t}</span>
                    {i < targets.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
