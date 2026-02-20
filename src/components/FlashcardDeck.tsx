"use client";

import { useState, useEffect, useCallback } from "react";

interface Flashcard {
  id: string;
  document_id: string;
  page_number: number;
  source_snippet: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export function FlashcardDeck() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  
  // Gamification state
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const generateDeck = async () => {
      try {
        const existingRes = await fetch(`/api/flashcards?documentId=library`);
        const existingData = await existingRes.json();
        
        if (existingData.flashcards && existingData.flashcards.length > 0) {
          setCards(existingData.flashcards);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/generate`, { method: "POST" });
        const data = await res.json();
        if (data.flashcards && data.flashcards.length > 0) {
          setCards(data.flashcards);
        }
      } catch (e) {
        console.error("Error fetching/generating deck", e);
      } finally {
        setLoading(false);
      }
    };
    generateDeck();
  }, []);

  const handleSelect = useCallback(async (option: string) => {
    if (status !== "idle") return;
    
    const card = cards[currentIndex];
    const isCorrect = option === card.correct_answer;
    setSelectedOption(option);
    setStatus(isCorrect ? "correct" : "incorrect");
    setShowFeedback(true);

    if (isCorrect) {
      const streakBonus = streak >= 3 ? 5 : 0;
      setXp(prev => prev + 10 + streakBonus);
      setStreak(prev => prev + 1);
      setCorrectCount(prev => prev + 1);
    } else {
      setStreak(0);
      setHearts(prev => Math.max(0, prev - 1));
    }

    fetch("/api/interaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: card.id, isCorrect })
    }).catch(console.error);
  }, [status, cards, currentIndex, streak]);

  const handleNext = useCallback(() => {
    setStatus("idle");
    setSelectedOption(null);
    setExplanation(null);
    setIsExplaining(false);
    setShowFeedback(false);
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleExplain = useCallback(async () => {
    setIsExplaining(true);
    try {
      const res = await fetch("/api/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: cards[currentIndex].id })
      });
      const data = await res.json();
      setExplanation(data.explanation || data.error);
    } catch {
      setExplanation("Failed to load explanation.");
    } finally {
      setIsExplaining(false);
    }
  }, [cards, currentIndex]);

  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-12">
        <div className="surface p-12 flex flex-col items-center text-center">
          <div className="mascot mb-6">🦉</div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
            Generating Your Deck
          </h2>
          <p className="text-text-secondary text-sm font-semibold">
            Analyzing your documents and extracting key concepts...
          </p>
          <div className="w-full mt-6 progress-track">
            <div className="progress-fill" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  // ── GAME OVER (no hearts) ──
  if (hearts <= 0 && currentIndex < cards.length) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
        <div className="surface p-12 text-center">
          <div className="text-6xl mb-4">💔</div>
          <h2 className="font-display text-3xl font-bold text-text-primary mb-2">
            Out of Lives!
          </h2>
          <p className="text-text-secondary font-semibold mb-6">
            You got {correctCount} out of {currentIndex} correct. Keep studying!
          </p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="stat-card">
              <div className="font-display text-3xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs font-bold text-text-muted tracking-wider uppercase mt-1">Correct</div>
            </div>
            <div className="stat-card">
              <div className="font-display text-3xl font-bold text-gold-500">+{xp}</div>
              <div className="text-xs font-bold text-text-muted tracking-wider uppercase mt-1">XP Earned</div>
            </div>
            <div className="stat-card">
              <div className="font-display text-3xl font-bold text-coral-500">{currentIndex - correctCount}</div>
              <div className="text-xs font-bold text-text-muted tracking-wider uppercase mt-1">Missed</div>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn-bounce btn-primary-3d text-lg px-8 py-4"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── DECK COMPLETE ──
  if (currentIndex >= cards.length) {
    const accuracy = cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 0;
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
        <div className="surface p-12 text-center">
          <div className="mascot mx-auto mb-6" style={{ animation: 'bob 0.4s ease-in-out infinite' }}>🦉</div>
          <h2 className="font-display text-3xl font-bold text-text-primary mb-2">
            Session Complete! 🎉
          </h2>
          <p className="text-text-secondary font-semibold mb-8">
            Impressive work! You&apos;ve reviewed all the cards.
          </p>
          
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="stat-card">
              <div className="font-display text-3xl font-bold text-green-600">{accuracy}%</div>
              <div className="text-xs font-bold text-text-muted tracking-wider uppercase mt-1">Accuracy</div>
            </div>
            <div className="stat-card">
              <div className="font-display text-3xl font-bold text-gold-500">+{xp}</div>
              <div className="text-xs font-bold text-text-muted tracking-wider uppercase mt-1">XP Earned</div>
            </div>
            <div className="stat-card">
              <div className="font-display text-3xl font-bold text-coral-500">{hearts}</div>
              <div className="text-xs font-bold text-text-muted tracking-wider uppercase mt-1">Lives Left</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.href = '/'}
              className="btn-bounce btn-primary-3d text-lg px-8 py-4"
            >
              Upload More PDFs
            </button>
          </div>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* ── TOP BAR: Progress, Hearts, XP ── */}
      <div className="flex items-center gap-4 mb-6">
        {/* Progress */}
        <div className="flex-1">
          <div className="progress-track">
            <div 
              className="progress-fill"
              style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Hearts */}
        <div className="flex gap-1 items-center">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`heart ${i >= hearts ? 'heart-empty' : ''}`}>
              ❤️
            </span>
          ))}
        </div>

        {/* XP Badge */}
        <div className="xp-badge">
          ⭐ {xp} XP
        </div>
      </div>

      {/* Streak indicator */}
      {streak >= 3 && (
        <div className="flex justify-center mb-4 animate-bounce-in">
          <div className="streak-badge">
            🔥 {streak} Streak! +5 bonus XP
          </div>
        </div>
      )}

      {/* ── QUESTION CARD ── */}
      <div className={`ds-card p-8 mb-6 transition-all duration-300 ${
        showFeedback && status === 'correct' ? 'ds-card-green' : 
        showFeedback && status === 'incorrect' ? 'ds-card-coral' : ''
      }`}>
        {/* Card header */}
        <div className="flex justify-between items-center mb-6">
          <span className="chip chip-navy font-bold">
            📄 Card {currentIndex + 1} of {cards.length}
          </span>
          <span className="chip chip-blue">
            📖 Page {card.page_number}
          </span>
        </div>

        {/* Question */}
        <h3 className="font-display text-2xl font-bold text-text-primary mb-8 leading-snug">
          {card.question}
        </h3>
        
        {/* Answer options */}
        <div className="flex flex-col gap-3">
          {card.options.map((option, i) => {
            let btnClass = "btn-bounce btn-secondary-3d w-full text-left justify-start";
            
            if (status !== "idle") {
              if (option === card.correct_answer) {
                btnClass = "answer-btn-correct w-full text-left justify-start flex items-center gap-3";
              } else if (option === selectedOption && status === "incorrect") {
                btnClass = "answer-btn-wrong w-full text-left justify-start flex items-center gap-3 animate-shake";
              } else {
                btnClass = "btn-bounce btn-secondary-3d w-full text-left justify-start opacity-40 cursor-not-allowed";
              }
            }

            return (
              <button 
                key={i} 
                onClick={() => handleSelect(option)}
                disabled={status !== "idle"}
                className={btnClass}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-navy-100 text-navy-600 font-bold text-sm flex-shrink-0 mr-3">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-semibold text-[15px] leading-relaxed">{option}</span>
                {status !== "idle" && option === card.correct_answer && (
                  <span className="ml-auto text-lg">✅</span>
                )}
                {status === "incorrect" && option === selectedOption && (
                  <span className="ml-auto text-lg">❌</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FEEDBACK BANNER ── */}
      {showFeedback && (
        <div className={`animate-slide-in mb-4 rounded-2xl p-5 flex items-center gap-4 ${
          status === 'correct' 
            ? 'bg-green-100 border-2 border-green-200' 
            : 'bg-coral-50 border-2 border-coral-200'
        }`}>
          <div className="text-3xl">
            {status === 'correct' ? '🎉' : '😢'}
          </div>
          <div className="flex-1">
            <div className={`font-bold text-lg ${
              status === 'correct' ? 'text-green-700' : 'text-coral-600'
            }`}>
              {status === 'correct' 
                ? streak >= 3 ? 'Amazing! Streak bonus! 🔥' : 'Correct!' 
                : 'Not quite...'}
            </div>
            {status === 'correct' && (
              <div className="text-green-600 font-semibold text-sm">+{streak >= 3 ? 15 : 10} XP</div>
            )}
            {status === 'incorrect' && (
              <div className="text-coral-500 font-semibold text-sm">
                The answer is: {card.correct_answer}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {status === "incorrect" && !explanation && (
              <button 
                onClick={handleExplain}
                disabled={isExplaining}
                className="btn-bounce btn-gold-3d text-sm px-4 py-2"
              >
                {isExplaining ? '⏳' : '💡'} Explain
              </button>
            )}
            <button 
              onClick={handleNext}
              className="btn-bounce btn-primary-3d text-sm px-6 py-2"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── REMEDIATION PANEL ── */}
      {explanation && (
        <div className="surface animate-slide-in mb-4">
          <h4 className="font-bold text-gold-500 mb-3 flex items-center gap-2 text-lg">
            💡 Explanation
          </h4>
          <p className="text-text-secondary font-semibold text-sm leading-relaxed mb-4">
            {explanation}
          </p>
          <div className="bg-navy-50 rounded-xl p-4 border border-navy-200">
            <div className="font-mono text-xs text-text-muted uppercase font-bold tracking-wider mb-2">
              📖 Source Material — Page {card.page_number}
            </div>
            <p className="text-text-secondary text-sm leading-relaxed italic border-l-4 border-green-400 pl-3">
              &quot;{card.source_snippet?.substring(0, 300)}...&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
