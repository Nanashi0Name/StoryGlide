"use client";

import { ArcDataPoint, CharacterObject, DownstreamImpact, WhatIfRequest, WhatIfResponse, runWhatIf } from "@/lib/api";
import React, { useState } from "react";

interface Props {
  manuscriptId: string;
  characters: CharacterObject[];
  arc: ArcDataPoint[];
}

const SCOPE_OPTIONS = [
  { value: "character_death", label: "Character Death", code: "CHAR_DEATH" },
  { value: "relationship_change", label: "Relationship Change", code: "REL_MUTATION" },
  { value: "event_removal", label: "Event Removal", code: "EVENT_REMOVAL" },
] as const;

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-[#060913]" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function WhatIfPanel({ manuscriptId, characters, arc }: Props) {
  const [scope, setScope] = useState<WhatIfRequest["scope"]>("character_death");
  const [targetId, setTargetId] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [atChapter, setAtChapter] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [error, setError] = useState("");

  const chapterIds = arc.length > 0
    ? arc.map((d) => d.chapter_id)
    : characters.flatMap((c) => Object.keys(c.status_by_chapter));
  const uniqueChapters = Array.from(new Set(chapterIds)).sort();

  const isCharacterScope = scope === "character_death" || scope === "relationship_change";
  const effectiveTarget = isCharacterScope ? targetId : customTarget;

  const canSubmit =
    effectiveTarget.trim().length > 0 && atChapter.length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await runWhatIf(manuscriptId, {
        scope,
        target_id: effectiveTarget.trim(),
        at_chapter: atChapter,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-obsidian-border bg-obsidian-card p-6 md:p-8 space-y-6 glass-panel shadow-lg">
        <h3 className="font-serif text-lg font-bold text-white tracking-wide">
          Configure Simulation Scenario
        </h3>

        {/* Scope */}
        <div className="space-y-2">
          <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
            SIMULATION_SCOPE
          </label>
          <div className="flex flex-wrap gap-2.5">
            {SCOPE_OPTIONS.map((opt) => {
              const isActive = scope === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setScope(opt.value); setTargetId(""); setCustomTarget(""); }}
                  className={`rounded-lg border px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 ${
                    isActive
                      ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_12px_rgba(13,240,255,0.1)]"
                      : "border-obsidian-border bg-transparent text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
              {isCharacterScope ? "TARGET_CHARACTER" : "TARGET_EVENT_ID"}
            </label>
            {isCharacterScope ? (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-xl border border-obsidian-border bg-[#060913] px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-neon-cyan/30 focus:border-neon-cyan transition-all"
              >
                <option value="" className="bg-[#0c111d] text-slate-500">Select target character...</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0c111d] text-slate-200">
                    {c.name} ({c.id.toUpperCase()})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                placeholder="e.g. time_machine_destroyed"
                className="w-full rounded-xl border border-obsidian-border bg-[#060913] px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-neon-cyan/30 focus:border-neon-cyan font-mono transition-all"
              />
            )}
          </div>

          {/* Chapter */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
              INSERTION_CHAPTER
            </label>
            <select
              value={atChapter}
              onChange={(e) => setAtChapter(e.target.value)}
              className="w-full rounded-xl border border-obsidian-border bg-[#060913] px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-neon-cyan/30 focus:border-neon-cyan transition-all"
            >
              <option value="" className="bg-[#0c111d] text-slate-500">Select chapter threshold...</option>
              {uniqueChapters.map((ch) => (
                <option key={ch} value={ch} className="bg-[#0c111d]">
                  {ch.toUpperCase().replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex items-center gap-2.5 rounded-xl bg-neon-cyan hover:bg-[#00d0e6] px-6 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#060913] shadow-glow-cyan/20 hover:shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
        >
          {loading && <Spinner />}
          {loading ? "RUNNING_SIMULATION..." : "COMPUTE ALTERNATE TIMELINE"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-neon-rose/30 bg-neon-rose/5 p-4 text-xs font-mono text-neon-rose shadow-glow-rose/10">
          <span className="font-bold uppercase tracking-wider block mb-1">[SIMULATOR_CRASH]</span>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-6 animate-scale-in">
          {/* Narrative sketch (Terminal Scanline Box) */}
          <div className="rounded-2xl border border-neon-cyan/30 bg-[#040811] p-6 shadow-glow-cyan/5 relative overflow-hidden scanlines">
            <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-3 mb-4 font-mono text-[9px] text-neon-cyan uppercase tracking-widest">
              <span>[SIMULATED_TIMELINE_SUMMARY]</span>
              <span className="text-neon-cyan animate-pulse">[OUTPUT_OK]</span>
            </div>
            
            {/* Typewriter text console */}
            <p className="text-sm font-mono text-slate-200 leading-relaxed font-normal cursor-blink whitespace-pre-line">
              {result.summary}
            </p>
          </div>

          {/* Downstream impacts */}
          {result.downstream_impacts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-serif text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span className="font-mono text-[9px] border border-neon-rose/30 bg-neon-rose/5 text-neon-rose px-2 py-0.5 rounded uppercase tracking-wider">
                  CASCADING_ERRORS
                </span>
                Downstream Impacts Detected
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {result.downstream_impacts.map((impact, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-obsidian-border bg-obsidian-card p-5 flex gap-4 items-start hover:border-neon-cyan/20 hover:bg-[#0c111d] transition-all duration-300 glass-panel"
                  >
                    <code className="shrink-0 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 px-3 py-1 font-mono text-[10px] font-bold text-neon-cyan uppercase tracking-wider">
                      {impact.chapter_id.replace(/_/g, " ")}
                    </code>
                    <p className="text-sm text-slate-300 leading-relaxed font-sans">{impact.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
