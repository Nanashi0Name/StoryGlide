"use client";

import { ContradictionFlag } from "@/lib/api";
import React from "react";

interface Props {
  contradictions: ContradictionFlag[];
  selectedId?: string;
  onSelect?: (id: string) => void;
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
      badge: "bg-crimson/10 border border-crimson/30 text-crimson",
      border: "border-crimson/30",
      shadow: "hover:shadow-wax-seal",
      text: "text-crimson",
      fill: "bg-crimson",
    };
  }
  if (c >= 0.5) {
    return {
      badge: "bg-gold/10 border border-gold/30 text-gold",
      border: "border-gold/30",
      shadow: "hover:shadow-gold-seal",
      text: "text-gold",
      fill: "bg-gold",
    };
  }
  return {
    badge: "bg-paper-darker border border-paper-border text-ink-muted",
    border: "border-paper-border",
    shadow: "hover:shadow-book",
    text: "text-ink-muted",
    fill: "bg-ink-muted",
  };
}

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

export default function ContradictionsList({ contradictions, selectedId, onSelect }: Props) {
  if (contradictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-2xl border border-dashed border-paper-border bg-paper-darker text-sm text-ink-muted gap-2 font-serif">
        <span className="text-sage text-xl font-bold">✓</span>
        No continuity contradictions detected in the current manuscript version.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contradictions.map((flag, idx) => {
        const theme = confidenceTheme(flag.confidence);
        const isSelected = selectedId === flag.id;
        return (
          <div
            key={flag.id}
            onClick={() => onSelect?.(flag.id)}
            style={{ animationDelay: `${idx * 80}ms` }}
            className={`cursor-pointer rounded-xl border transition-all duration-300 relative overflow-hidden p-6 ${
              isSelected
                ? "border-crimson bg-paper-card shadow-book-lg border-l-4 border-l-crimson"
                : `${theme.border} bg-paper-card hover:border-crimson/40 hover:-translate-y-0.5 hover:shadow-book`
            } glass-panel animate-fade-in-up`}
          >
            {/* Fine copper corner markers on selection */}
            {isSelected && (
              <>
                <div className="absolute top-2 right-2 font-mono text-[8px] text-crimson select-none">CONFIRMED AUDIT</div>
              </>
            )}

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`rounded px-2 py-0.5 text-[9px] font-sans font-bold uppercase tracking-wider ${theme.badge}`}>
                    {flag.type.replace(/_/g, " ")}
                  </span>
                  <span className="font-display text-lg font-bold text-ink tracking-wide">{flag.entity}</span>
                </div>
                
                <p className="text-sm text-ink-muted leading-relaxed font-serif font-light">{flag.description}</p>
                
                <div className="flex flex-wrap gap-2 text-xs text-ink-muted items-center font-mono uppercase tracking-wider pt-1">
                  <span className="text-[10px] text-ink-light">Conflicting Chapters:</span>
                  {flag.conflicting_chapters.map((ch) => (
                    <span
                      key={ch}
                      className="rounded bg-paper-darker border border-paper-border px-2.5 py-0.5 text-crimson text-[9px] font-bold shadow-inner"
                    >
                      {ch.replace(/_/g, " ").toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Evidence Context */}
                {isSelected && flag.evidence && flag.evidence.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-paper-border/60 space-y-4 animate-fade-in">
                    <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-faded">Context Citations (Ledger Extract):</div>
                    <div className="space-y-4">
                      {flag.evidence.map((ev, evIdx) => (
                        <div key={evIdx} className="space-y-2 pl-4 border-l border-crimson/50">
                          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-crimson">
                            Source: {ev.chapter_id.replace(/_/g, " ").toUpperCase()}
                          </div>
                          
                          <blockquote className="text-xs text-ink-muted leading-relaxed italic bg-paper-darker rounded-lg p-3.5 border border-paper-border font-mono relative overflow-hidden">
                            <span className="absolute top-1 right-2 text-[10px] text-paper-border select-none">“</span>
                            &ldquo;<HighlightQuote context={ev.context} quote={ev.quote} highlightClass="bg-crimson/10 text-crimson border-b border-crimson/35 font-bold" />&rdquo;
                          </blockquote>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confidence rating indicator */}
              <div className="flex flex-col items-start md:items-end shrink-0 gap-1.5 pt-3 border-t border-paper-border/50 md:border-0 md:pt-0">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-ink-faded">Audit Confidence</span>
                <span className={`text-xl font-mono font-bold tracking-tighter ${theme.text}`}>
                  {Math.round(flag.confidence * 100)}%
                </span>
                <div className="h-1 w-20 rounded-full bg-paper-darker overflow-hidden border border-paper-border/60">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${theme.fill}`}
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
