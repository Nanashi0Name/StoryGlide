import Link from "next/link";
import UploadForm from "@/components/UploadForm";

const DEMO_ID = process.env.NEXT_PUBLIC_DEMO_MANUSCRIPT_ID ?? "d54c0525-28c2-417e-9660-1ad9aa29bc54";

export default function HomePage() {
  return (
    <div className="space-y-16 py-6 font-serif">
      {/* Intro Hero Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-paper-border bg-paper-card p-8 md:p-14 glass-panel shadow-book-lg">
        {/* Glow corner simulating desk lamp */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-bl from-gold/10 via-transparent to-transparent pointer-events-none rounded-full blur-3xl"></div>
        <div className="absolute top-4 left-4 font-mono text-[9px] text-ink-light select-none">FOLIO INTAKE // PORTAL ACTIVE</div>
        
        <div className="max-w-3xl space-y-6 pt-4 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-md border border-gold/30 bg-gold/5 px-3 py-1 font-sans text-[9px] font-bold text-gold uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-ping"></span>
            MANUSCRIPT ANALYTICS ACTIVE
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-light tracking-tight leading-[1.1] text-ink">
            A Narrative Compass &amp; Continuity Ledger for your <span className="italic font-normal text-gold bg-gradient-to-r from-gold via-gold/90 to-gold/75 bg-clip-text text-transparent">Manuscript.</span>
          </h1>
          
          <p className="text-ink-muted text-base md:text-lg leading-relaxed max-w-2xl font-serif font-light">
            StoryGlide parses your draft and creates a structured chapter-by-chapter chronicle.
            Trace narrative timeline contradictions, track unresolved plot threads, map character relationships, and safely weave alternate draft trajectories.
          </p>

          <div className="pt-2 flex items-center gap-2.5 font-mono text-[10px] text-ink-light uppercase tracking-wider">
            <span>Compiled via primary LLM models</span>
            <span className="text-border">•</span>
            <span>Local processing sandbox</span>
          </div>
        </div>
      </div>

      {/* Main Upload / Demo Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Upload console */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-paper-border bg-paper-card p-6 md:p-8 glass-panel shadow-book space-y-6 relative">
            {/* Fine copper corner accents */}
            <div className="absolute top-3 right-3 font-mono text-[8px] text-ink-faded uppercase tracking-widest">INGESTION PANEL</div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink tracking-wide">
                Bind New Manuscript
              </h2>
              <p className="text-[9px] text-ink-muted font-mono font-bold mt-1.5 uppercase tracking-wider">
                Formats: .txt, .docx // Automated Chaptering Sandbox
              </p>
            </div>
            
            <UploadForm />

            <div className="border-t border-paper-border/50 pt-4 flex items-center justify-between text-[9px] text-ink-faded font-mono font-bold uppercase tracking-wider">
              <span>Local Processing Session</span>
              <span className="text-gold">[SECURE DRAFT DOCKET]</span>
            </div>
          </div>
        </div>

        {/* Right Side: Features / Quick Demo */}
        <div className="lg:col-span-5 space-y-8">
          {DEMO_ID && (
            <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 via-paper-card/80 to-gold/10 p-6 md:p-8 glass-panel shadow-book flex flex-col justify-between min-h-[280px] relative overflow-hidden group">
              {/* Subtle grid pattern overlay */}
              <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
              
              <div className="relative space-y-4">
                <div className="flex justify-between items-center border-b border-paper-border/55 pb-3">
                  <span className="font-sans text-[8px] font-bold text-crimson tracking-wider uppercase border border-crimson/25 bg-crimson/5 px-2.5 py-0.5 rounded">
                    DEMO ARCHIVE READY
                  </span>
                  <span className="font-mono text-[9px] text-gold uppercase tracking-wider">SIR ARTHUR CONAN DOYLE</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-ink group-hover:text-gold transition-colors duration-300">
                  Explore The Speckled Band
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed font-serif font-light">
                  Load a pre-compiled structural breakdown of the classic public domain Sherlock Holmes short story to see our contradictions diff, character network, and what-if exploration engine in action.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-paper-border/50">
                <Link
                  href={`/dashboard/${DEMO_ID}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold hover:bg-gold-hover text-paper px-5 py-3.5 text-xs font-sans font-bold tracking-widest uppercase transition-all duration-300 shadow-sm hover:shadow-book"
                >
                  Explore Demo Manuscript →
                </Link>
              </div>
            </div>
          )}

          {/* Engine Status Cards */}
          <div className="rounded-2xl border border-paper-border bg-paper-card p-6 glass-panel text-sm text-ink space-y-5 shadow-sm relative">
            <div className="text-ink-faded uppercase tracking-widest text-[9px] border-b border-paper-border pb-2.5 font-mono font-bold">
              Folio Analytics Summary
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sage text-base mt-0.5">✔</span>
              <span className="text-ink-muted text-xs leading-relaxed font-serif font-light">
                <strong className="text-ink font-display font-bold text-xs uppercase tracking-wider block mb-0.5">Continuity Ledger</strong>
                Cross-references entities, settings, and timings to find draft plot holes and inconsistencies.
              </span>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-gold text-base mt-0.5">✔</span>
              <span className="text-ink-muted text-xs leading-relaxed font-serif font-light">
                <strong className="text-ink font-display font-bold text-xs uppercase tracking-wider block mb-0.5">Story Weaver Cascade</strong>
                Simulates structural changes like character removal or state mutations, showing downstream chapter impacts.
              </span>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-velvet text-base mt-0.5">✔</span>
              <span className="text-ink-muted text-xs leading-relaxed font-serif font-light">
                <strong className="text-ink font-display font-bold text-xs uppercase tracking-wider block mb-0.5">Dramatis Personae Graph</strong>
                Extracts social linkages, sentiments, and alignments, dynamically drawing character maps.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
