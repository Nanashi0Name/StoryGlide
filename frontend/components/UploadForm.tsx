"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useRef, useState, useEffect } from "react";
import { pollStatus, uploadManuscript } from "@/lib/api";

type Stage = "idle" | "uploading" | "processing" | "error";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150; // ~5 minutes

const INGESTION_LOGS = [
  "Mounting folio into processing ledger...",
  "Running morphological parsing on chapters...",
  "Extracting character entities & aliases...",
  "Mapping dialogue networks & direct interaction paths...",
  "Analyzing temporal markers for narrative continuity...",
  "Auditing timeline inconsistencies & place-name anomalies...",
  "Tracing unresolved plot promises (Chekhov's Guns)...",
  "Compiling cascade simulation paths...",
  "Drying ink on structural analysis folios...",
  "Formatting final manuscript codex..."
];

export default function UploadForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [statusLabel, setStatusLabel] = useState("");
  const [logIndex, setLogIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [provider, setProvider] = useState<"watsonx" | "gemini">("gemini");
  
  const fileRef = useRef<HTMLInputElement>(null);

  // Rotate log messages during processing to simulate compiler detail
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stage === "processing") {
      interval = setInterval(() => {
        setLogIndex((prev) => (prev + 1) % INGESTION_LOGS.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [stage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".txt") || file.name.endsWith(".docx"))) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const triggerFileSelect = useCallback(() => {
    if (stage !== "uploading" && stage !== "processing") {
      fileRef.current?.click();
    }
  }, [stage]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setStage("uploading");
    setErrorMsg("");
    setStatusLabel("Uploading draft folio...");

    try {
      const { manuscript_id } = await uploadManuscript(selectedFile, provider);
      setStage("processing");
      setStatusLabel(INGESTION_LOGS[0]);

      let polls = 0;
      while (polls < MAX_POLLS) {
        await sleep(POLL_INTERVAL_MS);
        const status = await pollStatus(manuscript_id);

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
  }, [selectedFile, provider, router]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider selection */}
        <div className="rounded-xl border border-paper-border bg-paper-darker p-5 shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/40 to-transparent"></div>
          
          <label className="block text-[10px] font-sans font-bold text-ink-muted uppercase tracking-wider mb-3">
            CHOOSE LITERARY INTELLIGENCE
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              disabled={stage === "uploading" || stage === "processing"}
              onClick={() => setProvider("gemini")}
              className={`rounded-xl border p-4 text-left transition-all duration-300 relative overflow-hidden group ${
                provider === "gemini"
                  ? "bg-paper-card border-gold text-ink shadow-book"
                  : "border-paper-border text-ink-muted hover:text-ink hover:bg-paper-card/30"
              }`}
            >
              <div className="font-sans text-[8px] font-bold text-gold uppercase tracking-wider">PRIMARY PARSER</div>
              <div className="font-display text-base font-bold mt-1 text-ink">Google Gemini API</div>
              <div className="text-[10px] font-mono text-ink-muted mt-1">gemini-3.5-flash</div>
              {provider === "gemini" && (
                <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-gold shadow-gold-seal"></div>
              )}
            </button>
            <button
              type="button"
              disabled={stage === "uploading" || stage === "processing"}
              onClick={() => setProvider("watsonx")}
              className={`rounded-xl border p-4 text-left transition-all duration-300 relative overflow-hidden group ${
                provider === "watsonx"
                  ? "bg-paper-card border-gold text-ink shadow-book"
                  : "border-paper-border text-ink-muted hover:text-ink hover:bg-paper-card/30"
              }`}
            >
              <div className="font-sans text-[8px] font-bold text-ink-faded uppercase tracking-wider">LEGACY ENGINE</div>
              <div className="font-display text-base font-bold mt-1 text-ink">IBM watsonx.ai</div>
              <div className="text-[10px] font-mono text-ink-muted mt-1">granite-4-h-small</div>
              {provider === "watsonx" && (
                <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-gold shadow-gold-seal"></div>
              )}
            </button>
          </div>
        </div>

        {/* Drag and Drop Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col items-center justify-center min-h-[220px] ${
            isDragOver
              ? "border-gold bg-gold/5 shadow-book-lg scale-[1.01]"
              : selectedFile
              ? "border-sage/50 bg-sage/5 hover:border-sage hover:bg-sage/10"
              : "border-paper-border bg-paper-darker/60 hover:border-gold/30 hover:bg-paper-card/10"
          }`}
        >
          {/* Subtle copper corner accents (pure CSS typography) */}
          <div className="absolute top-2 left-2 font-mono text-[9px] text-paper-border select-none">┌</div>
          <div className="absolute top-2 right-2 font-mono text-[9px] text-paper-border select-none">┐</div>
          <div className="absolute bottom-2 left-2 font-mono text-[9px] text-paper-border select-none">└</div>
          <div className="absolute bottom-2 right-2 font-mono text-[9px] text-paper-border select-none">┘</div>

          <input
            ref={fileRef}
            type="file"
            accept=".txt,.docx"
            onChange={handleFileChange}
            className="hidden"
            disabled={stage === "uploading" || stage === "processing"}
          />

          {stage === "uploading" || stage === "processing" ? (
            <div className="space-y-4 w-full px-4">
              <div className="flex justify-center">
                <Spinner />
              </div>
              <div className="space-y-2">
                <div className="font-display text-lg font-bold text-ink uppercase tracking-wide animate-pulse">
                  Ingesting Manuscript
                </div>
                {/* Console Log Feed */}
                <div className="rounded-lg border border-paper-border bg-paper-card p-4 shadow-inner max-w-md mx-auto text-left font-mono text-xs text-gold/90 space-y-1.5 leading-relaxed overflow-hidden">
                  <div className="text-ink-faded font-bold uppercase text-[9px] border-b border-paper-border pb-1 mb-2 flex justify-between">
                    <span>Folio Ingestion Console</span>
                    <span className="animate-pulse">ONLINE</span>
                  </div>
                  <div>$ agy ingest --provider={provider} --file={selectedFile?.name.substring(0, 20)}...</div>
                  <div className="text-ink-muted">&gt; Uploading: 100% complete</div>
                  <div className="text-ink font-semibold cursor-blink">
                    &gt; {stage === "processing" ? INGESTION_LOGS[logIndex] : statusLabel}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full border border-sage/35 bg-sage/5 flex items-center justify-center mx-auto text-sage text-xl animate-float">
                📜
              </div>
              <div>
                <h4 className="font-display text-base font-bold text-ink truncate max-w-[280px]">
                  {selectedFile.name}
                </h4>
                <p className="text-[10px] text-sage font-sans font-bold uppercase tracking-wider mt-1">
                  Ready to bind // {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <p className="text-xs text-ink-muted italic">
                Click or drag another file to replace
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-full border border-paper-border bg-paper-card flex items-center justify-center mx-auto text-ink-muted text-lg group-hover:text-gold transition-colors">
                ✍
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-base font-bold text-ink tracking-wide">
                  Drop Draft Folio Here
                </h4>
                <p className="text-xs text-ink-muted leading-relaxed max-w-xs mx-auto">
                  Drag and drop your manuscript (<span className="font-mono text-[10px]">.txt</span> or <span className="font-mono text-[10px]">.docx</span>) or click to browse local files.
                </p>
              </div>
              <p className="text-[9px] text-ink-faded font-sans font-bold uppercase tracking-wider">
                Max File Size: 15MB // Sandbox Isolation Active
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={stage === "uploading" || stage === "processing" || !selectedFile}
          className="w-full flex items-center justify-center gap-3 rounded-xl bg-crimson hover:bg-crimson-hover px-6 py-4 text-xs font-bold text-white uppercase tracking-widest font-sans shadow-book hover:shadow-book-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-500"
        >
          <span>ANALYZE MANUSCRIPT</span>
        </button>
      </form>

      {/* Error Panel */}
      {stage === "error" && (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-5 text-xs font-sans text-crimson shadow-md flex items-start justify-between gap-4 animate-scale-in overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full w-[2px] bg-crimson"></div>
          <div className="space-y-1.5 min-w-0 flex-1 pl-1">
            <div className="font-bold uppercase tracking-widest text-[9px] text-crimson">INGESTION ERROR</div>
            <p className="text-ink-muted font-serif text-xs leading-relaxed break-all whitespace-pre-wrap max-h-40 overflow-y-auto pr-2">
              {errorMsg}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setStage("idle"); setErrorMsg(""); }}
            className="shrink-0 rounded-lg bg-crimson/10 border border-crimson/30 px-3.5 py-2 font-bold uppercase tracking-wider text-crimson hover:bg-crimson/20 transition-all text-[10px]"
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
    <div className="relative h-6 w-6">
      <span className="absolute inset-0 rounded-full border border-gold/15"></span>
      <span className="absolute inset-0 rounded-full border border-t-gold border-r-transparent border-b-transparent border-l-transparent animate-spin"></span>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
