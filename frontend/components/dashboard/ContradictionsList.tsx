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
      border: "border-crimson/25",
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
      <span className={`${highlightClass} px-1.5 py-0.5 rounded font-medium bg-opacity-20`}>
        {match}
      </span>
      {suffix}
    </span>
  );
}

export default function ContradictionsList({ contradictions, selectedId, onSelect }: Props) {
  if (contradictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 rounded-2xl border border-dashed border-paper-border bg-paper-darker text-sm text-ink-muted gap-2 font-serif">
        <span className="text-sage text-xl font-bold">✓</span>
        No continuity contradictions detected.
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
            style={{ animationDelay: `${idx * 100}ms` }}
            className={`cursor-pointer rounded-2xl border ${
              isSelected
                ? "border-crimson bg-crimson/5 shadow-book-lg"
                : `${theme.border} bg-paper-card`
            } p-6 shadow-sm hover:translate-x-1 hover:bg-paper-darker/30 ${theme.shadow} transition-all duration-300 glass-panel animate-fade-in-up`}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider ${theme.badge}`}>
                    {flag.type.replace(/_/g, " ")}
                  </span>
                  <span className="font-serif text-lg font-bold text-ink tracking-wide">{flag.entity}</span>
                </div>
                
                <p className="text-sm text-ink-muted leading-relaxed font-serif">{flag.description}</p>
                
                <div className="flex flex-wrap gap-2 text-xs text-ink-muted items-center font-sans font-bold uppercase tracking-wider pt-1">
                  <span>Conflicting Chapters:</span>
                  {flag.conflicting_chapters.map((ch) => (
                    <span
                      key={ch}
                      className="rounded bg-paper-darker border border-paper-border px-2.5 py-0.5 text-crimson text-[10px] font-sans font-bold uppercase tracking-wider shadow-inner"
                    >
                      {ch.replace(/_/g, " ").toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Evidence Context */}
                {isSelected && flag.evidence && flag.evidence.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-paper-border/60 space-y-3 animate-fade-in">
                    <div className="text-[9px] font-sans font-bold uppercase tracking-wider text-ink-muted">Context Citations:</div>
                    <div className="space-y-3">
                      {flag.evidence.map((ev, evIdx) => (
                        <div key={evIdx} className="space-y-1.5 pl-3 border-l-2 border-crimson/40">
                          <div className="text-[9px] font-sans font-bold uppercase tracking-wider text-crimson">
                            Source: {ev.chapter_id.replace(/_/g, " ").toUpperCase()}
                          </div>
                          <p className="text-xs text-ink-muted leading-relaxed italic bg-paper-darker rounded-lg p-3 border border-paper-border/60">
                            &ldquo;... <HighlightQuote context={ev.context} quote={ev.quote} highlightClass="bg-crimson/15 text-crimson border-b border-crimson/30" /> ...&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confidence indicator */}
              <div className="flex flex-col items-start md:items-end shrink-0 gap-1.5 pt-1 border-t border-paper-border/50 md:border-0 pt-3 md:pt-0">
                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-ink-faded">Confidence Rating</span>
                <span className={`text-lg font-sans font-bold tracking-tight ${theme.text}`}>
                  {Math.round(flag.confidence * 100)}%
                </span>
                <div className="h-1.5 w-24 rounded-full bg-paper-darker overflow-hidden border border-paper-border">
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
