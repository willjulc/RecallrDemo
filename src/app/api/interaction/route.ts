import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flashcardId, isCorrect } = body;

    if (!flashcardId || typeof isCorrect !== 'boolean') {
      return NextResponse.json({ error: "Missing or invalid payload" }, { status: 400 });
    }

    db.prepare("INSERT INTO user_interactions (flashcard_id, is_correct) VALUES (?, ?)").run(
      flashcardId,
      isCorrect ? 1 : 0
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Interaction logging error:", error);
    return NextResponse.json({ error: "Failed to log interaction" }, { status: 500 });
  }
}
