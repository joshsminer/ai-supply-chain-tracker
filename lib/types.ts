export type Severity = 'critical' | 'tight' | 'balanced' | 'monitoring';

export type Cadence = 'monthly' | 'quarterly' | 'annual' | 'event';

export type CompanyTier =
  | 'public-primary'
  | 'public-enabler'
  | 'public-device'
  | 'public-epi'
  | 'public-materials'
  | 'private';

export type MetricDirection =
  | 'up-bad'
  | 'up-good'
  | 'down-bad'
  | 'down-good'
  | 'neutral';

export interface Layer {
  id: string;
  number: number;
  name: string;
  subtitle: string;
}

export interface Metric {
  label: string;
  value: string;
  sub?: string;
  direction?: MetricDirection;
}

export interface Supplier {
  name: string;
  location: string;
  sharePct: number;
  note?: string;
  ticker?: string;
}

export interface SupplyDemandYear {
  year: string;
  supplyIndex: number;
  demandIndex: number;
  status: Exclude<Severity, 'monitoring'>;
}

export interface Indicator {
  cadence: Cadence;
  name: string;
  source: string;
  url?: string;
}

export interface Company {
  name: string;
  tier: CompanyTier;
  note: string;
  ticker?: string;
  url?: string;        // homepage or IR page
  funding?: string;    // e.g. "Series D · $400M · Sep 2025"
  investors?: string;  // notable investors / strategic backers, comma-separated
  stage?: string;      // pre-seed, seed, Series A-G, growth, late
}

export interface Debate {
  question: string;
  currentBelief: string;
  probability: number;
  lastUpdated: string;
}

export interface Bottleneck {
  slug: string;
  name: string;
  shortName: string;
  layerId: string;
  severity: Severity;
  severityNote: string;
  description: string;
  lastUpdated: string;
  metrics: Metric[];
  stackPosition: string;
  supplyStructure: Supplier[];
  supplyDemand: SupplyDemandYear[];
  indicators: Indicator[];
  companies: Company[];
  insight: string;
  debates?: Debate[];
  upstreamSlugs?: string[];
  downstreamSlugs?: string[];
}
