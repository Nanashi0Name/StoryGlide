"use client";

import {
  ChapterObject,
  CharacterObject,
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
  { value: "character_death", label: "Character Fate", code: "Weft I" },
  { value: "relationship_change", label: "Relationship Mutate", code: "Weft II" },
  { value: "event_removal", label: "Event Removal", code: "Weft III" },
] as const;

function Spinner() {
  return (
    <div className="relative h-4 w-4">
      <span className="absolute inset-0 rounded-full border border-gold/15"></span>
      <span className="absolute inset-0 rounded-full border border-t-gold border-r-transparent border-b-transparent border-l-transparent animate-spin"></span>
    </div>
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
      <div className="flex border-b border-paper-border pb-4 gap-4">
        <button
          onClick={() => {
            setActiveMode("preset");
            setError("");
          }}
          className={`pb-3 pr-6 text-xs font-mono font-bold tracking-widest transition-all duration-300 border-b-2 uppercase ${
            activeMode === "preset"
              ? "border-gold text-gold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Pathways Selection
        </button>
        <button
          onClick={() => {
            setActiveMode("conversational");
            setError("");
          }}
          className={`pb-3 px-6 text-xs font-mono font-bold tracking-widest transition-all duration-300 border-b-2 uppercase ${
            activeMode === "conversational"
              ? "border-gold text-gold"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Weave New Scenario
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-5 text-xs font-sans text-crimson shadow-sm relative">
          <div className="absolute top-0 left-0 h-full w-[2px] bg-crimson"></div>
          <span className="font-bold uppercase tracking-widest block mb-1 text-[9px] text-crimson">Weaving Interrupted</span>
          {error}
        </div>
      )}

      {/* PRESET MODE */}
      {activeMode === "preset" && (
        <div className="space-y-8">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-paper-border bg-paper-card p-6 md:p-8 space-y-6 glass-panel shadow-book relative">
            <div className="absolute top-3 right-3 font-mono text-[8px] text-ink-faded uppercase tracking-widest">NARRATIVE DRAFT ENGINE</div>
            <h3 className="font-display text-xl font-bold text-ink tracking-wide">
              Design Story Trajectory
            </h3>

            {/* Scope */}
            <div className="space-y-2">
              <label className="block text-[9px] font-mono font-bold text-ink-muted uppercase tracking-widest">
                Narrative Scope Selector
              </label>
              <div className="flex flex-wrap gap-2.5">
                {SCOPE_OPTIONS.map((opt) => {
                  const isActive = scope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setScope(opt.value); setTargetId(""); setCustomTarget(""); }}
                      className={`rounded-lg border px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-all duration-300 ${
                        isActive
                          ? "border-gold/50 bg-gold/5 text-gold shadow-book"
                          : "border-paper-border bg-transparent text-ink-muted hover:text-ink hover:border-gold/30"
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
                <label className="block text-[9px] font-mono font-bold text-ink-muted uppercase tracking-widest">
                  {isCharacterScope ? "Target Character Dossier" : "Target Event Key"}
                </label>
                {isCharacterScope ? (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full rounded-xl border border-paper-border bg-paper-darker px-4 py-3.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold shadow-inner font-sans cursor-pointer"
                  >
                    <option value="" className="bg-paper-card text-ink-muted">Select target character...</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id} className="bg-paper-card text-ink">
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value)}
                    placeholder="e.g. time_machine_destroyed"
                    className="w-full rounded-xl border border-paper-border bg-paper-darker px-4 py-3.5 text-sm text-ink placeholder-ink-light focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold font-mono shadow-inner"
                  />
                )}
              </div>

              {/* Chapter */}
              <div className="space-y-2">
                <label className="block text-[9px] font-mono font-bold text-ink-muted uppercase tracking-widest">
                  Chapter Threshold (Timeline Boundary)
                </label>
                <select
                  value={atChapter}
                  onChange={(e) => setAtChapter(e.target.value)}
                  className="w-full rounded-xl border border-paper-border bg-paper-darker px-4 py-3.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold shadow-inner font-sans cursor-pointer"
                >
                  <option value="" className="bg-paper-card text-ink-muted">Select chapter threshold...</option>
                  {uniqueChapters.map((ch) => (
                    <option key={ch} value={ch} className="bg-paper-card">
                      {ch.toUpperCase().replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-2.5 rounded-xl bg-crimson hover:bg-crimson-hover px-6 py-4 text-xs font-sans font-bold uppercase tracking-widest text-white shadow-book hover:shadow-book-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500"
            >
              {loading && <Spinner />}
              {loading ? "WEAVING ALTERNATE STORYLINES..." : "WEAVE ALTERNATE DRAFT"}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div className="space-y-6 animate-scale-in">
              {/* Typewriter text block for summary */}
              <div className="rounded-xl border border-gold/30 bg-paper-card p-6 md:p-8 shadow-book-lg relative overflow-hidden border-t-2 border-t-gold">
                {/* Vintage paper decoration lines */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold/50 via-gold/15 to-gold/50"></div>
                
                <div className="flex justify-between items-center border-b border-paper-border pb-4.5 mb-6 font-mono text-[9px] font-bold text-gold uppercase tracking-wider">
                  <span>SIMULATED NARRATIVE SKETCH</span>
                  <span>DRAFT COMPILED</span>
                </div>
                
                <p className="text-sm font-mono text-ink-muted leading-relaxed whitespace-pre-line bg-paper-darker/35 p-6 rounded-lg border border-paper-border/60">
                  {result.summary}
                </p>
              </div>

              {/* Downstream impacts */}
              {result.downstream_impacts.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-display text-lg font-bold text-ink tracking-wide flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold border border-crimson/30 bg-crimson/5 text-crimson px-2.5 py-0.5 rounded uppercase">
                      Narrative Cascade
                    </span>
                    Downstream Impacts Detected ({result.downstream_impacts.length})
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {result.downstream_impacts.map((impact, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-paper-border bg-paper-card p-5 flex gap-4 items-start hover:border-gold/30 hover:bg-paper-darker transition-all duration-300 glass-panel shadow-sm"
                      >
                        <span className="shrink-0 rounded bg-gold/5 border border-gold/20 px-3 py-1 font-mono text-[9px] font-bold text-gold uppercase tracking-wider">
                          {impact.chapter_id.replace(/_/g, " ")}
                        </span>
                        <p className="text-sm text-ink-muted leading-relaxed font-serif font-light">{impact.impact}</p>
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
        <div className="space-y-6 font-serif">
          {conversationalStep === 1 && (
            <div className="rounded-2xl border border-paper-border bg-paper-card p-6 md:p-8 space-y-6 glass-panel shadow-book animate-scale-in relative">
              <div className="absolute top-3 right-3 font-mono text-[8px] text-ink-faded uppercase tracking-widest">NARRATIVE DRAFT ENGINE</div>
              <h3 className="font-display text-xl font-bold text-ink tracking-wide flex items-center gap-2.5">
                <span className="font-mono text-[9px] font-bold border border-gold/30 bg-gold/5 text-gold px-2.5 py-0.5 rounded uppercase">
                  Free-form Exploration
                </span>
                Describe Alternate Story Trajectory
              </h3>

              <div className="space-y-2">
                <label className="block text-[9px] font-mono font-bold text-ink-muted uppercase tracking-widest">
                  Describe a scenario change (e.g. What if Elena Voss dies during the skirmish, leaving Marcus without his informant?)
                </label>
                <textarea
                  value={conversationalPrompt}
                  onChange={(e) => setConversationalPrompt(e.target.value)}
                  placeholder="What if Sherlock Holmes never meets Watson, but instead retains a different detective partner..."
                  rows={4}
                  className="w-full rounded-xl border border-paper-border bg-paper-darker px-4 py-3.5 text-sm text-ink placeholder-ink-light focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold transition-all shadow-inner font-sans leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={handlePropose}
                disabled={!conversationalPrompt.trim() || proposalsLoading}
                className="flex items-center gap-2.5 rounded-xl bg-crimson hover:bg-crimson-hover px-6 py-4 text-xs font-sans font-bold uppercase tracking-widest text-white shadow-book hover:shadow-book-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500"
              >
                {proposalsLoading && <Spinner />}
                {proposalsLoading ? "WEAVING TRAJECTORY PROPOSALS..." : "GENERATE TRAJECTORIES"}
              </button>
            </div>
          )}

          {conversationalStep === 2 && (
            <div className="space-y-6 animate-scale-in">
              <div className="rounded-2xl border border-paper-border bg-paper-card p-6 md:p-8 space-y-6 glass-panel shadow-book">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-paper-border pb-4 gap-4">
                  <h3 className="font-display text-xl font-bold text-ink tracking-wide flex items-center gap-2.5">
                    <span className="font-mono text-[9px] font-bold border border-gold/30 bg-gold/5 text-gold px-2.5 py-0.5 rounded uppercase">
                      Weaver Proposals
                    </span>
                    Select Alternate Pathway
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleReroll}
                      disabled={proposalsLoading || expandLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-paper-border hover:border-gold/30 bg-paper-darker px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted hover:text-ink transition-all duration-300"
                    >
                      {proposalsLoading && <Spinner />}
                      RE-WEAVE
                    </button>
                    <button
                      onClick={handleAbort}
                      disabled={proposalsLoading || expandLoading}
                      className="rounded-lg border border-crimson/30 bg-crimson/5 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-crimson hover:bg-crimson/10 transition-all duration-300"
                    >
                      ABORT
                    </button>
                  </div>
                </div>

                <p className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest">
                  Lock in one of the simulated parameters below:
                </p>

                {proposalsLoading ? (
                  <div className="flex flex-col items-center justify-center py-14 space-y-3">
                    <Spinner />
                    <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest animate-pulse">
                      Simulating narrative pathways...
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
                              ? "border-gold bg-gold/5 shadow-book scale-[1.02]"
                              : "border-paper-border bg-paper-darker/50 hover:border-gold/35 hover:bg-paper-darker text-ink-muted"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <span className={`font-mono text-[8px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                                prop.scope === "character_death"
                                  ? "border-crimson/30 bg-crimson/5 text-crimson"
                                  : prop.scope === "relationship_change"
                                  ? "border-gold/30 bg-gold/5 text-gold"
                                  : "border-velvet/30 bg-velvet/5 text-velvet"
                              }`}>
                                {prop.scope.replace(/_/g, " ")}
                              </span>
                              <span className="font-mono text-[8px] font-bold text-ink-faded uppercase">
                                {prop.at_chapter.replace(/_/g, " ")}
                              </span>
                            </div>
                            <h4 className="font-display text-base font-bold text-ink tracking-wide">
                              {prop.title}
                            </h4>
                            <p className="text-xs text-ink-muted leading-relaxed font-serif font-light">
                              {prop.teaser}
                            </p>
                          </div>
                          <div className="border-t border-paper-border/60 pt-3 flex justify-between items-center text-[8px] font-mono font-bold text-ink-faded uppercase tracking-wider">
                            <span>TARGET DOCK:</span>
                            <span className="text-ink font-bold truncate max-w-[110px]">{prop.target_id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-paper-border pt-6 flex justify-end">
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedProposal || proposalsLoading || expandLoading}
                    className="flex items-center gap-2.5 rounded-xl bg-crimson hover:bg-crimson-hover px-6 py-4 text-xs font-sans font-bold uppercase tracking-widest text-white shadow-book hover:shadow-book-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500"
                  >
                    {expandLoading && <Spinner />}
                    {expandLoading ? "COMPILING CASCSDE IMPACTS..." : "CONFIRM TRAJECTORY"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {conversationalStep === 3 && conversationalResult && (
            <div className="space-y-6 animate-scale-in">
              <div className="flex justify-between items-center">
                <h4 className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-widest">
                  Simulation Finished
                </h4>
                <button
                  onClick={handleAbort}
                  className="rounded-lg border border-crimson/30 bg-crimson/5 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-crimson hover:bg-crimson/10 transition-all duration-300"
                >
                  START NEW SESSION
                </button>
              </div>

              {/* Selected proposal summary context */}
              {selectedProposal && (
                <div className="rounded-xl border border-paper-border bg-paper-card p-5 text-xs font-mono text-ink-muted space-y-1.5 glass-panel">
                  <div className="flex justify-between font-bold text-ink uppercase tracking-wider pb-2 border-b border-paper-border/60">
                    <span>{selectedProposal.title}</span>
                    <span className="text-gold">{selectedProposal.scope.toUpperCase().replace(/_/g, " ")}</span>
                  </div>
                  <div className="pt-2">TIMELINE THRESHOLD: {selectedProposal.at_chapter.toUpperCase().replace(/_/g, " ")}</div>
                  <div>BOUND MUTATION OBJECT: {selectedProposal.target_id}</div>
                </div>
              )}

              {/* Simulated sketch card */}
              <div className="rounded-xl border border-gold/30 bg-paper-card p-6 md:p-8 shadow-book-lg relative overflow-hidden border-t-2 border-t-gold">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold/50 via-gold/15 to-gold/50"></div>
                <div className="flex justify-between items-center border-b border-paper-border pb-4.5 mb-6 font-mono text-[9px] font-bold text-gold uppercase tracking-wider">
                  <span>SIMULATED NARRATIVE SKETCH</span>
                  <span>DRAFT COMPILED</span>
                </div>
                
                <p className="text-sm font-mono text-ink-muted leading-relaxed whitespace-pre-line bg-paper-darker/35 p-6 rounded-lg border border-paper-border/60">
                  {conversationalResult.summary}
                </p>
              </div>

              {/* Downstream impacts */}
              {conversationalResult.downstream_impacts.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-display text-lg font-bold text-ink tracking-wide flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold border border-crimson/30 bg-crimson/5 text-crimson px-2.5 py-0.5 rounded uppercase">
                      Narrative Cascade
                    </span>
                    Downstream Impacts Detected
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {conversationalResult.downstream_impacts.map((impact, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-paper-border bg-paper-card p-5 flex gap-4 items-start hover:border-gold/30 hover:bg-paper-darker transition-all duration-300 glass-panel shadow-sm"
                      >
                        <span className="shrink-0 rounded bg-gold/5 border border-gold/20 px-3 py-1 font-mono text-[9px] font-bold text-gold uppercase tracking-wider">
                          {impact.chapter_id.replace(/_/g, " ")}
                        </span>
                        <p className="text-sm text-ink-muted leading-relaxed font-serif font-light">{impact.impact}</p>
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
