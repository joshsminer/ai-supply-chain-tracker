import type { PricePoint } from '@/lib/history';

interface SparklineProps {
  series: PricePoint[];
  width?: number;
  height?: number;
}

export function Sparkline({ series, width = 100, height = 22 }: SparklineProps) {
  if (series.length < 2) return null;
  const values = series.map((p) => p.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = series.length;
  const stepX = n > 1 ? width / (n - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const lastUp = values[n - 1] >= values[0];
  const stroke = lastUp ? '#3B6D11' : '#791F1F';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(' ')}
      />
    </svg>
  );
}
