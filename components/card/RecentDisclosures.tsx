import { bottlenecks } from '@/data';
import { getExtract, type ExtractFinding, type ExtractSnapshot } from '@/lib/refreshed';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';

const CATEGORY_LABEL: Record<string, string> = {
  segmentRevenue: 'Segment revenue',
  capacity: 'Capacity',
  leadTime: 'Lead time',
  qualification: 'Qualification',
  pricing: 'Pricing',
  supplyConstraint: 'Supply constraint',
  demandSignal: 'Demand signal',
  competitiveContext: 'Competitive',
};

const CATEGORY_COLOR: Record<string, string> = {
  segmentRevenue: 'text-emerald-700 bg-emerald-50',
  capacity: 'text-violet-700 bg-violet-50',
  leadTime: 'text-amber-700 bg-amber-50',
  qualification: 'text-sky-700 bg-sky-50',
  pricing: 'text-rose-700 bg-rose-50',
  supplyConstraint: 'text-amber-700 bg-amber-50',
  demandSignal: 'text-emerald-700 bg-emerald-50',
  competitiveContext: 'text-neutral-700 bg-neutral-100',
};

function tickersFor(slug: string): string[] {
  const b = bottlenecks.find((x) => x.slug === slug);
  if (!b) return [];
  const seen = new Set<string>();
  for (const s of b.supplyStructure) if (s.ticker) seen.add(s.ticker);
  for (const c of b.companies) if (c.ticker) seen.add(c.ticker);
  return Array.from(seen);
}

function FindingRow({ finding }: { finding: ExtractFinding }) {
  const label = CATEGORY_LABEL[finding.category] ?? finding.category;
  const colorClass =
    CATEGORY_COLOR[finding.category] ?? 'text-neutral-700 bg-neutral-100';
  return (
    <li className="space-y-1 border-b-[0.5px] border-neutral-200 py-2 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-micro font-medium uppercase tracking-wider',
            colorClass
          )}
        >
          {label}
        </span>
        <p className="text-caption font-medium leading-snug text-neutral-900">
          {finding.claim}
        </p>
      </div>
      <blockquote className="border-l-2 border-neutral-200 pl-2 text-micro italic leading-snug text-neutral-500">
        &ldquo;{finding.sourceQuote}&rdquo;
      </blockquote>
      {finding.topicTags && finding.topicTags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {finding.topicTags.map((t) => (
            <span
              key={t}
              className="rounded bg-neutral-50 px-1.5 py-0.5 font-mono text-micro text-neutral-500"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function TickerCard({ extract }: { extract: ExtractSnapshot }) {
  return (
    <div className="space-y-2 rounded-md border-[0.5px] border-neutral-200 px-3 py-2.5">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-[0.5px] border-neutral-200 pb-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-caption text-neutral-500">
            {extract.ticker}
          </span>
          <a
            href={extract.filing.url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="text-caption font-medium text-neutral-900 underline-offset-2 hover:underline"
          >
            {extract.filing.form}
          </a>
          <span className="text-micro text-neutral-500">
            filed {formatDate(extract.filing.filedAt)}
          </span>
        </div>
        <span className="text-micro text-neutral-400">
          extracted {formatRelativeTime(extract.fetchedAt)}
        </span>
      </header>
      {extract.summary ? (
        <p className="text-caption leading-snug text-neutral-700">
          {extract.summary}
        </p>
      ) : null}
      {extract.findings.length > 0 ? (
        <ul className="space-y-0">
          {extract.findings.map((f, i) => (
            <FindingRow key={`${f.category}-${i}`} finding={f} />
          ))}
        </ul>
      ) : (
        <p className="text-micro text-neutral-400">
          No material findings flagged.
        </p>
      )}
    </div>
  );
}

export function RecentDisclosures({ slug }: { slug: string }) {
  const tickers = tickersFor(slug);
  const extracts = tickers
    .map((t) => getExtract(t))
    .filter((e): e is ExtractSnapshot => e != null);
  if (extracts.length === 0) return null;
  return (
    <section className="space-y-2.5">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Recent disclosures · auto-extracted
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {extracts.map((e) => (
          <TickerCard key={e.ticker} extract={e} />
        ))}
      </div>
      <p className="text-micro text-neutral-400">
        Findings extracted by Claude from SEC filings via tool-use. Source
        quotes preserved verbatim for audit.
      </p>
    </section>
  );
}
