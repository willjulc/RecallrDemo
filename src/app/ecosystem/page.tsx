import { VentureDashboard } from "@/components/VentureDashboard";

export default function EcosystemPage() {
  return (
    <main className="min-h-screen flex flex-col items-center py-8 px-4"
      style={{ background: 'var(--color-surface-raised)' }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="ds-logo">
          <div className="ds-logo-mark text-2xl w-10 h-10">🏢</div>
          <div className="text-left">
            <div className="ds-logo-name text-lg">Venture Dashboard</div>
          </div>
        </div>
        <span className="chip chip-amber font-bold">Simulation</span>
      </div>

      <p className="text-center type-body text-sm mb-6 max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
        Your study mastery fuels this venture. Neglect your reviews and face Operational Crises.
      </p>

      {/* Nav */}
      <div className="flex gap-2 mb-8">
        <a href="/" className="btn btn-secondary btn-sm">
          🏠 Home
        </a>
        <a href="/study/library" className="btn btn-primary btn-sm">
          📚 Study Session
        </a>
      </div>

      <VentureDashboard />
    </main>
  );
}
