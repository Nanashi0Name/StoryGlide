"use client";

import { ArcDataPoint, CharacterObject, DownstreamImpact, WhatIfRequest, WhatIfResponse, runWhatIf } from "@/lib/api";
import React, { useState } from "react";

interface Props {
  manuscriptId: string;
  characters: CharacterObject[];
  arc: ArcDataPoint[];
}

const SCOPE_OPTIONS = [
  { value: "character_death", label: "Character Death" },
  { value: "relationship_change", label: "Relationship Change" },
  { value: "event_removal", label: "Event Removal" },
] as const;

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
      <form onSubmit={handleSubmit} className="rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] p-6 space-y-5">
        <h3 className="font-bold text-[#1f2328]">Configure what-if scenario</h3>

        {/* Scope */}
        <div>
          <label className="block text-xs font-semibold text-[#57606a] uppercase tracking-wider mb-1.5">
            Scenario type
          </label>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setScope(opt.value); setTargetId(""); setCustomTarget(""); }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  scope === opt.value
                    ? "border-[#3b82d4] bg-[#3b82d4] text-white"
                    : "border-[#e5e7eb] bg-white text-[#1f2328] hover:border-[#3b82d4]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target */}
        <div>
          <label className="block text-xs font-semibold text-[#57606a] uppercase tracking-wider mb-1.5">
            {isCharacterScope ? "Character" : "Event name or ID"}
          </label>
          {isCharacterScope ? (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2328] focus:outline-none focus:ring-2 focus:ring-[#3b82d4]"
            >
              <option value="">Select a character…</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              placeholder="e.g. kingdom_attacked"
              className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2328] focus:outline-none focus:ring-2 focus:ring-[#3b82d4]"
            />
          )}
        </div>

        {/* Chapter */}
        <div>
          <label className="block text-xs font-semibold text-[#57606a] uppercase tracking-wider mb-1.5">
            At chapter
          </label>
          <select
            value={atChapter}
            onChange={(e) => setAtChapter(e.target.value)}
            className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2328] focus:outline-none focus:ring-2 focus:ring-[#3b82d4]"
          >
            <option value="">Select a chapter…</option>
            {uniqueChapters.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex items-center gap-2 rounded-lg bg-[#3b82d4] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading && <Spinner />}
          {loading ? "Generating…" : "Generate alternate path"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-5">
          {/* Narrative sketch */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-6">
            <div className="text-xs font-semibold text-[#57606a] uppercase tracking-wider mb-2">
              Alternate path narrative
            </div>
            <p className="text-sm text-[#1f2328] leading-relaxed">{result.summary}</p>
          </div>

          {/* Downstream impacts */}
          {result.downstream_impacts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-[#1f2328]">
                Downstream impacts ({result.downstream_impacts.length} chapters affected)
              </h4>
              {result.downstream_impacts.map((impact, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#e5e7eb] bg-white p-4 flex gap-4 items-start"
                >
                  <code className="shrink-0 rounded bg-[#f7f8fa] border border-[#e5e7eb] px-2 py-0.5 text-xs font-semibold text-[#3b82d4]">
                    {impact.chapter_id}
                  </code>
                  <p className="text-sm text-[#24292f]">{impact.impact}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
