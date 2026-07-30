"use client";

import ContradictionsList from "@/components/dashboard/ContradictionsList";
import RelationshipGraph from "@/components/dashboard/RelationshipGraph";
import ThreadsList from "@/components/dashboard/ThreadsList";
import WhatIfPanel from "@/components/dashboard/WhatIfPanel";
import {
  ChapterObject,
  CharacterObject,
  ContradictionFlag,
  UnresolvedThread,
  fetchDashboard,
} from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

type Tab = "overview" | "contradictions" | "threads" | "whatif";

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

const TABS: { id: Tab; label: string; code: string }[] = [
  { id: "overview", label: "Folio Overview", code: "Folio I" },
  { id: "contradictions", label: "Continuity Conflicts", code: "Folio II" },
  { id: "threads", label: "Open Plot Threads", code: "Folio III" },
  { id: "whatif", label: "Story Weaver (What-If)", code: "Folio IV" },
];

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border-2 border-crimson/10"></span>
        <span className="absolute inset-0 rounded-full border-2 border-t-crimson border-r-transparent border-b-transparent border-l-transparent animate-spin"></span>
      </div>
      <span className="font-sans text-xs font-bold text-crimson uppercase tracking-wider animate-pulse">Leafing through manuscript...</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-paper-border bg-paper-darker p-12 text-center space-y-4">
      <div className="h-10 w-10 rounded-full bg-paper-card border border-paper-border flex items-center justify-center text-ink-muted font-bold font-sans">
        &bull;
      </div>
      <div className="space-y-1">
        <div className="font-sans text-xs font-bold text-ink-muted uppercase tracking-wider">EMPTY ARCHIVE</div>
        <p className="text-sm text-ink-muted max-w-sm">{message}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams();
  const manuscriptId = params?.manuscriptId as string;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [characters, setCharacters] = useState<CharacterObject[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionFlag[]>([]);
  const [threads, setThreads] = useState<UnresolvedThread[]>([]);
  const [chapters, setChapters] = useState<ChapterObject[]>([]);

  const [selectedContradictionId, setSelectedContradictionId] = useState<string>("");
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");

  const loadAll = useCallback(async () => {
    if (!manuscriptId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchDashboard(manuscriptId);
      setCharacters(data?.characters || []);
      setContradictions(data?.contradictions || []);
      setThreads(data?.threads || []);
      setChapters(data?.chapters || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [manuscriptId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    setSelectedContradictionId("");
    setSelectedThreadId("");
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-crimson transition-colors"
        >
          <span>←</span> Back to Library
        </Link>
      </div>

      {/* Sub Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-border pb-6">
        <div>
          <div className="font-sans text-[10px] font-bold text-crimson uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-crimson animate-pulse"></span>
            MANUSCRIPT INGESTED &amp; ANALYZED
          </div>
          <h1 className="font-display text-3xl font-bold text-ink tracking-wide">
            Draft Analysis Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-muted font-sans font-bold text-xs uppercase tracking-wider">Codex Key:</span>
          <span className="text-crimson font-sans font-bold text-xs bg-crimson/5 border border-crimson/25 px-3.5 py-1 rounded-full shadow-inner">
            {manuscriptId}
          </span>
        </div>
      </div>

      {loading && <Spinner />}

      {error && (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-6 text-sm text-crimson animate-scale-in">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="font-sans font-bold uppercase tracking-wider block">CONNECTION INTERRUPTED</span>
              <span className="text-ink-muted font-serif block">{error}</span>
            </div>
            <button
              onClick={loadAll}
              className="shrink-0 rounded-lg bg-crimson/10 border border-crimson/35 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider text-crimson hover:bg-crimson/20 transition-all"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-2 rounded-2xl bg-paper-darker border border-paper-border p-1.5 overflow-x-auto shadow-inner">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[155px] rounded-xl px-4 py-3 text-left transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? "bg-paper-card border border-gold/40 text-ink shadow-book"
                      : "border border-transparent text-ink-muted hover:text-ink hover:bg-paper-darker/50"
                  }`}
                >
                  <div className="font-sans text-[9px] font-bold text-gold uppercase tracking-wider">
                    {tab.code}
                  </div>
                  <div className="font-display text-sm font-bold flex items-center justify-between mt-1">
                    <span>{tab.label}</span>
                    {/* Badge count indicators */}
                    {tab.id === "contradictions" && contradictions.length > 0 && (
                      <span className="ml-2 rounded bg-crimson/15 border border-crimson/20 text-crimson text-[10px] px-2 py-0.5 font-bold font-sans">
                        {contradictions.length}
                      </span>
                    )}
                    {tab.id === "threads" && threads.length > 0 && (
                      <span className="ml-2 rounded bg-gold/15 border border-gold/20 text-gold text-[10px] px-2 py-0.5 font-bold font-sans">
                        {threads.length}
                      </span>
                    )}
                  </div>
                  {/* Subtle active border light */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Overview Tab ───────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-in-up">
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard
                  label="Characters Extracted"
                  value={characters.length}
                  color="gold"
                  code="Dramatis Personae"
                />
                <StatCard
                  label="Continuity Conflicts"
                  value={contradictions.length}
                  color={contradictions.length > 0 ? "crimson" : "sage"}
                  code="Continuity Audit"
                />
                <StatCard
                  label="Open Narrative Threads"
                  value={threads.length}
                  color={threads.length > 0 ? "crimson" : "sage"}
                  code="Foreshadowing &amp; Promises"
                />
              </div>

              {/* Relationship graph */}
              <section className="space-y-4">
                <SectionHeading code="Social Map">Character Relationship Graph</SectionHeading>
                {characters.length === 0 ? (
                  <EmptyState message="No characters were extracted from this manuscript." />
                ) : (
                  <RelationshipGraph characters={characters} />
                )}
              </section>
            </div>
          )}

          {/* ── Contradictions Tab ─────────────────────────────────────── */}
          {activeTab === "contradictions" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-paper-border/50 pb-4">
                <SectionHeading code="Contradiction Registry">
                  Logical Contradictions ({contradictions.length})
                </SectionHeading>
                <span className="font-sans text-xs font-bold text-ink-muted uppercase tracking-wider">Intel Guide: Fact Audit</span>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed font-serif">
                Our fact analysis engine cross-references settings, events, and statements across your pages to highlight structural timeline discrepancies. Select a card to view detailed source citations.
              </p>
              {contradictions.length === 0 ? (
                <EmptyState message="No contradictions detected — your manuscript's world state is consistent." />
              ) : (
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                  <ContradictionsList
                    contradictions={contradictions}
                    selectedId={selectedContradictionId}
                    onSelect={(id) => setSelectedContradictionId(id)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Threads Tab ────────────────────────────────────────────── */}
          {activeTab === "threads" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-paper-border/50 pb-4">
                <SectionHeading code="Unresolved Promises">
                  Unresolved Narrative Threads ({threads.length})
                </SectionHeading>
                <span className="font-sans text-xs font-bold text-ink-muted uppercase tracking-wider">Intel Guide: Narrative Promises</span>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed font-serif">
                A ledger of introduced elements (foreshadowing, narrative questions, Chekhov&apos;s guns) that lack a clear resolution event. Select an entry to review its introduction text.
              </p>
              {threads.length === 0 ? (
                <EmptyState message="No unresolved threads detected — all planted elements appear to be resolved." />
              ) : (
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                  <ThreadsList
                    threads={threads}
                    selectedId={selectedThreadId}
                    onSelect={(id) => setSelectedThreadId(id)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── What-If Tab ────────────────────────────────────────────── */}
          {activeTab === "whatif" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-paper-border/50 pb-4">
                <SectionHeading code="Narrative Simulator">Story Weaver (What-If Simulation)</SectionHeading>
                <span className="font-sans text-xs font-bold text-ink-muted uppercase tracking-wider">Weaving Engine: Alternate Timelines</span>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed font-serif">
                Weave an alternate timeline by modifying character statuses or removing vital events, and see the ripple effect across downstream chapters.
              </p>
              <WhatIfPanel
                manuscriptId={manuscriptId}
                characters={characters}
                chapters={chapters}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ children, code }: { children: React.ReactNode; code: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="font-sans text-[9px] font-bold text-crimson border border-crimson/20 bg-crimson/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
        {code}
      </div>
      <h2 className="font-display text-lg font-bold text-ink tracking-wide">{children}</h2>
    </div>
  );
}

const STAT_COLORS = {
  gold: {
    border: "border-gold/25 hover:border-gold/45",
    bg: "bg-gold/5",
    text: "text-gold",
    dot: "bg-gold",
  },
  crimson: {
    border: "border-crimson/25 hover:border-crimson/45",
    bg: "bg-crimson/5",
    text: "text-crimson",
    dot: "bg-crimson animate-pulse",
  },
  sage: {
    border: "border-sage/25 hover:border-sage/45",
    bg: "bg-sage/5",
    text: "text-sage",
    dot: "bg-sage",
  },
};

function StatCard({
  label,
  value,
  color,
  code,
}: {
  label: string;
  value: number;
  color: keyof typeof STAT_COLORS;
  code: string;
}) {
  const cls = STAT_COLORS[color];
  return (
    <div className={`rounded-2xl border ${cls.border} ${cls.bg} bg-paper-card p-6 glass-panel transition-all duration-300 hover:shadow-book relative overflow-hidden group`}>
      <div className="flex justify-between items-start">
        <span className="font-sans text-[9px] font-bold text-ink-faded uppercase tracking-wider">{code}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${cls.dot}`} />
      </div>
      <div className="mt-4">
        <span className="text-xs font-sans font-bold text-ink-muted uppercase tracking-wider">{label}</span>
        <div className={`mt-2 font-display text-5xl font-bold tracking-tight ${cls.text}`}>
          {value}
        </div>
      </div>
      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none"></div>
    </div>
  );
}
