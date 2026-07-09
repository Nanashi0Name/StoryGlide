"use client";

import ArcChart from "@/components/dashboard/ArcChart";
import ContradictionsList from "@/components/dashboard/ContradictionsList";
import PacingHeatmap from "@/components/dashboard/PacingHeatmap";
import RelationshipGraph from "@/components/dashboard/RelationshipGraph";
import ThreadsList from "@/components/dashboard/ThreadsList";
import WhatIfPanel from "@/components/dashboard/WhatIfPanel";
import {
  ArcDataPoint,
  CharacterObject,
  ContradictionFlag,
  UnresolvedThread,
  fetchDashboard,
} from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

type Tab = "overview" | "arc" | "contradictions" | "threads" | "whatif";

const TABS: { id: Tab; label: string; code: string }[] = [
  { id: "overview", label: "Overview", code: "SYS_OVERVIEW" },
  { id: "arc", label: "Emotional Arc", code: "PACING_ARC" },
  { id: "contradictions", label: "Contradictions", code: "CONFLICTS_DIFF" },
  { id: "threads", label: "Threads", code: "UNRESOLVED_LOG" },
  { id: "whatif", label: "What-If", code: "FLIGHT_SIM" },
];

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border-2 border-neon-cyan/20"></span>
        <span className="absolute inset-0 rounded-full border-2 border-t-neon-cyan border-r-transparent border-b-transparent border-l-transparent animate-spin"></span>
      </div>
      <span className="font-mono text-xs text-neon-cyan animate-pulse">COMPILING_TELEMETRY...</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-obsidian-border bg-obsidian-card p-12 text-center space-y-4">
      <div className="h-10 w-10 rounded-full bg-slate-800/50 border border-obsidian-border flex items-center justify-center text-slate-400">
        !
      </div>
      <div className="space-y-1">
        <div className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">[NO_TELEMETRY]</div>
        <p className="text-sm text-slate-500 max-w-sm">{message}</p>
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
  const [arc, setArc] = useState<ArcDataPoint[]>([]);

  const loadAll = useCallback(async () => {
    if (!manuscriptId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchDashboard(manuscriptId);
      setCharacters(data.characters);
      setContradictions(data.contradictions);
      setThreads(data.threads);
      setArc(data.arc);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [manuscriptId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-400 hover:text-neon-cyan transition-colors"
        >
          <span>←</span> [BACK_TO_HOME_CONSOLE]
        </Link>
      </div>

      {/* Sub Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-obsidian-border pb-6">
        <div>
          <div className="font-mono text-xs text-neon-cyan uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse"></span>
            MANUSCRIPT TELEMETRY ENGINE LOADED
          </div>
          <h1 className="font-serif text-3xl font-bold text-white tracking-wide">
            Draft Analysis Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-xs">MANUSCRIPT_ID:</span>
          <span className="text-neon-cyan font-mono text-xs bg-neon-cyan/5 border border-neon-cyan/20 px-3 py-1 rounded-md shadow-inner">
            {manuscriptId}
          </span>
        </div>
      </div>

      {loading && <Spinner />}

      {error && (
        <div className="rounded-xl border border-neon-rose/30 bg-neon-rose/5 p-6 text-sm text-neon-rose animate-scale-in">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono font-bold uppercase tracking-wider block">[SYSTEM_CONNECTIVITY_ERROR]</span>
              <span className="text-slate-300 font-sans block">{error}</span>
            </div>
            <button
              onClick={loadAll}
              className="shrink-0 rounded-lg bg-neon-rose/10 border border-neon-rose/30 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-neon-rose hover:bg-neon-rose/20 transition-all"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-2 rounded-2xl bg-[#090d16]/80 border border-obsidian-border p-1.5 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[130px] rounded-xl px-4 py-3 text-left transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? "bg-[#121827] border border-neon-cyan/30 text-white shadow-glow-cyan/5"
                      : "border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30"
                  }`}
                >
                  <div className="font-mono text-[9px] text-slate-500 tracking-wider">
                    {tab.code}
                  </div>
                  <div className="font-sans text-sm font-semibold flex items-center justify-between mt-1">
                    <span>{tab.label}</span>
                    {/* Badge count indicators */}
                    {tab.id === "contradictions" && contradictions.length > 0 && (
                      <span className="ml-2 rounded-md bg-neon-amber/10 border border-neon-amber/30 text-neon-amber text-[10px] px-2 py-0.5 font-bold font-mono">
                        {contradictions.length}
                      </span>
                    )}
                    {tab.id === "threads" && threads.length > 0 && (
                      <span className="ml-2 rounded-md bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] px-2 py-0.5 font-bold font-mono">
                        {threads.length}
                      </span>
                    )}
                  </div>
                  {/* Subtle active border light */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent"></div>
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
                  color="cyan"
                  code="SYS_ENTITIES"
                />
                <StatCard
                  label="Continuity Errors"
                  value={contradictions.length}
                  color={contradictions.length > 0 ? "amber" : "green"}
                  code="SYS_CONFLICTS"
                />
                <StatCard
                  label="Unresolved Threads"
                  value={threads.length}
                  color={threads.length > 0 ? "rose" : "green"}
                  code="SYS_UNRESOLVED"
                />
              </div>

              {/* Relationship graph */}
              <section className="space-y-4">
                <SectionHeading code="CHAR_GRAPH_01">Character Relationship Graph</SectionHeading>
                {characters.length === 0 ? (
                  <EmptyState message="No characters were extracted from this manuscript." />
                ) : (
                  <RelationshipGraph characters={characters} />
                )}
              </section>
            </div>
          )}

          {/* ── Arc Tab ────────────────────────────────────────────────── */}
          {activeTab === "arc" && (
            <div className="space-y-8 animate-fade-in-up">
              <section className="space-y-2">
                <SectionHeading code="EMO_ARC_TENSION">Emotional Arc</SectionHeading>
                <p className="text-sm text-slate-400">
                  Tension score per chapter (0 = calm, 1 = maximum tension). Hover dots for sentiment details. The dashed line represents the ideal reference arc structure.
                </p>
                {arc.length === 0 ? (
                  <EmptyState message="No arc data available — the manuscript may still be processing." />
                ) : (
                  <div className="rounded-2xl border border-obsidian-border bg-obsidian-card p-6 glass-panel">
                    <ArcChart arc={arc} />
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <SectionHeading code="PACE_HEATMAP">Pacing Heatmap</SectionHeading>
                <p className="text-sm text-slate-400">
                  Word density heat distribution. Deeper neon blocks highlight denser pacing intervals.
                </p>
                {arc.length === 0 ? (
                  <EmptyState message="No pacing data available yet." />
                ) : (
                  <PacingHeatmap arc={arc} />
                )}
              </section>
            </div>
          )}

          {/* ── Contradictions Tab ─────────────────────────────────────── */}
          {activeTab === "contradictions" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-obsidian-border/50 pb-4">
                <SectionHeading code="CONFLICT_DIAGNOSTICS">
                  Logical Contradictions ({contradictions.length})
                </SectionHeading>
                <span className="font-mono text-xs text-slate-500">ENGINE: Fact State Diff</span>
              </div>
              <p className="text-sm text-slate-400">
                The structured state-diff engine cross-checks facts extracted in SQLite databases to capture timeline integrity issues.
              </p>
              {contradictions.length === 0 ? (
                <EmptyState message="No contradictions detected — your manuscript's world state is consistent." />
              ) : (
                <ContradictionsList contradictions={contradictions} />
              )}
            </div>
          )}

          {/* ── Threads Tab ────────────────────────────────────────────── */}
          {activeTab === "threads" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-obsidian-border/50 pb-4">
                <SectionHeading code="NARRATIVE_THREADS">
                  Unresolved Narrative Threads ({threads.length})
                </SectionHeading>
                <span className="font-mono text-xs text-slate-500">ENGINE: Promise Tracker</span>
              </div>
              <p className="text-sm text-slate-400">
                List of planted elements (Chekhov&apos;s guns, foreshadows, questions) that haven&apos;t met resolution events.
              </p>
              {threads.length === 0 ? (
                <EmptyState message="No unresolved threads detected — all planted elements appear to be resolved." />
              ) : (
                <ThreadsList threads={threads} />
              )}
            </div>
          )}

          {/* ── What-If Tab ────────────────────────────────────────────── */}
          {activeTab === "whatif" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-obsidian-border/50 pb-4">
                <SectionHeading code="FLIGHT_SIMULATOR">What-If Exploration</SectionHeading>
                <span className="font-mono text-xs text-slate-500">ENGINE: IBM Granite RAG Cascade</span>
              </div>
              <p className="text-sm text-slate-400">
                Hypothesize a character change or event removal, then simulate downstream chapter changes.
              </p>
              <WhatIfPanel
                manuscriptId={manuscriptId}
                characters={characters}
                arc={arc}
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
      <div className="font-mono text-[9px] font-bold text-neon-cyan border border-neon-cyan/30 bg-neon-cyan/5 px-2 py-0.5 rounded">
        {code}
      </div>
      <h2 className="font-serif text-lg font-bold text-white tracking-wide">{children}</h2>
    </div>
  );
}

const STAT_COLORS = {
  cyan: {
    border: "border-neon-cyan/20 hover:border-neon-cyan/40",
    bg: "bg-neon-cyan/5",
    text: "text-neon-cyan drop-shadow-[0_0_8px_rgba(13,240,255,0.2)]",
    dot: "bg-neon-cyan animate-pulse",
  },
  amber: {
    border: "border-neon-amber/20 hover:border-neon-amber/40",
    bg: "bg-neon-amber/5",
    text: "text-neon-amber drop-shadow-[0_0_8px_rgba(255,173,51,0.2)]",
    dot: "bg-neon-amber animate-pulse",
  },
  rose: {
    border: "border-neon-rose/20 hover:border-neon-rose/40",
    bg: "bg-neon-rose/5",
    text: "text-neon-rose drop-shadow-[0_0_8px_rgba(255,75,114,0.2)]",
    dot: "bg-neon-rose animate-ping",
  },
  green: {
    border: "border-neon-green/20 hover:border-neon-green/40",
    bg: "bg-neon-green/5",
    text: "text-neon-green drop-shadow-[0_0_8px_rgba(5,243,173,0.2)]",
    dot: "bg-neon-green",
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
    <div className={`rounded-2xl border ${cls.border} ${cls.bg} p-6 glass-panel transition-all duration-300 hover:shadow-glow-cyan/5 relative overflow-hidden group`}>
      <div className="flex justify-between items-start">
        <span className="font-mono text-[9px] text-slate-500 tracking-wider">{code}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${cls.dot}`} />
      </div>
      <div className="mt-4">
        <span className="text-xs font-sans text-slate-400 font-medium">{label}</span>
        <div className={`mt-2 font-mono text-5xl font-extrabold tracking-tight ${cls.text}`}>
          {value}
        </div>
      </div>
      {/* HUD scanner line visual effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none"></div>
    </div>
  );
}
