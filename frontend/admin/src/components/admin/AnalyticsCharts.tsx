"use client";
import React, { useEffect, useRef, useState } from 'react';

export const COLORS = { blue: '#2563EB', lightBlue: '#93C5FD', green: '#10B981', purple: '#8B5CF6', orange: '#F59E0B', red: '#EF4444', slate: '#94A3B8' };
const GRID = '#EEF2F7';
const AXIS_TEXT = '#94A3B8';

/** Keyframes shared by every chart. They are switched off for people who prefer reduced motion. */
const CHART_CSS = `
@keyframes amsh-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes amsh-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes amsh-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes amsh-sweep { from { stroke-dasharray: 0 1000; } }
.amsh-bar { transform-box: fill-box; transform-origin: bottom; animation: amsh-grow .7s cubic-bezier(.22,1,.36,1) both; }
.amsh-line { stroke-dasharray: 1; stroke-dashoffset: 0; animation: amsh-draw 1.1s ease-out both; }
.amsh-area { animation: amsh-fade .9s ease-out .25s both; }
.amsh-seg { animation: amsh-sweep .9s cubic-bezier(.22,1,.36,1) both; }
@media (prefers-reduced-motion: reduce) { .amsh-bar, .amsh-line, .amsh-area, .amsh-seg { animation: none !important; } }
`;

export const compact = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(Math.abs(n) >= 1e4 ? 0 : 1)}K` : String(Math.round(n * 10) / 10));

/** Average a long series down to at most `max` points so bars stay readable. */
export function downsample<T>(items: T[], max: number, merge: (chunk: T[]) => T): T[] {
  if (items.length <= max) return items;
  const size = Math.ceil(items.length / max);
  const out: T[] = [];
  for (let i = 0; i < items.length; i += size) out.push(merge(items.slice(i, i + size)));
  return out;
}

/** A step that gives about four round grid intervals: 1, 2, 5 times a power of ten. */
function niceStep(max: number): number {
  const raw = Math.max(max, 1) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Smooth curve through the points (Catmull-Rom turned into bezier segments). Gaps (null) split the line. */
function smoothPath(points: ({ x: number; y: number } | null)[]): string {
  let d = '';
  let run: { x: number; y: number }[] = [];
  const flush = () => {
    if (run.length === 1) d += `M${run[0].x.toFixed(1)},${run[0].y.toFixed(1)} `;
    if (run.length > 1) {
      d += `M${run[0].x.toFixed(1)},${run[0].y.toFixed(1)} `;
      for (let i = 0; i < run.length - 1; i++) {
        const p0 = run[i - 1] || run[i];
        const p1 = run[i];
        const p2 = run[i + 1];
        const p3 = run[i + 2] || p2;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${c1y.toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} `;
      }
    }
    run = [];
  };
  points.forEach((p) => (p ? run.push(p) : flush()));
  flush();
  return d.trim();
}

interface Plot {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  band: number;
  cx: (i: number) => number;
  y: (v: number) => number; // left axis
  plotH: number;
}

interface ShellProps {
  n: number;
  height?: number;
  yMax: number; // left axis maximum (a multiple of four round steps)
  leftFmt?: (v: number) => string;
  rightTicks?: string[]; // five labels, top to bottom order handled here (0 first)
  xLabels: string[];
  tooltip: (i: number) => { title: string; rows: { name: string; value: string; color: string }[] };
  children: (p: Plot) => React.ReactNode;
}

