"use client";

import { ArcDataPoint } from "@/lib/api";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { Tooltip, useTooltip, defaultStyles } from "@visx/tooltip";
import React from "react";

interface Props {
  arc: ArcDataPoint[];
}

const MARGIN = { top: 24, right: 20, bottom: 48, left: 52 };

const EMOTION_COLOR: Record<string, string> = {
  fear: "#ef4444",
  anger: "#f97316",
  joy: "#22c55e",
  sadness: "#3b82f6",
  surprise: "#a855f7",
  disgust: "#6b7280",
  anticipation: "#f59e0b",
  trust: "#10b981",
};

function ArcChartInner({ arc, width, height }: Props & { width: number; height: number }) {
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } =
    useTooltip<ArcDataPoint>();

  const xScale = scalePoint({
    domain: arc.map((d) => d.chapter_id),
    range: [0, innerWidth],
    padding: 0.3,
  });

  const yScale = scaleLinear({ domain: [0, 1], range: [innerHeight, 0], nice: true });

  // Reference "ideal" arc: rise–fall–rise
  const idealArc = arc.map((d, i) => {
    const t = i / Math.max(arc.length - 1, 1);
    const y = t < 0.5 ? 0.2 + t * 1.2 : 0.8 - (t - 0.5) * 0.8 + 0.1;
    return { ...d, tension_score: Math.max(0, Math.min(1, y)) };
  });

  return (
    <div style={{ position: "relative" }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={innerWidth} stroke="#e5e7eb" strokeDasharray="3,3" numTicks={5} />

          {/* Reference arc */}
          <LinePath
            data={idealArc}
            x={(d) => xScale(d.chapter_id) ?? 0}
            y={(d) => yScale(d.tension_score)}
            stroke="#d1d5db"
            strokeWidth={1.5}
            strokeDasharray="6,3"
          />

          {/* Actual arc */}
          <LinePath
            data={arc}
            x={(d) => xScale(d.chapter_id) ?? 0}
            y={(d) => yScale(d.tension_score)}
            stroke="#3b82d4"
            strokeWidth={2.5}
          />

          {/* Data points */}
          {arc.map((d, i) => {
            const cx = xScale(d.chapter_id) ?? 0;
            const cy = yScale(d.tension_score);
            const color = EMOTION_COLOR[d.dominant_emotion] ?? "#3b82d4";
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={6}
                fill={color}
                stroke="#ffffff"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  showTooltip({ tooltipData: d, tooltipLeft: cx + MARGIN.left, tooltipTop: cy + MARGIN.top })
                }
                onMouseLeave={hideTooltip}
              />
            );
          })}

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickLabelProps={{ fontSize: 10, fill: "#57606a", textAnchor: "end", dy: 4, dx: -4, transform: "rotate(-35)" }}
            stroke="#e5e7eb"
            tickStroke="#e5e7eb"
          />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            tickLabelProps={{ fontSize: 10, fill: "#57606a", dx: -4 }}
            stroke="#e5e7eb"
            tickStroke="#e5e7eb"
            label="Tension"
            labelProps={{ fontSize: 11, fill: "#57606a", textAnchor: "middle" }}
          />
        </Group>
      </svg>

      {tooltipData && (
        <Tooltip
          left={tooltipLeft}
          top={tooltipTop}
          style={{ ...defaultStyles, background: "#1f2328", color: "#fff", fontSize: 12, lineHeight: 1.6 }}
        >
          <div className="font-semibold">{tooltipData.chapter_id}</div>
          <div>Tension: {Math.round(tooltipData.tension_score * 100)}%</div>
          <div>Sentiment: {tooltipData.sentiment}</div>
          <div>Emotion: {tooltipData.dominant_emotion}</div>
        </Tooltip>
      )}

      {/* Legend: dashed = ideal reference */}
      <div className="flex gap-4 mt-2 px-2 text-xs text-[#57606a]">
        <span className="flex items-center gap-1.5">
          <svg width={24} height={4}><line x1={0} y1={2} x2={24} y2={2} stroke="#3b82d4" strokeWidth={2.5} /></svg>
          Your arc
        </span>
        <span className="flex items-center gap-1.5">
          <svg width={24} height={4}><line x1={0} y1={2} x2={24} y2={2} stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4,2" /></svg>
          Reference arc
        </span>
      </div>
    </div>
  );
}

export default function ArcChart({ arc }: Props) {
  if (arc.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] text-sm text-[#57606a]">
        No arc data available yet.
      </div>
    );
  }

  return (
    <ParentSize>
      {({ width }) => (
        <ArcChartInner arc={arc} width={Math.max(300, width)} height={300} />
      )}
    </ParentSize>
  );
}
