"use client";

import { UnresolvedThread } from "@/lib/api";
import React from "react";

interface Props {
  threads: UnresolvedThread[];
  selectedId?: string;
  onSelect?: (id: string) => void;
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

interface HighlightProps {
  context: string;
  quote: string;
  highlightClass: string;
}

function HighlightQuote({ context, quote, highlightClass }: HighlightProps) {
  if (!context) return null;
  if (!quote) return <span>{context}</span>;

  const idx = context.toLowerCase().indexOf(quote.toLowerCase());
  if (idx === -1) {
    return <span>{context}</span>;
  }

  const prefix = context.substring(0, idx);
  const match = context.substring(idx, idx + quote.length);
  const suffix = context.substring(idx + quote.length);

  return (
    <span>
      {prefix}
      <span className={`${highlightClass} px-1.5 py-0.5 rounded font-medium bg-opacity-20`}>
        {match}
      </span>
      {suffix}
    </span>
  );
}

export default function ThreadsList({ threads, selectedId, onSelect }: Props) {
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
        const isSelected = selectedId === thread.id;

        return (
          <div
            key={thread.id}
            onClick={() => onSelect?.(thread.id)}
            style={{ animationDelay: `${idx * 100}ms` }}
            className={`cursor-pointer rounded-2xl border ${
              isSelected
                ? "border-neon-cyan bg-neon-cyan/5 shadow-glow-cyan/10"
                : "border-obsidian-border bg-[#0c111d]/75"
            } p-6 shadow-sm hover:translate-x-1 hover:bg-[#111727] hover:shadow-glow-cyan/5 transition-all duration-300 glass-panel animate-fade-in-up`}
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

                {/* Evidence Context */}
                {isSelected && thread.evidence && (
                  <div className="mt-4 pt-4 border-t border-obsidian-border/50 space-y-2 animate-fade-in">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Context Citation:</div>
                    <div className="space-y-1.5 pl-3 border-l-2 border-neon-cyan/40">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-neon-cyan">
                        Source: {thread.evidence.chapter_id.replace(/_/g, " ").toUpperCase()}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic bg-black/40 rounded-lg p-3 border border-obsidian-border/30">
                        &ldquo;... <HighlightQuote context={thread.evidence.context} quote={thread.evidence.quote} highlightClass="bg-neon-cyan/20 text-neon-cyan border-b border-neon-cyan" /> ...&rdquo;
                      </p>
                    </div>
                  </div>
                )}
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
