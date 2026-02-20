import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { updateConceptMastery } from "@/lib/conceptExtractor";
import crypto from "crypto";

/**
 * Metacognitive confidence calibration scoring matrix.
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

  const bloomMultiplier = 1 + (bloomLevel - 1) * 0.3;

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
    const { data: flashcard } = await supabase
      .from("flashcards")
      .select("concept_id, bloom_level")
      .eq("id", flashcardId)
      .single();

    const bloomLevel = flashcard?.bloom_level || 1;
    const conceptId = flashcard?.concept_id || null;

    const { xp, coins, calibrationAccuracy, feedbackType } = calculateXP(isCorrect, confidenceBefore, bloomLevel);

    // Log the interaction
    await supabase.from("user_interactions").insert({
      flashcard_id: flashcardId,
      concept_id: conceptId,
      is_correct: isCorrect,
      confidence_before: confidenceBefore,
      bloom_level: bloomLevel,
      time_taken_ms: timeTakenMs,
      xp_earned: xp,
      coins_earned: coins,
      calibration_accuracy: calibrationAccuracy,
    });

    // Update player capital resource
    const { data: hasCapital } = await supabase
      .from("player_resources")
      .select("amount")
      .eq("resource_type", "capital")
      .single();

    if (hasCapital) {
      await supabase.rpc("increment_resource_amount", {
        p_resource_type: "capital",
        p_delta: coins,
      });
    } else {
      await supabase.from("player_resources").insert({
        id: crypto.randomUUID(),
        player_id: "default_player",
        resource_type: "capital",
        amount: coins,
      });
    }

    // Update concept mastery
    let masteryUpdate = null;
    if (conceptId) {
      masteryUpdate = await updateConceptMastery(conceptId, isCorrect, confidenceBefore);
    }

    return NextResponse.json({
      success: true,
      xp,
      coins,
      calibrationAccuracy: Math.round(calibrationAccuracy * 100),
      feedbackType,
      bloomLevel,
      masteryUpdate,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Interaction logging error:", error);
    return NextResponse.json({ error: "Failed to log interaction" }, { status: 500 });
  }
}
