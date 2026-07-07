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

  const intensityScale = scaleLinear({ domain: [0, maxWords], range: [0.1, 1] });

  const totalWidth = n * cellWidth + (n - 1) * CELL_GAP + MARGIN.left + MARGIN.right;
  const totalHeight = CELL_HEIGHT + LABEL_HEIGHT + MARGIN.top;

  return (
    <div style={{ position: "relative", overflowX: "auto" }}>
      <svg width={Math.max(totalWidth, width)} height={totalHeight}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          {arc.map((d, i) => {
            const x = i * (cellWidth + CELL_GAP);
            const intensity = intensityScale(d.word_count);
            const fill = `rgba(59, 130, 212, ${intensity})`;
            const label =
              d.chapter_id.length > 8
                ? d.chapter_id.replace(/chapter_?/i, "Ch.").replace(/_/g, " ")
                : d.chapter_id;

            return (
              <g key={d.chapter_id}>
                <rect
                  x={x}
                  y={0}
                  width={cellWidth}
                  height={CELL_HEIGHT}
                  fill={fill}
                  rx={4}
                  style={{ cursor: "pointer" }}
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
                  fill={intensity > 0.5 ? "#ffffff" : "#1f2328"}
                  fontWeight={600}
                >
                  {d.word_count > 0 ? `${Math.round(d.word_count / 100) / 10}k` : "—"}
                </text>
                {/* chapter label below */}
                <text
                  x={x + cellWidth / 2}
                  y={CELL_HEIGHT + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#57606a"
                  transform={`rotate(-40, ${x + cellWidth / 2}, ${CELL_HEIGHT + 16})`}
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
          style={{ ...defaultStyles, background: "#1f2328", color: "#fff", fontSize: 12, lineHeight: 1.6 }}
        >
          <div className="font-semibold">{tooltipData.chapter_id}</div>
          <div>Words: {tooltipData.word_count.toLocaleString()}</div>
        </Tooltip>
      )}
    </div>
  );
}

export default function PacingHeatmap({ arc }: Props) {
  if (arc.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] text-sm text-[#57606a]">
        No pacing data available yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
      <div className="text-xs font-semibold text-[#57606a] uppercase tracking-wider mb-3">
        Pacing — Word Count per Chapter
      </div>
      <ParentSize>
        {({ width }) => <PacingHeatmapInner arc={arc} width={Math.max(200, width)} />}
      </ParentSize>
      <div className="mt-2 flex items-center gap-2 text-xs text-[#57606a]">
        <span>Low density</span>
        <div className="flex gap-px">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
            <span key={o} className="inline-block h-3 w-6 rounded-sm" style={{ background: `rgba(59,130,212,${o})` }} />
          ))}
        </div>
        <span>High density</span>
      </div>
    </div>
  );
}
