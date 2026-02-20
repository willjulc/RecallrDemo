import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

// Constants for Venture Capital Economy
const CAPITAL_REWARDS = {
  HIGH_CONFIDENCE_CORRECT: 100,
  LOW_CONFIDENCE_CORRECT: 50,
  LOW_CONFIDENCE_INCORRECT: 25,
  HIGH_CONFIDENCE_INCORRECT: -50,
};

export async function POST(req: NextRequest) {
  try {
    const {
      cardId,
      userAnswer,
      confidenceLevel,
      conceptName,
      question,
      targetExplanation,
      sourceSnippet
    } = await req.json();

    if (!userAnswer || confidenceLevel === undefined) {
      return NextResponse.json({ error: "Missing answer or confidence" }, { status: 400 });
    }

    // 1. Grade the answer using Gemini
    const prompt = `You are an encouraging study buddy helping a student review concepts. The student is answering from memory — they do NOT have any notes or textbook in front of them.

CONCEPT: ${conceptName}
QUESTION: ${question}
CORE IDEA: ${targetExplanation}

STUDENT'S ANSWER: "${userAnswer}"

GRADING INSTRUCTIONS:
You must be VERY generous. This is a learning tool, not an exam. Your job is to ENCOURAGE continued studying, not gatekeep correctness.

Mark as CORRECT if the student:
- Shows ANY understanding of the concept, even if vague or incomplete
- Gets the general direction right, even with wrong details
- Uses their own words to describe the right idea
- Mentions related concepts that show they're in the right area
- Gives a partial answer that covers at least one aspect of the core idea

Mark as INCORRECT only if the student:
- Gives a completely unrelated answer
- Demonstrates a fundamental misunderstanding (says the opposite of truth)
- Writes something totally random or nonsensical

EXAMPLE — If the core idea is "managing production processes efficiently":
- "it's about making sure a business runs smoothly" → CORRECT (right direction)
- "managing how products get made" → CORRECT (captures the idea)
- "it's a type of accounting method" → INCORRECT (wrong concept entirely)

DEFAULT TO CORRECT. When in doubt, mark it correct and provide encouraging feedback that fills in what they missed.

Respond in JSON:
- "is_correct": boolean
- "socratic_feedback": string (if correct: praise + add detail they missed; if incorrect: gentle hint toward the right idea)`;

    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_correct: { type: Type.BOOLEAN },
            socratic_feedback: { type: Type.STRING }
          },
          required: ["is_correct", "socratic_feedback"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });

    const cleanOutput = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleanOutput);
    } catch (e) {
      console.error("Failed to parse Gemini evaluation output:", cleanOutput);
      throw e;
    }

    const isHighConfidence = confidenceLevel >= 75;

    // 2. Apply Metacognitive Reward Logic
    let capitalEarned = 0;

    if (result.is_correct && isHighConfidence) {
      capitalEarned = CAPITAL_REWARDS.HIGH_CONFIDENCE_CORRECT;
    } else if (result.is_correct && !isHighConfidence) {
      capitalEarned = CAPITAL_REWARDS.LOW_CONFIDENCE_CORRECT;
    } else if (!result.is_correct && !isHighConfidence) {
      capitalEarned = CAPITAL_REWARDS.LOW_CONFIDENCE_INCORRECT;
    } else if (!result.is_correct && isHighConfidence) {
      capitalEarned = CAPITAL_REWARDS.HIGH_CONFIDENCE_INCORRECT;
    }

    // 3. Track the interaction
    await supabase.from("user_interactions").insert({
      flashcard_id: cardId,
      is_correct: result.is_correct,
      confidence_before: confidenceLevel,
      time_taken_ms: 0,
      coins_earned: capitalEarned,
    });

    // 4. Update player capital
    const { data: hasCapital } = await supabase
      .from("player_resources")
      .select("amount")
      .eq("resource_type", "capital")
      .single();

    if (hasCapital) {
      await supabase.rpc("increment_resource_amount", {
        p_resource_type: "capital",
        p_delta: capitalEarned,
      });
    } else {
      await supabase.from("player_resources").insert({
        id: crypto.randomUUID(),
        player_id: "default_player",
        resource_type: "capital",
        amount: capitalEarned,
      });
    }

    // 5. Bloom's Escalation
    if (result.is_correct && isHighConfidence) {
      const { data: card } = await supabase
        .from("flashcards")
        .select("concept_id, bloom_level")
        .eq("id", cardId)
        .single();

      if (card?.concept_id) {
        const { data: concept } = await supabase
          .from("concepts")
          .select("bloom_mastery")
          .eq("id", card.concept_id)
          .single();

        if (concept && card.bloom_level >= concept.bloom_mastery && concept.bloom_mastery < 4) {
          const newMastery = concept.bloom_mastery + 1;
          await supabase.rpc("escalate_concept_bloom", {
            p_concept_id: card.concept_id,
            p_new_mastery: newMastery,
            p_mastery_delta: 10,
          });
          console.log(`[Escalation] Concept ${card.concept_id} escalated to Bloom Level ${newMastery}`);
        } else if (concept) {
          await supabase.rpc("increment_concept_mastery", {
            p_concept_id: card.concept_id,
            p_delta: 5,
          });
        }
      }
    }

    // Fetch new capital total for the UI
    const { data: totalCapital } = await supabase
      .from("player_resources")
      .select("amount")
      .eq("resource_type", "capital")
      .single();

    return NextResponse.json({
      isCorrect: result.is_correct,
      feedback: result.socratic_feedback,
      capitalDelta: capitalEarned,
      newTotalCapital: totalCapital?.amount || 0,
    });

  } catch (error) {
    console.error("Evaluation failed:", error);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}
