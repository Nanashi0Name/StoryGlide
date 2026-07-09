"use client";

import { UnresolvedThread } from "@/lib/api";
import React from "react";

interface Props {
  threads: UnresolvedThread[];
}

const TYPE_STYLES: Record<string, string> = {
  chekhov_gun: "bg-neon-purple/10 border-neon-purple/30 text-neon-purple shadow-[0_0_8px_rgba(189,94,255,0.15)]",
  promise: "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan shadow-[0_0_8px_rgba(13,240,255,0.15)]",
  foreshadowing: "bg-neon-amber/10 border-neon-amber/30 text-neon-amber shadow-[0_0_8px_rgba(255,173,51,0.15)]",
  question: "bg-neon-green/10 border-neon-green/30 text-neon-green shadow-[0_0_8px_rgba(5,243,173,0.15)]",
};

const TYPE_LABELS: Record<string, string> = {
  chekhov_gun: "Chekhov's Gun",
  promise: "Promise",
  foreshadowing: "Foreshadowing",
  question: "Narrative Question",
};

export default function ThreadsList({ threads }: Props) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 rounded-2xl border border-dashed border-obsidian-border bg-obsidian-card text-sm text-slate-400 gap-2 font-mono">
        <span className="text-neon-green text-xl font-bold">✓</span>
        NO_UNRESOLVED_THREADS_FOUND
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {threads.map((thread, idx) => {
        const typeCls = TYPE_STYLES[thread.type] ?? "bg-slate-800 border-slate-700 text-slate-400";
        const typeLabel = TYPE_LABELS[thread.type] ?? thread.type.replace(/_/g, " ");

        return (
          <div
            key={thread.id}
            style={{ animationDelay: `${idx * 100}ms` }}
            className="rounded-2xl border border-obsidian-border bg-[#0c111d]/75 p-6 shadow-sm hover:translate-x-1 hover:bg-[#111727] hover:shadow-glow-cyan/5 transition-all duration-300 glass-panel animate-fade-in-up"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-md border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${typeCls}`}>
                    {typeLabel.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm font-serif text-white tracking-wide leading-relaxed font-medium">
                  {thread.description}
                </p>
                
                <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 pt-1">
                  <span>INTRODUCED_AT:</span>
                  <code className="rounded bg-[#060913] border border-obsidian-border px-2 py-0.5 text-neon-cyan text-[11px]">
                    {thread.introduced_chapter.toUpperCase()}
                  </code>
                </div>
              </div>
              
              {/* Status pill */}
              <div className="shrink-0 pt-0.5 self-start sm:self-center">
                {thread.resolved ? (
                  <span className="inline-flex items-center rounded-md bg-neon-green/10 border border-neon-green/30 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neon-green shadow-[0_0_8px_rgba(5,243,173,0.1)]">
                    Resolved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-md bg-neon-rose/10 border border-neon-rose/30 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neon-rose shadow-[0_0_8px_rgba(255,75,114,0.1)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-rose opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-rose"></span>
                    </span>
                    Open Thread
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
