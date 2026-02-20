import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 3000): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit = error instanceof Error &&
        (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'));
      if (!isRateLimit || attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Rate limited. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(req: NextRequest) {
  try {
    let targetConceptId: string | null = null;
    try {
      const body = await req.json();
      targetConceptId = body.targetConceptId || null;
    } catch {
      // Ignore empty body
    }

    // 0. Prioritize generating for a specific concept if requested
    if (targetConceptId) {
      const { data: targetConcept } = await supabase
        .from("concepts")
        .select("id, name, topic, description, bloom_mastery, needs_generation_level, source_chunk_ids")
        .eq("id", targetConceptId)
        .single();

      if (targetConcept && targetConcept.needs_generation_level <= targetConcept.bloom_mastery) {
        console.log(`[Queue] Prioritizing question generation for target concept ${targetConceptId}`);
        return await generateQuestionsForConcept(targetConcept);
      }
    }

    // 1. Get 1 pending chunk
    const { data: chunks } = await supabase
      .from("chunks")
      .select("id, document_id, page_number, content")
      .eq("processed_status", "pending")
      .limit(1);

    const chunk = chunks?.[0];

    if (!chunk) {
      // Check for concepts that need generation
      const { data: conceptsToGen } = await supabase
        .from("concepts")
        .select("id, name, topic, description, bloom_mastery, needs_generation_level, source_chunk_ids")
        .limit(1);

      const conceptToGenerate = conceptsToGen?.find(
        c => c.needs_generation_level <= c.bloom_mastery
      );

      if (!conceptToGenerate) {
        return NextResponse.json({ status: "idle", message: "No chunks or concepts pending processing" });
      } else {
        return await generateQuestionsForConcept(conceptToGenerate);
      }
    }

    // Mark as processing
    await supabase
      .from("chunks")
      .update({ processed_status: "processing" })
      .eq("id", chunk.id);

    console.log(`[Queue] Processing chunk ${chunk.id}...`);

    // 2. Extract concepts for this chunk
    const prompt = `You are an expert academic content analyst. Analyze the following academic text excerpt and extract 1 to 3 KEY CONCEPTS that a student needs to master.

For each concept, provide:
- "name": A concise concept name (2-5 words)
- "topic": The broader topic/category it belongs to
- "description": A one-sentence description of the concept

RULES:
1. Extract 1 to 3 concepts that represent the most important ideas in this specific text snippet.
2. Concepts should be specific enough to generate targeted questions about.
3. Topics should group related concepts together.

SOURCE TEXT:
${chunk.content.substring(0, 3000)}`;

    const response = await withRetry(() => getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              topic: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name", "topic", "description"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) {
      await supabase
        .from("chunks")
        .update({ processed_status: "failed" })
        .eq("id", chunk.id);
      return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });
    }

    const concepts: { name: string; topic: string; description: string }[] = JSON.parse(text);

    // Store concepts
    await supabase.from("concepts").insert(
      concepts.map(concept => ({
        id: crypto.randomUUID(),
        document_id: chunk.document_id,
        name: concept.name,
        topic: concept.topic,
        description: concept.description,
        source_chunk_ids: JSON.stringify([chunk.id]),
        needs_generation_level: 1,
      }))
    );

    // Mark chunk as completed
    await supabase
      .from("chunks")
      .update({ processed_status: "completed" })
      .eq("id", chunk.id);

    return NextResponse.json({ status: "processed", chunkId: chunk.id, conceptsExtracted: concepts.length });

  } catch (error: unknown) {
    console.error("Queue process failed:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to process queue" }, { status: 500 });
  }
}

const BLOOM_PROMPTS: Record<number, string> = {
  1: "Focus on basic recall. Ask a clear, conversational question that checks if the student knows what this concept is and why it matters. Do NOT ask them to recite definitions. (Remembering)",
  2: "Focus on understanding. Ask a question that checks if the student can explain this concept in their own words, give a real-world example, or describe why it matters. (Understanding)",
  3: "Focus on application. Present a brief realistic scenario and ask how this concept would apply. The student should demonstrate they can use the idea, not just define it. (Applying)",
  4: "Focus on analysis. Ask a question that requires the student to compare, contrast, or break down how this concept relates to other ideas in the field. (Analyzing)"
};

