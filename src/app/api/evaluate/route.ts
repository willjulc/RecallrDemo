import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Constants for Venture Capital Economy (from PRD)
const CAPITAL_REWARDS = {
  HIGH_CONFIDENCE_CORRECT: 100, // Max Capital
  LOW_CONFIDENCE_CORRECT: 50,
  LOW_CONFIDENCE_INCORRECT: 25, // Calibration Bonus
  HIGH_CONFIDENCE_INCORRECT: -50, // Penalty for overconfidence
};

export async function POST(req: NextRequest) {
  try {
    const { 
        cardId, 
        userAnswer, 
        confidenceLevel, // 0 to 100
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

    const response = await ai.models.generateContent({
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
    
    // Sometimes gemini will wrap with backticks even when response schema is defined.
    const cleanOutput = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();

    let result;
    try {
        result = JSON.parse(cleanOutput);
    } catch (e) {
        console.error("Failed to parse Gemini evaluation output:", cleanOutput);
        throw e;
    }
    
    const isHighConfidence = confidenceLevel >= 75;
    
    // 2. Apply PRD Metacognitive Reward Logic
    let capitalEarned = 0;
    
    if (result.is_correct && isHighConfidence) {
        capitalEarned = CAPITAL_REWARDS.HIGH_CONFIDENCE_CORRECT;
    } else if (result.is_correct && !isHighConfidence) {
        capitalEarned = CAPITAL_REWARDS.LOW_CONFIDENCE_CORRECT;
    } else if (!result.is_correct && !isHighConfidence) {
        capitalEarned = CAPITAL_REWARDS.LOW_CONFIDENCE_INCORRECT; // Honesty bonus
    } else if (!result.is_correct && isHighConfidence) {
        capitalEarned = CAPITAL_REWARDS.HIGH_CONFIDENCE_INCORRECT; // Overconfidence penalty
    }

    // 3. Update the Database
    db.transaction(() => {
        // Track the interaction
        db.prepare(
            "INSERT INTO user_interactions (flashcard_id, is_correct, confidence_before, time_taken_ms, coins_earned) VALUES (?, ?, ?, ?, ?)"
        ).run(cardId, result.is_correct ? 1 : 0, confidenceLevel, 0, capitalEarned);

        // Check if player_resources has the row
        const hasCapital = db.prepare("SELECT amount FROM player_resources WHERE resource_type = 'capital'").get();
        if (hasCapital) {
             db.prepare("UPDATE player_resources SET amount = amount + ? WHERE resource_type = 'capital'").run(capitalEarned);
        } else {
             db.prepare("INSERT INTO player_resources (id, player_id, resource_type, amount) VALUES (?, ?, ?, ?)").run(crypto.randomUUID(), 'default_player', 'capital', capitalEarned);
        }
        
        // 4. Bloom's Escalation (from PRD Phase 4)
        if (result.is_correct && isHighConfidence) {
            // Find the concept_id for this card
            const card = db.prepare("SELECT concept_id, bloom_level FROM flashcards WHERE id = ?").get(cardId) as { concept_id: string; bloom_level: number } | undefined;
            if (card && card.concept_id) {
                // Determine if this card is currently at the max mastery level of the concept
                const concept = db.prepare("SELECT bloom_mastery FROM concepts WHERE id = ?").get(card.concept_id) as { bloom_mastery: number } | undefined;
                
                // If they mastered the current level, escalate it. (Max level 4 for MVP)
                if (concept && card.bloom_level >= concept.bloom_mastery && concept.bloom_mastery < 4) {
                    const newMastery = concept.bloom_mastery + 1;
                    db.prepare(`
                        UPDATE concepts 
                        SET bloom_mastery = ?, needs_generation_level = ?, mastery_score = mastery_score + 10, last_reviewed = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(newMastery, newMastery, card.concept_id);
                    console.log(`[Escalation] Concept ${card.concept_id} escalated to Bloom Level ${newMastery}`);
                } else if (concept) {
                    // Just update mastery score and last reviewed
                    db.prepare(`
                         UPDATE concepts SET mastery_score = mastery_score + 5, last_reviewed = CURRENT_TIMESTAMP WHERE id = ?
                    `).run(card.concept_id);
                }
            }
        }
    })();

    // Fetch new capital total for the UI
    const totalCapital = db.prepare("SELECT amount FROM player_resources WHERE resource_type = 'capital'").get() as { amount: number } | undefined;

    return NextResponse.json({
        isCorrect: result.is_correct,
        feedback: result.socratic_feedback,
        capitalDelta: capitalEarned,
        newTotalCapital: totalCapital?.amount || 0
    });

  } catch (error) {
    console.error("Evaluation failed:", error);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}
