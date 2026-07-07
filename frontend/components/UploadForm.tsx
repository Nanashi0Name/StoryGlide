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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStage("uploading");
    setErrorMsg("");
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
          <div className="flex items-start justify-between gap-4">
            <span><strong>Error:</strong> {errorMsg}</span>
            <button
              type="button"
              onClick={() => { setStage("idle"); setErrorMsg(""); }}
              className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 transition-colors"
            >
              Try again
            </button>
          </div>
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
