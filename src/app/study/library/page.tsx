import { FlashcardDeck } from "@/components/FlashcardDeck";

export default function StudyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-6 bg-surface-raised">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-xl" style={{ boxShadow: '0 0 0 2px #16a34a, 0 4px 0 #16a34a' }}>
          🧠
        </div>
        <span className="font-display text-2xl font-bold text-text-primary">
          Recallr
        </span>
        <span className="chip chip-green font-bold">Study Session</span>
        <a href="/ecosystem" className="chip chip-gold font-bold cursor-pointer hover:scale-105 transition-transform ml-auto">
          🏰 My City
        </a>
      </div>
      
      <FlashcardDeck />
    </main>
  );
}
