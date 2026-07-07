import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryGlide",
  description: "A flight recorder and flight simulator for your manuscript.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <header className="border-b border-[#e5e7eb] bg-[#f7f8fa] px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-[#1f2328]">
            StoryGlide
          </span>
          <span className="ml-2 text-sm text-[#57606a]">
            — flight recorder &amp; simulator for your manuscript
          </span>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
