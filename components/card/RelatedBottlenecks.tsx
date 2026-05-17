import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { bottlenecksBySlug } from '@/data';
import { severityDotClass, severityLabel } from '@/lib/severity';
import { cn } from '@/lib/utils';

interface RelatedBottlenecksProps {
  upstreamSlugs?: string[];
  downstreamSlugs?: string[];
}

function RelatedColumn({
  title,
  Icon,
  slugs,
  emptyHint,
}: {
  title: string;
  Icon: typeof ArrowUpRight;
  slugs: string[];
  emptyHint: string;
}) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-micro font-medium uppercase tracking-wider text-neutral-500">
        <Icon aria-hidden className="h-3 w-3" />
        {title}
      </h4>
      {slugs.length === 0 ? (
        <p className="text-caption text-neutral-400">{emptyHint}</p>
      ) : (
        <ul className="space-y-1">
          {slugs.map((slug) => {
            const b = bottlenecksBySlug[slug];
            if (!b) {
              return (
                <li key={slug} className="text-caption text-neutral-400">
                  <span className="font-mono">{slug}</span>{' '}
                  <span className="text-micro">(not yet tracked)</span>
                </li>
              );
            }
            return (
              <li key={slug}>
                <Link
                  href={`/bottleneck/${b.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-neutral-200 bg-white px-2.5 py-1 text-caption text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                  title={`${b.name} · ${severityLabel[b.severity]}`}
                >
                  <span
                    aria-hidden
                    className={cn('h-1.5 w-1.5 rounded-full', severityDotClass[b.severity])}
                  />
                  {b.shortName}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function RelatedBottlenecks({
  upstreamSlugs = [],
  downstreamSlugs = [],
}: RelatedBottlenecksProps) {
  if (upstreamSlugs.length === 0 && downstreamSlugs.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Related bottlenecks
      </h3>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RelatedColumn
          title="Upstream"
          Icon={ArrowUpRight}
          slugs={upstreamSlugs}
          emptyHint="None tracked yet."
        />
        <RelatedColumn
          title="Downstream"
          Icon={ArrowDownRight}
          slugs={downstreamSlugs}
          emptyHint="None tracked yet."
        />
      </div>
    </section>
  );
}
