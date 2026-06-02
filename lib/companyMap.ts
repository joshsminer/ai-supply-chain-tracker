import type { Bottleneck, CompanyTier } from './types';
import { bottlenecks } from '@/data';

/**
 * Company-mapping module: ties each bottleneck stage to the public and private
 * players positioned against it. Distinguishes:
 *   - incumbents (the suppliers who currently hold share in the supply structure)
 *   - challengers (companies listed as addressing the bottleneck, esp. private)
 * so the dashboard surfaces not just where the constraint is but who's exposed
 * to / positioned for it.
 */

export interface PositionedPlayer {
  name: string;
  ticker: string | null;
  tier: CompanyTier;
  note: string;
  isPrivate: boolean;
  isIncumbentSupplier: boolean;
  supplierSharePct: number | null;
  url?: string;
  funding?: string;
}

export interface StagePlayers {
  slug: string;
  name: string;
  incumbents: PositionedPlayer[]; // suppliers holding share now
  publicChallengers: PositionedPlayer[]; // public, not top-share incumbents
  privateChallengers: PositionedPlayer[]; // pre-IPO names addressing it
}

function buildStagePlayers(b: Bottleneck): StagePlayers {
  // Suppliers by share (incumbents)
  const supplierByName = new Map<string, number>();
  for (const s of b.supplyStructure) {
    supplierByName.set(s.name.toLowerCase(), s.sharePct);
  }

  const incumbents: PositionedPlayer[] = b.supplyStructure
    .filter((s) => s.ticker || s.sharePct >= 10)
    .map((s) => ({
      name: s.name,
      ticker: s.ticker ?? null,
      tier: (s.ticker ? 'public-primary' : 'private') as CompanyTier,
      note: s.note ?? s.location,
      isPrivate: !s.ticker,
      isIncumbentSupplier: true,
      supplierSharePct: s.sharePct,
    }));

  const publicChallengers: PositionedPlayer[] = [];
  const privateChallengers: PositionedPlayer[] = [];

  for (const c of b.companies) {
    const share = supplierByName.get(c.name.toLowerCase()) ?? null;
    const player: PositionedPlayer = {
      name: c.name,
      ticker: c.ticker ?? null,
      tier: c.tier,
      note: c.note,
      isPrivate: c.tier === 'private',
      isIncumbentSupplier: share != null,
      supplierSharePct: share,
      url: c.url,
      funding: c.funding,
    };
    if (c.tier === 'private') privateChallengers.push(player);
    else if (share == null) publicChallengers.push(player); // public, not an incumbent supplier
  }

  return {
    slug: b.slug,
    name: b.name,
    incumbents,
    publicChallengers,
    privateChallengers,
  };
}

const BY_SLUG: Record<string, StagePlayers> = Object.fromEntries(
  bottlenecks.map((b) => [b.slug, buildStagePlayers(b)])
);

export function stagePlayers(slug: string): StagePlayers | undefined {
  return BY_SLUG[slug];
}

/** Compact one-liner of who's positioned, for dense forecast rows. */
export function positionedSummary(slug: string): {
  incumbents: string[];
  challengers: string[];
} {
  const sp = BY_SLUG[slug];
  if (!sp) return { incumbents: [], challengers: [] };
  const incumbents = sp.incumbents
    .slice()
    .sort((a, b) => (b.supplierSharePct ?? 0) - (a.supplierSharePct ?? 0))
    .slice(0, 3)
    .map((p) => (p.ticker ? `${p.name} (${p.ticker})` : p.name));
  const challengers = [...sp.privateChallengers, ...sp.publicChallengers]
    .slice(0, 3)
    .map((p) => p.name);
  return { incumbents, challengers };
}
