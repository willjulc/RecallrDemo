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
  coins: number;
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
    xp = Math.round(15 * bloomMultiplier);
    feedbackType = "mastery";
  } else if (!isCorrect && confidence <= 40) {
    xp = Math.round(8 * bloomMultiplier);
    feedbackType = "calibrated";
  } else if (!isCorrect && confidence >= 60) {
    xp = Math.round(2 * bloomMultiplier);
    feedbackType = "overconfident";
  } else if (isCorrect && confidence <= 40) {
    xp = Math.round(10 * bloomMultiplier);
    feedbackType = "underconfident";
  } else {
    xp = Math.round((isCorrect ? 12 : 5) * bloomMultiplier);
    feedbackType = isCorrect ? "mastery" : "calibrated";
  }

  // Knowledge Coins earned (resource allocation currency)
  const coins = Math.ceil(xp / 3);

  return { xp, coins, calibrationAccuracy, feedbackType };
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
    const { xp, coins, calibrationAccuracy, feedbackType } = calculateXP(isCorrect, confidenceBefore, bloomLevel);

    // Log the interaction with full cognitive metadata
    db.prepare(`
      INSERT INTO user_interactions 
        (flashcard_id, concept_id, is_correct, confidence_before, bloom_level, time_taken_ms, xp_earned, coins_earned, calibration_accuracy) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      flashcardId,
      conceptId,
      isCorrect ? 1 : 0,
      confidenceBefore,
      bloomLevel,
      timeTakenMs,
      xp,
      coins,
      calibrationAccuracy
    );

    // Update player resources
    db.prepare(`
      UPDATE player_resources SET 
        coins = coins + ?,
        total_coins_earned = total_coins_earned + ?
      WHERE id = 1
    `).run(coins, coins);

    // Update concept mastery (Bloom's escalation/de-escalation)
    let masteryUpdate = null;
    if (conceptId) {
      masteryUpdate = updateConceptMastery(conceptId, isCorrect, confidenceBefore);
    }

    return NextResponse.json({ 
      success: true,
      xp,
      coins,
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