async function generateQuestionsForConcept(concept: {
  id: string;
  name: string;
  topic: string;
  description: string;
  bloom_mastery: number;
  source_chunk_ids: string;
}) {
  if (concept.bloom_mastery > 4) {
    await supabase
      .from("concepts")
      .update({ needs_generation_level: 5 })
      .eq("id", concept.id);
    return NextResponse.json({ status: "idle", message: "Concept maxed out" });
  }

  const chunkIds = JSON.parse(concept.source_chunk_ids) as number[];
  if (chunkIds.length === 0) {
    await supabase
      .from("concepts")
      .update({ needs_generation_level: 5 })
      .eq("id", concept.id);
    return NextResponse.json({ status: "idle", message: "No chunks to generate from" });
  }

  const { data: sourceChunks } = await supabase
    .from("chunks")
    .select("*")
    .in("id", chunkIds);

  if (!sourceChunks || sourceChunks.length === 0) {
    return NextResponse.json({ status: "idle", message: "Source chunks not found" });
  }

  const sourceText = sourceChunks.map(c => `[Page ${c.page_number}]: ${c.content}`).join("\n\n");
  const targetLevel = concept.bloom_mastery;
  const bloomPrompt = BLOOM_PROMPTS[targetLevel] || BLOOM_PROMPTS[1];

  const fullPrompt = `${bloomPrompt}

CONCEPT TO TEST: "${concept.name}" — ${concept.description}
BLOOM'S LEVEL: ${targetLevel} of 4
TOPIC: ${concept.topic}

Generate 5 open-ended, free-response questions about this concept at the specified Bloom's level.
DO NOT generate multiple choice options. The student will type their answer.

CRITICAL RULES:
- Do NOT start questions with "According to the text" or "Based on the reading" — the student does NOT have the text in front of them.
- Ask about the CONCEPT itself, not about what a document says.
- Questions should sound like a knowledgeable tutor asking a student, not a textbook quiz.
- Keep questions concise and clear.

For each question, provide a "target_explanation" — this is the CORE IDEA the student should demonstrate understanding of. Focus on the concept, not specific wording or terminology.

SOURCE MATERIAL (for your reference only — the student cannot see this):
${sourceText.substring(0, 3000)}`;

  try {
    console.log(`[Queue] Generating Level ${targetLevel} questions for concept: ${concept.name}...`);

    const response = await withRetry(() => getAI().models.generateContent({
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
              target_explanation: { type: Type.STRING }
            },
            required: ["question", "target_explanation"]
          }
        }
      }
    }));

    const textOutput = response.text;
    if (!textOutput) return NextResponse.json({ error: "No text output from Gemini" }, { status: 500 });

    const cards = JSON.parse(textOutput);
    const primaryChunk = sourceChunks[0];

    await supabase.from("flashcards").insert(
      cards.map((card: { question: string; target_explanation: string }) => ({
        id: crypto.randomUUID(),
        document_id: primaryChunk.document_id,
        concept_id: concept.id,
        page_number: primaryChunk.page_number,
        source_snippet: primaryChunk.content.substring(0, 500),
        question: card.question,
        explanation: card.target_explanation,
        bloom_level: targetLevel,
        difficulty: 1,
      }))
    );

    // Mark generation as complete for this level
    await supabase
      .from("concepts")
      .update({ needs_generation_level: targetLevel + 1 })
      .eq("id", concept.id);

    return NextResponse.json({ status: "generated", conceptId: concept.id, cardsGenerated: cards.length });

  } catch (e) {
    console.error("Queue format questions failed: ", e);
    return NextResponse.json({ error: "Failed to format questions" }, { status: 500 });
  }
}
