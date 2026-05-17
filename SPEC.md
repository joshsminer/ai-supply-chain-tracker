# AI Supply Chain Bottleneck Tracker — Build Spec

Internal research tool for tracking critical bottlenecks across the AI hardware supply chain. Owned by Maverick Silicon. Dashboard-style: a stack-view landing page organizes all bottlenecks by their layer in the AI stack; each bottleneck drills into a detailed tracker card with a consistent schema.

This document is the complete handoff. Read it end-to-end before scaffolding.

---

## 1. Goals & non-goals

**Goals**
- Single-pane view of AI supply chain bottlenecks, organized by stack layer
- Drill into individual bottleneck cards with a consistent, comparable schema
- Living dataset — easy to update as research evolves
- Clean foundation for later automation (scrapers, alerts, time-series storage)

**Non-goals for v1**
- Real-time data feeds (manual JSON updates are fine for v1)
- Authentication or multi-user (single user, local or private Vercel)
- Time-series / backtesting (snapshot the JSON to git on each update; build proper storage later)
- Mobile-first (desktop research tool; should still be responsive but not optimized)

---

## 2. Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript, strict mode
- **Styling**: Tailwind CSS with a custom theme matching the design system in §6
- **Components**: shadcn/ui as the base; customize liberally
- **Icons**: lucide-react
- **Charts**: Recharts (only as needed — most visualizations are pure HTML/CSS bars)
- **Data**: JSON files in `/data`, loaded at build time as typed imports
- **Deploy**: Vercel, private deployment

Keep dependencies minimal. No animation libraries, no design-system overkill, no state-management library (React state + URL params are enough).

---

## 3. Folder structure

```
/ai-supply-chain-tracker
├── app/
│   ├── layout.tsx                    # Root layout, sidebar nav, brand header
│   ├── page.tsx                      # Stack view (landing)
│   ├── bottleneck/
│   │   └── [slug]/
│   │       └── page.tsx              # Drill-down card
│   └── globals.css                   # Tailwind + design tokens
├── components/
│   ├── stack/
│   │   ├── StackView.tsx             # Full stack list
│   │   ├── LayerRow.tsx              # One layer's row
│   │   ├── BottleneckChip.tsx        # Severity-coded chip
│   │   └── FilterBar.tsx             # Top filter bar
│   ├── card/
│   │   ├── BottleneckHeader.tsx      # Title + severity + description
│   │   ├── MetricGrid.tsx            # 4-up key metrics
│   │   ├── StackPosition.tsx         # Where it sits in stack
│   │   ├── SupplyStructure.tsx       # Supplier table with bars
│   │   ├── SupplyDemandGap.tsx       # Multi-year supply vs demand
│   │   ├── LeadingIndicators.tsx     # Indicator grid
│   │   ├── InvestmentLandscape.tsx   # Company grid
│   │   ├── InsightPanel.tsx          # Editorial insight (highlighted)
│   │   └── DebatesPanel.tsx          # Open debates with priors
│   └── ui/                           # shadcn/ui generated components
├── data/
│   ├── layers.json                   # Stack layer definitions
│   ├── bottlenecks/
│   │   ├── indium-phosphide.json
│   │   └── hbm-memory.json
│   └── index.ts                      # Typed exports of all data
├── lib/
│   ├── types.ts                      # All TypeScript interfaces (§5)
│   ├── severity.ts                   # Severity color/label helpers
│   └── utils.ts                      # cn(), formatters
└── SPEC.md                           # This file
```

---

## 4. Routing & navigation

- `/` — stack view landing page
- `/bottleneck/[slug]` — individual tracker card (slug matches the bottleneck `slug` field)
- Filter state on landing lives in URL query params: `?severity=critical&singleSource=true`
- Header is persistent across all pages (brand mark + last-refresh timestamp + filter shortcuts)

Clicking a `BottleneckChip` in the stack view navigates to `/bottleneck/[slug]`. The drill-down has a breadcrumb back to `/` and to the layer's filtered view (future: layer detail page).

