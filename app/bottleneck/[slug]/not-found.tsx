import Link from 'next/link';
import { bottlenecks } from '@/data';

export default function BottleneckNotFound() {
  return (
    <div className="space-y-5">
      <nav className="text-caption text-neutral-500">
        <Link href="/" className="hover:text-neutral-900 hover:underline">
          Stack
        </Link>
        <span className="px-1.5">›</span>
        <span className="text-neutral-900">Not found</span>
      </nav>
      <section className="space-y-1.5">
        <h1 className="text-h1">Bottleneck not tracked</h1>
        <p className="max-w-[60ch] text-body text-neutral-600">
          No bottleneck matches that slug. It may be planned but not yet
          written, or you may have followed a stale link.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          Currently tracked
        </h3>
        <ul className="space-y-1 text-caption">
          {bottlenecks.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/bottleneck/${b.slug}`}
                className="text-neutral-900 underline-offset-2 hover:underline"
              >
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
