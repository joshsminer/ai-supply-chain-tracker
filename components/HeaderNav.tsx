'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Stack', match: (p: string) => p === '/' },
  { href: '/dag', label: 'DAG', match: (p: string) => p.startsWith('/dag') },
  {
    href: '/alerts',
    label: 'Alerts',
    match: (p: string) => p.startsWith('/alerts'),
  },
];

export function HeaderNav() {
  const pathname = usePathname() || '/';
  return (
    <nav className="flex items-center gap-1 text-caption">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-2 py-1 transition-colors',
              active
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
