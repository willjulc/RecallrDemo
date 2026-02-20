import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Check for targeted concept study
    const body = await req.json().catch(() => ({}));
    const targetConceptId = body.conceptId || null;

    let selectedFlashcards: Record<string, unknown>[] = [];
    let conceptsUsed: any[] = [];

    if (targetConceptId) {
        // Targeted study: focus on a specific concept
        const targetConcept = db.prepare("SELECT * FROM concepts WHERE id = ?")
            .get(targetConceptId) as any | undefined;
        
        if (!targetConcept) {
             return NextResponse.json({ error: "Target concept not found" }, { status: 404 });
        }

        // Get ALL flashcards for the target concept (crisis review — any level is fine)
        selectedFlashcards = db.prepare(`
            SELECT f.*, c.name as concept_name, c.topic 
            FROM flashcards f
            JOIN concepts c ON f.concept_id = c.id
            WHERE f.concept_id = ?
            ORDER BY RANDOM()
            LIMIT 5
        `).all(targetConceptId) as Record<string, unknown>[];

        conceptsUsed.push(targetConcept);

    } else {
        // General study: Prioritize concepts that are due for review, lower mastery, or haven't been reviewed much
        // For the hackathon MVP, we'll pick a few concepts that have flashcards available
        
        const priorityConcepts = db.prepare(`
             SELECT DISTINCT c.*
             FROM concepts c
             JOIN flashcards f ON c.id = f.concept_id
             WHERE f.bloom_level <= c.bloom_mastery
             ORDER BY c.mastery_score ASC, c.last_reviewed ASC
             LIMIT 5
        `).all() as any[];

        conceptsUsed = priorityConcepts;

        if (priorityConcepts.length > 0) {
            const conceptIds = priorityConcepts.map(c => c.id);
            const placeholders = conceptIds.map(() => '?').join(',');
            
            // Get 1-2 cards per selected concept to interleave topics
            selectedFlashcards = db.prepare(`
                SELECT f.*, c.name as concept_name, c.topic 
                FROM flashcards f
                JOIN concepts c ON f.concept_id = c.id
                WHERE f.concept_id IN (${placeholders}) 
                  AND f.bloom_level <= c.bloom_mastery
                ORDER BY RANDOM()
                LIMIT 10
            `).all(...conceptIds) as Record<string, unknown>[];
        }
    }

    if (selectedFlashcards.length === 0) {
        return NextResponse.json({ 
            error: "We are still building your venture and generating questions in the background. Please wait a moment and try again!" 
        }, { status: 400 });
    }

    // Shuffle the flashcards to interleave topics and pick a max of 10
    const shuffled = selectedFlashcards.sort(() => 0.5 - Math.random()).slice(0, 10);

    return NextResponse.json({ 
      success: true, 
      flashcards: shuffled,
      targetedConcept: targetConceptId || null,
      conceptsUsed: conceptsUsed.map(c => ({
        name: c.name,
        topic: c.topic,
        bloom_level: c.bloom_mastery,
        mastery: c.mastery_score
      }))
    });
    
  } catch (error: unknown) {
    console.error("Failed to fetch study deck:", error);
    return NextResponse.json({ error: "Failed to fetch study deck" }, { status: 500 });
  }
}
