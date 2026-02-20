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

const BLOOM_LABELS: Record<number, { label: string; emoji: string; chipClass: string }> = {
  1: { label: "Remember", emoji: "🧠", chipClass: "chip-ink" },
  2: { label: "Understand", emoji: "💡", chipClass: "chip-violet" },
  3: { label: "Apply", emoji: "🔧", chipClass: "chip-lime" },
  4: { label: "Analyze", emoji: "🔬", chipClass: "chip-amber" },
  5: { label: "Evaluate", emoji: "⚖️", chipClass: "chip-rose" },
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

export function FlashcardDeck({ conceptId }: { conceptId?: string } = {}) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "confidence" | "answered">("idle");
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  
  // Active Recall State
  const [userAnswer, setUserAnswer] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [socraticFeedback, setSocraticFeedback] = useState<string | null>(null);
  
  // Confidence system
  const [confidence, setConfidence] = useState(50);
  const [answerStartTime, setAnswerStartTime] = useState<number>(0);
  
  // Scoring
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [insightScore, setInsightScore] = useState<number[]>([]); // Array of calibration scores
  const [feedbackType, setFeedbackType] = useState<string>("mastery");
  const [lastXpGain, setLastXpGain] = useState(0);
  const [lastCoins, setLastCoins] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    const generateDeck = async () => {
      try {
        // Always generate fresh, mastery-aware questions
        const res = await fetch(`/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conceptId: conceptId || null }),
        });
        const data = await res.json();
        if (data.flashcards && data.flashcards.length > 0) {
          setCards(data.flashcards);
        }
      } catch (e) {
        console.error("Error generating deck", e);
      } finally {
        setLoading(false);
      }
    };
    generateDeck();
  }, [conceptId]);

  // Poll for cards if none are ready yet (e.g. background processing is still running)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let pollCount = 0;
    const MAX_POLLS = 10; // 10 polls × 3s = 30s timeout
    if (!loading && cards.length === 0) {
      interval = setInterval(async () => {
        pollCount++;
        if (pollCount > MAX_POLLS) {
          clearInterval(interval);
          return;
        }
        try {
          // Poke the background queue to process chunks into questions
          await fetch("/api/process-queue", { 
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ targetConceptId: conceptId || null }),
          });
          
          // Check if cards are now available
          const res = await fetch(`/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conceptId: conceptId || null }),
          });
          const data = await res.json();
          if (data.flashcards && data.flashcards.length > 0) {
             setCards(data.flashcards);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading, cards.length, conceptId]);

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

    const handleSubmitAnswer = useCallback(async () => {
        if (status !== "confidence" || !userAnswer.trim() || isEvaluating) return;
        setIsEvaluating(true);
        const card = cards[currentIndex];
        
        try {
            const res = await fetch("/api/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardId: card.id,
                    userAnswer,
                    confidenceLevel: confidence,
                    conceptName: card.concept_name || "General Concept",
                    question: card.question,
                    targetExplanation: card.explanation,
                    sourceSnippet: card.source_snippet
                })
            });
            
            const data = await res.json();
            
            setIsCorrect(data.isCorrect);
            setSocraticFeedback(data.feedback);
            
            if (data.capitalDelta) {
                setLastXpGain(data.capitalDelta);
                setXp(prev => prev + data.capitalDelta);
                setLastCoins(data.capitalDelta); // Transitioning to pure capital, using coins as proxy for now
                setCoins(data.newTotalCapital || 0);
            }
            
            setStatus("answered");
            if (data.isCorrect) setCorrectCount(prev => prev + 1);
            
            // Set insight feedback type based on PRD logic
            const highConf = confidence >= 75;
            if (data.isCorrect && highConf) setFeedbackType('mastery');
            else if (data.isCorrect && !highConf) setFeedbackType('underconfident');
            else if (!data.isCorrect && !highConf) setFeedbackType('calibrated');
            else if (!data.isCorrect && highConf) setFeedbackType('overconfident');
            
        } catch (e) {
            console.error("Evaluation failed", e);
            setSocraticFeedback("There was an error grading your answer. Please try again or skip.");
            setStatus("answered");
        } finally {
            setIsEvaluating(false);
        }
    }, [status, userAnswer, isEvaluating, cards, currentIndex, confidence]);

  const handleNext = useCallback(() => {
    setStatus("idle");
    setUserAnswer("");
    setSocraticFeedback(null);
    setExplanation(null);
    setIsExplaining(false);
    setFeedbackType("mastery");
    setLastXpGain(0);
    setLastCoins(0);
    setIsCorrect(false);
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleExplain = useCallback(async () => {
    setIsExplaining(true);
    setExplanation(cards[currentIndex].explanation);
    setIsExplaining(false);
  }, [cards, currentIndex]);

  const avgInsight = insightScore.length > 0 
    ? Math.round(insightScore.reduce((a, b) => a + b, 0) / insightScore.length) 
    : 0;

  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <div className="surface p-12 flex flex-col items-center text-center">
          <div className="mascot mb-6">🚀</div>
          <h2 className="type-display text-3xl mb-2">
            Generating Your Study Session
          </h2>
          <p className="type-body text-sm mt-2">
            Analyzing your materials and generating adaptive questions...
          </p>
          <div className="w-full mt-6 progress-bar-track">
            <div className="progress-bar-fill" style={{ width: "45%" }} />
          </div>
        </div>
      </div>
    );
  }

  // ── DECK COMPLETE ──
  if (currentIndex >= cards.length && cards.length > 0) {
    const accuracy = Math.round((correctCount / cards.length) * 100);
    return (
      <div className="w-full max-w-3xl mx-auto animate-fade-in-up mt-8">
        <div className="surface p-12 text-center">
          <div className="mascot mx-auto mb-6">🚀</div>
          <h2 className="type-display mb-2">
            Session Complete!
          </h2>
          <p className="type-body mb-8">
            Your concept mastery has been updated. Questions will adapt next session.
          </p>
          
          <div className="ds-row justify-center gap-4 mb-10 w-full">
            <div className="stat-card flex-1 min-w-[120px]">
              <div className="stat-value text-[var(--lime-500)]">{accuracy}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-card flex-1 min-w-[120px]">
              <div className="stat-value text-[var(--amber-400)]">{(xp > 0 ? "+" : "")}{xp}</div>
              <div className="stat-label">Capital Change</div>
            </div>
            <div className="stat-card flex-1 min-w-[120px]">
              <div className="stat-value text-[var(--amber-500)]">🪙 {coins}</div>
              <div className="stat-label">Total Capital</div>
            </div>
            <div className="stat-card flex-1 min-w-[120px]">
              <div className="stat-value text-[var(--violet-500)]">{avgInsight}%</div>
              <div className="stat-label">Insight</div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => window.location.href = '/ecosystem'}
              className="btn btn-secondary btn-lg"
            >
              🏢 View My Venture
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="btn btn-primary btn-lg"
            >
              Continue Learning
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <div className="surface p-12 text-center animate-pulse">
          <div className="text-6xl mb-4 animate-bounce">🚀</div>
          <h2 className="type-display text-3xl mb-4">Generating Study Questions...</h2>
          <p className="type-body mb-6">
            Recallr is crafting active recall questions from your materials. This usually takes ~15 seconds.
          </p>
          <div className="w-full mt-6 progress-bar-track overflow-hidden">
            <div className="progress-bar-fill w-full opacity-50 transition-all duration-1000" />
          </div>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];
  const bloomInfo = BLOOM_LABELS[card.bloom_level] || BLOOM_LABELS[1];
  const confidenceLabel = getConfidenceLabel(confidence);

  return (
    <div className="w-full max-w-3xl mx-auto pb-[var(--sp20)] mt-[var(--sp8)]">
      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-[var(--sp6)] mb-[var(--sp8)] mt-[var(--sp2)] w-full">
        <div className="flex-1">
          <div className="flex justify-between type-mono text-xs mb-2 text-[var(--color-text-muted)] font-bold tracking-widest uppercase">
            <span>Session Progress</span>
            <span>{Math.round((currentIndex / cards.length) * 100)}%</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${(currentIndex / cards.length) * 100}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="chip chip-violet font-bold py-1 px-3">
            🧠 {avgInsight || '--'}% Insight
          </div>

          <div className="chip chip-amber font-bold py-1 px-3">
            🪙 {coins} Capital
          </div>
        </div>
      </div>

      {/* ── QUESTION CARD ── */}
      <div className={`surface mb-[var(--sp8)] transition-all duration-[var(--dur-base)] relative overflow-hidden ${
        status === 'answered' && isCorrect ? 'border-[var(--lime-500)] shadow-[0_0_24px_rgba(132,204,22,0.15)]' : 
        status === 'answered' && !isCorrect ? 'border-[var(--rose-500)] shadow-[0_0_24px_rgba(244,63,94,0.15)]' : ''
      }`}>
        {/* Decorative Top Accent */}
        {status === 'idle' && (
           <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--amber-400)] to-[var(--amber-600)] opacity-70"></div>
        )}

        {/* Card header with Bloom's level + topic */}
        <div className="flex flex-wrap justify-between items-center gap-[var(--sp2)] mb-[var(--sp8)]">
          <div className="flex gap-2 items-center">
            <span className={`chip ${bloomInfo.chipClass}`}>
              {bloomInfo.emoji} {bloomInfo.label}
            </span>
            {card.topic && (
              <span className="type-mono text-[11px] text-[var(--color-text-muted)] font-bold tracking-wider uppercase ml-2">
                {card.topic.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <span className="chip chip-ink">
              {currentIndex + 1} / {cards.length}
            </span>
            <span className="chip chip-violet">
              📖 p.{card.page_number || "?"}
            </span>
          </div>
        </div>

        {/* Concept name */}
        {card.concept_name && (
          <div className="mb-3 type-mono text-[11px] text-[var(--color-text-secondary)] font-bold tracking-wider uppercase flex items-center gap-2">
            Target Concept <div className="h-px bg-[var(--color-border)] flex-1 ml-2"></div>
          </div>
        )}

        {/* Question */}
        <h3 className="type-heading-xl mb-[var(--sp10)] leading-tight">
          {card.question}
        </h3>

        {/* ── CONFIDENCE STEP (before seeing answers) ── */}
        {status === "idle" && (
          <div className="animate-fade-in-up mt-[var(--sp8)]">
            <div className="bg-[var(--color-surface-sunken)] rounded-[var(--r-lg)] p-[var(--sp6)] border border-[var(--color-border)] mb-[var(--sp4)]">
              <div className="text-center mb-[var(--sp6)]">
                <div className="type-mono text-[var(--text-xs)] text-[var(--color-text-muted)] tracking-widest uppercase font-bold mb-[var(--sp3)]">
                  How confident are you?
                </div>
                <div className="text-4xl mb-[var(--sp2)] drop-shadow-md">{confidenceLabel.emoji}</div>
                <div className="type-heading-md">{confidenceLabel.label} — {confidence}%</div>
              </div>
              
              <div className="px-[var(--sp2)]">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer border border-[var(--color-border)] shadow-inner"
                  style={{
                    background: `linear-gradient(to right, var(--rose-500) 0%, var(--amber-400) 50%, var(--lime-500) 100%)`,
                  }}
                />
                <div className="flex justify-between type-mono text-[10px] text-[var(--color-text-secondary)] font-bold tracking-wider uppercase mt-4">
                  <span>Wild Guess</span>
                  <span>Absolutely Certain</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleConfidenceSubmit}
              className="btn btn-primary w-full justify-center py-4 text-sm uppercase tracking-wider font-extrabold flex items-center gap-2"
            >
              Lock In → Answer
            </button>
          </div>
        )}

        {/* ── ACTIVE RECALL (FREE TEXT) STEP ── */}
        {(status === "confidence" || status === "answered") && (
          <div className="flex flex-col gap-[var(--sp4)] animate-fade-in-up w-full mt-[var(--sp6)] border-t border-[var(--color-border)] pt-[var(--sp8)]">
            <div className="type-mono text-[var(--text-xs)] text-[var(--color-text-muted)] tracking-widest uppercase font-bold text-center">
               Active Recall
            </div>
            <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={status === "answered" || isEvaluating}
                placeholder="Type your answer based on the course materials..."
                className="input w-full min-h-[160px] resize-y bg-[var(--color-surface-sunken)] border-2 focus:border-[var(--amber-500)] text-[1.1rem] leading-relaxed p-5 placeholder:text-[var(--color-text-muted)]"
            />
            
            {status === "confidence" && (
                 <button 
                   onClick={handleSubmitAnswer}
                   disabled={!userAnswer.trim() || isEvaluating}
                   className={`btn w-full justify-center py-4 text-sm uppercase tracking-wider font-extrabold flex items-center gap-2 mt-2 ${isEvaluating ? 'btn-secondary opacity-60' : 'btn-primary'}`}
                 >
                   {isEvaluating ? <span className="animate-pulse">⏳ Grading...</span> : 'Submit Answer ⚡'}
                 </button>
            )}
          </div>
        )}
      </div>

      {/* ── SOCRATIC FEEDBACK BANNER ── */}
      {status === "answered" && (
        <div className={`animate-slide-in mb-[var(--sp4)] toast w-full max-w-none ${
          isCorrect 
            ? 'toast-success' 
            : feedbackType === 'calibrated'
              ? 'toast-success border-[var(--violet-400)] before:bg-[var(--violet-500)]' // Hack to make it violet toast
              : 'toast-alert'
        }`}>
          <div className="flex items-start gap-[var(--sp4)] w-full">
            <div className={`toast-icon flex-shrink-0 ${isCorrect || feedbackType === 'calibrated' ? 'bg-[var(--chip-lime-bg)]' : 'bg-[var(--chip-rose-bg)]'}`}>
              {FEEDBACK_MESSAGES[feedbackType]?.emoji || '🎯'}
            </div>
            <div className="flex-1 min-w-0">
               <div className="toast-title mb-[var(--sp1)] text-[var(--text-lg)]">
                {FEEDBACK_MESSAGES[feedbackType]?.title || (isCorrect ? 'Correct!' : 'Incorrect')}
              </div>
              
              {/* Socratic Feedback from LLM */}
              {socraticFeedback && (
                   <p className="type-body text-[var(--text-sm)] mt-[var(--sp3)] mb-[var(--sp4)] bg-[var(--color-surface-sunken)] p-[var(--sp4)] rounded-[var(--r-md)] border border-[var(--color-border)]">
                       {socraticFeedback}
                   </p>
              )}

              <div className="flex flex-wrap gap-[var(--sp2)] mt-[var(--sp2)]">
                <span className={`chip ${lastXpGain >= 0 ? 'chip-amber' : 'chip-rose'}`}>
                    {lastXpGain > 0 ? '+' : ''}{lastXpGain} Capital
                </span>
                <span className="chip chip-ink">Confidence: {confidence}%</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-[var(--sp3)] mt-[var(--sp4)] w-full self-end">
             {!isCorrect && !explanation && (
                <button 
                  onClick={handleExplain}
                  disabled={isExplaining}
                  className="btn btn-secondary px-[var(--sp4)]"
                >
                  {isExplaining ? '⏳' : '💡'} Show Target Answer
                </button>
              )}
              <button 
                onClick={handleNext}
                className="btn btn-primary px-[var(--sp8)]"
              >
                Next <span>→</span>
              </button>
          </div>
        </div>
      )}

      {/* ── TARGET EXPLANATION & REMEDIATION PANEL ── */}
      {explanation && (
        <div className="toast toast-success w-full max-w-none animate-slide-in mb-[var(--sp4)] border-[var(--amber-500)] before:bg-[var(--amber-400)]">
          <div className="flex flex-col w-full">
            <h4 className="toast-title mb-[var(--sp4)] flex items-center gap-[var(--sp2)] text-[var(--text-lg)]">
              🎯 Target Concept
            </h4>
            <p className="type-body text-[var(--text-sm)] leading-relaxed mb-[var(--sp6)]">
              {explanation}
            </p>
            <div className="bg-[var(--color-surface-sunken)] rounded-[var(--r-md)] p-[var(--sp4)] border border-[var(--color-border)]">
              <div className="type-mono text-[var(--text-xs)] mb-[var(--sp3)]">
                📖 Source Material — Page {card.page_number}
              </div>
              <p className="type-body text-[var(--text-sm)] italic border-l-[3px] border-[var(--amber-400)] pl-[var(--sp4)]">
                &quot;{card.source_snippet?.substring(0, 300)}...&quot;
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
