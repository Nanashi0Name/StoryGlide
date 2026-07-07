import UploadForm from "@/components/UploadForm";

export default function HomePage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[#1f2328]">Upload your manuscript</h1>
      <p className="mb-8 text-sm text-[#57606a]">
        Accepts <code>.txt</code> and <code>.docx</code>. Your manuscript is analysed locally —
        no prose is stored beyond the processing session.
      </p>
      <UploadForm />
    </div>
  );
}
