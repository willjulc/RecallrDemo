import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let db;
  try {
    // Dynamic import to catch SQLite native binary loading errors on Vercel
    const dbModule = require("@/lib/db");
    db = dbModule.db;
  } catch (err: any) {
    console.error("Failed to load SQLite:", err);
    return NextResponse.json({ error: "Database failed to load on Vercel: " + err.message, stack: err.stack }, { status: 500 });
  }

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
        // VERCEL FIREWALL: If the DB hasn't seeded yet or the query misses,
        // instantly return an emergency fallback deck so the demo never hangs.
        selectedFlashcards = [
          {
            id: 'fallback-1',
            concept_name: 'Supply Chain Management',
            topic: 'Operations',
            question: "What is the main goal of supply chain management?",
            explanation: "To maximize customer value and achieve a sustainable competitive advantage by managing supply chain activities effectively.",
            bloom_level: 1,
            source_snippet: "Supply Chain Management (SCM) is the active management of supply chain activities..."
          },
          {
            id: 'fallback-2',
            concept_name: 'Just-in-Time (JIT)',
            topic: 'Operations',
            question: "What is the core idea behind Just-in-Time manufacturing?",
            explanation: "Materials arrive exactly when needed in the production process, minimizing inventory and storage costs.",
            bloom_level: 1,
            source_snippet: "Just-in-Time (JIT) manufacturing is a methodology aimed at reducing times..."
          },
          {
            id: 'fallback-3',
            concept_name: 'Lean Manufacturing',
            topic: 'Operations',
            question: "What does 'waste' (muda) mean in Lean Manufacturing?",
            explanation: "Any activity that does not add value from the customer's perspective is considered waste.",
            bloom_level: 1,
            source_snippet: "Lean principles focus on minimizing waste (muda) without sacrificing productivity."
          },
          {
            id: 'fallback-4',
            concept_name: 'Six Sigma',
            topic: 'Operations',
            question: "What is the primary goal of Six Sigma?",
            explanation: "To improve process quality by identifying and removing causes of defects and minimizing variability.",
            bloom_level: 1,
            source_snippet: "Six Sigma seeks to improve the quality of the output of a process by identifying and removing..."
          },
          {
            id: 'fallback-5',
            concept_name: 'Operations Management',
            topic: 'Operations',
            question: "What is the core focus of operations management?",
            explanation: "Designing, controlling, and redesigning the production processes for goods and services.",
            bloom_level: 1,
            source_snippet: "Operations Management is an area of management concerned with designing and controlling..."
           }
        ];
        
        // Also populate dummy concepts for the fallback
        if (conceptsUsed.length === 0) {
            conceptsUsed = [
                { name: "Supply Chain Management", topic: "Operations", bloom_mastery: 1, mastery_score: 0 },
                { name: "Just-in-Time (JIT)", topic: "Operations", bloom_mastery: 1, mastery_score: 0 }
            ];
        }
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