---

## 5. Data model (TypeScript)

Put this in `lib/types.ts`. Every JSON file in `/data` must validate against these.

```typescript
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
  | 'up-bad'    // value rising is bad (e.g. lead time)
  | 'up-good'   // value rising is good (e.g. capacity)
  | 'down-bad'
  | 'down-good'
  | 'neutral';

export interface Layer {
  id: string;             // e.g. "optical-interconnect"
  number: number;         // 1-12, top of stack = highest number
  name: string;           // "Optical & interconnect"
  subtitle: string;       // "Datacenter"
}

export interface Metric {
  label: string;          // "Wafer lead time"
  value: string;          // "38 wk"
  sub?: string;           // "from 22 wk (2023)"
  direction?: MetricDirection;
}

export interface Supplier {
  name: string;
  location: string;       // "Japan · 2/3/4\""
  sharePct: number;       // 0-100
  note?: string;
  ticker?: string;
}

export interface SupplyDemandYear {
  year: string;           // "2024" or "2026E"
  supplyIndex: number;    // 0-100, relative to reference year
  demandIndex: number;    // 0-100, relative to reference year
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
}

export interface Debate {
  question: string;
  currentBelief: string;
  probability: number;    // 0-1
  lastUpdated: string;    // ISO date
}

export interface Bottleneck {
  slug: string;                       // URL slug
  name: string;                       // "Indium phosphide (InP)"
  shortName: string;                  // "Indium phosphide" — for chips
  layerId: string;                    // FK to Layer.id
  severity: Severity;
  severityNote: string;               // "single-source exposure"
  description: string;                // 1-3 sentences
  lastUpdated: string;                // ISO date
  metrics: Metric[];                  // exactly 4
  stackPosition: string;              // markdown: where it sits in the flow
  supplyStructure: Supplier[];
  supplyDemand: SupplyDemandYear[];   // 4-5 years
  indicators: Indicator[];
  companies: Company[];
  insight: string;                    // markdown; rendered in highlighted panel
  debates?: Debate[];                 // optional but encouraged
  upstreamSlugs?: string[];           // links to upstream bottlenecks
  downstreamSlugs?: string[];
}
```

---

## 6. Design system

Match the mockup aesthetic: clean, flat, white surfaces, 0.5px borders, generous whitespace. Investment-grade, not consumer-y. No gradients, shadows, or decorative effects.

### Typography
- Font: Inter (or system sans). Two weights only — 400 and 500.
- Sizes: h1 22px / h2 18px / h3 16px / body 14px / caption 12px / micro 11px
- Sentence case everywhere. No ALL CAPS except micro-labels with `tracking-wider`.

### Spacing
- Card padding: 16px (px-4 py-3 for tight, px-5 py-4 for standard)
- Section gaps: 14px between sections inside a card
- Page padding: 24-32px

### Colors

Use Tailwind's neutral palette as the base. Severity colors:

| Severity | Bar/dot | Badge bg | Badge text |
|---|---|---|---|
| critical | `#E24B4A` | `#FCEBEB` | `#791F1F` |
| tight | `#EF9F27` | `#FAEEDA` | `#633806` |
| balanced | `#639922` | `#EAF3DE` | `#3B6D11` |
| monitoring | `#B4B2A9` | `#F1EFE8` | `#5F5E5A` |

Supplier share bars: purple ramp at 4 stops — `#534AB7`, `#7F77DD`, `#AFA9EC`, `#D3D1C7` (largest → smallest).

Supply/demand gap: supply is striped teal (`#1D9E75` / `#5DCAA5`), demand is solid purple (`#534AB7`) overlaid.

Insight panel: amber accent. Background `#FAEEDA`, left border `3px solid #BA7517`, text `#633806`.

### Borders & radius
- All borders 0.5px (Tailwind: use `border-[0.5px]`)
- Border color: `border-neutral-200` (and `dark:border-neutral-800` if dark mode is added)
- Radius: `rounded-md` (6-8px) for most, `rounded-lg` (12px) for cards

