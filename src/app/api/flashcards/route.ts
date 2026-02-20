import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  try {
    let flashcards;
    if (documentId === "library") {
      // Pull flashcards with concept data, interleaved
      flashcards = db.prepare(`
        SELECT f.*, c.name as concept_name, c.topic 
        FROM flashcards f
        LEFT JOIN concepts c ON f.concept_id = c.id
        ORDER BY RANDOM() 
        LIMIT 20
      `).all() as Record<string, unknown>[];
    } else {
      flashcards = db.prepare(`
        SELECT f.*, c.name as concept_name, c.topic
        FROM flashcards f
        LEFT JOIN concepts c ON f.concept_id = c.id
        WHERE f.document_id = ?
      `).all(documentId) as Record<string, unknown>[];
    }
    
    const formatted = flashcards.map((fc) => ({
      ...fc,
      options: JSON.parse(fc.options as string)
    }));

    return NextResponse.json({ flashcards: formatted });
  } catch (error: unknown) {
    console.error("Fetch DB error:", error);
    return NextResponse.json({ error: "Failed to fetch flashcards" }, { status: 500 });
  }
}
