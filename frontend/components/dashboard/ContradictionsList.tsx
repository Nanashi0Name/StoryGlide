"use client";

import { ContradictionFlag } from "@/lib/api";
import React from "react";

interface Props {
  contradictions: ContradictionFlag[];
}

function confidenceColor(c: number): { badge: string; bar: string } {
  if (c >= 0.8) return { badge: "bg-red-100 text-red-800", bar: "#ef4444" };
  if (c >= 0.5) return { badge: "bg-amber-100 text-amber-800", bar: "#f59e0b" };
  return { badge: "bg-gray-100 text-gray-600", bar: "#9ca3af" };
}

export default function ContradictionsList({ contradictions }: Props) {
  if (contradictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] text-sm text-[#57606a] gap-2">
        <span className="text-2xl">✓</span>
        No logical contradictions detected — great continuity!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contradictions.map((flag) => {
        const { badge, bar } = confidenceColor(flag.confidence);
        return (
          <div
            key={flag.id}
            className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded px-2.5 py-0.5 text-xs font-semibold uppercase ${badge}`}>
                    {flag.type.replace(/_/g, " ")}
                  </span>
                  <span className="font-bold text-[#1f2328]">{flag.entity}</span>
                </div>
                <p className="mt-2 text-sm text-[#24292f]">{flag.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#57606a] items-center">
                  <span>Conflicting chapters:</span>
                  {flag.conflicting_chapters.map((ch) => (
                    <code
                      key={ch}
                      className="rounded bg-[#f7f8fa] border border-[#e5e7eb] px-1.5 py-0.5 text-[#1f2328]"
                    >
                      {ch}
                    </code>
                  ))}
                </div>
              </div>
              {/* Confidence indicator */}
              <div className="flex flex-col items-end shrink-0 gap-1 pt-0.5">
                <span className="text-xs text-[#57606a]">Confidence</span>
                <span className="text-lg font-bold" style={{ color: bar }}>
                  {Math.round(flag.confidence * 100)}%
                </span>
                <div className="h-1.5 w-20 rounded-full bg-[#e5e7eb] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${flag.confidence * 100}%`, background: bar }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
