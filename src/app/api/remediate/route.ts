import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cardId } = body;

    if (!cardId) {
      return NextResponse.json({ error: "Missing cardId" }, { status: 400 });
    }

    // Retrieve the specific card to get the constraints and context
    const flashcard = db.prepare("SELECT * FROM flashcards WHERE id = ?").get(cardId) as Record<string, string>;
    
    if (!flashcard) {
      return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });
    }

    // Real-time Gemini call asking to explain the concept pulling only from source
    const prompt = `
You are a tutor explaining why an answer is correct based strictly on the provided source material.
The user got the flashcard wrong. Explain the core concept so they immediately understand it.
CRITICAL CONSTRAINT: Pull only from the specific cited source text. Do not hallucinate or use external knowledge.

SOURCE TEXT:
"${flashcard.source_snippet}"

FLASHCARD QUESTION:
"${flashcard.question}"

CORRECT ANSWER:
"${flashcard.correct_answer}"

Provide a concise, engaging summary (max 3 sentences) of why the correct answer is true based on the text.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    return NextResponse.json({ 
      success: true, 
      explanation: response.text 
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("Remediation error:", error);
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }
}
