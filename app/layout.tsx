import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { lastRefreshed } from '@/data';
import { liveDataSummary } from '@/lib/refreshed';
import { formatDate, formatRelativeTime } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Supply Chain Tracker · Maverick Silicon',
  description: 'Internal research tool for tracking critical bottlenecks across the AI hardware supply chain.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const refreshed = lastRefreshed();
  const live = liveDataSummary();
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <header className="border-b-[0.5px] border-neutral-200">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-8 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center bg-black text-[14px] font-medium text-white"
              >
                M
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-h3">AI Supply Chain Tracker</span>
                <span className="text-micro text-neutral-500">
                  Maverick Silicon · Internal research
                </span>
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-4 text-caption text-neutral-500">
              <Link
                href="/"
                className="hover:text-neutral-900 hover:underline"
              >
                Stack
              </Link>
              <Link
                href="/dag"
                className="hover:text-neutral-900 hover:underline"
              >
                DAG
              </Link>
              <Link
                href="/private"
                className="hover:text-neutral-900 hover:underline"
              >
                Private
              </Link>
              <Link
                href="/alerts"
                className="hover:text-neutral-900 hover:underline"
              >
                Alerts
              </Link>
            </nav>
            <div className="flex flex-col items-end gap-0.5 leading-tight">
              {refreshed ? (
                <span className="text-micro text-neutral-500">
                  Editorial · {formatDate(refreshed)}
                </span>
              ) : null}
              {live.latestFetchAt ? (
                <Link
                  href="/alerts"
                  className="flex items-center gap-1.5 text-micro text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
                  title="View alerts and source links"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-severity-balanced"
                  />
                  Live · {live.marketTickerCount} tickers ·{' '}
                  {formatRelativeTime(live.latestFetchAt)}
                </Link>
              ) : (
                <span className="text-micro text-neutral-400">
                  No live data — run python tools/refresh_market_data.py
                </span>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1200px] px-8 py-8">{children}</main>
      </body>
    </html>
  );
}