### Dark mode
Optional for v1; build with CSS variables so it can be added without refactor.

---

## 7. Page-by-page UI spec

### 7.1 Stack view (`app/page.tsx`)

Layout (top to bottom):

1. **Header bar** — brand mark ("M" in a black square), "AI Supply Chain Tracker" + "Maverick Silicon · Internal research" subtitle, last-refresh timestamp right-aligned
2. **Filter bar** — chips: "All layers", "Critical only", "Single-source", "Lead time > 18mo", "Investable now". Multi-select. State in URL params.
3. **Severity legend** — small row showing the 4 severity dots with labels
4. **Layer rows** — render in DESCENDING layer number (12 at top → 1 at bottom). Each row:
   - Left column (170px): layer name + subtitle (e.g. "Site & grid" / "Layer 12 · physical")
   - Middle column: `BottleneckChip[]` — pill with severity dot + bottleneck `shortName`. Click → navigate to `/bottleneck/[slug]`.
   - Right column (70px): count of bottlenecks in that layer

The order of the layers (top to bottom) is fixed by the layer `number` field, but apply filters by hiding chips that don't match. If a row has zero chips after filtering, still show the row but with a "—" placeholder.

### 7.2 Drill-down card (`app/bottleneck/[slug]/page.tsx`)

Sections in order, separated by 0.5px dividers:

1. **Breadcrumb** — `Stack › [Layer name] › [Bottleneck name]`
2. **Header** — title (h1), severity badge inline, last-updated date, description paragraph
3. **Metric grid** — 4 metric cards in a 4-column grid. Each card: label (12px muted), value (20-22px medium weight), sub (11px tertiary, colored by `direction`)
4. **Stack position** — "Where it sits in the stack" microheading + markdown narrative
5. **Supply structure** — "Supply structure" microheading + rows of: supplier name + location + horizontal bar + percentage
6. **Supply vs. demand** — "Supply vs. demand · [years]" microheading + a `SupplyDemandGap` visualization: one row per year showing two overlapping bars (striped teal for supply, solid purple for demand), with a status pill on the right
7. **Leading indicators** — 2-column grid of indicator cards. Each card: cadence tag (micro-label) + indicator name + source (with link if `url` provided)
8. **Investment landscape** — 3-column grid of company cards. Each card: tier (micro-label) + name + note (+ ticker if public)
9. **Insight** — highlighted amber panel with "Insight" micro-label header + markdown body. (Note: this is named "Insight", not "Maverick Angle" — internal voice but generically labeled.)
10. **Debates** (if present) — optional section with each debate as a row: question + current belief + probability bar + last-updated stamp

---

## 8. Seeded data

### 8.1 `data/layers.json`

```json
[
  { "id": "site-grid", "number": 12, "name": "Site & grid", "subtitle": "Physical" },
  { "id": "power-equipment", "number": 11, "name": "Power equipment", "subtitle": "Electrical" },
  { "id": "human-capital", "number": 10, "name": "Human capital", "subtitle": "Labor" },
  { "id": "thermal-rack", "number": 9, "name": "Thermal & rack", "subtitle": "Datacenter" },
  { "id": "optical-interconnect", "number": 8, "name": "Optical & interconnect", "subtitle": "Datacenter" },
  { "id": "datacenter-silicon", "number": 7, "name": "Datacenter silicon", "subtitle": "Compute" },
  { "id": "advanced-packaging", "number": 6, "name": "Advanced packaging", "subtitle": "Back-end" },
  { "id": "memory", "number": 5, "name": "Memory", "subtitle": "DRAM / HBM" },
  { "id": "leading-edge-logic", "number": 4, "name": "Leading-edge logic", "subtitle": "Foundry" },
  { "id": "wafer-fab-equipment", "number": 3, "name": "Wafer-fab equipment", "subtitle": "WFE" },
  { "id": "substrates-wafers", "number": 2, "name": "Substrates & wafers", "subtitle": "Materials" },
  { "id": "raw-materials", "number": 1, "name": "Raw materials", "subtitle": "Upstream" }
]
```

