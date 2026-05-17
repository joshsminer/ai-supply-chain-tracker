import { getKoreaTrade, type KoreaPeriodRow } from '@/lib/refreshed';
import { Sparkline } from './Sparkline';
import { formatRelativeTime } from '@/lib/utils';
import { comtradeHsUrl } from '@/lib/external-links';

function formatPeriod(yyyymm: string): string {
  if (yyyymm.length !== 6) return yyyymm;
  const year = yyyymm.slice(0, 4);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  const m = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][month - 1];
  return `${m} ${year}`;
}

function rowToPricePoints(rows: KoreaPeriodRow[]) {
  return rows
    .filter((r): r is KoreaPeriodRow & { totalUsd: number } => r.totalUsd != null)
    .map((r) => ({
      ticker: 'KR-MEM',
      date: `${r.period.slice(0, 4)}-${r.period.slice(4, 6)}-01`,
      close: r.totalUsd / 1e9,
    }));
}

export function KoreaTradePanel() {
  const data = getKoreaTrade();
  if (!data || data.byPeriod.length === 0) return null;

  const recent = data.byPeriod.slice(-6); // last 6 months
  const latest = recent[recent.length - 1];
  const series = rowToPricePoints(data.byPeriod);

  // Aggregate latest by partner; show top 6.
  const partners = (latest.byPartner ?? [])
    .filter((p) => p.valueUsd != null)
    .slice(0, 6);

  return (
    <section className="space-y-2.5">
      <h3 className="text-micro font-medium uppercase tracking-wider text-neutral-500">
        Korea memory IC exports · UN Comtrade
      </h3>
      <div className="rounded-md border-[0.5px] border-neutral-200 px-4 py-3">
        <div className="flex items-end justify-between gap-3 border-b-[0.5px] border-neutral-200 pb-2.5">
          <div className="flex flex-col leading-tight">
            <span className="text-micro text-neutral-500">
              {formatPeriod(latest.period)} · total
            </span>
            <span className="text-h2 tabular-nums text-neutral-900">
              ${((latest.totalUsd ?? 0) / 1e9).toFixed(2)}B
            </span>
            <span className="text-micro text-neutral-400">
              HS 854232 · refreshed {formatRelativeTime(data.fetchedAt)}
            </span>
          </div>
          <Sparkline series={series} width={120} height={28} />
        </div>
        <div className="grid grid-cols-1 gap-1.5 pt-2.5 md:grid-cols-2">
          {partners.map((p) => {
            const pct =
              p.valueUsd != null && latest.totalUsd
                ? (p.valueUsd / latest.totalUsd) * 100
                : 0;
            return (
              <div
                key={p.partnerCode}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-caption text-neutral-700">
                  {p.partner}
                </span>
                <span className="text-caption tabular-nums text-neutral-500">
                  ${(p.valueUsd! / 1e9).toFixed(2)}B
                  <span className="ml-1.5 text-micro text-neutral-400">
                    {pct.toFixed(0)}%
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-micro text-neutral-400">
        Source:{' '}
        <a
          href={comtradeHsUrl(data.hsCode)}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:text-neutral-900 hover:underline"
        >
          {data.source}
        </a>
        . Monthly Korean exports of electronic ICs - memories (HS {data.hsCode}).
        Note: aggregates DRAM + NAND + HBM; not separable at HS-6.
      </p>
    </section>
  );
}
