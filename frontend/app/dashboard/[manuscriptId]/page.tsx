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
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

type Tab = "overview" | "arc" | "contradictions" | "threads" | "whatif";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "arc", label: "Emotional Arc" },
  { id: "contradictions", label: "Contradictions" },
  { id: "threads", label: "Threads" },
  { id: "whatif", label: "What-If" },
];

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <svg className="h-8 w-8 animate-spin text-[#3b82d4]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] bg-white py-16 text-center">
      <svg className="mb-3 h-10 w-10 text-[#e5e7eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
      <p className="text-sm text-[#57606a]">{message}</p>
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
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[#1f2328] tracking-tight">StoryGlide</span>
            <span className="ml-3 text-xs font-medium text-[#57606a] bg-[#f7f8fa] border border-[#e5e7eb] rounded-full px-2.5 py-0.5">
              Analysis Dashboard
            </span>
          </div>
          <span className="text-xs text-[#57606a] font-mono">{manuscriptId}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading && <Spinner />}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <div className="flex items-start justify-between gap-4">
              <span><strong>Failed to load dashboard:</strong> {error}</span>
              <button
                onClick={loadAll}
                className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-1 rounded-xl bg-[#e5e7eb] p-1 mb-8 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[80px] rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-white text-[#1f2328] shadow-sm"
                      : "text-[#57606a] hover:text-[#1f2328]"
                  }`}
                >
                  {tab.label}
                  {/* Badge for counts */}
                  {tab.id === "contradictions" && contradictions.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-400 text-white text-2xs px-1.5 py-0.5 font-bold">
                      {contradictions.length}
                    </span>
                  )}
                  {tab.id === "threads" && threads.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-[#3b82d4] text-white text-2xs px-1.5 py-0.5 font-bold">
                      {threads.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ───────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    label="Characters"
                    value={characters.length}
                    color="blue"
                  />
                  <StatCard
                    label="Contradictions"
                    value={contradictions.length}
                    color={contradictions.length > 0 ? "amber" : "green"}
                  />
                  <StatCard
                    label="Unresolved Threads"
                    value={threads.length}
                    color={threads.length > 0 ? "red" : "green"}
                  />
                </div>

                {/* Relationship graph */}
                <section>
                  <SectionHeading>Character Relationship Graph</SectionHeading>
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
              <div className="space-y-6">
                <section>
                  <SectionHeading>Emotional Arc</SectionHeading>
                  <p className="text-sm text-[#57606a] mb-4">
                    Tension score per chapter (0 = calm, 1 = maximum tension). Hover dots for emotion detail. Dashed line = reference arc.
                  </p>
                  {arc.length === 0 ? (
                    <EmptyState message="No arc data available — the manuscript may still be processing." />
                  ) : (
                    <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                      <ArcChart arc={arc} />
                    </div>
                  )}
                </section>

                <section>
                  <SectionHeading>Pacing Heatmap</SectionHeading>
                  <p className="text-sm text-[#57606a] mb-4">
                    Word count per chapter — darker = denser scene.
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
              <div className="space-y-4">
                <SectionHeading>
                  Logical Contradictions ({contradictions.length})
                </SectionHeading>
                <p className="text-sm text-[#57606a]">
                  State-diff analysis detected these continuity conflicts across chapters.
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
              <div className="space-y-4">
                <SectionHeading>
                  Unresolved Narrative Threads ({threads.length})
                </SectionHeading>
                <p className="text-sm text-[#57606a]">
                  Planted story elements (Chekhov&apos;s guns, promises, foreshadowing) that were not resolved by the final chapter.
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
              <div className="space-y-4">
                <SectionHeading>What-If Exploration</SectionHeading>
                <p className="text-sm text-[#57606a]">
                  Select a scenario and let AI simulate how alternate choices would cascade through your story&apos;s world state.
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
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-[#1f2328] mb-4">{children}</h2>
  );
}

const STAT_COLORS = {
  blue: "border-[#e5e7eb] bg-white text-[#3b82d4]",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-600",
  green: "border-green-200 bg-green-50 text-green-700",
};

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: keyof typeof STAT_COLORS;
}) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${STAT_COLORS[color]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-2 text-4xl font-bold">{value}</div>
    </div>
  );
}
