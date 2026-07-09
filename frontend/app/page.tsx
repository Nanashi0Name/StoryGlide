import Link from "next/link";
import UploadForm from "@/components/UploadForm";

const DEMO_ID = process.env.NEXT_PUBLIC_DEMO_MANUSCRIPT_ID ?? "";

export default function HomePage() {
  return (
    <div className="space-y-12 py-4">
      {/* Intro Hero Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-obsidian-border bg-[#0d1322]/40 p-8 md:p-12 glass-panel shadow-2xl">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-neon-cyan/10 to-transparent pointer-events-none rounded-full blur-2xl"></div>
        
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-1 font-mono text-[10px] text-neon-cyan uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse"></span>
            MANUSCRIPT INGESTION ONLINE
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
            A Flight Recorder &amp; Simulator for your <span className="bg-gradient-to-r from-neon-cyan to-neon-green bg-clip-text text-transparent italic font-normal">Manuscript.</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed font-sans">
            StoryGlide parses your draft and creates a structured chapter-by-chapter world state model.
            Trace narrative timeline contradictions, track unresolved Chekhov&apos;s guns, score tension pacing, and safely simulate downstream impacts of script rewrites.
          </p>
        </div>
      </div>

      {/* Main Upload / Demo Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Upload console */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-obsidian-border bg-obsidian-card p-6 md:p-8 glass-panel shadow-lg space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-white tracking-wide">
                Ingest Manuscript
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                [SUPPORTED_FORMATS: .TXT, .DOCX] // ENGINE: IBM GRANITE-3 &amp; WATSON NLU
              </p>
            </div>
            
            <UploadForm />

            <div className="border-t border-obsidian-border/50 pt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>LOCAL PROCESS SESSION</span>
              <span className="text-neon-cyan">[SECURE_SANDBOX]</span>
            </div>
          </div>
        </div>

        {/* Right Side: Features / Quick Demo */}
        <div className="lg:col-span-5 space-y-6">
          {DEMO_ID && (
            <div className="rounded-2xl border border-neon-cyan/30 bg-gradient-to-br from-[#0c1626]/80 to-[#070b13]/85 p-6 glass-panel shadow-glow-cyan/5 flex flex-col justify-between h-full relative overflow-hidden group">
              {/* Animated subtle grid overlay */}
              <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
              <div className="relative space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-neon-cyan tracking-widest uppercase border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-0.5 rounded">
                    DEMO SEED READY
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">H.G. WELLS</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white group-hover:text-neon-cyan transition-colors">
                  Explore The Time Machine
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Load a pre-compiled structural breakdown of the classic public domain novel to see our contradictions diff, tension arc charts, character network, and what-if exploration engine in action.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-obsidian-border/50">
                <Link
                  href={`/dashboard/${DEMO_ID}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-neon-cyan hover:bg-[#00d0e6] text-[#060913] px-5 py-3 text-sm font-bold tracking-wider uppercase transition-all duration-300 hover:shadow-glow-cyan font-mono"
                >
                  Launch Demo Simulator →
                </Link>
              </div>
            </div>
          )}

          {/* Engine Status Cards */}
          <div className="rounded-2xl border border-obsidian-border bg-obsidian-card/40 p-6 glass-panel text-xs font-mono space-y-3.5">
            <div className="text-slate-400 uppercase tracking-widest text-[10px] border-b border-obsidian-border pb-2 font-bold">
              SYSTEM CAPABILITIES
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-neon-green">✔</span>
              <span className="text-slate-300">
                <strong className="text-white">Structured State Diffs:</strong> Evaluates chapter JSON facts for hard logical errors.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-neon-cyan">✔</span>
              <span className="text-slate-300">
                <strong className="text-white">Pacing Heatmaps:</strong> Analyzes chapter sizes and scene tension indexes.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-neon-purple">✔</span>
              <span className="text-slate-300">
                <strong className="text-white">What-If Cascade:</strong> Generates alternate summary and tags affected downstream scenes.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
