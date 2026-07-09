"use client";

import { ArcDataPoint } from "@/lib/api";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { Tooltip, useTooltip, defaultStyles } from "@visx/tooltip";
import React from "react";

interface Props {
  arc: ArcDataPoint[];
}

const CELL_HEIGHT = 48;
const CELL_GAP = 4;
const LABEL_HEIGHT = 52;
const MARGIN = { top: 16, right: 16, bottom: 0, left: 16 };

function PacingHeatmapInner({ arc, width }: Props & { width: number }) {
  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } =
    useTooltip<ArcDataPoint & { cellX: number }>();

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const n = arc.length;
  if (n === 0) return null;

  const cellWidth = Math.max(24, (innerWidth - (n - 1) * CELL_GAP) / n);
  const maxWords = Math.max(...arc.map((d) => d.word_count), 1);

  const intensityScale = scaleLinear({ domain: [0, maxWords], range: [0.15, 1] });

  const totalWidth = n * cellWidth + (n - 1) * CELL_GAP + MARGIN.left + MARGIN.right;
  const totalHeight = CELL_HEIGHT + LABEL_HEIGHT + MARGIN.top;

  return (
    <div style={{ position: "relative", overflowX: "auto" }}>
      <svg width={Math.max(totalWidth, width)} height={totalHeight}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          {arc.map((d, i) => {
            const x = i * (cellWidth + CELL_GAP);
            const intensity = intensityScale(d.word_count);
            // Neon cyan pacing intensity fill
            const fill = `rgba(13, 240, 255, ${intensity})`;
            const label =
              d.chapter_id.length > 8
                ? d.chapter_id.replace(/chapter_?/i, "Ch.").replace(/_/g, " ")
                : d.chapter_id;

            return (
              <g key={d.chapter_id} className="group">
                <rect
                  x={x}
                  y={0}
                  width={cellWidth}
                  height={CELL_HEIGHT}
                  fill={fill}
                  rx={6}
                  stroke={intensity > 0.8 ? "rgba(13, 240, 255, 0.4)" : "rgba(255,255,255,0.05)"}
                  strokeWidth={1.5}
                  style={{ cursor: "pointer", transition: "all 0.2s" }}
                  className="hover:stroke-neon-cyan hover:filter hover:drop-shadow-[0_0_4px_rgba(13,240,255,0.5)]"
                  onMouseEnter={() =>
                    showTooltip({
                      tooltipData: { ...d, cellX: x },
                      tooltipLeft: x + MARGIN.left + cellWidth / 2,
                      tooltipTop: MARGIN.top,
                    })
                  }
                  onMouseLeave={hideTooltip}
                />
                {/* word count label inside cell */}
                <text
                  x={x + cellWidth / 2}
                  y={CELL_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill={intensity > 0.5 ? "#060913" : "#f1f5f9"}
                  fontWeight={700}
                  fontFamily="var(--font-mono)"
                  style={{ pointerEvents: "none" }}
                >
                  {d.word_count > 0 ? `${Math.round(d.word_count / 100) / 10}k` : "—"}
                </text>
                {/* chapter label below */}
                <text
                  x={x + cellWidth / 2}
                  y={CELL_HEIGHT + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#94a3b8"
                  fontFamily="var(--font-mono)"
                  transform={`rotate(-40, ${x + cellWidth / 2}, ${CELL_HEIGHT + 16})`}
                  style={{ pointerEvents: "none" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </Group>
      </svg>

      {tooltipData && (
        <Tooltip
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            ...defaultStyles,
            background: "rgba(12, 17, 29, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(13, 240, 255, 0.3)",
            color: "#f1f5f9",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            boxShadow: "0 0 15px rgba(13, 240, 255, 0.15)",
            padding: "8px 12px",
            borderRadius: "8px",
          }}
        >
          <div className="font-bold text-white border-b border-white/10 pb-1 mb-1 uppercase text-2xs tracking-wider">
            {tooltipData.chapter_id.replace(/_/g, " ")}
          </div>
          <div>WORD COUNT: <span className="text-neon-cyan font-bold">{tooltipData.word_count.toLocaleString()}</span></div>
        </Tooltip>
      )}
    </div>
  );
}

export default function PacingHeatmap({ arc }: Props) {
  if (arc.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl border border-obsidian-border bg-obsidian-card text-sm text-slate-400">
        No pacing data available yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-obsidian-border bg-obsidian-card p-6 glass-panel">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono mb-4 flex items-center justify-between">
        <span>PACING_MATRIX // WORD_COUNT</span>
        <span className="text-[10px] text-slate-500 font-normal">[AXIS: ORDERED_CHAPTERS]</span>
      </div>
      <ParentSize>
        {({ width }) => <PacingHeatmapInner arc={arc} width={Math.max(200, width)} />}
      </ParentSize>
      <div className="mt-4 flex items-center gap-3 text-[10px] font-mono text-slate-500">
        <span>SPARSE</span>
        <div className="flex gap-[3px]">
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((o) => (
            <span key={o} className="inline-block h-3.5 w-7 rounded-sm border border-white/5" style={{ background: `rgba(13,240,255,${o})` }} />
          ))}
        </div>
        <span>DENSE</span>
      </div>
    </div>
  );
}
