export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--color-surface-raised)' }}>
      <div className="w-full max-w-3xl flex flex-col items-center text-center animate-fade-in-up">
        {/* Logo */}
        <div className="ds-logo mb-8 mt-12">
          <div className="ds-logo-mark">🚀</div>
          <div className="text-left">
            <div className="ds-logo-name">Recallr</div>
            <div className="ds-logo-tagline">// founder-os · v3.0</div>
          </div>
        </div>

        {/* Badge */}
        <div className="traction-badge mb-6">
          ▲ Founder OS Beta
        </div>
        
        <h1 className="type-display mb-4 leading-tight">
          Study smarter.<br />
          <span className="type-display-accent">Master faster.</span>
        </h1>
        
        <p className="type-body text-lg mb-10 max-w-2xl leading-relaxed">
          AI-generated active recall questions anchored strictly to your course materials. No hallucinations — just real mastery.
        </p>

        <div className="flex gap-4 mb-12">
          <a href="/study/library" className="btn btn-primary btn-lg">⚡ Start Studying</a>
          <a href="/ecosystem" className="btn btn-launch btn-lg">🚀 My Venture</a>
        </div>
      </div>
    </main>
  );
}
