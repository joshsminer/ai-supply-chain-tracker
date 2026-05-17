'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { layers } from '@/data';
import { cn } from '@/lib/utils';
import { activeFilterCount, hasAnyFilter, parseFilters } from '@/lib/filters';
import type { Severity } from '@/lib/types';

type ToggleKind =
  | { kind: 'severity'; value: Severity }
  | { kind: 'boolean'; param: 'singleSource' | 'leadTime' }
  | { kind: 'reset' };

interface FilterDef {
  label: string;
  toggle: ToggleKind;
}

const FILTERS: FilterDef[] = [
  { label: 'All layers', toggle: { kind: 'reset' } },
  { label: 'Critical only', toggle: { kind: 'severity', value: 'critical' } },
  { label: 'Single-source', toggle: { kind: 'boolean', param: 'singleSource' } },
  { label: 'Lead time > 18mo', toggle: { kind: 'boolean', param: 'leadTime' } },
];

function paramsToObject(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

const ALL_PARAM_KEYS = ['severity', 'singleSource', 'leadTime', 'layer'];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(paramsToObject(searchParams));
  const anyActive = hasAnyFilter(filters);
  const activeCount = activeFilterCount(filters);

  const layerLookup = useMemo(
    () => Object.fromEntries(layers.map((l) => [l.id, l])),
    []
  );
  const activeLayer = filters.layerId ? layerLookup[filters.layerId] : null;

  const isActive = useCallback(
    (def: FilterDef): boolean => {
      switch (def.toggle.kind) {
        case 'reset':
          return !anyActive;
        case 'severity':
          return filters.severities.includes(def.toggle.value);
        case 'boolean':
          if (def.toggle.param === 'singleSource') return filters.singleSource;
          return filters.longLeadTime;
      }
    },
    [anyActive, filters]
  );

  const writeParams = useCallback(
    (mutate: (sp: URLSearchParams) => void) => {
      const sp = new URLSearchParams(searchParams.toString());
      mutate(sp);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const onToggle = useCallback(
    (def: FilterDef) => {
      writeParams((sp) => {
        if (def.toggle.kind === 'reset') {
          ALL_PARAM_KEYS.forEach((k) => sp.delete(k));
          return;
        }
        if (def.toggle.kind === 'severity') {
          const current = new Set(filters.severities);
          if (current.has(def.toggle.value)) current.delete(def.toggle.value);
          else current.add(def.toggle.value);
          if (current.size === 0) sp.delete('severity');
          else sp.set('severity', Array.from(current).join(','));
          return;
        }
        const key = def.toggle.param;
        const currentVal =
          key === 'singleSource' ? filters.singleSource : filters.longLeadTime;
        if (currentVal) sp.delete(key);
        else sp.set(key, 'true');
      });
    },
    [filters, writeParams]
  );

  const clearLayer = useCallback(() => {
    writeParams((sp) => sp.delete('layer'));
  }, [writeParams]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((f) => {
        const active = isActive(f);
        return (
          <button
            key={f.label}
            type="button"
            onClick={() => onToggle(f)}
            aria-pressed={active}
            className={cn(
              'rounded-full border-[0.5px] px-2.5 py-1 text-caption transition-colors',
              active
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
            )}
          >
            {f.label}
          </button>
        );
      })}
      {activeLayer ? (
        <button
          type="button"
          onClick={clearLayer}
          className="inline-flex items-center gap-1 rounded-full border-[0.5px] border-violet-300 bg-violet-50 px-2.5 py-1 text-caption text-violet-700 transition-colors hover:bg-violet-100"
          title="Clear layer filter"
        >
          Layer · {activeLayer.name}
          <X aria-hidden className="h-3 w-3" />
        </button>
      ) : null}
      {activeCount > 0 ? (
        <span className="ml-auto text-micro text-neutral-500">
          {activeCount} active filter{activeCount === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
}
