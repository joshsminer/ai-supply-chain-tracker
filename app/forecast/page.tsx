import { ForecastBoard } from '@/components/forecast/ForecastBoard';

export const metadata = {
  title: 'Forecast · AI Supply Chain Tracker',
};

export default function ForecastPage() {
  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-h1">Constraint forecast</h1>
        <p className="max-w-[80ch] text-caption text-neutral-500">
          Scores each stage&rsquo;s binding-constraint risk today and 2–4 quarters
          out, and flags the next stage most likely to become the binding
          constraint. Transparent scoring on supply–demand gap trajectory, forward
          status, supplier concentration, and live signals — every score is
          decomposed into named drivers.
        </p>
      </section>
      <ForecastBoard />
    </div>
  );
}
