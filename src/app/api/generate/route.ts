import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenAI, Type } from "@google/genai";
import { ensureConceptsExist, getStudyPriorityConcepts } from "@/lib/conceptExtractor";
import crypto from "crypto";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Bloom's Taxonomy prompt templates.
 * Each level generates progressively deeper questions.
 */
const BLOOM_PROMPTS: Record<number, string> = {
  1: `You are a rigorous academic study assistant. Generate RECALL-level questions (Bloom's Level 1: Remember).
These should test whether the student can recall basic facts and definitions.
Format: "What is X?", "Define X", "Name the key components of X"
CRITICAL: Only use the provided source text. Never introduce outside knowledge.`,

  2: `You are a rigorous academic study assistant. Generate COMPREHENSION-level questions (Bloom's Level 2: Understand).
These should test whether the student grasps the meaning and can explain concepts.
Format: "Explain why X matters", "What is the significance of X?", "Summarize the relationship between X and Y"
CRITICAL: Only use the provided source text. Never introduce outside knowledge.`,

  3: `You are a rigorous academic study assistant. Generate APPLICATION-level questions (Bloom's Level 3: Apply).
These should present a realistic scenario and test whether the student can apply the concept.
Format: "In this scenario [describe], how would X apply?", "A company faces [situation]. Using concept X, what should they do?"
CRITICAL: Only use the provided source text. Never introduce outside knowledge.`,

  4: `You are a rigorous academic study assistant. Generate ANALYSIS-level questions (Bloom's Level 4: Analyze).
These should test the student's ability to compare, contrast, and break down relationships between concepts.
Format: "Compare and contrast X and Y", "What distinguishes X from Y in the context of Z?", "Analyze how X impacts Y"
CRITICAL: Only use the provided source text. Never introduce outside knowledge.`,

  5: `You are a rigorous academic study assistant. Generate EVALUATION-level questions (Bloom's Level 5: Evaluate).
These should test critical thinking — the student must judge, critique, or defend a position.
Format: "Evaluate the argument that X is better than Y", "What are the strengths and weaknesses of approach X?", "Critique the claim that..."
CRITICAL: Only use the provided source text. Never introduce outside knowledge.`
};

