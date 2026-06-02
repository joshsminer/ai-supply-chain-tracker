import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ShaderAnimation } from '@/components/ui/shader-animation';
import { bottlenecks } from '@/data';

export const metadata = {
  title: 'AI Supply Chain Tracker',
};

export default function LandingPage() {
  const criticalCount = bottlenecks.filter((b) => b.severity === 'critical').length;
  const tightCount = bottlenecks.filter((b) => b.severity === 'tight').length;

  return (
    <>
      {/* Shader background — fills the viewport behind everything */}
      <div className="fixed inset-0 -z-10">
        <ShaderAnimation />
      </div>

      {/* Hero overlay — centered in the viewport below the sticky header */}
      <div className="relative -mx-8 -my-8 flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-8 text-center text-white">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-micro uppercase tracking-wider text-white/80 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live · 60 tickers · {bottlenecks.length} bottlenecks tracked
        </span>
        <h1 className="text-[56px] font-semibold leading-[1.05] tracking-[-0.02em] md:text-[80px]">
          AI Supply Chain
          <br />
          Tracker
        </h1>
        <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-white/75">
          Real-time view of the {criticalCount} critical and {tightCount} tight
          bottlenecks across the 12-layer AI hardware stack — InP wafers, HBM,
          CoWoS, leading-edge logic, transformers, interconnection queues, and
          the labor and materials feeding them.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-caption font-medium text-neutral-900 transition-colors hover:bg-neutral-100"
          >
            Open dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dag"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/0 px-5 py-2.5 text-caption font-medium text-white transition-colors hover:bg-white/10"
          >
            View cross-layer DAG
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-x-10 text-white/70">
          <div className="flex flex-col">
            <span className="text-3xl font-semibold tabular-nums text-white">
              {bottlenecks.length}
            </span>
            <span className="mt-1 text-micro uppercase tracking-wider">
              Bottlenecks
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-semibold tabular-nums text-white">
              12
            </span>
            <span className="mt-1 text-micro uppercase tracking-wider">
              Stack layers
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-semibold tabular-nums text-white">
              60+
            </span>
            <span className="mt-1 text-micro uppercase tracking-wider">
              Tickers live
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
