import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryGlide | Manuscript Flight Recorder & Simulator",
  description: "Identify structural narrative conflicts, plot holes, emotional pacing, and simulate alternate storyline paths.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#060913] text-[#f1f5f9] antialiased selection:bg-[#0df0ff] selection:text-[#060913]">
        {/* Ambient background layers */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 hud-grid opacity-70"></div>
          <div className="absolute inset-0 hud-grid-fine opacity-40"></div>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] glow-orb-primary opacity-60"></div>
          <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] glow-orb-secondary opacity-40"></div>
        </div>

        {/* Global Layout Container */}
        <div className="relative z-10 min-h-screen flex flex-col justify-between">
          <div>
            <header className="border-b border-obsidian-border bg-[#0c111d]/60 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group hover:opacity-90 transition-opacity">
                  {/* Glowing Radar Circle */}
                  <div className="relative h-4 w-4">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75 animate-ping"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-[#0a2e38] border border-neon-cyan flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan"></span>
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold tracking-widest bg-gradient-to-r from-white via-slate-200 to-[#94a3b8] bg-clip-text text-transparent group-hover:text-neon-cyan transition-colors">
                      STORYGLIDE
                    </span>
                    <span className="hidden sm:inline font-mono text-[10px] text-neon-cyan uppercase tracking-wider">
                      [FLIGHT_RECORDER_v1.0]
                    </span>
                  </div>
                </Link>
                <div className="font-mono text-xs text-slate-400 bg-obsidian-border/50 border border-obsidian-border px-3 py-1 rounded-md">
                  MANUSCRIPT TELEMETRY ENGINE
                </div>
              </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-8 animate-fade-in-up">
              {children}
            </main>
          </div>

          <footer className="border-t border-obsidian-border bg-[#090d16]/80 px-6 py-8 text-center text-xs text-slate-500 font-mono tracking-wider relative z-10">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>STORYGLIDE // STRUCTURAL DIAGNOSTICS FOR NOVELISTS</div>
              <div className="text-slate-600 flex items-center gap-1.5">
                STATUS: <span className="text-neon-green font-bold flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse"></span> ONLINE</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