export async function POST(req: NextRequest) {
  try {
    // Check for targeted concept study
    const body = await req.json().catch(() => ({}));
    const targetConceptId = body.conceptId || null;

    // Safety net: ensure all uploaded documents have had concepts extracted
    await ensureConceptsExist();

    // Step 2: Clear old flashcards so we always generate fresh questions
    db.prepare("DELETE FROM flashcards").run();

    let concepts: {
      id: string; name: string; topic: string; description: string;
      bloom_mastery: number; mastery_score: number; source_chunk_ids: string;
    }[];

    if (targetConceptId) {
      // Targeted study: focus on a specific concept
      const targetConcept = db.prepare("SELECT * FROM concepts WHERE id = ?")
        .get(targetConceptId) as typeof concepts[0] | undefined;
      
      if (targetConcept) {
        // Get the target concept + a few related ones from the same topic
        const relatedConcepts = db.prepare(
          "SELECT * FROM concepts WHERE topic = ? AND id != ? ORDER BY mastery_score ASC LIMIT 2"
        ).all(targetConcept.topic, targetConceptId) as typeof concepts;
        concepts = [targetConcept, ...(relatedConcepts || [])];
      } else {
        concepts = getStudyPriorityConcepts(5);
      }
    } else {
      // Normal study: priority-based selection
      concepts = getStudyPriorityConcepts(5);
    }

    if (!concepts || concepts.length === 0) {
      const chunks = db.prepare("SELECT * FROM chunks ORDER BY RANDOM() LIMIT 5")
        .all() as { id: number; document_id: string; page_number: number; content: string }[];
      
      if (chunks.length === 0) {
        return NextResponse.json({ error: "No documents ingested yet." }, { status: 400 });
      }
    }

    console.log(`Generating fresh Bloom's-leveled questions for ${concepts.length} concepts:`);
    concepts.forEach(c => console.log(`  - "${c.name}" (${c.topic}) @ Bloom's L${c.bloom_mastery}, mastery: ${(c.mastery_score * 100).toFixed(0)}%`));

    const generatedFlashcards: Record<string, unknown>[] = [];

    for (const concept of concepts) {
      // Get source chunks for this concept
      const chunkIds: number[] = JSON.parse(concept.source_chunk_ids);
      const placeholders = chunkIds.map(() => '?').join(',');
      const sourceChunks = db.prepare(
        `SELECT * FROM chunks WHERE id IN (${placeholders})`
      ).all(...chunkIds) as { id: number; document_id: string; page_number: number; content: string }[];

      if (sourceChunks.length === 0) continue;

      // Combine source text
      const sourceText = sourceChunks.map(c => 
        `[Page ${c.page_number}]: ${c.content}`
      ).join("\n\n");

      // Select Bloom's prompt based on concept's current mastery level
      const bloomLevel = concept.bloom_mastery;
      const bloomPrompt = BLOOM_PROMPTS[bloomLevel] || BLOOM_PROMPTS[1];

      const fullPrompt = `${bloomPrompt}

CONCEPT TO TEST: "${concept.name}" — ${concept.description}
BLOOM'S LEVEL: ${bloomLevel} of 5
TOPIC: ${concept.topic}

Generate 2-3 multiple-choice questions about this concept at the specified Bloom's level.
Each question must have exactly 3 options with one correct answer.
Include a clear explanation for why the correct answer is right.
IMPORTANT: Generate DIFFERENT questions each time. Avoid repeating previous questions. Be creative with angles and scenarios.

SOURCE TEXT:
${sourceText.substring(0, 3000)}`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: fullPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correct_answer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correct_answer", "explanation"]
              }
            }
          }
        });

        const textOutput = response.text;
        if (!textOutput) continue;

        const cards = JSON.parse(textOutput);
        const primaryChunk = sourceChunks[0];

        const stmt = db.prepare(
          `INSERT INTO flashcards (id, document_id, concept_id, page_number, source_snippet, question, options, correct_answer, explanation, bloom_level, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        const insertMany = db.transaction((cardsToInsert: Record<string, unknown>[]) => {
          for (const card of cardsToInsert) {
            const id = crypto.randomUUID();
            stmt.run(
              id,
              primaryChunk.document_id,
              concept.id,
              primaryChunk.page_number,
              sourceText.substring(0, 500),
              card.question,
              JSON.stringify(card.options),
              card.correct_answer,
              card.explanation,
              bloomLevel,
              bloomLevel
            );
            generatedFlashcards.push({
              id,
              document_id: primaryChunk.document_id,
              concept_id: concept.id,
              concept_name: concept.name,
              topic: concept.topic,
              page_number: primaryChunk.page_number,
              source_snippet: sourceText.substring(0, 500),
              question: card.question,
              options: card.options,
              correct_answer: card.correct_answer,
              explanation: card.explanation,
              bloom_level: bloomLevel,
              difficulty: bloomLevel
            });
          }
        });

        insertMany(cards);

      } catch (genError) {
        console.error(`Failed to generate for concept "${concept.name}":`, genError);
      }
    }

    // Shuffle the flashcards to interleave topics
    const shuffled = generatedFlashcards.sort(() => 0.5 - Math.random());

    return NextResponse.json({ 
      success: true, 
      flashcards: shuffled,
      targetedConcept: targetConceptId || null,
      conceptsUsed: concepts.map(c => ({
        name: c.name,
        topic: c.topic,
        bloom_level: c.bloom_mastery,
        mastery: c.mastery_score
      }))
    });
    
  } catch (error: unknown) {
    console.error("Failed to generate study deck:", error);
    return NextResponse.json({ error: "Failed to generate study deck" }, { status: 500 });
  }
}
