"use client";

import { useState, useEffect, useCallback } from "react";

interface Flashcard {
  id: string;
  document_id: string;
  concept_id?: string;
  concept_name?: string;
  topic?: string;
  page_number: number;
  source_snippet: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  bloom_level: number;
  difficulty: number;
}

const BLOOM_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: "Remember", emoji: "🧠", color: "chip-navy" },
  2: { label: "Understand", emoji: "💡", color: "chip-blue" },
  3: { label: "Apply", emoji: "🔧", color: "chip-green" },
  4: { label: "Analyze", emoji: "🔬", color: "chip-gold" },
  5: { label: "Evaluate", emoji: "⚖️", color: "chip-coral" },
};

const CONFIDENCE_LABELS = [
  { max: 20, label: "No idea", emoji: "🤷" },
  { max: 40, label: "Guessing", emoji: "🎲" },
  { max: 60, label: "Maybe", emoji: "🤔" },
  { max: 80, label: "Pretty sure", emoji: "😊" },
  { max: 100, label: "Certain", emoji: "💯" },
];

function getConfidenceLabel(value: number) {
  return CONFIDENCE_LABELS.find(l => value <= l.max) || CONFIDENCE_LABELS[4];
}

const FEEDBACK_MESSAGES: Record<string, { title: string; subtitle: string; emoji: string }> = {
  mastery: { title: "Mastery Confirmed!", subtitle: "You knew it and you knew you knew it.", emoji: "🏆" },
  calibrated: { title: "Good Self-Awareness", subtitle: "You knew your limits — that's metacognitive skill.", emoji: "🧠" },
  overconfident: { title: "Overconfidence Detected", subtitle: "Your confidence was higher than your knowledge. Recalibrate.", emoji: "⚠️" },
  underconfident: { title: "You Know More Than You Think!", subtitle: "Trust yourself — you had this.", emoji: "🌟" },
};

