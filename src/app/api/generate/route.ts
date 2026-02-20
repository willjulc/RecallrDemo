import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { seedDemoDatabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Ensure demo data exists
    await seedDemoDatabase();

    const body = await req.json().catch(() => ({}));
    const targetConceptId = body.conceptId || null;

    let selectedFlashcards: Record<string, unknown>[] = [];
    let conceptsUsed: Record<string, unknown>[] = [];

    if (targetConceptId) {
      const { data: targetConcept } = await supabase
        .from("concepts")
        .select("*")
        .eq("id", targetConceptId)
        .single();

      if (!targetConcept) {
        return NextResponse.json({ error: "Target concept not found" }, { status: 404 });
      }

      const { data: flashcards } = await supabase
        .from("flashcards")
        .select("*, concepts!inner(name, topic)")
        .eq("concept_id", targetConceptId)
        .limit(5);

      if (flashcards) {
        selectedFlashcards = flashcards.map(f => ({
          ...f,
          concept_name: (f.concepts as Record<string, unknown>)?.name,
          topic: (f.concepts as Record<string, unknown>)?.topic,
          concepts: undefined,
        }));
      }

      conceptsUsed.push(targetConcept);

    } else {
      const { data: priorityConcepts } = await supabase
        .from("concepts")
        .select("*")
        .order("mastery_score", { ascending: true })
        .order("last_reviewed", { ascending: true, nullsFirst: true })
        .limit(5);

      if (priorityConcepts && priorityConcepts.length > 0) {
        const conceptIds = priorityConcepts.map(c => c.id);
        conceptsUsed = priorityConcepts;

        const { data: flashcards } = await supabase
          .from("flashcards")
          .select("*, concepts!inner(name, topic, bloom_mastery)")
          .in("concept_id", conceptIds)
          .limit(10);

        if (flashcards) {
          selectedFlashcards = flashcards
            .filter(f => f.bloom_level <= ((f.concepts as Record<string, unknown>)?.bloom_mastery as number ?? 99))
            .map(f => ({
              ...f,
              concept_name: (f.concepts as Record<string, unknown>)?.name,
              topic: (f.concepts as Record<string, unknown>)?.topic,
              concepts: undefined,
            }));
        }
      }
    }

    if (selectedFlashcards.length === 0) {
      return NextResponse.json({
        error: "We are still building your venture and generating questions in the background. Please wait a moment and try again!"
      }, { status: 400 });
    }

    const shuffled = selectedFlashcards.sort(() => 0.5 - Math.random()).slice(0, 10);

    return NextResponse.json({
      success: true,
      flashcards: shuffled,
      targetedConcept: targetConceptId || null,
      conceptsUsed: conceptsUsed.map((c: Record<string, unknown>) => ({
        name: c.name,
        topic: c.topic,
        bloom_level: c.bloom_mastery,
        mastery: c.mastery_score,
      })),
    });

  } catch (error: unknown) {
    console.error("Failed to fetch study deck:", error);
    return NextResponse.json({ error: "Failed to fetch study deck" }, { status: 500 });
  }
}
