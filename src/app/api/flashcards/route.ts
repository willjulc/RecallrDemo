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
      // Pull all flashcards for global study randomly
      flashcards = db.prepare("SELECT * FROM flashcards ORDER BY RANDOM() LIMIT 20").all() as Record<string, unknown>[];
    } else {
      flashcards = db.prepare("SELECT * FROM flashcards WHERE document_id = ?").all(documentId) as Record<string, unknown>[];
    }
    
    // Parse options array natively for frontend convenience
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
