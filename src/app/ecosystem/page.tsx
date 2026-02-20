import { EcosystemView } from "@/components/EcosystemView";

export default function EcosystemPage() {
  return (
    <main className="min-h-screen flex flex-col items-center py-8 px-4"
      style={{
        background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 30%, #bbf7d0 60%, #86efac 100%)",
      }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-xl" style={{ boxShadow: '0 0 0 2px #16a34a, 0 4px 0 #16a34a' }}>
          🏰
        </div>
        <span className="font-display text-2xl font-bold text-text-primary">
          Knowledge City
        </span>
        <span className="chip chip-green font-bold">Ecosystem</span>
      </div>

      <p className="text-center text-text-secondary font-semibold text-sm mb-6 max-w-md">
        Your study effort builds this city. Each building is a concept you&apos;re mastering. Neglect a concept and its building decays!
      </p>

      {/* Nav */}
      <div className="flex gap-2 mb-8">
        <a href="/" className="btn-bounce btn-secondary-3d text-sm px-4 py-2">
          🏠 Home
        </a>
        <a href="/study/library" className="btn-bounce btn-primary-3d text-sm px-4 py-2">
          📚 Study
        </a>
      </div>

      <EcosystemView />
    </main>
  );
}
