"use client";

import { useSearchParams } from "next/navigation";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { Suspense } from "react";

function StudyContent() {
  const searchParams = useSearchParams();
  const conceptId = searchParams.get("concept") || undefined;
  const conceptName = searchParams.get("name") || undefined;

  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-6" style={{ background: 'var(--color-surface-raised)' }}>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4 w-full max-w-3xl justify-between">
        <div className="flex items-center gap-4">
          <div className="ds-logo">
            <div className="ds-logo-mark text-2xl w-10 h-10">🚀</div>
            <div className="text-left hidden sm:block">
              <div className="ds-logo-name text-lg">Recallr</div>
            </div>
          </div>
          
          {conceptName ? (
            <span className="chip chip-rose font-bold">🔧 Reviewing: {conceptName}</span>
          ) : (
            <span className="chip chip-lime font-bold">⚡ Active Session</span>
          )}
        </div>
        
        <a href="/ecosystem" className="btn btn-secondary text-xs px-4 py-2 hover:scale-105 transition-transform">
          🏢 Venture Dashboard
        </a>
      </div>
      
      <FlashcardDeck conceptId={conceptId} />
    </main>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-raised)' }}>
        <div className="surface p-12 text-center">
          <div className="mascot mb-4 animate-bounce">🚀</div>
          <h2 className="type-display text-2xl">Loading Session...</h2>
        </div>
      </main>
    }>
      <StudyContent />
    </Suspense>
  );
}