### 8.2 `data/bottlenecks/indium-phosphide.json`

```json
{
  "slug": "indium-phosphide",
  "name": "Indium phosphide (InP)",
  "shortName": "Indium phosphide",
  "layerId": "optical-interconnect",
  "severity": "critical",
  "severityNote": "Single-source exposure",
  "description": "III-V semiconductor used for EMLs, DFB lasers, and photodiodes in 800G/1.6T pluggable transceivers and the InP die in co-packaged optics. The 4\" to 6\" wafer transition is the binding constraint for the 2026 to 2028 optics ramp.",
  "lastUpdated": "2026-05-17",
  "metrics": [
    { "label": "Wafer lead time", "value": "38 wk", "sub": "from 22 wk (2023)", "direction": "up-bad" },
    { "label": "Top-2 wafer share", "value": "~82%", "sub": "Sumitomo + JX", "direction": "neutral" },
    { "label": "6\" wafer readiness", "value": "~15%", "sub": "Pilot lines only", "direction": "neutral" },
    { "label": "1.6T attach growth", "value": "+220%", "sub": "'26 vs '25 forecast", "direction": "up-good" }
  ],
  "stackPosition": "InP wafer → epitaxy (MOCVD) → device fab (EML, DFB, PD) → pluggable transceiver OR co-packaged optics → switch / GPU rack → datacenter network spine. The wafer layer is the chokepoint; downstream device capacity at Coherent and Lumentum can scale faster than upstream wafer supply.",
  "supplyStructure": [
    { "name": "Sumitomo Electric", "location": "Japan · 2/3/4\"", "sharePct": 55, "ticker": "5802.T" },
    { "name": "JX Advanced Metals", "location": "Japan · 2/3/4\"", "sharePct": 27, "ticker": "5016.T" },
    { "name": "AXT", "location": "US-listed / China fab", "sharePct": 12, "note": "Subject to China export-control risk", "ticker": "AXTI" },
    { "name": "IQE / others", "location": "UK · epi-on-wafer", "sharePct": 6, "ticker": "IQE.L" }
  ],
  "supplyDemand": [
    { "year": "2024", "supplyIndex": 55, "demandIndex": 48, "status": "balanced" },
    { "year": "2025", "supplyIndex": 58, "demandIndex": 64, "status": "tight" },
    { "year": "2026E", "supplyIndex": 62, "demandIndex": 84, "status": "critical" },
    { "year": "2027E", "supplyIndex": 72, "demandIndex": 95, "status": "critical" },
    { "year": "2028E", "supplyIndex": 88, "demandIndex": 92, "status": "tight" }
  ],
  "indicators": [
    { "cadence": "quarterly", "name": "Sumitomo Electric optical components segment revenue", "source": "Sumitomo IR · JP filings" },
    { "cadence": "quarterly", "name": "AXT InP revenue mix & China export license status", "source": "AXTI 10-Q · BIS notices" },
    { "cadence": "quarterly", "name": "Coherent and Lumentum datacom backlog and EML capacity commentary", "source": "COHR, LITE earnings transcripts" },
    { "cadence": "monthly", "name": "LightCounting transceiver unit forecast by speed", "source": "LightCounting reports (paid)" },
    { "cadence": "event", "name": "OFC and ECOC 6\" InP wafer demo and qualification announcements", "source": "Conference press · March / September" },
    { "cadence": "event", "name": "NVIDIA Quantum-X and Broadcom Bailly CPO product milestones", "source": "Vendor keynotes" }
  ],
  "companies": [
    { "name": "AXT", "tier": "public-primary", "note": "InP wafer; China overhang", "ticker": "AXTI" },
    { "name": "Coherent", "tier": "public-device", "note": "EMLs, transceivers, full optical stack", "ticker": "COHR" },
    { "name": "Lumentum", "tier": "public-device", "note": "EMLs, ramping 1.6T", "ticker": "LITE" },
    { "name": "IQE", "tier": "public-epi", "note": "III-V epitaxy services", "ticker": "IQE.L" },
    { "name": "NcodiN", "tier": "private", "note": "III-V-on-Si nanolasers; substrate-bypass thesis" },
    { "name": "Ayar Labs", "tier": "private", "note": "External laser source architecture for co-packaged optics" }
  ],
  "insight": "The chokepoint is not InP devices — it's 6\" wafer qualification at Sumitomo and JX. Anyone with a credible path to 6\" epi yield in 2026 owns the next-cycle margin pool. Watch for non-Japanese supply emerging in Korea or via CHIPS-funded US pilot lines. The investable wedge is the qualification race itself, not the incumbents. Contrarian path: substrate-bypass plays like III-V-on-silicon that route around the wafer constraint entirely.",
  "debates": [
    {
      "question": "Does Sumitomo or JX reach production-yield 6\" InP wafers by end of 2026?",
      "currentBelief": "Sumitomo more likely than JX; both still pilot as of mid-2026",
      "probability": 0.35,
      "lastUpdated": "2026-05-17"
    },
    {
      "question": "Does CPO meaningfully cannibalize pluggable transceiver volumes by 2027?",
      "currentBelief": "CPO ramps but pluggables grow alongside through 2028",
      "probability": 0.25,
      "lastUpdated": "2026-05-17"
    }
  ],
  "upstreamSlugs": ["inp-wafers-6inch"],
  "downstreamSlugs": ["transceivers-1-6t", "cpo-ramp"]
}
```

