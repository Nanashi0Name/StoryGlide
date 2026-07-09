"use client";

import { ContradictionFlag } from "@/lib/api";
import React from "react";

interface Props {
  contradictions: ContradictionFlag[];
}

interface VisualTheme {
  badge: string;
  border: string;
  shadow: string;
  text: string;
  fill: string;
}

function confidenceTheme(c: number): VisualTheme {
  if (c >= 0.8) {
    return {
      badge: "bg-neon-rose/10 border border-neon-rose/30 text-neon-rose",
      border: "border-neon-rose/30",
      shadow: "hover:shadow-glow-rose/10",
      text: "text-neon-rose",
      fill: "bg-neon-rose",
    };
  }
  if (c >= 0.5) {
    return {
      badge: "bg-neon-amber/10 border border-neon-amber/30 text-neon-amber",
      border: "border-neon-amber/20",
      shadow: "hover:shadow-glow-amber/10",
      text: "text-neon-amber",
      fill: "bg-neon-amber",
    };
  }
  return {
    badge: "bg-slate-800 border border-slate-700 text-slate-400",
    border: "border-obsidian-border",
    shadow: "hover:shadow-glow-cyan/5",
    text: "text-slate-400",
    fill: "bg-slate-500",
  };
}

export default function ContradictionsList({ contradictions }: Props) {
  if (contradictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 rounded-2xl border border-dashed border-obsidian-border bg-obsidian-card text-sm text-slate-400 gap-2 font-mono">
        <span className="text-neon-green text-xl font-bold">✓</span>
        NO_TIMELINE_CONTRADICTIONS_DETECTED
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contradictions.map((flag, idx) => {
        const theme = confidenceTheme(flag.confidence);
        return (
          <div
            key={flag.id}
            style={{ animationDelay: `${idx * 100}ms` }}
            className={`rounded-2xl border ${theme.border} bg-[#0c111d]/75 p-6 shadow-sm hover:translate-x-1 hover:bg-[#111727] ${theme.shadow} transition-all duration-300 glass-panel animate-fade-in-up`}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${theme.badge}`}>
                    {flag.type.replace(/_/g, " ")}
                  </span>
                  <span className="font-serif text-lg font-bold text-white tracking-wide">{flag.entity}</span>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed font-sans">{flag.description}</p>
                
                <div className="flex flex-wrap gap-2 text-xs text-slate-400 items-center font-mono pt-1">
                  <span>CONFLICTING_SECTIONS:</span>
                  {flag.conflicting_chapters.map((ch) => (
                    <code
                      key={ch}
                      className="rounded bg-[#060913] border border-obsidian-border px-2 py-0.5 text-neon-cyan text-[11px]"
                    >
                      {ch.toUpperCase()}
                    </code>
                  ))}
                </div>
              </div>
              
              {/* Confidence indicator */}
              <div className="flex flex-col items-start md:items-end shrink-0 gap-1.5 pt-1 border-t border-obsidian-border/50 md:border-0 pt-3 md:pt-0">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Confidence Rating</span>
                <span className={`text-xl font-mono font-extrabold tracking-tight ${theme.text}`}>
                  {Math.round(flag.confidence * 100)}%
                </span>
                <div className="h-1.5 w-24 rounded-full bg-[#060913] overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${theme.fill}`}
                    style={{ width: `${flag.confidence * 100}%` }}
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