/** Axes, grid, hover guide and tooltip around a chart drawn at its real pixel width (nothing is stretched). */
function Shell({ n, height = 190, yMax, leftFmt = compact, rightTicks, xLabels, tooltip, children }: ShellProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const left = 34;
  const right = rightTicks ? 38 : 6;
  const top = 8;
  const bottom = 22;
  const plotW = Math.max(width - left - right, 10);
  const plotH = height - top - bottom;
  const band = plotW / Math.max(n, 1);
  const plot: Plot = {
    width,
    height,
    left,
    right,
    top,
    bottom,
    band,
    plotH,
    cx: (i) => left + band * i + band / 2,
    y: (v) => top + plotH - (Math.max(v, 0) / yMax) * plotH,
  };
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 62))));
  const tip = hover != null ? tooltip(hover) : null;
  const tipLeft = hover != null ? Math.min(Math.max(plot.cx(hover) + 10, 4), Math.max(width - 150, 4)) : 0;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      <style>{CHART_CSS}</style>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Chart" onMouseLeave={() => setHover(null)}>
          {[0, 1, 2, 3, 4].map((t) => {
            const gy = top + plotH - (t / 4) * plotH;
            return (
              <g key={t}>
                <line x1={left} x2={width - right} y1={gy} y2={gy} stroke={GRID} strokeDasharray={t === 0 ? undefined : '3 4'} />
                <text x={left - 8} y={gy + 3.5} textAnchor="end" fontSize="10" fill={AXIS_TEXT}>
                  {leftFmt((yMax / 4) * t)}
                </text>
                {rightTicks && (
                  <text x={width - right + 8} y={gy + 3.5} fontSize="10" fill={AXIS_TEXT}>
                    {rightTicks[t]}
                  </text>
                )}
              </g>
            );
          })}
          {xLabels.map((label, i) =>
            i % every === 0 ? (
              <text key={i} x={plot.cx(i)} y={height - 6} textAnchor="middle" fontSize="10" fill={AXIS_TEXT}>
                {label}
              </text>
            ) : null
          )}
          {hover != null && <line x1={plot.cx(hover)} x2={plot.cx(hover)} y1={top} y2={top + plotH} stroke="#CBD5E1" strokeDasharray="3 3" />}
          {children(plot)}
          <rect
            x={left}
            y={top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={(e) => {
              const box = (e.currentTarget as SVGRectElement).getBoundingClientRect();
              setHover(Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * n))));
            }}
          />
        </svg>
      )}
      {tip && (
        <div className="pointer-events-none absolute top-1 z-10 min-w-[120px] rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-2 text-[11px] shadow-lg" style={{ left: tipLeft }}>
          <p className="mb-1 font-semibold text-[#0F172A]">{tip.title}</p>
          {tip.rows.map((r) => (
            <p key={r.name} className="flex items-center justify-between gap-3 text-[#475569]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: r.color }} />
                {r.name}
              </span>
              <span className="font-semibold tabular-nums text-[#0F172A]">{r.value}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const roundTop = (x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
};

interface Series {
  name: string;
  color: string;
  values: number[];
}

export function StackedBars({ data, labels }: { data: Series[]; labels: string[] }) {
  const totals = labels.map((_, i) => data.reduce((s, d) => s + d.values[i], 0));
  const step = niceStep(Math.max(...totals));
  const yMax = step * 4;
  return (
    <Shell
      n={labels.length}
      yMax={yMax}
      xLabels={labels}
      tooltip={(i) => ({ title: labels[i], rows: [...data].reverse().map((d) => ({ name: d.name, value: String(d.values[i]), color: d.color })) })}
    >
      {(p) =>
        labels.map((_, i) => {
          const w = Math.max(Math.min(p.band * 0.62, 18), 2);
          let base = p.top + p.plotH;
          return (
            <g key={i}>
              {data.map((d, si) => {
                const h = (d.values[i] / yMax) * p.plotH;
                base -= h;
                if (h <= 0) return null;
                const last = data.slice(si + 1).every((o) => o.values[i] <= 0);
                return <path key={d.name} className="amsh-bar" style={{ animationDelay: `${i * 12}ms` }} d={last ? roundTop(p.cx(i) - w / 2, base, w, h, 3) : `M${p.cx(i) - w / 2},${base} h${w} v${h} h${-w} Z`} fill={d.color} />;
              })}
            </g>
          );
        })
      }
    </Shell>
  );
}

export function GroupedBars({ data, labels }: { data: Series[]; labels: string[] }) {
  const step = niceStep(Math.max(...data.flatMap((d) => d.values)));
  const yMax = step * 4;
  return (
    <Shell
      n={labels.length}
      yMax={yMax}
      height={170}
      xLabels={labels}
      tooltip={(i) => ({ title: labels[i], rows: data.map((d) => ({ name: d.name, value: String(d.values[i]), color: d.color })) })}
    >
      {(p) =>
        labels.map((_, i) => {
          const w = Math.min((p.band * 0.7) / data.length, 22);
          const start = p.cx(i) - (w * data.length) / 2;
          return (
            <g key={i}>
              {data.map((d, j) => {
                const h = (d.values[i] / yMax) * p.plotH;
                return h > 0 ? <path key={d.name} className="amsh-bar" style={{ animationDelay: `${i * 70 + j * 40}ms` }} d={roundTop(start + j * w, p.top + p.plotH - h, w - 2, h, 3)} fill={d.color} /> : null;
              })}
            </g>
          );
        })
      }
    </Shell>
  );
}

/** Bars plus up to two smooth lines. `lineScale="percent"` puts the lines on a 0-100% right axis; "own" gives them their own right axis. */
export function BarsWithLines({
  bars,
  barColor,
  barName,
  lines,
  labels,
  lineScale = 'percent',
  barFmt,
}: {
  bars: number[];
  barColor: string;
  barName: string;
  lines: { name: string; color: string; values: (number | null)[] }[];
  labels: string[];
  lineScale?: 'percent' | 'own';
  barFmt?: (v: number) => string;
}) {
  const yMax = niceStep(Math.max(...bars)) * 4;
  const lineMax = lineScale === 'percent' ? 100 : niceStep(Math.max(1, ...lines.flatMap((l) => l.values.map((v) => v ?? 0)))) * 4;
  const rightTicks = [0, 1, 2, 3, 4].map((t) => (lineScale === 'percent' ? `${t * 25}%` : compact((lineMax / 4) * t)));
  const fmt = barFmt || ((v: number) => String(v));
  return (
    <Shell
      n={labels.length}
      yMax={yMax}
      rightTicks={rightTicks}
      xLabels={labels}
      tooltip={(i) => ({
        title: labels[i],
        rows: [{ name: barName, value: fmt(bars[i]), color: barColor }, ...lines.map((l) => ({ name: l.name, value: l.values[i] == null ? '–' : lineScale === 'percent' ? `${l.values[i]}%` : compact(l.values[i] as number), color: l.color }))],
      })}
    >
      {(p) => (
        <>
          {bars.map((v, i) => {
            const h = (v / yMax) * p.plotH;
            const w = Math.max(Math.min(p.band * 0.62, 16), 2);
            return h > 0 ? <path key={i} className="amsh-bar" style={{ animationDelay: `${i * 10}ms` }} d={roundTop(p.cx(i) - w / 2, p.top + p.plotH - h, w, h, 3)} fill={barColor} opacity="0.4" /> : null;
          })}
          {lines.map((l) => {
            const pts = l.values.map((v, i) => (v == null ? null : { x: p.cx(i), y: p.top + p.plotH - (v / lineMax) * p.plotH }));
            return <path key={l.name} className="amsh-line" pathLength={1} d={smoothPath(pts)} fill="none" stroke={l.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />;
          })}
        </>
      )}
    </Shell>
  );
}

export function AreaLines({ series, labels }: { series: Series[]; labels: string[] }) {
  const yMax = niceStep(Math.max(...series.flatMap((s) => s.values))) * 4;
  return (
    <Shell n={labels.length} yMax={yMax} xLabels={labels} tooltip={(i) => ({ title: labels[i], rows: series.map((s) => ({ name: s.name, value: String(s.values[i]), color: s.color })) })}>
      {(p) =>
        series.map((s) => {
          const pts = s.values.map((v, i) => ({ x: p.cx(i), y: p.y(v) }));
          const line = smoothPath(pts);
          const area = `${line} L${pts[pts.length - 1].x},${p.top + p.plotH} L${pts[0].x},${p.top + p.plotH} Z`;
          return (
            <g key={s.name}>
              <defs>
                <linearGradient id={`area-${s.name.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path className="amsh-area" d={area} fill={`url(#area-${s.name.replace(/\W/g, '')})`} />
              <path className="amsh-line" pathLength={1} d={line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })
      }
    </Shell>
  );
}

export function Donut({ data, total, centerLabel }: { data: { name: string; value: number; color: string }[]; total: number; centerLabel: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const gap = data.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <svg viewBox="0 0 150 150" className="h-40 w-40 shrink-0" role="img" aria-label={`${centerLabel}: ${total}`}>
      <style>{CHART_CSS}</style>
      <circle cx="75" cy="75" r={r} fill="none" stroke={GRID} strokeWidth="20" />
      {total > 0 &&
        data.map((d) => {
          const len = Math.max((d.value / total) * c - gap, 0);
          const seg = (
            <circle key={d.name} className="amsh-seg" cx="75" cy="75" r={r} fill="none" stroke={d.color} strokeWidth="20" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 75 75)">
              <title>{`${d.name}: ${d.value}`}</title>
            </circle>
          );
          offset += (d.value / total) * c;
          return seg;
        })}
      <text x="75" y="76" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0F172A">
        {total}
      </text>
      <text x="75" y="93" textAnchor="middle" fontSize="10" fill={AXIS_TEXT}>
        {centerLabel}
      </text>
    </svg>
  );
}

/** The funnel graphic: four stacked, rounded steps that narrow downwards. Numbers sit beside it, so its shape is decorative. */
export function Funnel({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const widths = [100, 76, 54, 34, 20]; // half-widths of the boundaries between steps
  const h = 44;
  const gap = 4;
  return (
    <svg viewBox={`0 0 220 ${steps.length * (h + gap)}`} className="w-[150px] shrink-0 sm:w-[190px]" role="img" aria-label="Conversion funnel">
      <style>{CHART_CSS}</style>
      {steps.map((s, i) => {
        const y = i * (h + gap);
        const a = widths[i];
        const b = widths[i + 1];
        return (
          <polygon key={s.label} className="amsh-area" style={{ animationDelay: `${i * 120}ms` }} points={`${110 - a},${y} ${110 + a},${y} ${110 + b},${y + h} ${110 - b},${y + h}`} fill={s.color} stroke={s.color} strokeLinejoin="round" strokeWidth="4">
            <title>{`${s.label}: ${s.value}`}</title>
          </polygon>
        );
      })}
    </svg>
  );
}

/** Seven chunky bars that rise left to right, drawn at fixed pixel size (never stretched). Flat data shows even, muted bars. */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-9 w-[60px]" aria-hidden="true" />;
  const pts = downsample(values, 7, (c) => c[c.length - 1]);
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const flat = max === min;
  const w = 5;
  const gap = 3.5;
  return (
    <svg width={pts.length * (w + gap) - gap} height="36" aria-hidden="true">
      <style>{CHART_CSS}</style>
      {pts.map((v, i) => {
        const h = flat ? 10 : 6 + ((v - min) / (max - min)) * 28;
        return <rect key={i} className="amsh-bar" style={{ animationDelay: `${i * 50}ms` }} x={i * (w + gap)} y={36 - h} width={w} height={h} rx="2" fill={color} opacity={flat ? 0.3 : 0.4 + (i / pts.length) * 0.6} />;
      })}
    </svg>
  );
}
