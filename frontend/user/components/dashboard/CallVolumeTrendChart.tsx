"use client";
import React, { useState } from 'react';
import { VolumeTrendPoint } from '../../controllers/analytics.controller';
import { ChartSkeleton } from '../common/ShimmerSkeleton';

interface CallVolumeTrendChartProps {
  data?: VolumeTrendPoint[];
  loading?: boolean;
}

export function CallVolumeTrendChart({ data, loading = false }: CallVolumeTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const points = data || [];

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 160;
  const paddingLeft = 32;
  const paddingRight = 36;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxCalls = points.length > 0 ? Math.max(...points.map((p) => p.calls), 20) : 20;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  const linePoints = points.map((p, idx) => {
    const x = paddingLeft + idx * stepX;
    const y = paddingTop + chartHeight - (p.answer_rate / 100) * chartHeight;
    return { x, y, ...p };
  });

  const linePath = linePoints.length > 0
    ? linePoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
    : '';

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[260px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">Call Volume Trend</h3>
          <p className="text-[11px] text-gray-500 font-medium">Total incoming calls and AI handling rate</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#C9DCFF]" />
              <span>Call Volume</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
              <span>AI Answer Rate</span>
            </span>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 transition-colors"
          >
            <span>Selected Period</span>
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* State 1: Loading Progress State */}
      {loading ? (
        <ChartSkeleton height="h-40" />
      ) : points.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center my-auto">
          <p className="text-xs font-bold text-gray-800">No trend data available for this range</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Calls will be plotted as they occur.</p>
        </div>
      ) : (
        /* Dual Axis Chart View */
        <div className="relative w-full overflow-hidden pt-1 pb-1">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Grid lines and Left/Right Y-axis ticks */}
            {[100, 80, 60, 40, 20, 0].map((val) => {
              const y = paddingTop + chartHeight - (val / 100) * chartHeight;
              const ratePercent = `${val}%`;
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#F3F4F6"
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-gray-400 text-[9px] font-semibold"
                  >
                    {Math.round((val / 100) * maxCalls)}
                  </text>
                  <text
                    x={svgWidth - paddingRight + 6}
                    y={y + 3}
                    textAnchor="start"
                    className="fill-gray-400 text-[9px] font-semibold"
                  >
                    {ratePercent}
                  </text>
                </g>
              );
            })}

            {/* Volume Bars */}
            {points.map((pt, idx) => {
              const x = paddingLeft + idx * stepX;
              const barWidth = 14;
              const barHeight = maxCalls > 0 ? (pt.calls / maxCalls) * chartHeight : 0;
              const barY = paddingTop + chartHeight - barHeight;
              const isHovered = hoveredIdx === idx;

              return (
                <rect
                  key={`bar-${idx}`}
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  className={`transition-all duration-200 cursor-pointer ${
                    isHovered ? 'fill-[#0066FF]' : 'fill-[#DCE8FF] hover:fill-[#B8D3FF]'
                  }`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}

            {/* AI Answer Rate Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#0066FF"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Line Data Points */}
            {linePoints.map((pt, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <circle
                  key={`dot-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 4.5 : 3}
                  className="fill-[#0066FF] stroke-white transition-all duration-150 cursor-pointer"
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}

            {/* X-axis Date Labels */}
            {points.map((pt, idx) => {
              const x = paddingLeft + idx * stepX;
              return (
                <text
                  key={`date-${idx}`}
                  x={x}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  className={`text-[9px] font-semibold transition-colors ${
                    hoveredIdx === idx ? 'fill-gray-900 font-bold' : 'fill-gray-400'
                  }`}
                >
                  {pt.date}
                </text>
              );
            })}
          </svg>

          {/* Hover info tooltip box */}
          {hoveredIdx !== null && (
            <div
              className="absolute top-2 right-12 bg-gray-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-md flex items-center gap-2 pointer-events-none"
            >
              <span className="font-bold">{points[hoveredIdx].date}:</span>
              <span className="text-blue-300">{points[hoveredIdx].calls} calls</span>
              <span>•</span>
              <span className="text-emerald-300">{points[hoveredIdx].answer_rate}% AI answer rate</span>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 mt-1">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
          Aggregated by date interval
        </span>
        <span className="text-[10px] font-bold text-gray-400">Live DB Timeline</span>
      </div>
    </div>
  );
}
