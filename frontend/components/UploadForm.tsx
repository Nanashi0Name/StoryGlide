"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  CharactersResponse,
  ContradictionFlag,
  UnresolvedThread,
  fetchCharacters,
  fetchContradictions,
  fetchThreads,
  pollStatus,
  uploadManuscript,
} from "@/lib/api";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150; // ~5 minutes

export default function UploadForm() {
  const [stage, setStage] = useState<Stage>("idle");
  const [statusLabel, setStatusLabel] = useState("");
  const [result, setResult] = useState<CharactersResponse | null>(null);
  const [contradictions, setContradictions] = useState<ContradictionFlag[]>([]);
  const [threads, setThreads] = useState<UnresolvedThread[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStage("uploading");
    setErrorMsg("");
    setResult(null);
    setContradictions([]);
    setThreads([]);
    setStatusLabel("Uploading…");

    try {
      const { manuscript_id } = await uploadManuscript(file);
      setStage("processing");

      // Poll until done or error
      let polls = 0;
      while (polls < MAX_POLLS) {
        await sleep(POLL_INTERVAL_MS);
        const status = await pollStatus(manuscript_id);
        setStatusLabel(`Processing… (${status.status})`);

        if (status.status === "done") {
          const chars = await fetchCharacters(manuscript_id);
          const contraRes = await fetchContradictions(manuscript_id);
          const threadsRes = await fetchThreads(manuscript_id);

          setResult(chars);
          setContradictions(contraRes.contradictions);
          setThreads(threadsRes.threads);
          setStage("done");
          return;
        }
        if (status.status === "error") {
          throw new Error(status.error ?? "Extraction failed.");
        }
        polls++;
      }
      throw new Error("Timed out waiting for processing to complete.");
    } catch (err: unknown) {
      setStage("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-[#e5e7eb] bg-gradient-to-br from-white to-[#f7f8fa] p-6 shadow-sm">
          <label className="block text-sm font-semibold text-[#1f2328] mb-2">
            Manuscript file
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.docx"
            className="block w-full text-sm text-[#57606a] file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#3b82f6] file:to-[#1d4ed8] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:opacity-90 transition-all cursor-pointer"
            disabled={stage === "uploading" || stage === "processing"}
          />
          <p className="mt-2 text-xs text-[#57606a]">Supported formats: .txt, .docx</p>
        </div>

        <button
          type="submit"
          disabled={stage === "uploading" || stage === "processing"}
          className="rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] px-6 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {stage === "uploading" || stage === "processing" ? (
            <span className="flex items-center gap-2">
              <Spinner />
              {statusLabel}
            </span>
          ) : (
            "Analyse manuscript"
          )}
        </button>
      </form>

      {/* Error */}
      {stage === "error" && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-700 shadow-sm">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Results */}
      {stage === "done" && result && (
        <div className="mt-10 space-y-8 animate-fade-in">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#e5e7eb] bg-gradient-to-b from-white to-[#f7f8fa] p-5 shadow-sm">
              <div className="text-xs font-semibold text-[#57606a] uppercase tracking-wider">Characters Found</div>
              <div className="mt-2 text-3xl font-bold text-[#1f2328]">{result.characters.length}</div>
            </div>
            
            <div className={`rounded-xl border p-5 shadow-sm ${contradictions.length > 0 ? "border-amber-200 bg-amber-50/30" : "border-[#e5e7eb] bg-[#f7f8fa]"}`}>
              <div className="text-xs font-semibold text-[#57606a] uppercase tracking-wider">Contradictions</div>
              <div className={`mt-2 text-3xl font-bold ${contradictions.length > 0 ? "text-amber-700" : "text-[#1f2328]"}`}>
                {contradictions.length}
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e7eb] bg-gradient-to-b from-white to-[#f7f8fa] p-5 shadow-sm">
              <div className="text-xs font-semibold text-[#57606a] uppercase tracking-wider">Unresolved Threads</div>
              <div className="mt-2 text-3xl font-bold text-[#1f2328]">{threads.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Contradictions Diff Engine */}
            {contradictions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[#1f2328] flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-sm font-bold">!</span>
                  Logical Contradictions ({contradictions.length})
                </h2>
                <div className="space-y-3">
                  {contradictions.map((flag) => (
                    <div
                      key={flag.id}
                      className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-5 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 uppercase">
                          {flag.type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-[#57606a] font-medium">
                          Confidence: {Math.round(flag.confidence * 100)}%
                        </span>
                      </div>
                      <h3 className="mt-2 font-bold text-[#1f2328]">{flag.entity}</h3>
                      <p className="mt-1 text-sm text-[#24292f]">{flag.description}</p>
                      <div className="mt-3 flex gap-2 text-xs text-[#57606a]">
                        <span>Conflicting chapters:</span>
                        {flag.conflicting_chapters.map((ch) => (
                          <code key={ch} className="rounded bg-white border border-[#e5e7eb] px-1.5 py-0.5 text-xs text-[#1f2328]">
                            {ch}
                          </code>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unresolved Narrative Threads */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1f2328] flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-sm font-bold">?</span>
                Unresolved Narrative Threads ({threads.length})
              </h2>
              <div className="space-y-3">
                {threads.length > 0 ? (
                  threads.map((thread) => (
                    <div
                      key={thread.id}
                      className="rounded-xl border border-[#e5e7eb] bg-gradient-to-br from-white to-[#f7f8fa] p-5 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 uppercase">
                          {thread.type.replace("_", " ")}
                        </span>
                        <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping"></span>
                          Unresolved
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#24292f] font-medium">{thread.description}</p>
                      <div className="mt-3 text-xs text-[#57606a]">
                        Introduced in: <code className="rounded bg-white border border-[#e5e7eb] px-1 py-0.5">{thread.introduced_chapter}</code>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#57606a] italic">No unresolved threads found. Pacing is clean!</p>
                )}
              </div>
            </div>

            {/* Extracted Characters */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#1f2328]">Extracted Characters ({result.characters.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.characters.map((char) => (
                  <div
                    key={char.id}
                    className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-bold text-lg text-[#1f2328]">
                        {char.name}
                        {char.aliases && char.aliases.length > 0 && (
                          <span className="block text-xs font-normal text-[#57606a] mt-1">
                            aka {char.aliases.join(", ")}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-[#57606a]">
                        First Appearance: <code className="rounded bg-[#f7f8fa] border border-[#e5e7eb] px-1 py-0.5">{char.first_appearance}</code>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-semibold text-[#24292f]">Status Timeline:</div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(char.status_by_chapter).map(([ch, st]) => (
                            <span
                              key={ch}
                              className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider ${
                                st === "alive"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {ch}: {st}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {char.relationships && char.relationships.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#f1f2f4]">
                        <div className="text-xs font-semibold text-[#24292f] mb-1.5">Relationships:</div>
                        <div className="space-y-1">
                          {char.relationships.map((rel, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-[#57606a]">
                              <span>
                                {rel.type} with <code className="font-semibold text-[#1f2328]">{rel.target_id}</code>
                              </span>
                              <span className="italic text-2xs">{rel.sentiment}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer text-xs text-[#57606a] hover:text-[#1f2328] font-semibold">
              Raw JSON Data
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] p-4 text-xs font-mono shadow-inner max-h-96">
              {JSON.stringify({ characters: result.characters, contradictions, threads }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
