import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cardId } = body;

    if (!cardId) {
      return NextResponse.json({ error: "Missing cardId" }, { status: 400 });
    }

    const { data: flashcard } = await supabase
      .from("flashcards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (!flashcard) {
      return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });
    }

    const prompt = `
You are a tutor explaining why an answer is correct based strictly on the provided source material.
The user got the flashcard wrong. Explain the core concept so they immediately understand it.
CRITICAL CONSTRAINT: Pull only from the specific cited source text. Do not hallucinate or use external knowledge.

SOURCE TEXT:
"${flashcard.source_snippet}"

FLASHCARD QUESTION:
"${flashcard.question}"

CORRECT ANSWER:
"${flashcard.explanation}"

Provide a concise, engaging summary (max 3 sentences) of why the correct answer is true based on the text.
`;

    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({
      success: true,
      explanation: response.text,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("Remediation error:", error);
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }
}