### 8.3 `data/bottlenecks/hbm-memory.json`

```json
{
  "slug": "hbm-memory",
  "name": "High-bandwidth memory (HBM3E to HBM4)",
  "shortName": "HBM3E / HBM4",
  "layerId": "memory",
  "severity": "critical",
  "severityNote": "Sold out through 2026",
  "description": "Stacked DRAM with TSV interconnect, attached to GPU and ASIC dies via 2.5D packaging. HBM4 introduces a logic base die fabbed at TSMC, deepening the foundry-memory coupling. HBM bit growth is the single most important AI memory metric.",
  "lastUpdated": "2026-05-17",
  "metrics": [
    { "label": "HBM bit growth '26E", "value": "~70%", "sub": "YoY, industry", "direction": "up-good" },
    { "label": "Top-3 share", "value": "~100%", "sub": "Hynix + Samsung + Micron", "direction": "neutral" },
    { "label": "Wafer area vs DDR5", "value": "~3×", "sub": "Per equivalent bit", "direction": "neutral" },
    { "label": "HBM contract price", "value": "~5× DDR5", "sub": "Premium widening", "direction": "up-good" }
  ],
  "stackPosition": "DRAM wafer → TSV and stacking → HBM cube (8-Hi, 12-Hi, 16-Hi) → known-good-stacked-die sort → ship to TSMC for CoWoS attach to GPU or ASIC → SXM or OAM module → server → rack → datacenter. The structural shift in HBM4 is that the base die moves to TSMC's logic process, making HBM4 supply also gated by foundry capacity.",
  "supplyStructure": [
    { "name": "SK Hynix", "location": "M15X, Cheongju", "sharePct": 52, "ticker": "000660.KS" },
    { "name": "Samsung", "location": "P3 / P4 Pyeongtaek", "sharePct": 35, "note": "HBM4 NVIDIA qualification is make-or-break", "ticker": "005930.KS" },
    { "name": "Micron", "location": "Taichung, Hiroshima", "sharePct": 13, "ticker": "MU" }
  ],
  "supplyDemand": [
    { "year": "2024", "supplyIndex": 42, "demandIndex": 48, "status": "tight" },
    { "year": "2025", "supplyIndex": 62, "demandIndex": 74, "status": "critical" },
    { "year": "2026E", "supplyIndex": 82, "demandIndex": 96, "status": "critical" },
    { "year": "2027E", "supplyIndex": 95, "demandIndex": 99, "status": "tight" }
  ],
  "indicators": [
    { "cadence": "quarterly", "name": "SK Hynix HBM revenue mix and capex guidance", "source": "000660.KS earnings" },
    { "cadence": "quarterly", "name": "Samsung HBM3E 12-Hi and HBM4 NVIDIA qualification language", "source": "005930.KS calls and Korean trade press" },
    { "cadence": "quarterly", "name": "Micron HBM revenue and sold-out commentary", "source": "MU 10-Q" },
    { "cadence": "monthly", "name": "TrendForce HBM and DDR5 contract price index", "source": "TrendForce / DRAMeXchange" },
    { "cadence": "monthly", "name": "Korea DRAM exports by destination", "source": "MOTIE / KITA trade statistics" },
    { "cadence": "event", "name": "NVIDIA Rubin BOM disclosures including HBM stack count and capacity per stack", "source": "GTC keynotes and supplier IR" }
  ],
  "companies": [
    { "name": "SK Hynix", "tier": "public-primary", "note": "Highest-conviction long; HBM is the engine", "ticker": "000660.KS" },
    { "name": "Micron", "tier": "public-primary", "note": "Higher-beta catch-up; US-listed pure-ish exposure", "ticker": "MU" },
    { "name": "Hanmi Semiconductor", "tier": "public-enabler", "note": "TC bonders for HBM stacking", "ticker": "042700.KS" },
    { "name": "BE Semiconductor (BESI)", "tier": "public-enabler", "note": "Hybrid bonding for HBM4 16-Hi and beyond", "ticker": "BESI.AS" },
    { "name": "Soulbrain / SK Materials", "tier": "public-materials", "note": "TSV etch and precursors", "ticker": "357780.KS" },
    { "name": "Eliyan", "tier": "private", "note": "NuLink as alternative to HBM at high-bandwidth scale" }
  ],
  "insight": "The next leg isn't capacity — it's hybrid bonding qualification for HBM4 16-Hi at sub-55 micron pitch. BESI tool wins, Hynix and TSMC base-die yields, and the TC-bonder-to-hybrid-bonder transition are the deciding variables. Samsung's HBM4 NVIDIA qualification is the highest-variance event for the 2026 to 2027 supply picture. The under-watched second-order trade is the broader memory backend equipment shift from TCB to hybrid bonding, which extends well past HBM into mainstream DRAM and NAND.",
  "debates": [
    {
      "question": "Does Samsung qualify HBM4 at NVIDIA by end of 2H 2026?",
      "currentBelief": "Partial qualification likely; full volume share gain still uncertain",
      "probability": 0.55,
      "lastUpdated": "2026-05-17"
    },
    {
      "question": "Does hybrid bonding meaningfully replace TCB for HBM4 production volumes in 2027?",
      "currentBelief": "Hybrid bonding wins at 16-Hi; TCB persists at 12-Hi longer than consensus expects",
      "probability": 0.65,
      "lastUpdated": "2026-05-17"
    },
    {
      "question": "Does CXMT (China) reach competitive HBM2 production by 2028?",
      "currentBelief": "Yes for domestic Chinese market; export-controlled out of frontier accelerators",
      "probability": 0.60,
      "lastUpdated": "2026-05-17"
    }
  ],
  "upstreamSlugs": ["dram-wafer-capacity", "tsv-throughput"],
  "downstreamSlugs": ["cowos-packaging", "ai-accelerators"]
}
```

