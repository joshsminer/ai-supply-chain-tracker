import Link from 'next/link';
import { bottlenecks, layers } from '@/data';
import { severityDotClass, severityLabel } from '@/lib/severity';
import { cn } from '@/lib/utils';
import type { Bottleneck, Company, Layer } from '@/lib/types';

export const metadata = {
  title: 'Private builders · AI Supply Chain Tracker',
};

interface PrivateRow {
  company: Company;
  bottleneck: Bottleneck;
  layer: Layer | undefined;
}

function privateRows(): PrivateRow[] {
  const layerById = new Map(layers.map((l) => [l.id, l]));
  const out: PrivateRow[] = [];
  for (const b of bottlenecks) {
    for (const c of b.companies) {
      if (c.tier !== 'private') continue;
      out.push({ company: c, bottleneck: b, layer: layerById.get(b.layerId) });
    }
  }
  return out;
}

function groupByBottleneck(rows: PrivateRow[]) {
  const grouped = new Map<string, { bottleneck: Bottleneck; layer: Layer | undefined; rows: Company[] }>();
  for (const r of rows) {
    const entry = grouped.get(r.bottleneck.slug);
    if (entry) entry.rows.push(r.company);
    else
      grouped.set(r.bottleneck.slug, {
        bottleneck: r.bottleneck,
        layer: r.layer,
        rows: [r.company],
      });
  }
  // Sort groups by layer number desc (matches stack view ordering)
  return Array.from(grouped.values()).sort(
    (a, b) => (b.layer?.number ?? 0) - (a.layer?.number ?? 0)
  );
}

function CompanyCard({ company }: { company: Company }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border-[0.5px] border-neutral-200 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        {company.url ? (
          <a
            href={company.url}
            target="_blank"
            rel="noreferrer"
            className="text-caption font-medium text-neutral-900 underline-offset-2 hover:underline"
          >
            {company.name}
          </a>
        ) : (
          <span className="text-caption font-medium text-neutral-900">
            {company.name}
          </span>
        )}
        {company.stage ? (
          <span className="font-mono text-micro text-neutral-400">
            {company.stage}
          </span>
        ) : null}
      </div>
      <p className="text-micro leading-snug text-neutral-600">{company.note}</p>
      {company.funding ? (
        <div className="flex items-baseline justify-between gap-2 border-t-[0.5px] border-neutral-100 pt-1.5">
          <span className="text-micro text-neutral-500">{company.funding}</span>
        </div>
      ) : null}
      {company.investors ? (
        <span className="text-micro leading-snug text-neutral-400">
          Investors: {company.investors}
        </span>
      ) : null}
    </div>
  );
}

export default function PrivatePage() {
  const rows = privateRows();
  const groups = groupByBottleneck(rows);
  const totalCompanies = rows.length;
  const totalBottlenecks = groups.length;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-h1">Private builders</h1>
        <p className="max-w-[72ch] text-caption text-neutral-500">
          Who&rsquo;s pre-IPO across the AI supply chain, grouped by bottleneck.
          Funding stage and lead investors are noted where disclosed. Useful for
          understanding the competitive landscape one cycle ahead of the public
          markets — these are the names hyperscalers are evaluating now.
        </p>
        <p className="text-micro text-neutral-400">
          {totalCompanies} private companies across {totalBottlenecks} bottlenecks ·
          editorial · last updated by data/bottlenecks/*.json
        </p>
      </section>

      <div className="space-y-6">
        {groups.map(({ bottleneck, layer, rows }) => (
          <section key={bottleneck.slug} className="space-y-3">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-[0.5px] border-neutral-200 pb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-micro text-neutral-400">
                  Layer {layer?.number ?? '?'} · {layer?.name ?? bottleneck.layerId}
                </span>
                <Link
                  href={`/bottleneck/${bottleneck.slug}`}
                  className="text-h3 text-neutral-900 underline-offset-2 hover:underline"
                >
                  {bottleneck.name}
                </Link>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-micro text-neutral-500'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    severityDotClass[bottleneck.severity]
                  )}
                />
                {severityLabel[bottleneck.severity]} · {rows.length} private{' '}
                {rows.length === 1 ? 'builder' : 'builders'}
              </span>
            </header>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((c) => (
                <CompanyCard key={`${bottleneck.slug}-${c.name}`} company={c} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
