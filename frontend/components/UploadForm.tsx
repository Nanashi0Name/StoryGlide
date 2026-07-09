"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useRef, useState } from "react";
import {
  pollStatus,
  uploadManuscript,
} from "@/lib/api";

type Stage = "idle" | "uploading" | "processing" | "error";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150; // ~5 minutes

export default function UploadForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [statusLabel, setStatusLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileSelected, setFileSelected] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStage("uploading");
    setErrorMsg("");
    setStatusLabel("UPLOADING_DRAFT...");

    try {
      const { manuscript_id } = await uploadManuscript(file);
      setStage("processing");

      // Poll until done or error
      let polls = 0;
      while (polls < MAX_POLLS) {
        await sleep(POLL_INTERVAL_MS);
        const status = await pollStatus(manuscript_id);
        setStatusLabel(`RUNNING_DIAGNOSTICS (${status.status.toUpperCase()})`);

        if (status.status === "done") {
          router.push(`/dashboard/${manuscript_id}`);
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
  }, [router]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-obsidian-border bg-[#0a0f1d] p-6 shadow-inner relative overflow-hidden group">
          {/* Subtle decoration lines representing radar scanner */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-neon-cyan/40 to-transparent animate-pulse"></div>
          
          <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-3">
            SELECT_MANUSCRIPT_FILE
          </label>
          
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.docx"
            onChange={(e) => setFileSelected(!!e.target.files?.length)}
            className="block w-full text-sm text-slate-400 font-sans
              file:mr-4 file:rounded-lg file:border file:border-neon-cyan/30 file:bg-neon-cyan/5 
              file:px-4 file:py-2 file:text-xs file:font-mono file:font-bold file:text-neon-cyan 
              file:uppercase file:tracking-wider hover:file:bg-neon-cyan/20 file:transition-all 
              cursor-pointer focus:outline-none"
            disabled={stage === "uploading" || stage === "processing"}
          />
          
          <p className="mt-3 text-[11px] text-slate-500 font-mono">
            FILE_EXTENSIONS: .txt, .docx (Max 15MB)
          </p>
        </div>

        <button
          type="submit"
          disabled={stage === "uploading" || stage === "processing" || !fileSelected}
          className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-neon-cyan to-[#00cce0] px-6 py-3.5 text-sm font-bold text-[#060913] uppercase tracking-wider font-mono shadow-glow-cyan/20 hover:shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300"
        >
          {stage === "uploading" || stage === "processing" ? (
            <span className="flex items-center gap-2.5">
              <Spinner />
              <span className="animate-pulse">{statusLabel}</span>
            </span>
          ) : (
            <span>RUN TELEMETRY ANALYSIS</span>
          )}
        </button>
      </form>

      {/* Error Panel */}
      {stage === "error" && (
        <div className="rounded-xl border border-neon-rose/30 bg-neon-rose/5 p-4 text-xs font-mono text-neon-rose shadow-glow-rose/10 flex items-start justify-between gap-4 animate-scale-in">
          <div className="space-y-1">
            <div className="font-bold uppercase tracking-wider">[ANALYSIS_FAIL]</div>
            <p className="text-slate-300 leading-normal">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => { setStage("idle"); setErrorMsg(""); }}
            className="shrink-0 rounded bg-neon-rose/10 border border-neon-rose/30 px-3 py-1.5 font-bold uppercase tracking-wider text-neon-rose hover:bg-neon-rose/20 transition-colors"
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-[#060913]"
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
