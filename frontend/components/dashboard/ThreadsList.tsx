"use client";

import { UnresolvedThread } from "@/lib/api";
import React from "react";

interface Props {
  threads: UnresolvedThread[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

const TYPE_STYLES: Record<string, string> = {
  chekhov_gun: "bg-velvet/10 border-velvet/30 text-velvet",
  promise: "bg-gold/10 border-gold/30 text-gold",
  foreshadowing: "bg-crimson/10 border-crimson/30 text-crimson",
  question: "bg-sage/10 border-sage/30 text-sage",
};

const TYPE_LABELS: Record<string, string> = {
  chekhov_gun: "Chekhov's Gun",
  promise: "Narrative Promise",
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
      <span className={`${highlightClass} px-1.5 py-0.5 rounded font-medium bg-opacity-25`}>
        {match}
      </span>
      {suffix}
    </span>
  );
}

export default function ThreadsList({ threads, selectedId, onSelect }: Props) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-2xl border border-dashed border-paper-border bg-paper-darker text-sm text-ink-muted gap-2 font-serif">
        <span className="text-sage text-xl font-bold">✓</span>
        All narrative threads have been successfully resolved in the manuscript.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {threads.map((thread, idx) => {
        const typeCls = TYPE_STYLES[thread.type] ?? "bg-paper-darker border-paper-border text-ink-muted";
        const typeLabel = TYPE_LABELS[thread.type] ?? thread.type.replace(/_/g, " ");
        const isSelected = selectedId === thread.id;

        return (
          <div
            key={thread.id}
            onClick={() => onSelect?.(thread.id)}
            style={{ animationDelay: `${idx * 80}ms` }}
            className={`cursor-pointer rounded-xl border transition-all duration-300 relative overflow-hidden p-6 ${
              isSelected
                ? "border-gold bg-paper-card shadow-book-lg border-l-4 border-l-gold rotate-0 scale-[1.01] z-10"
                : "border-paper-border bg-paper-card hover:border-gold/40 hover:-translate-y-0.5 hover:shadow-book even:rotate-[0.2deg] odd:-rotate-[0.2deg]"
            } glass-panel animate-fade-in-up`}
          >
            {/* Fine copper corner markers on selection */}
            {isSelected && (
              <div className="absolute top-2 right-2 font-mono text-[8px] text-gold select-none">📌 PINNED TASK</div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded border px-2 py-0.5 text-[9px] font-sans font-bold uppercase tracking-wider ${typeCls}`}>
                    {typeLabel.toUpperCase()}
                  </span>
                </div>
                
                <h4 className="font-display text-lg font-bold text-ink tracking-wide leading-relaxed">
                  {thread.description}
                </h4>
                
                <div className="text-xs text-ink-muted font-mono uppercase tracking-wider flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-ink-light">Introduced In:</span>
                  <span className="rounded bg-paper-darker border border-paper-border px-2.5 py-0.5 text-gold text-[9px] font-bold shadow-inner">
                    {thread.introduced_chapter.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>

                {/* Evidence Context */}
                {isSelected && thread.evidence && (
                  <div className="mt-6 pt-4 border-t border-paper-border/60 space-y-4 animate-fade-in">
                    <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-faded">Context Citation (Ledger Extract):</div>
                    <div className="space-y-2 pl-4 border-l border-gold/50">
                      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-gold">
                        Source: {thread.evidence.chapter_id.replace(/_/g, " ").toUpperCase()}
                      </div>
                      
                      <blockquote className="text-xs text-ink-muted leading-relaxed italic bg-paper-darker rounded-lg p-3.5 border border-paper-border font-mono relative overflow-hidden">
                        <span className="absolute top-1 right-2 text-[10px] text-paper-border select-none">“</span>
                        &ldquo;<HighlightQuote context={thread.evidence.context} quote={thread.evidence.quote} highlightClass="bg-gold/10 text-gold border-b border-gold/35 font-bold" />&rdquo;
                      </blockquote>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status pill */}
              <div className="shrink-0 self-start sm:self-center">
                {thread.resolved ? (
                  <span className="inline-flex items-center rounded bg-sage/10 border border-sage/35 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-sage shadow-sm">
                    RESOLVED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded bg-gold/5 border border-gold/30 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-gold shadow-sm">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold"></span>
                    </span>
                    OPEN LINE
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
