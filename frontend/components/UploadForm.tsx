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
  const [provider, setProvider] = useState<"watsonx" | "gemini">("gemini");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStage("uploading");
    setErrorMsg("");
    setStatusLabel("Uploading draft...");

    try {
      const { manuscript_id } = await uploadManuscript(file, provider);
      setStage("processing");

      // Poll until done or error
      let polls = 0;
      while (polls < MAX_POLLS) {
        await sleep(POLL_INTERVAL_MS);
        const status = await pollStatus(manuscript_id);
        setStatusLabel("Leafing through draft pages...");

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
  }, [router, provider]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider selection */}
        <div className="rounded-xl border border-paper-border bg-paper-darker p-6 shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent"></div>
          
          <label className="block text-[10px] font-sans font-bold text-ink-muted uppercase tracking-wider mb-3">
            CHOOSE LITERARY GUIDE
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              disabled={stage === "uploading" || stage === "processing"}
              onClick={() => setProvider("gemini")}
              className={`rounded-xl border p-4 text-left transition-all duration-300 relative overflow-hidden group ${
                provider === "gemini"
                  ? "bg-paper-card border-crimson text-ink shadow-book"
                  : "border-paper-border text-ink-muted hover:text-ink hover:bg-paper-darker/50"
              }`}
            >
              <div className="font-sans text-[9px] font-bold text-ink-faded uppercase tracking-wider">PRIMARY INTEL</div>
              <div className="font-display text-sm font-bold mt-1 text-ink">Google Gemini API</div>
              <div className="text-[10px] font-sans text-ink-muted mt-1">gemini-3.5-flash</div>
              {provider === "gemini" && (
                <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-crimson"></div>
              )}
            </button>
            <button
              type="button"
              disabled={stage === "uploading" || stage === "processing"}
              onClick={() => setProvider("watsonx")}
              className={`rounded-xl border p-4 text-left transition-all duration-300 relative overflow-hidden group ${
                provider === "watsonx"
                  ? "bg-paper-card border-crimson text-ink shadow-book"
                  : "border-paper-border text-ink-muted hover:text-ink hover:bg-paper-darker/50"
              }`}
            >
              <div className="font-sans text-[9px] font-bold text-ink-faded uppercase tracking-wider">SECONDARY INTEL</div>
              <div className="font-display text-sm font-bold mt-1 text-ink">IBM watsonx.ai</div>
              <div className="text-[10px] font-sans text-ink-muted mt-1">granite-4-h-small</div>
              {provider === "watsonx" && (
                <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-crimson"></div>
              )}
            </button>
          </div>
        </div>

        {/* File Ingestion */}
        <div className="rounded-xl border border-paper-border bg-paper-darker p-6 shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent"></div>
          
          <label className="block text-[10px] font-sans font-bold text-ink-muted uppercase tracking-wider mb-3">
            SELECT MANUSCRIPT DRAFT
          </label>
          
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.docx"
            onChange={(e) => setFileSelected(!!e.target.files?.length)}
            className="block w-full text-sm text-ink-muted font-sans
              file:mr-4 file:rounded-lg file:border file:border-crimson/25 file:bg-crimson/5 
              file:px-4 file:py-2 file:text-xs file:font-sans file:font-bold file:text-crimson 
              file:uppercase file:tracking-wider hover:file:bg-crimson/15 file:transition-all 
              cursor-pointer focus:outline-none"
            disabled={stage === "uploading" || stage === "processing"}
          />
          
          <p className="mt-3 text-[10px] text-ink-faded font-sans font-medium">
            File Extensions: .txt, .docx (Up to 15MB)
          </p>
        </div>

        <button
          type="submit"
          disabled={stage === "uploading" || stage === "processing" || !fileSelected}
          className="w-full flex items-center justify-center gap-3 rounded-xl bg-crimson hover:bg-crimson-hover px-6 py-3.5 text-sm font-bold text-white uppercase tracking-wider font-sans shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300"
        >
          {stage === "uploading" || stage === "processing" ? (
            <span className="flex items-center gap-2.5">
              <Spinner />
              <span className="animate-pulse">{statusLabel}</span>
            </span>
          ) : (
            <span>ANALYZE MANUSCRIPT</span>
          )}
        </button>
      </form>

      {/* Error Panel */}
      {stage === "error" && (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-xs font-sans text-crimson shadow-sm flex items-start justify-between gap-4 animate-scale-in overflow-hidden">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="font-bold uppercase tracking-wider">ANALYSIS INTERRUPTED</div>
            <p className="text-ink-muted leading-normal break-all whitespace-pre-wrap max-h-48 overflow-y-auto pr-2">
              {errorMsg}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setStage("idle"); setErrorMsg(""); }}
            className="shrink-0 rounded bg-crimson/10 border border-crimson/30 px-3 py-1.5 font-bold uppercase tracking-wider text-crimson hover:bg-crimson/20 transition-colors"
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
