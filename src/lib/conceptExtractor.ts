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
 * Extract concepts from a specific document's chunks.
 * Called right after PDF upload to build the concept graph incrementally.
 * Each document gets its own extraction — concepts accumulate over time.
 */
export async function extractConceptsForDocument(documentId: string): Promise<void> {
  // Get chunks for this specific document
  const chunks = db.prepare(
    "SELECT id, document_id, page_number, content FROM chunks WHERE document_id = ?"
  ).all(documentId) as {
    id: number;
    document_id: string;
    page_number: number;
    content: string;
  }[];

  if (chunks.length === 0) {
    console.log(`No chunks found for document ${documentId}`);
    return;
  }

  console.log(`Extracting concepts from ${chunks.length} chunks for document ${documentId}...`);

  // Build text for LLM
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
    console.log(`Extracted ${concepts.length} concepts from document ${documentId}`);

    // Store concepts in SQLite, linked to this document
    const stmt = db.prepare(
      "INSERT INTO concepts (id, document_id, name, topic, description, source_chunk_ids) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const insertAll = db.transaction((conceptList: ExtractedConcept[]) => {
      for (const concept of conceptList) {
        // Validate chunk IDs exist for this document
        const validChunkIds = concept.source_chunk_ids.filter(id => 
          chunks.some(c => c.id === id)
        );
        // If LLM hallucinated chunk IDs, assign real ones from this document
        const finalChunkIds = validChunkIds.length > 0 
          ? validChunkIds 
          : [chunks[Math.floor(Math.random() * chunks.length)].id];

        stmt.run(
          crypto.randomUUID(),
          documentId,
          concept.name,
          concept.topic,
          concept.description,
          JSON.stringify(finalChunkIds)
        );
      }
    });

    insertAll(concepts);
    console.log(`✅ Stored ${concepts.length} concepts for document ${documentId}`);

  } catch (error) {
    console.error("Concept extraction failed:", error);
    // Don't throw — let the upload succeed even if extraction fails
    // Concepts can be re-extracted on next generate call
  }
}

/**
 * Ensure all documents have had concepts extracted.
 * Runs during generate as a safety net — extracts for any documents
 * that were uploaded but don't yet have concepts (e.g. if extraction
 * failed during upload).
 */
export async function ensureConceptsExist(): Promise<void> {
  // Find documents that have chunks but no concepts
  const documentsWithoutConcepts = db.prepare(`
    SELECT DISTINCT d.id FROM documents d
    INNER JOIN chunks c ON c.document_id = d.id
    LEFT JOIN concepts co ON co.document_id = d.id
    WHERE co.id IS NULL
  `).all() as { id: string }[];

  if (documentsWithoutConcepts.length === 0) {
    return; // All documents have concepts
  }

  console.log(`Found ${documentsWithoutConcepts.length} documents without concepts, extracting...`);
  
  for (const doc of documentsWithoutConcepts) {
    await extractConceptsForDocument(doc.id);
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
  
  const masteryDelta = isCorrect ? 0.2 : -0.15;
  let newMastery = Math.max(0, Math.min(1, concept.mastery_score + masteryDelta));

  let newBloom = concept.bloom_mastery;
  
  if (isCorrect && newStreak >= 2 && newBloom < 5) {
    newBloom = Math.min(5, newBloom + 1);
    newStreak = 0;
    console.log(`⬆️ Concept promoted to Bloom's level ${newBloom}`);
  } else if (!isCorrect && newBloom > 1) {
    newBloom = Math.max(1, newBloom - 1);
    console.log(`⬇️ Concept demoted to Bloom's level ${newBloom}`);
  }

  const confidenceNorm = confidenceBefore / 100;
  const calibrationError = Math.abs(confidenceNorm - (isCorrect ? 1 : 0));
  const calibrationBonus = (1 - calibrationError) * 0.05;
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
