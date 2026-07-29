"use client";

import { UnresolvedThread } from "@/lib/api";
import React from "react";

interface Props {
  threads: UnresolvedThread[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

const TYPE_STYLES: Record<string, string> = {
  chekhov_gun: "bg-velvet/5 border-velvet/20 text-velvet",
  promise: "bg-gold/5 border-gold/20 text-gold",
  foreshadowing: "bg-crimson/5 border-crimson/20 text-crimson",
  question: "bg-sage/5 border-sage/20 text-sage",
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
      <div className="flex flex-col items-center justify-center h-40 rounded-2xl border border-dashed border-paper-border bg-paper-darker text-sm text-ink-muted gap-2 font-serif">
        <span className="text-sage text-xl font-bold">✓</span>
        All narrative threads have been successfully resolved.
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
            style={{ animationDelay: `${idx * 100}ms` }}
            className={`cursor-pointer rounded-2xl border ${
              isSelected
                ? "border-gold bg-gold/5 shadow-book-lg"
                : "border-paper-border bg-paper-card"
            } p-6 shadow-sm hover:translate-x-1 hover:bg-paper-darker/35 hover:shadow-book transition-all duration-300 glass-panel animate-fade-in-up`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-md border px-2.5 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider ${typeCls}`}>
                    {typeLabel.toUpperCase()}
                  </span>
                </div>
                
                <p className="font-serif text-ink tracking-wide leading-relaxed font-bold">
                  {thread.description}
                </p>
                
                <div className="text-xs text-ink-muted font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 pt-1">
                  <span>Introduced In:</span>
                  <span className="rounded bg-paper-darker border border-paper-border px-2.5 py-0.5 text-gold text-[10px] font-sans font-bold uppercase tracking-wider shadow-inner">
                    {thread.introduced_chapter.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>

                {/* Evidence Context */}
                {isSelected && thread.evidence && (
                  <div className="mt-4 pt-4 border-t border-paper-border/60 space-y-2 animate-fade-in">
                    <div className="text-[9px] font-sans font-bold uppercase tracking-wider text-ink-muted">Context Citation:</div>
                    <div className="space-y-1.5 pl-3 border-l-2 border-gold/40">
                      <div className="text-[9px] font-sans font-bold uppercase tracking-wider text-gold">
                        Source: {thread.evidence.chapter_id.replace(/_/g, " ").toUpperCase()}
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed italic bg-paper-darker rounded-lg p-3 border border-paper-border/60">
                        &ldquo;... <HighlightQuote context={thread.evidence.context} quote={thread.evidence.quote} highlightClass="bg-gold/15 text-gold border-b border-gold/30" /> ...&rdquo;
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status pill */}
              <div className="shrink-0 pt-0.5 self-start sm:self-center">
                {thread.resolved ? (
                  <span className="inline-flex items-center rounded-md bg-sage/10 border border-sage/35 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-sage shadow-sm">
                    Resolved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-md bg-crimson/5 border border-crimson/30 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-crimson shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson"></span>
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
