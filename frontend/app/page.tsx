import Link from "next/link";
import UploadForm from "@/components/UploadForm";

const DEMO_ID = process.env.NEXT_PUBLIC_DEMO_MANUSCRIPT_ID ?? "";

export default function HomePage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[#1f2328]">Upload your manuscript</h1>
      <p className="mb-8 text-sm text-[#57606a]">
        Accepts <code>.txt</code> and <code>.docx</code>. Your manuscript is analysed locally —
        no prose is stored beyond the processing session.
      </p>
      <UploadForm />
      {DEMO_ID && (
        <div className="mt-8 rounded-xl border border-[#e5e7eb] bg-white p-5">
          <p className="text-sm font-semibold text-[#1f2328] mb-1">Want to see it in action first?</p>
          <p className="text-xs text-[#57606a] mb-3">
            A pre-loaded analysis of <em>The Time Machine</em> by H.G. Wells is ready to explore.
          </p>
          <Link
            href={`/dashboard/${DEMO_ID}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b82d4] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            View demo analysis →
          </Link>
        </div>
      )}
    </div>
  );
}
