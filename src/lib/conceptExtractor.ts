import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./db";
import crypto from "crypto";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ExtractedConcept {
  name: string;
  topic: string;
  description: string;
  source_chunk_ids: number[];
}

/**
 * Extract structured concepts from document chunks using Gemini.
 * Groups chunks by document, sends batches to the LLM, and stores
 * the resulting concept graph in SQLite.
 */
export async function extractConceptsFromChunks(): Promise<void> {
  // Check if concepts already exist
  const existing = db.prepare("SELECT COUNT(*) as count FROM concepts").get() as { count: number };
  if (existing.count > 0) {
    console.log(`Concept graph already exists with ${existing.count} concepts. Skipping extraction.`);
    return;
  }

  // Pull all chunks
  const chunks = db.prepare("SELECT id, document_id, page_number, content FROM chunks").all() as {
    id: number;
    document_id: string;
    page_number: number;
    content: string;
  }[];

  if (chunks.length === 0) return;

  // Build a condensed text representation for the LLM (limit context size)
  // Group by document for coherence
  const chunkSummaries = chunks.map(c => 
    `[Chunk ${c.id}, Page ${c.page_number}]: ${c.content.substring(0, 500)}`
  ).join("\n\n");

  // Limit to ~15000 chars to stay within context bounds
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
4. Each concept must reference at least one source chunk ID
5. Focus on concepts that build on each other (simple → complex)

SOURCE TEXT:
${truncated}`;

  try {
    const response = await ai.models.generateContent({
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
    });

    const text = response.text;
    if (!text) {
      console.error("No response from concept extraction");
      return;
    }

    const concepts: ExtractedConcept[] = JSON.parse(text);
    console.log(`Extracted ${concepts.length} concepts from document chunks`);

    // Store concepts in SQLite
    const stmt = db.prepare(
      "INSERT INTO concepts (id, name, topic, description, source_chunk_ids) VALUES (?, ?, ?, ?, ?)"
    );

    const insertAll = db.transaction((conceptList: ExtractedConcept[]) => {
      for (const concept of conceptList) {
        // Validate chunk IDs exist
        const validChunkIds = concept.source_chunk_ids.filter(id => 
          chunks.some(c => c.id === id)
        );
        // If LLM hallucinated chunk IDs, assign random real ones
        const finalChunkIds = validChunkIds.length > 0 
          ? validChunkIds 
          : [chunks[Math.floor(Math.random() * chunks.length)].id];

        stmt.run(
          crypto.randomUUID(),
          concept.name,
          concept.topic,
          concept.description,
          JSON.stringify(finalChunkIds)
        );
      }
    });

    insertAll(concepts);
    console.log(`Stored ${concepts.length} concepts in concept graph`);

  } catch (error) {
    console.error("Concept extraction failed:", error);
    throw error;
  }
}

/**
 * Get concepts ordered by priority for the next study session.
 * Priority: lowest mastery first, then longest since last review (spaced repetition), 
 * interleaved across different topics.
 */
export function getStudyPriorityConcepts(limit: number = 5): {
  id: string;
  name: string;
  topic: string;
  description: string;
  bloom_mastery: number;
  mastery_score: number;
  source_chunk_ids: string;
}[] {
  // Select concepts prioritizing:
  // 1. Never-reviewed concepts first
  // 2. Lowest mastery_score
  // 3. Longest since last review (spaced repetition)
  // 4. Interleave by selecting from different topics
  const concepts = db.prepare(`
    SELECT * FROM concepts
    ORDER BY 
      CASE WHEN last_reviewed IS NULL THEN 0 ELSE 1 END,
      mastery_score ASC,
      COALESCE(last_reviewed, '1970-01-01') ASC
    LIMIT ?
  `).all(limit * 2) as {
    id: string;
    name: string;
    topic: string;
    description: string;
    bloom_mastery: number;
    mastery_score: number;
    source_chunk_ids: string;
  }[];

  // Interleave: pick from different topics to avoid blocked practice
  const selected: typeof concepts = [];
  const usedTopics = new Set<string>();
  
  // First pass: one from each topic
  for (const concept of concepts) {
    if (selected.length >= limit) break;
    if (!usedTopics.has(concept.topic)) {
      selected.push(concept);
      usedTopics.add(concept.topic);
    }
  }
  
  // Second pass: fill remaining slots
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
 * Implements Bloom's level escalation/de-escalation.
 */
export function updateConceptMastery(
  conceptId: string, 
  isCorrect: boolean, 
  confidenceBefore: number
): { newBloomLevel: number; newMasteryScore: number } {
  const concept = db.prepare("SELECT * FROM concepts WHERE id = ?").get(conceptId) as {
    bloom_mastery: number;
    mastery_score: number;
    correct_streak: number;
    review_count: number;
  } | undefined;

  if (!concept) return { newBloomLevel: 1, newMasteryScore: 0 };

  let newStreak = isCorrect ? concept.correct_streak + 1 : 0;
  
  // Mastery score: exponential moving average
  const masteryDelta = isCorrect ? 0.2 : -0.15;
  let newMastery = Math.max(0, Math.min(1, concept.mastery_score + masteryDelta));

  // Bloom's level escalation logic
  let newBloom = concept.bloom_mastery;
  
  if (isCorrect && newStreak >= 2 && newBloom < 5) {
    // Promote after 2 consecutive correct answers at current level
    newBloom = Math.min(5, newBloom + 1);
    newStreak = 0; // Reset streak for new level
    console.log(`⬆️ Concept promoted to Bloom's level ${newBloom}`);
  } else if (!isCorrect && newBloom > 1) {
    // Demote on incorrect answer (but floor at 1)
    newBloom = Math.max(1, newBloom - 1);
    console.log(`⬇️ Concept demoted to Bloom's level ${newBloom}`);
  }

  // Confidence calibration bonus to mastery
  const confidenceNorm = confidenceBefore / 100;
  const calibrationError = Math.abs(confidenceNorm - (isCorrect ? 1 : 0));
  const calibrationBonus = (1 - calibrationError) * 0.05; // Small bonus for accurate self-assessment
  newMastery = Math.min(1, newMastery + calibrationBonus);

  db.prepare(`
    UPDATE concepts SET 
      bloom_mastery = ?,
      mastery_score = ?,
      correct_streak = ?,
      review_count = review_count + 1,
      last_reviewed = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newBloom, newMastery, newStreak, conceptId);

  return { newBloomLevel: newBloom, newMasteryScore: newMastery };
}
