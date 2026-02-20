import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "./supabase";
import crypto from "crypto";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

/** Retry wrapper for Gemini API calls with exponential backoff for 429s */
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

interface ExtractedConcept {
  name: string;
  topic: string;
  description: string;
  source_chunk_ids: number[];
}

/**
 * Extract concepts from a specific document's chunks.
 */
export async function extractConceptsForDocument(documentId: string): Promise<void> {
  const { data: chunks } = await supabase
    .from("chunks")
    .select("id, document_id, page_number, content")
    .eq("document_id", documentId);

  if (!chunks || chunks.length === 0) {
    console.log(`No chunks found for document ${documentId}`);
    return;
  }

  console.log(`Extracting concepts from ${chunks.length} chunks for document ${documentId}...`);

  const chunkSummaries = chunks.map(c =>
    `[Chunk ${c.id}, Page ${c.page_number}]: ${c.content.substring(0, 500)}`
  ).join("\n\n");

  const truncated = chunkSummaries.substring(0, 15000);

  const prompt = `You are an expert academic content analyst. Analyze the following academic text excerpts and extract the KEY CONCEPTS that a student needs to master.

For each concept, provide:
- "name": A concise concept name (2-5 words)
- "topic": The broader topic/category it belongs to
- "description": A one-sentence description of the concept
- "source_chunk_ids": Array of chunk IDs (integers) where this concept appears

RULES:
1. Extract 8-15 concepts that represent the most important ideas
2. Concepts should be specific enough to generate targeted questions about
3. Topics should group related concepts together
4. Each concept must reference at least one source chunk ID from the list provided
5. Focus on concepts that build on each other (simple to complex)

SOURCE TEXT:
${truncated}`;

  try {
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
              description: { type: Type.STRING },
              source_chunk_ids: { type: Type.ARRAY, items: { type: Type.INTEGER } }
            },
            required: ["name", "topic", "description", "source_chunk_ids"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) {
      console.error("No response from concept extraction");
      return;
    }

    const concepts: ExtractedConcept[] = JSON.parse(text);
    console.log(`Extracted ${concepts.length} concepts from document ${documentId}`);

    const rows = concepts.map(concept => {
      const validChunkIds = concept.source_chunk_ids.filter(id =>
        chunks.some(c => c.id === id)
      );
      const finalChunkIds = validChunkIds.length > 0
        ? validChunkIds
        : [chunks[Math.floor(Math.random() * chunks.length)].id];

      return {
        id: crypto.randomUUID(),
        document_id: documentId,
        name: concept.name,
        topic: concept.topic,
        description: concept.description,
        source_chunk_ids: JSON.stringify(finalChunkIds),
      };
    });

    await supabase.from("concepts").insert(rows);
    console.log(`Stored ${concepts.length} concepts for document ${documentId}`);

  } catch (error) {
    console.error("Concept extraction failed:", error);
  }
}

/**
 * Ensure all documents have had concepts extracted.
 */
export async function ensureConceptsExist(): Promise<void> {
  const { data: allDocs } = await supabase
    .from("documents")
    .select("id");

  if (!allDocs) return;

  for (const doc of allDocs) {
    const { count: conceptCount } = await supabase
      .from("concepts")
      .select("*", { count: "exact", head: true })
      .eq("document_id", doc.id);

    const { count: chunkCount } = await supabase
      .from("chunks")
      .select("*", { count: "exact", head: true })
      .eq("document_id", doc.id);

    if ((chunkCount ?? 0) > 0 && (conceptCount ?? 0) === 0) {
      console.log(`Document ${doc.id} has chunks but no concepts, extracting...`);
      await extractConceptsForDocument(doc.id);
    }
  }
}

/**
 * Get concepts ordered by priority for the next study session.
 */
export async function getStudyPriorityConcepts(limit: number = 5) {
  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, name, topic, description, bloom_mastery, mastery_score, source_chunk_ids")
    .order("mastery_score", { ascending: true })
    .order("last_reviewed", { ascending: true, nullsFirst: true })
    .limit(limit * 2);

  if (!concepts) return [];

  // Interleave: pick from different topics to avoid blocked practice
  const selected: typeof concepts = [];
  const usedTopics = new Set<string>();

  for (const concept of concepts) {
    if (selected.length >= limit) break;
    if (!usedTopics.has(concept.topic)) {
      selected.push(concept);
      usedTopics.add(concept.topic);
    }
  }

  for (const concept of concepts) {
    if (selected.length >= limit) break;
    if (!selected.includes(concept)) {
      selected.push(concept);
    }
  }

  return selected;
}

/**
 * Update a concept's mastery after the student answers a question.
 */
export async function updateConceptMastery(
  conceptId: string,
  isCorrect: boolean,
  confidenceBefore: number
): Promise<{ newBloomLevel: number; newMasteryScore: number }> {
  const { data: concept } = await supabase
    .from("concepts")
    .select("bloom_mastery, mastery_score, correct_streak, review_count")
    .eq("id", conceptId)
    .single();

  if (!concept) return { newBloomLevel: 1, newMasteryScore: 0 };

  let newStreak = isCorrect ? concept.correct_streak + 1 : 0;

  const masteryDelta = isCorrect ? 0.2 : -0.15;
  let newMastery = Math.max(0, Math.min(1, concept.mastery_score + masteryDelta));

  let newBloom = concept.bloom_mastery;

  if (isCorrect && newStreak >= 2 && newBloom < 5) {
    newBloom = Math.min(5, newBloom + 1);
    newStreak = 0;
    console.log(`Concept promoted to Bloom's level ${newBloom}`);
  } else if (!isCorrect && newBloom > 1) {
    newBloom = Math.max(1, newBloom - 1);
    console.log(`Concept demoted to Bloom's level ${newBloom}`);
  }

  const confidenceNorm = confidenceBefore / 100;
  const calibrationError = Math.abs(confidenceNorm - (isCorrect ? 1 : 0));
  const calibrationBonus = (1 - calibrationError) * 0.05;
  newMastery = Math.min(1, newMastery + calibrationBonus);

  await supabase.rpc("update_concept_after_review", {
    p_concept_id: conceptId,
    p_bloom_mastery: newBloom,
    p_mastery_score: newMastery,
    p_correct_streak: newStreak,
  });

  return { newBloomLevel: newBloom, newMasteryScore: newMastery };
}
