import { useState } from "react";

export interface DayCount { date: string; label: string; count: number; revenue: number }

const W = 640, H = 200, PAD = { top: 16, right: 8, bottom: 26, left: 30 };
const BAR = "#2f6a33";        // validated: passes lightness, chroma and 3:1 contrast on the white surface
const BAR_HOVER = "#3f7d3a";

const niceMax = (v: number) => (v <= 4 ? 4 : v <= 10 ? 10 : Math.ceil(v / 5) * 5);

/** Orders per day: single-series column chart. Thin bars, hairline grid, per-bar tooltip, table view. */
export default function OrdersChart({ days }: { days: DayCount[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...days.map((d) => d.count)));
  const ticks = [0, max / 2, max];
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;
  const band = plotW / days.length;
  const bw = Math.min(24, band - 2);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const peak = days.reduce((best, d, i) => (d.count > (days[best]?.count ?? -1) ? i : best), 0);
  const fmtR = (c: number) => "R" + (c / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

  // Column with a 4px rounded top and a square base on the baseline.
  const col = (x: number, top: number, bottom: number) => {
    const h = bottom - top, r = Math.min(4, h, bw / 2);
    if (h <= 0) return "";
    return `M${x},${bottom}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${bottom}Z`;
  };

  const active = hover != null ? days[hover] : null;
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Orders per day for the last 14 days">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e7e5df" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#6b6f67" style={{ fontVariantNumeric: "tabular-nums" }}>{t}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = PAD.left + i * band + (band - bw) / 2;
          return (
            <g key={d.date}>
              <path d={col(x, y(d.count), y(0))} fill={hover === i ? BAR_HOVER : BAR} />
              {i === peak && d.count > 0 && (
                <text x={x + bw / 2} y={y(d.count) - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1d2a1f">{d.count}</text>
              )}
              {(i % 2 === 0 || i === days.length - 1) && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b6f67">{d.label}</text>
              )}
              <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH + 4} fill="transparent" tabIndex={0}
                aria-label={`${d.label}: ${d.count} orders, ${fmtR(d.revenue)}`}
                onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
            </g>
          );
        })}
      </svg>
      {active && hover != null && (
        <div className="pointer-events-none absolute top-0 rounded-md border border-ink/10 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `clamp(0px, calc(${((PAD.left + hover * band + band / 2) / W) * 100}% - 60px), calc(100% - 130px))` }}>
          <p className="text-base font-bold text-ink">{active.count} {active.count === 1 ? "order" : "orders"}</p>
          <p className="text-ink/60">{active.label} · {fmtR(active.revenue)}</p>
        </div>
      )}
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-ink/60">Show as table</summary>
        <table className="mt-2 w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead><tr className="text-left text-ink/60"><th className="py-1">Day</th><th className="py-1 text-right">Orders</th><th className="py-1 text-right">Value</th></tr></thead>
          <tbody>{days.map((d) => <tr key={d.date} className="border-t border-ink/10"><td className="py-1">{d.label}</td><td className="py-1 text-right">{d.count}</td><td className="py-1 text-right">{fmtR(d.revenue)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