export function FlashcardDeck() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "confidence" | "answered">("idle");
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  
  // Confidence system
  const [confidence, setConfidence] = useState(50);
  const [answerStartTime, setAnswerStartTime] = useState<number>(0);
  
  // Scoring
  const [xp, setXp] = useState(0);
  const [insightScore, setInsightScore] = useState<number[]>([]); // Array of calibration scores
  const [feedbackType, setFeedbackType] = useState<string>("mastery");
  const [lastXpGain, setLastXpGain] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

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

  // When a new card appears, set state to confidence step
  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      setStatus("idle");
      setConfidence(50);
      setAnswerStartTime(Date.now());
    }
  }, [currentIndex, cards.length]);

  const handleConfidenceSubmit = useCallback(() => {
    setStatus("confidence");
    setAnswerStartTime(Date.now());
  }, []);

  const handleSelect = useCallback(async (option: string) => {
    if (status !== "confidence") return;
    
    const card = cards[currentIndex];
    const correct = option === card.correct_answer;
    const timeTaken = Date.now() - answerStartTime;
    
    setSelectedOption(option);
    setIsCorrect(correct);
    setStatus("answered");
    if (correct) setCorrectCount(prev => prev + 1);

    // Send to API with confidence data
    try {
      const res = await fetch("/api/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          flashcardId: card.id, 
          isCorrect: correct,
          confidenceBefore: confidence,
          timeTakenMs: timeTaken
        })
      });
      const data = await res.json();
      
      if (data.xp) {
        setLastXpGain(data.xp);
        setXp(prev => prev + data.xp);
      }
      if (data.feedbackType) {
        setFeedbackType(data.feedbackType);
      }
      if (data.calibrationAccuracy !== undefined) {
        setInsightScore(prev => [...prev, data.calibrationAccuracy]);
      }
    } catch (e) {
      console.error("Failed to log interaction", e);
    }
  }, [status, cards, currentIndex, confidence, answerStartTime]);

  const handleNext = useCallback(() => {
    setStatus("idle");
    setSelectedOption(null);
    setExplanation(null);
    setIsExplaining(false);
    setFeedbackType("mastery");
    setLastXpGain(0);
    setIsCorrect(false);
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

  const avgInsight = insightScore.length > 0 
    ? Math.round(insightScore.reduce((a, b) => a + b, 0) / insightScore.length) 
    : 0;

  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="surface p-12 flex flex-col items-center text-center">
          <div className="mascot mb-6">🦉</div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
            Building Your Concept Map
          </h2>
          <p className="text-text-secondary text-sm font-semibold">
            Analyzing your documents, extracting key concepts, and generating adaptive questions...
          </p>
          <div className="w-full mt-6 progress-track">
            <div className="progress-fill" style={{ width: "45%" }} />
          </div>
        </div>
      </div>
    );
  }

  // ── DECK COMPLETE ──
  if (currentIndex >= cards.length && cards.length > 0) {
    const accuracy = Math.round((correctCount / cards.length) * 100);
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
        <div className="surface p-12 text-center">
          <div className="mascot mx-auto mb-6" style={{ animation: 'bob 0.4s ease-in-out infinite' }}>🦉</div>
          <h2 className="font-display text-3xl font-bold text-text-primary mb-2">
            Session Complete! 🎉
          </h2>
          <p className="text-text-secondary font-semibold mb-8">
            Your concept mastery has been updated. Questions will adapt next session.
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
              <div className="font-display text-3xl font-bold text-blue-500">{avgInsight}%</div>
              <div className="text-xs font-bold text-text-muted tracking-wider uppercase mt-1">Insight Score</div>
            </div>
          </div>

          <button 
            onClick={() => window.location.href = '/'}
            className="btn-bounce btn-primary-3d text-lg px-8 py-4"
          >
            Continue Learning
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="surface p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">No Documents Yet</h2>
          <p className="text-text-secondary font-semibold">Upload your course PDFs to get started.</p>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];
  const bloomInfo = BLOOM_LABELS[card.bloom_level] || BLOOM_LABELS[1];
  const confidenceLabel = getConfidenceLabel(confidence);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(currentIndex / cards.length) * 100}%` }} />
          </div>
        </div>

        {/* Insight Score (replaces hearts) */}
        <div className="chip chip-blue font-bold text-sm">
          🧠 {avgInsight || '--'}% Insight
        </div>

        <div className="xp-badge">
          ⭐ {xp} XP
        </div>
      </div>

      {/* ── QUESTION CARD ── */}
      <div className={`ds-card p-8 mb-6 transition-all duration-300 ${
        status === 'answered' && isCorrect ? 'ds-card-green' : 
        status === 'answered' && !isCorrect ? 'ds-card-coral' : ''
      }`}>
        {/* Card header with Bloom's level + topic */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
          <div className="flex gap-2">
            <span className={`chip ${bloomInfo.color} font-bold`}>
              {bloomInfo.emoji} {bloomInfo.label}
            </span>
            {card.topic && (
              <span className="chip chip-navy font-bold">
                📁 {card.topic}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <span className="chip chip-navy">
              {currentIndex + 1}/{cards.length}
            </span>
            <span className="chip chip-blue">
              📖 p.{card.page_number}
            </span>
          </div>
        </div>

        {/* Concept name */}
        {card.concept_name && (
          <div className="mb-3 text-xs font-bold text-text-muted uppercase tracking-wider">
            Concept: {card.concept_name}
          </div>
        )}

        {/* Question */}
        <h3 className="font-display text-xl md:text-2xl font-bold text-text-primary mb-8 leading-snug">
          {card.question}
        </h3>

        {/* ── CONFIDENCE STEP (before seeing answers) ── */}
        {status === "idle" && (
          <div className="animate-fade-in-up">
            <div className="bg-navy-50 rounded-2xl p-6 border-2 border-navy-200 mb-4">
              <div className="text-center mb-4">
                <div className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1">
                  How confident are you?
                </div>
                <div className="text-3xl mb-1">{confidenceLabel.emoji}</div>
                <div className="font-bold text-lg text-text-primary">{confidenceLabel.label} — {confidence}%</div>
              </div>
              
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-3 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ff4b35 0%, #fbbf24 50%, #22c55e 100%)`,
                }}
              />
              <div className="flex justify-between text-xs font-bold text-text-muted mt-1">
                <span>No idea</span>
                <span>Certain</span>
              </div>
            </div>
            
            <button 
              onClick={handleConfidenceSubmit}
              className="btn-bounce btn-primary-3d w-full py-4 text-lg"
            >
              Lock In Confidence → Show Answers
            </button>
          </div>
        )}

        {/* ── ANSWER OPTIONS (after confidence is locked) ── */}
        {(status === "confidence" || status === "answered") && (
          <div className="flex flex-col gap-3 animate-fade-in-up">
            {card.options.map((option, i) => {
              let btnClass = "btn-bounce btn-secondary-3d w-full text-left justify-start";
              
              if (status === "answered") {
                if (option === card.correct_answer) {
                  btnClass = "answer-btn-correct w-full text-left justify-start flex items-center gap-3";
                } else if (option === selectedOption && !isCorrect) {
                  btnClass = "answer-btn-wrong w-full text-left justify-start flex items-center gap-3 animate-shake";
                } else {
                  btnClass = "btn-bounce btn-secondary-3d w-full text-left justify-start opacity-40 cursor-not-allowed";
                }
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleSelect(option)}
                  disabled={status === "answered"}
                  className={btnClass}
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-navy-100 text-navy-600 font-bold text-sm flex-shrink-0 mr-3">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-semibold text-[15px] leading-relaxed">{option}</span>
                  {status === "answered" && option === card.correct_answer && (
                    <span className="ml-auto text-lg">✅</span>
                  )}
                  {status === "answered" && option === selectedOption && !isCorrect && (
                    <span className="ml-auto text-lg">❌</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── METACOGNITIVE FEEDBACK BANNER ── */}
      {status === "answered" && (
        <div className={`animate-slide-in mb-4 rounded-2xl p-5 border-2 ${
          isCorrect 
            ? 'bg-green-100 border-green-200' 
            : feedbackType === 'calibrated'
              ? 'bg-blue-50 border-blue-100'
              : 'bg-coral-50 border-coral-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="text-3xl">
              {FEEDBACK_MESSAGES[feedbackType]?.emoji || '🎯'}
            </div>
            <div className="flex-1">
              <div className={`font-bold text-lg ${
                isCorrect ? 'text-green-700' : 
                feedbackType === 'calibrated' ? 'text-blue-600' : 'text-coral-600'
              }`}>
                {FEEDBACK_MESSAGES[feedbackType]?.title || (isCorrect ? 'Correct!' : 'Incorrect')}
              </div>
              <div className={`text-sm font-semibold ${
                isCorrect ? 'text-green-600' : 
                feedbackType === 'calibrated' ? 'text-blue-500' : 'text-coral-500'
              }`}>
                {FEEDBACK_MESSAGES[feedbackType]?.subtitle}
              </div>
              <div className="flex gap-2 mt-2">
                <span className="chip chip-gold text-xs font-bold">+{lastXpGain} XP</span>
                <span className="chip chip-navy text-xs font-bold">Confidence: {confidence}%</span>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              {!isCorrect && !explanation && (
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
                Next →
              </button>
            </div>
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
