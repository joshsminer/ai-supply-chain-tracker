import type { Bottleneck, Layer } from '@/lib/types';
import layersJson from './layers.json';
import indiumPhosphide from './bottlenecks/indium-phosphide.json';
import hbmMemory from './bottlenecks/hbm-memory.json';
import cowos from './bottlenecks/cowos.json';
import abfSubstrates from './bottlenecks/abf-substrates.json';
import largePowerTransformers from './bottlenecks/large-power-transformers.json';
import gasTurbines from './bottlenecks/gas-turbines.json';
import interconnectionQueues from './bottlenecks/interconnection-queues.json';
import highNaEuv from './bottlenecks/high-na-euv.json';
import humanCapital from './bottlenecks/human-capital.json';
import thermalRack from './bottlenecks/thermal-rack.json';
import datacenterSilicon from './bottlenecks/datacenter-silicon.json';
import leadingEdgeLogic from './bottlenecks/leading-edge-logic.json';
import rawMaterials from './bottlenecks/raw-materials.json';
import transceivers16t from './bottlenecks/transceivers-1-6t.json';
import cpoRamp from './bottlenecks/cpo-ramp.json';
import dramWaferCapacity from './bottlenecks/dram-wafer-capacity.json';

export const layers: Layer[] = layersJson as Layer[];

export const bottlenecks: Bottleneck[] = [
  indiumPhosphide as Bottleneck,
  hbmMemory as Bottleneck,
  cowos as Bottleneck,
  abfSubstrates as Bottleneck,
  largePowerTransformers as Bottleneck,
  gasTurbines as Bottleneck,
  interconnectionQueues as Bottleneck,
  highNaEuv as Bottleneck,
  humanCapital as Bottleneck,
  thermalRack as Bottleneck,
  datacenterSilicon as Bottleneck,
  leadingEdgeLogic as Bottleneck,
  rawMaterials as Bottleneck,
  transceivers16t as Bottleneck,
  cpoRamp as Bottleneck,
  dramWaferCapacity as Bottleneck,
];

export const bottlenecksBySlug: Record<string, Bottleneck> = Object.fromEntries(
  bottlenecks.map((b) => [b.slug, b])
);

export const bottlenecksByLayer: Record<string, Bottleneck[]> = bottlenecks.reduce(
  (acc, b) => {
    (acc[b.layerId] ||= []).push(b);
    return acc;
  },
  {} as Record<string, Bottleneck[]>
);

export function getBottleneck(slug: string): Bottleneck | undefined {
  return bottlenecksBySlug[slug];
}

export function lastRefreshed(): string {
  return bottlenecks
    .map((b) => b.lastUpdated)
    .sort()
    .at(-1) ?? '';
}
