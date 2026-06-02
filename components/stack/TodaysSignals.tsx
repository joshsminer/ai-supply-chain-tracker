import Link from 'next/link';
import { ArrowDown, ArrowUp, FileText, TrendingUp } from 'lucide-react';
import { bottlenecks } from '@/data';
import { dashboardStats } from '@/lib/dashboardStats';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { displayTicker } from '@/lib/external-links';

function tickerToBottleneck(): Map<string, { slug: string; name: string }> {
  const m = new Map<string, { slug: string; name: string }>();
  for (const b of bottlenecks) {
    for (const s of b.supplyStructure) {
      if (s.ticker && !m.has(s.ticker)) m.set(s.ticker, { slug: b.slug, name: b.name });
    }
    for (const c of b.companies) {
      if (c.ticker && !m.has(c.ticker)) m.set(c.ticker, { slug: b.slug, name: b.name });
    }
  }
  return m;
}

function Signal({
  icon,
  label,
  href,
  children,
  rightSlot,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md border-[0.5px] border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-700 group-hover:bg-white"
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-micro font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        <span className="truncate text-caption text-neutral-900">{children}</span>
      </div>
      {rightSlot ? (
        <span className="shrink-0 text-caption tabular-nums">{rightSlot}</span>
      ) : null}
    </Link>
  );
}

export function TodaysSignals() {
  const s = dashboardStats();
  const lookup = tickerToBottleneck();

  const slots: React.ReactNode[] = [];

  if (s.topDayGainer) {
    const ref = lookup.get(s.topDayGainer.ticker);
    const name = s.topDayGainer.name ?? s.topDayGainer.ticker;
    slots.push(
      <Signal
        key="gainer"
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        label="Top gainer today"
        href={ref ? `/bottleneck/${ref.slug}` : '/alerts'}
        rightSlot={
          <span className="text-severity-balanced-fg">
            +{s.topDayGainer.dayChangePct.toFixed(2)}%
          </span>
        }
      >
        <span className="font-medium">{displayTicker(s.topDayGainer.ticker)}</span>{' '}
        <span className="text-neutral-500">· {name}</span>
      </Signal>
    );
  }

  if (s.topDayLoser) {
    const ref = lookup.get(s.topDayLoser.ticker);
    const name = s.topDayLoser.name ?? s.topDayLoser.ticker;
    slots.push(
      <Signal
        key="loser"
        icon={<ArrowDown className="h-3.5 w-3.5" />}
        label="Top loser today"
        href={ref ? `/bottleneck/${ref.slug}` : '/alerts'}
        rightSlot={
          <span className="text-severity-critical-fg">
            {s.topDayLoser.dayChangePct.toFixed(2)}%
          </span>
        }
      >
        <span className="font-medium">{displayTicker(s.topDayLoser.ticker)}</span>{' '}
        <span className="text-neutral-500">· {name}</span>
      </Signal>
    );
  }

  if (s.latestFiling) {
    const ref = lookup.get(s.latestFiling.ticker);
    slots.push(
      <Signal
        key="filing"
        icon={<FileText className="h-3.5 w-3.5" />}
        label="Latest filing"
        href={ref ? `/bottleneck/${ref.slug}` : '/alerts'}
        rightSlot={
          <span className="text-neutral-500">
            {formatDate(s.latestFiling.filedAt)}
          </span>
        }
      >
        <span className="font-medium">{s.latestFiling.ticker}</span>{' '}
        <span className="text-neutral-500">
          · {s.latestFiling.form} · {s.latestFiling.entityName ?? ''}
        </span>
      </Signal>
    );
  }

  if (s.latestPriorMove) {
    const delta = s.latestPriorMove.delta;
    const sign = delta >= 0 ? '+' : '';
    const colorClass =
      delta >= 0 ? 'text-severity-balanced-fg' : 'text-severity-critical-fg';
    const b = bottlenecks.find((x) => x.slug === s.latestPriorMove?.slug);
    slots.push(
      <Signal
        key="prior"
        icon={<ArrowUp className="h-3.5 w-3.5" />}
        label="Latest prior update"
        href={s.latestPriorMove.slug ? `/bottleneck/${s.latestPriorMove.slug}` : '/alerts'}
        rightSlot={
          <span className={cn('font-medium', colorClass)}>
            {sign}
            {(delta * 100).toFixed(0)}pp
          </span>
        }
      >
        <span className="font-medium">{b?.shortName ?? s.latestPriorMove.slug}</span>{' '}
        <span className="text-neutral-500">
          · updated {formatRelativeTime(s.latestPriorMove.current.snapshotAt)}
        </span>
      </Signal>
    );
  }

  if (slots.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
      {slots}
    </section>
  );
}
