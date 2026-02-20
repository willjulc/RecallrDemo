import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  try {
    let query = supabase
      .from("flashcards")
      .select("*, concepts(name, topic)");

    if (documentId === "library") {
      query = query.limit(20);
    } else {
      query = query.eq("document_id", documentId);
    }

    const { data: flashcards, error } = await query;

    if (error) throw error;

    const formatted = (flashcards || []).map((fc) => ({
      ...fc,
      concept_name: (fc.concepts as Record<string, unknown>)?.name,
      topic: (fc.concepts as Record<string, unknown>)?.topic,
      concepts: undefined,
    }));

    return NextResponse.json({ flashcards: formatted });
  } catch (error: unknown) {
    console.error("Fetch DB error:", error);
    return NextResponse.json({ error: "Failed to fetch flashcards" }, { status: 500 });
  }
}
