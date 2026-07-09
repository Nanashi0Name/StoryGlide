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
  fear: "#ff4b72", // neon-rose
  anger: "#ffad33", // neon-amber
  joy: "#05f3ad", // neon-green
  sadness: "#0df0ff", // neon-cyan
  surprise: "#bd5eff", // neon-purple
  disgust: "#64748b", // slate-500
  anticipation: "#f97316", // orange
  trust: "#10b981", // emerald
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
        {/* Glow Filters */}
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={innerWidth} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3,3" numTicks={5} />

          {/* Reference arc */}
          <LinePath
            data={idealArc}
            x={(d) => xScale(d.chapter_id) ?? 0}
            y={(d) => yScale(d.tension_score)}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={1.5}
            strokeDasharray="6,3"
          />

          {/* Actual arc */}
          <LinePath
            data={arc}
            x={(d) => xScale(d.chapter_id) ?? 0}
            y={(d) => yScale(d.tension_score)}
            stroke="#0df0ff"
            strokeWidth={3}
            filter="url(#neon-glow)"
          />

          {/* Data points */}
          {arc.map((d, i) => {
            const cx = xScale(d.chapter_id) ?? 0;
            const cy = yScale(d.tension_score);
            const color = EMOTION_COLOR[d.dominant_emotion] ?? "#0df0ff";
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={5}
                fill={color}
                stroke="#060913"
                strokeWidth={2}
                style={{ cursor: "pointer", transition: "all 0.2s" }}
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
            tickLabelProps={{ fontSize: 9, fill: "#94a3b8", fontFamily: "var(--font-mono)", textAnchor: "end", dy: 4, dx: -4, transform: "rotate(-35)" }}
            stroke="rgba(255, 255, 255, 0.08)"
            tickStroke="rgba(255, 255, 255, 0.08)"
          />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            tickLabelProps={{ fontSize: 9, fill: "#94a3b8", fontFamily: "var(--font-mono)", dx: -4 }}
            stroke="rgba(255, 255, 255, 0.08)"
            tickStroke="rgba(255, 255, 255, 0.08)"
            label="Tension Index"
            labelProps={{ fontSize: 10, fill: "#94a3b8", fontFamily: "var(--font-mono)", textAnchor: "middle", dy: -10 }}
          />
        </Group>
      </svg>

      {tooltipData && (
        <Tooltip
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            ...defaultStyles,
            background: "rgba(12, 17, 29, 0.9)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(13, 240, 255, 0.3)",
            color: "#f1f5f9",
            fontSize: 11,
            lineHeight: 1.5,
            fontFamily: "var(--font-mono)",
            boxShadow: "0 0 15px rgba(13, 240, 255, 0.15)",
            padding: "8px 12px",
            borderRadius: "8px",
          }}
        >
          <div className="font-bold text-white border-b border-white/10 pb-1 mb-1 uppercase text-xs tracking-wider">
            {tooltipData.chapter_id.replace(/_/g, " ")}
          </div>
          <div>TENSION: <span className="text-neon-cyan font-bold">{Math.round(tooltipData.tension_score * 100)}%</span></div>
          <div className="capitalize">SENTIMENT: <span className="text-neon-green font-bold">{tooltipData.sentiment}</span></div>
          <div className="capitalize">EMOTION: <span className="font-bold" style={{ color: EMOTION_COLOR[tooltipData.dominant_emotion] }}>{tooltipData.dominant_emotion}</span></div>
        </Tooltip>
      )}

      {/* Legend: dashed = ideal reference */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 px-2 text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-6 rounded bg-[#0df0ff] shadow-[0_0_8px_#0df0ff]" />
          MANUSCRIPT ARC
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-6 border-t border-dashed border-slate-500" />
          IDEAL ARC MODEL
        </span>
        <div className="flex gap-3 ml-auto">
          {Object.entries(EMOTION_COLOR).map(([emotion, color]) => (
            <span key={emotion} className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] uppercase tracking-wider text-slate-500">{emotion}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArcChart({ arc }: Props) {
  if (arc.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-obsidian-border bg-obsidian-card text-sm text-slate-400">
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
