import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryGlide | Literary Codex & Manuscript Companion",
  description: "Track narrative continuity, map character networks, monitor open plot threads, and explore alternate story drafts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased selection:bg-gold/25 selection:text-ink font-serif">
        {/* Ambient paper layers */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 hud-grid opacity-90"></div>
          <div className="absolute inset-0 hud-grid-fine opacity-50"></div>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] glow-orb-primary opacity-70"></div>
          <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] glow-orb-secondary opacity-50"></div>
        </div>

        {/* Global Layout Container */}
        <div className="relative z-10 min-h-screen flex flex-col justify-between">
          <div>
            <header className="border-b border-paper-border bg-paper/80 backdrop-blur-md px-6 py-4.5 sticky top-0 z-50">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group hover:opacity-90 transition-opacity">
                  {/* Elegant Book Seal */}
                  <div className="relative h-7 w-7 flex items-center justify-center rounded-full bg-crimson/5 border border-crimson/20 group-hover:bg-crimson/10 transition-colors shadow-sm">
                    <svg className="h-4 w-4 text-crimson" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold tracking-widest text-ink group-hover:text-crimson transition-colors">
                      STORYGLIDE
                    </span>
                    <span className="hidden sm:inline font-sans text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
                      Manuscript Folio
                    </span>
                  </div>
                </Link>
                <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-gold border border-gold/30 bg-gold/5 px-3 py-1.5 rounded-full shadow-inner">
                  Narrative Ingestion Engine
                </div>
              </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-10 animate-fade-in-up">
              {children}
            </main>
          </div>

          <footer className="border-t border-paper-border bg-paper-darker/60 px-6 py-8 text-center text-xs text-ink-muted font-sans relative z-10">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-medium">
              <div>STORYGLIDE &mdash; ANALYTICAL LEDGER FOR NOVELISTS</div>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-faded">
                STATUS: <span className="text-sage font-bold uppercase flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-sage"></span> Bound &amp; Ready</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
