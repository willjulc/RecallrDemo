import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateConceptMastery } from "@/lib/conceptExtractor";

/**
 * Metacognitive confidence calibration scoring matrix:
 * 
 * Confident + Correct    = MAX XP (mastery confirmed)
 * Not confident + Wrong  = CALIBRATION BONUS (good self-awareness)  
 * Overconfident + Wrong   = MINIMAL XP (illusion of competence)
 * Underconfident + Correct = MODERATE XP (you know more than you think)
 */
function calculateXP(isCorrect: boolean, confidence: number, bloomLevel: number): {
  xp: number;
  calibrationAccuracy: number;
  feedbackType: "mastery" | "calibrated" | "overconfident" | "underconfident";
} {
  const confidenceNorm = confidence / 100;
  const outcome = isCorrect ? 1 : 0;
  const calibrationError = Math.abs(confidenceNorm - outcome);
  const calibrationAccuracy = 1 - calibrationError;
  
  // Base XP scales with Bloom's level (harder questions = more XP)
  const bloomMultiplier = 1 + (bloomLevel - 1) * 0.3; // 1x, 1.3x, 1.6x, 1.9x, 2.2x
  
  let xp: number;
  let feedbackType: "mastery" | "calibrated" | "overconfident" | "underconfident";

  if (isCorrect && confidence >= 60) {
    // Confident + Correct → max reward
    xp = Math.round(15 * bloomMultiplier);
    feedbackType = "mastery";
  } else if (!isCorrect && confidence <= 40) {
    // Not confident + Wrong → calibration bonus (good self-awareness)
    xp = Math.round(8 * bloomMultiplier);
    feedbackType = "calibrated";
  } else if (!isCorrect && confidence >= 60) {
    // Overconfident + Wrong → minimal reward
    xp = Math.round(2 * bloomMultiplier);
    feedbackType = "overconfident";
  } else if (isCorrect && confidence <= 40) {
    // Underconfident + Correct → moderate reward
    xp = Math.round(10 * bloomMultiplier);
    feedbackType = "underconfident";
  } else {
    // Middle ground
    xp = Math.round((isCorrect ? 12 : 5) * bloomMultiplier);
    feedbackType = isCorrect ? "mastery" : "calibrated";
  }

  return { xp, calibrationAccuracy, feedbackType };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flashcardId, isCorrect, confidenceBefore = 50, timeTakenMs = 0 } = body;

    if (!flashcardId || typeof isCorrect !== 'boolean') {
      return NextResponse.json({ error: "Missing or invalid payload" }, { status: 400 });
    }

    // Get the flashcard to find its concept and bloom level
    const flashcard = db.prepare(
      "SELECT concept_id, bloom_level FROM flashcards WHERE id = ?"
    ).get(flashcardId) as { concept_id: string | null; bloom_level: number } | undefined;

    const bloomLevel = flashcard?.bloom_level || 1;
    const conceptId = flashcard?.concept_id || null;

    // Calculate metacognitive XP
    const { xp, calibrationAccuracy, feedbackType } = calculateXP(isCorrect, confidenceBefore, bloomLevel);

    // Log the interaction with full cognitive metadata
    db.prepare(`
      INSERT INTO user_interactions 
        (flashcard_id, concept_id, is_correct, confidence_before, bloom_level, time_taken_ms, xp_earned, calibration_accuracy) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      flashcardId,
      conceptId,
      isCorrect ? 1 : 0,
      confidenceBefore,
      bloomLevel,
      timeTakenMs,
      xp,
      calibrationAccuracy
    );

    // Update concept mastery (Bloom's escalation/de-escalation)
    let masteryUpdate = null;
    if (conceptId) {
      masteryUpdate = updateConceptMastery(conceptId, isCorrect, confidenceBefore);
    }

    return NextResponse.json({ 
      success: true,
      xp,
      calibrationAccuracy: Math.round(calibrationAccuracy * 100),
      feedbackType,
      bloomLevel,
      masteryUpdate
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Interaction logging error:", error);
    return NextResponse.json({ error: "Failed to log interaction" }, { status: 500 });
  }
}
