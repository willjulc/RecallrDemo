"use client";

import { useSearchParams } from "next/navigation";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { Suspense } from "react";

function StudyContent() {
  const searchParams = useSearchParams();
  const conceptId = searchParams.get("concept") || undefined;
  const conceptName = searchParams.get("name") || undefined;

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
        {conceptName ? (
          <span className="chip chip-coral font-bold">🔧 Repairing: {conceptName}</span>
        ) : (
          <span className="chip chip-green font-bold">Study Session</span>
        )}
        <a href="/ecosystem" className="chip chip-gold font-bold cursor-pointer hover:scale-105 transition-transform ml-auto">
          🏰 My City
        </a>
      </div>
      
      <FlashcardDeck conceptId={conceptId} />
    </main>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-surface-raised">
        <div className="surface p-12 text-center">
          <div className="mascot mb-4">🦉</div>
          <h2 className="font-display text-2xl font-bold text-text-primary">Loading...</h2>
        </div>
      </main>
    }>
      <StudyContent />
    </Suspense>
  );
}
