import Link from "next/link";
import UploadForm from "@/components/UploadForm";

const DEMO_ID = process.env.NEXT_PUBLIC_DEMO_MANUSCRIPT_ID ?? "";

export default function HomePage() {
  return (
    <div className="space-y-12 py-4 font-serif">
      {/* Intro Hero Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-paper-border bg-paper-darker p-8 md:p-12 glass-panel shadow-book-lg">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-gold/10 to-transparent pointer-events-none rounded-full blur-2xl"></div>
        
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-crimson/20 bg-crimson/5 px-3 py-1 font-sans text-[10px] font-bold text-crimson uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-crimson"></span>
            MANUSCRIPT ANALYTICS ACTIVE
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-ink">
            A Narrative Compass &amp; Continuity Ledger for your <span className="bg-gradient-to-r from-crimson via-gold to-crimson bg-clip-text text-transparent italic font-normal font-serif">Manuscript.</span>
          </h1>
          <p className="text-ink-muted text-base md:text-lg leading-relaxed font-serif">
            StoryGlide parses your draft and creates a structured chapter-by-chapter chronicle.
            Trace narrative timeline contradictions, track unresolved plot threads, map character relationships, and safely weave alternate draft trajectories.
          </p>
        </div>
      </div>

      {/* Main Upload / Demo Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Upload console */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-paper-border bg-paper-card p-6 md:p-8 glass-panel shadow-book space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink tracking-wide">
                Bind New Manuscript
              </h2>
              <p className="text-[10px] text-ink-muted font-sans font-bold mt-1 uppercase tracking-wider">
                Supported Formats: .txt, .docx // Processing Sandbox
              </p>
            </div>
            
            <UploadForm />

            <div className="border-t border-paper-border/50 pt-4 flex items-center justify-between text-[10px] text-ink-faded font-sans font-bold uppercase tracking-wider">
              <span>Local Processing Session</span>
              <span className="text-gold">[Secure Sandbox]</span>
            </div>
          </div>
        </div>

        {/* Right Side: Features / Quick Demo */}
        <div className="lg:col-span-5 space-y-6">
          {DEMO_ID && (
            <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 via-paper/50 to-gold/10 p-6 glass-panel shadow-book flex flex-col justify-between h-full relative overflow-hidden group">
              {/* Animated subtle grid overlay */}
              <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
              <div className="relative space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-[9px] font-bold text-crimson tracking-wider uppercase border border-crimson/25 bg-crimson/5 px-2.5 py-0.5 rounded-full">
                    DEMO ARCHIVE READY
                  </span>
                  <span className="font-sans text-[10px] font-bold text-gold uppercase tracking-wider">SIR ARTHUR CONAN DOYLE</span>
                </div>
                <h3 className="font-display text-xl font-bold text-ink group-hover:text-crimson transition-colors">
                  Explore The Speckled Band
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed font-serif">
                  Load a pre-compiled structural breakdown of the classic public domain Sherlock Holmes short story to see our contradictions diff, character network, and what-if exploration engine in action.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-paper-border/50">
                <Link
                  href={`/dashboard/${DEMO_ID}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-crimson hover:bg-crimson-hover text-white px-5 py-3.5 text-xs font-sans font-bold tracking-wider uppercase transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Explore Demo Manuscript →
                </Link>
              </div>
            </div>
          )}

          {/* Engine Status Cards */}
          <div className="rounded-2xl border border-paper-border bg-paper-darker p-6 glass-panel text-sm text-ink space-y-4 shadow-sm">
            <div className="text-ink-muted uppercase tracking-wider text-[10px] border-b border-paper-border pb-2 font-sans font-bold">
              Folio Analytics
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-sage font-bold">✔</span>
              <span className="text-ink-muted font-serif">
                <strong className="text-ink font-sans font-bold text-xs uppercase tracking-wider">Continuity Ledger:</strong> Automatically cross-checks facts across chapters for timeline inconsistencies.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-gold font-bold">✔</span>
              <span className="text-ink-muted font-serif">
                <strong className="text-ink font-sans font-bold text-xs uppercase tracking-wider">Story Weaver Cascade:</strong> Simulates downstream impacts on characters and plot points from structural changes.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
