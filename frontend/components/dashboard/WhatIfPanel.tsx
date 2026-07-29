"use client";

import {
  ChapterObject,
  CharacterObject,
  DownstreamImpact,
  WhatIfRequest,
  WhatIfResponse,
  WhatIfProposal,
  runWhatIf,
  proposeWhatIf,
  confirmWhatIf,
} from "@/lib/api";
import React, { useState } from "react";

interface Props {
  manuscriptId: string;
  characters: CharacterObject[];
  chapters: ChapterObject[];
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

export default function WhatIfPanel({ manuscriptId, characters, chapters }: Props) {
  const [scope, setScope] = useState<WhatIfRequest["scope"]>("character_death");
  const [targetId, setTargetId] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [atChapter, setAtChapter] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [error, setError] = useState("");

  // Mode selection
  const [activeMode, setActiveMode] = useState<"preset" | "conversational">("preset");

  // Conversational mode state
  const [conversationalPrompt, setConversationalPrompt] = useState("");
  const [proposals, setProposals] = useState<WhatIfProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<WhatIfProposal | null>(null);
  const [conversationalStep, setConversationalStep] = useState<1 | 2 | 3>(1);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [expandLoading, setExpandLoading] = useState(false);
  const [conversationalResult, setConversationalResult] = useState<WhatIfResponse | null>(null);

  const chapterIds = chapters.length > 0
    ? chapters.map((ch) => ch.chapter_id)
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

  async function handlePropose() {
    if (!conversationalPrompt.trim()) return;
    setProposalsLoading(true);
    setError("");
    setSelectedProposal(null);
    try {
      const res = await proposeWhatIf(manuscriptId, conversationalPrompt.trim());
      setProposals(res.proposals);
      setConversationalStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProposalsLoading(false);
    }
  }

  async function handleConfirm() {
    if (!selectedProposal) return;
    setExpandLoading(true);
    setError("");
    setConversationalResult(null);
    try {
      const res = await confirmWhatIf(manuscriptId, selectedProposal);
      setConversationalResult(res);
      setConversationalStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExpandLoading(false);
    }
  }

  function handleAbort() {
    setConversationalPrompt("");
    setProposals([]);
    setSelectedProposal(null);
    setConversationalResult(null);
    setConversationalStep(1);
    setError("");
  }

  async function handleReroll() {
    if (!conversationalPrompt.trim()) return;
    setProposalsLoading(true);
    setError("");
    setSelectedProposal(null);
    try {
      const res = await proposeWhatIf(manuscriptId, conversationalPrompt.trim());
      setProposals(res.proposals);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProposalsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex border-b border-obsidian-border pb-4 gap-2">
        <button
          onClick={() => {
            setActiveMode("preset");
            setError("");
          }}
          className={`pb-2 pr-6 text-xs font-mono font-bold tracking-wider transition-all duration-300 border-b-2 ${
            activeMode === "preset"
              ? "border-neon-cyan text-neon-cyan"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          [SYS_MODE: PRESET_TRAJECTORY]
        </button>
        <button
          onClick={() => {
            setActiveMode("conversational");
            setError("");
          }}
          className={`pb-2 px-6 text-xs font-mono font-bold tracking-wider transition-all duration-300 border-b-2 ${
            activeMode === "conversational"
              ? "border-neon-cyan text-neon-cyan"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          [SYS_MODE: CONVERSATIONAL_SANDBOX]
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-neon-rose/30 bg-neon-rose/5 p-4 text-xs font-mono text-neon-rose shadow-glow-rose/10">
          <span className="font-bold uppercase tracking-wider block mb-1">[SIMULATOR_CRASH]</span>
          {error}
        </div>
      )}

      {/* PRESET MODE */}
      {activeMode === "preset" && (
        <div className="space-y-6">
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
      )}

      {/* CONVERSATIONAL MODE */}
      {activeMode === "conversational" && (
        <div className="space-y-6">
          {conversationalStep === 1 && (
            <div className="rounded-2xl border border-obsidian-border bg-obsidian-card p-6 md:p-8 space-y-6 glass-panel shadow-lg animate-scale-in">
              <h3 className="font-serif text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span className="font-mono text-[9px] border border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan px-2 py-0.5 rounded uppercase tracking-wider">
                  SYS_PROPOSAL_PROMPT
                </span>
                Describe Alternate Story Trajectory
              </h3>

              <div className="space-y-2">
                <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
                  PROMPT_INPUT (Free text)
                </label>
                <textarea
                  value={conversationalPrompt}
                  onChange={(e) => setConversationalPrompt(e.target.value)}
                  placeholder="Describe a change. e.g. What if Elena Voss dies during the skirmish, leaving Marcus without his informant?"
                  rows={4}
                  className="w-full rounded-xl border border-obsidian-border bg-[#060913] px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-neon-cyan/30 focus:border-neon-cyan transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handlePropose}
                disabled={!conversationalPrompt.trim() || proposalsLoading}
                className="flex items-center gap-2.5 rounded-xl bg-neon-cyan hover:bg-[#00d0e6] px-6 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#060913] shadow-glow-cyan/20 hover:shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
              >
                {proposalsLoading && <Spinner />}
                {proposalsLoading ? "COMPUTING..." : "COMPUTE_PROPOSALS"}
              </button>
            </div>
          )}

          {conversationalStep === 2 && (
            <div className="space-y-6 animate-scale-in">
              <div className="rounded-2xl border border-obsidian-border bg-obsidian-card p-6 md:p-8 space-y-6 glass-panel shadow-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-obsidian-border pb-4 gap-4">
                  <h3 className="font-serif text-lg font-bold text-white tracking-wide flex items-center gap-2">
                    <span className="font-mono text-[9px] border border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan px-2 py-0.5 rounded uppercase tracking-wider">
                      SYS_PROPOSALS_LIST
                    </span>
                    Trajectory Alternatives
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleReroll}
                      disabled={proposalsLoading || expandLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-obsidian-border hover:border-slate-700 bg-[#060913] px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-all duration-300"
                    >
                      {proposalsLoading && <Spinner />}
                      RECOMPUTE_PROPOSALS
                    </button>
                    <button
                      onClick={handleAbort}
                      disabled={proposalsLoading || expandLoading}
                      className="rounded-lg border border-neon-rose/30 bg-neon-rose/5 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-neon-rose hover:bg-neon-rose/10 transition-all duration-300"
                    >
                      ABORT
                    </button>
                  </div>
                </div>

                <p className="text-xs font-mono text-slate-400">
                  Select a trajectory scenario below to lock in the simulation parameters.
                </p>

                {proposalsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Spinner />
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">
                      Generating alternate options...
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {proposals.map((prop) => {
                      const isSelected = selectedProposal?.id === prop.id;
                      return (
                        <div
                          key={prop.id}
                          onClick={() => setSelectedProposal(prop)}
                          className={`cursor-pointer rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all duration-300 ${
                            isSelected
                              ? "border-neon-cyan bg-neon-cyan/5 shadow-[0_0_15px_rgba(13,240,255,0.15)]"
                              : "border-obsidian-border bg-[#060913]/40 hover:border-slate-700 hover:bg-[#0c111d] text-slate-300"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${
                                prop.scope === "character_death"
                                  ? "border-neon-rose/30 bg-neon-rose/5 text-neon-rose"
                                  : prop.scope === "relationship_change"
                                  ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
                                  : "border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan"
                              }`}>
                                {prop.scope.replace(/_/g, " ")}
                              </span>
                              <span className="font-mono text-[8px] text-slate-500 uppercase font-bold">
                                {prop.at_chapter.replace(/_/g, " ")}
                              </span>
                            </div>
                            <h4 className="font-serif text-sm font-bold text-white tracking-wide">
                              {prop.title}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans">
                              {prop.teaser}
                            </p>
                          </div>
                          <div className="border-t border-obsidian-border pt-3 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold">
                            <span>TARGET:</span>
                            <span className="text-slate-300 font-bold truncate max-w-[120px]">{prop.target_id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-obsidian-border pt-6 flex justify-end">
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedProposal || proposalsLoading || expandLoading}
                    className="flex items-center gap-2.5 rounded-xl bg-neon-cyan hover:bg-[#00d0e6] px-6 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#060913] shadow-glow-cyan/20 hover:shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {expandLoading && <Spinner />}
                    {expandLoading ? "EXPANDING_TIMELINE..." : "LOCK_TRAJECTORY"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {conversationalStep === 3 && conversationalResult && (
            <div className="space-y-6 animate-scale-in">
              <div className="flex justify-between items-center">
                <h4 className="font-mono text-xs text-slate-500 uppercase tracking-widest font-bold">
                  [SYS_SIMULATION_COMPLETED]
                </h4>
                <button
                  onClick={handleAbort}
                  className="rounded-lg border border-neon-rose/30 bg-neon-rose/5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-neon-rose hover:bg-neon-rose/10 transition-all duration-300"
                >
                  ABORT
                </button>
              </div>

              {/* Selected proposal summary context */}
              {selectedProposal && (
                <div className="rounded-xl border border-obsidian-border bg-obsidian-card p-4 text-xs font-mono text-slate-400 space-y-1 glass-panel">
                  <div className="flex justify-between font-bold text-white uppercase tracking-wider">
                    <span>{selectedProposal.title}</span>
                    <span className="text-neon-cyan font-semibold">{selectedProposal.scope.toUpperCase().replace(/_/g, " ")}</span>
                  </div>
                  <div>CHAPTER TARGET: {selectedProposal.at_chapter.toUpperCase().replace(/_/g, " ")}</div>
                  <div>TARGET ENTITY: {selectedProposal.target_id}</div>
                </div>
              )}

              {/* Narrative sketch (Terminal Scanline Box) */}
              <div className="rounded-2xl border border-neon-cyan/30 bg-[#040811] p-6 shadow-glow-cyan/5 relative overflow-hidden scanlines">
                <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-3 mb-4 font-mono text-[9px] text-neon-cyan uppercase tracking-widest">
                  <span>[SIMULATED_TIMELINE_SUMMARY]</span>
                  <span className="text-neon-cyan animate-pulse">[OUTPUT_OK]</span>
                </div>
                
                {/* Typewriter text console */}
                <p className="text-sm font-mono text-slate-200 leading-relaxed font-normal cursor-blink whitespace-pre-line">
                  {conversationalResult.summary}
                </p>
              </div>

              {/* Downstream impacts */}
              {conversationalResult.downstream_impacts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-serif text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span className="font-mono text-[9px] border border-neon-rose/30 bg-neon-rose/5 text-neon-rose px-2 py-0.5 rounded uppercase tracking-wider">
                      CASCADING_ERRORS
                    </span>
                    Downstream Impacts Detected
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {conversationalResult.downstream_impacts.map((impact, i) => (
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
      )}
    </div>
  );
}
