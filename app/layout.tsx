import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { lastRefreshed } from '@/data';
import { liveDataSummary } from '@/lib/refreshed';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { HeaderNav } from '@/components/HeaderNav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Supply Chain Tracker',
  description:
    'Internal research tool for tracking critical bottlenecks across the AI hardware supply chain.',
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
        <header className="sticky top-0 z-30 border-b-[0.5px] border-neutral-200 bg-white/85 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1240px] items-center gap-6 px-8 py-3.5">
            <Link
              href="/"
              className="group flex items-center gap-3"
              aria-label="Home"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-sm bg-neutral-900 text-[13px] font-medium text-white transition-colors group-hover:bg-black"
              >
                M
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-h3 text-neutral-900">
                  AI Supply Chain Tracker
                </span>
                <span className="text-micro text-neutral-500">
                  Internal research
                </span>
              </span>
            </Link>
            <div className="ml-4 hidden md:block">
              <HeaderNav />
            </div>
            <div className="ml-auto flex flex-col items-end gap-0.5 leading-tight">
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
                  No live data — run tools/refresh_market_data.py
                </span>
              )}
            </div>
          </div>
          <div className="border-t-[0.5px] border-neutral-200 px-8 py-2 md:hidden">
            <div className="mx-auto max-w-[1240px]">
              <HeaderNav />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1240px] px-8 py-8">{children}</main>
      </body>
    </html>
  );
}