---

## 9. Component implementation notes

### `MetricGrid`
- 4 columns on desktop, 2 columns under 640px
- Background: `bg-neutral-50`, no border, rounded-md, padding `px-3 py-2.5`
- Value font-size 18-20px, weight 500
- `direction` controls the `sub` color: `up-bad` and `down-bad` use red-900; `up-good` and `down-good` use green-800; `neutral` uses neutral-500

### `SupplyStructure`
- Each row is a 3-column grid: 140px name/location + flex bar track + 50px percentage
- Bar fill colors use the 4-stop purple ramp from §6, ordered by share descending

### `SupplyDemandGap`
- One row per year. Each row is a 3-column grid: 70px year label + flex bar track + 60px status pill
- Bar track is `bg-neutral-100`, height 14px, rounded
- Supply: absolute-positioned div with striped teal background, width = `supplyIndex%`
- Demand: absolute-positioned div with solid purple, width = `demandIndex%`, with `mix-blend-mode: multiply` for the overlap effect
- Stripes via `repeating-linear-gradient(45deg, #1D9E75, #1D9E75 4px, #5DCAA5 4px, #5DCAA5 8px)`

### `LeadingIndicators`
- 2-column grid, gap 8px
- Each indicator card: bordered, padded, with cadence as a micro-label at top, name in 12px medium weight, source in 11px secondary

