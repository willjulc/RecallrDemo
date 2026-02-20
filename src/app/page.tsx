import { UploadDropzone } from "@/components/UploadDropzone";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-raised">
      <div className="w-full max-w-3xl flex flex-col items-center text-center animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-2xl" style={{ boxShadow: '0 0 0 2px #16a34a, 0 5px 0 #16a34a' }}>
            🧠
          </div>
          <span className="font-display text-4xl font-bold text-text-primary">Recallr</span>
        </div>

        {/* Badge */}
        <div className="chip chip-green mb-6 text-sm font-bold">
          ✨ Beta — Powered by Gemini AI
        </div>
        
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-4 text-text-primary leading-tight">
          Study smarter,<br />not harder.
        </h1>
        
        <p className="text-lg text-text-secondary mb-10 max-w-2xl leading-relaxed font-semibold">
          Upload your course PDFs and get dynamic, AI-generated flashcards strictly anchored to your syllabus. No hallucinations, just your materials.
        </p>

        <div className="flex gap-3 mb-8">
          <a href="/study/library" className="btn-bounce btn-primary-3d px-6 py-3">📚 Study Now</a>
          <a href="/ecosystem" className="btn-bounce btn-gold-3d px-6 py-3">🏰 My City</a>
        </div>

        <div className="w-full">
          <UploadDropzone />
        </div>
      </div>
    </main>
  );
}
