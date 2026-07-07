"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  CharactersResponse,
  fetchCharacters,
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
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStage("uploading");
    setErrorMsg("");
    setResult(null);
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
          setResult(chars);
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
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f7f8fa] p-6">
          <label className="block text-sm font-medium text-[#1f2328] mb-2">
            Manuscript file
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.docx"
            className="block w-full text-sm text-[#57606a] file:mr-4 file:rounded file:border-0 file:bg-[#3b82d4] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-600"
            disabled={stage === "uploading" || stage === "processing"}
          />
          <p className="mt-2 text-xs text-[#57606a]">Supported formats: .txt, .docx</p>
        </div>

        <button
          type="submit"
          disabled={stage === "uploading" || stage === "processing"}
          className="rounded bg-[#3b82d4] px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stage === "uploading" || stage === "processing" ? statusLabel : "Analyse manuscript"}
        </button>
      </form>

      {/* Status */}
      {(stage === "uploading" || stage === "processing") && (
        <div className="mt-6 flex items-center gap-3 text-sm text-[#57606a]">
          <Spinner />
          <span>{statusLabel}</span>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Results */}
      {stage === "done" && result && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-[#1f2328]">
            Extracted characters ({result.characters.length})
          </h2>
          <div className="space-y-3">
            {result.characters.map((char) => (
              <div
                key={char.id}
                className="rounded-lg border border-[#e5e7eb] bg-[#f7f8fa] p-4"
              >
                <div className="font-medium text-[#1f2328]">
                  {char.name}
                  {char.aliases.length > 0 && (
                    <span className="ml-2 text-xs text-[#57606a]">
                      aka {char.aliases.join(", ")}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-[#57606a]">
                  First appears: <code>{char.first_appearance}</code> ·{" "}
                  {char.relationships.length} relationship(s)
                </div>
                <div className="mt-1 text-xs text-[#57606a]">
                  Status:{" "}
                  {Object.entries(char.status_by_chapter)
                    .map(([ch, st]) => `${ch}: ${st}`)
                    .join(", ")}
                </div>
              </div>
            ))}
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer text-xs text-[#57606a] hover:text-[#1f2328]">
              Raw JSON
            </summary>
            <pre className="mt-2 overflow-x-auto rounded border border-[#e5e7eb] bg-[#f7f8fa] p-4 text-xs">
              {JSON.stringify(result, null, 2)}
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
      className="h-4 w-4 animate-spin text-[#3b82d4]"
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