### `InvestmentLandscape`
- 3-column grid, gap 8px
- Each company card: tier as micro-label, name in 12px medium, note in 11px secondary, ticker (if present) as a small monospace badge

### `InsightPanel`
- Background `#FAEEDA`, left border `3px solid #BA7517`, no rounded-left corners (rounded-r-md only)
- Padding px-3.5 py-3
- "Insight" label in 11px medium, color `#854F0B`, tracking-wider
- Body markdown rendered in 13px, color `#633806`, line-height 1.55

### `DebatesPanel`
- Each debate row: question (medium weight) on top, current belief on a second line, then a horizontal probability bar (purple fill, full-width track), with the probability as a percentage on the right
- Last-updated as a small timestamp

---

## 10. Build phases

Ship in this order. Each phase should be independently demoable.

**Phase 1 — Scaffold (half day)**
- Next.js + TypeScript + Tailwind + shadcn/ui
- Design tokens in `globals.css`
- `lib/types.ts` populated from §5
- Both seeded JSON files in place, typed and importable
- Brand header + empty pages

**Phase 2 — Stack view (half day)**
- Layer rows rendering from `layers.json`
- Bottleneck chips rendering from the two seeded bottlenecks
- Severity dots and legend
- Filter bar (functional: severity filter at minimum)
- Click chip → navigate to drill-down

**Phase 3 — Drill-down card layout (1 day)**
- All sections from §7.2 rendering for both seeded bottlenecks
- `SupplyDemandGap` is the hardest component — get this right first
- Markdown rendering for `stackPosition` and `insight` (use `react-markdown`)

**Phase 4 — Polish (half day)**
- Filter combinations work via URL params
- Empty states for layers with no matching chips
- Breadcrumb navigation
- Last-updated stamps

**Phase 5 — Future (out of scope for v1)**
- Add 6 more bottlenecks (CoWoS, ABF substrates, transformers, gas turbines, interconnection queues, High-NA EUV)
- Snapshot the JSON to git on every refresh; build a "history" view per bottleneck
- Cross-layer DAG view (which bottlenecks gate which)
- Scrapers for the leading indicators (start with public earnings PDFs and TrendForce)
- Alert system on indicator changes
- Probability-update workflow for the debates panel

---

## 11. Editorial conventions

- The editorial panel on each card is labeled **Insight** (not "Maverick angle" or any branded variant). Internal voice but generically labeled.
- Severity is your call as the researcher. Bias toward calling things "tight" rather than "critical" — reserve "critical" for genuine single-source-or-no-substitute situations.
- `lastUpdated` should be updated whenever any field on a bottleneck changes. Treat it as an audit trail.
- Probabilities in debates are subjective priors. The point is to write them down so they can be updated, not to be precise.

---

## 12. First Claude Code prompt

When you hand this to Claude Code, your initial prompt should be roughly:

> Read SPEC.md end to end. Then execute Phase 1 (Scaffold) from §10. Initialize a Next.js 14 project with the App Router, TypeScript strict mode, Tailwind, and shadcn/ui. Create the folder structure from §3, populate `lib/types.ts` from §5, drop the seeded JSON files from §8 into `data/bottlenecks/`, and stand up the brand header and empty page shells. Stop and show me the result before starting Phase 2.

Then iterate phase by phase.
