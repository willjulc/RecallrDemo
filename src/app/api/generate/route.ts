import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const promptConstraint = "You are a rigorous academic study assistant. Your task is to create high-quality, multiple-choice flashcards strictly based on the provided text.\nCRITICAL CONSTRAINTS:\n1. ONLY use the provided text. Never introduce outside knowledge.\n2. Formulate questions that test comprehension.\n3. Provide exactly 3 options.\n4. Ensure the correct_answer is exactly one of the options.";

export async function POST() {
  try {
    // Sample random chunks directly from SQLite — no embedding needed for generation
    const chunks = db.prepare(
      "SELECT * FROM chunks ORDER BY RANDOM() LIMIT 5"
    ).all() as { id: number; document_id: string; page_number: number; content: string }[];
    
    if (chunks.length === 0) {
      return NextResponse.json({ error: "No documents ingested into library yet." }, { status: 400 });
    }
    
    console.log(`Generating flashcards from ${chunks.length} randomly sampled chunks...`);
    
    const generatedFlashcards: Record<string, unknown>[] = [];
    
    for (const chunk of chunks) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptConstraint + "\n\nSOURCE TEXT (Page " + chunk.page_number + "):\n" + chunk.content,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correct_answer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correct_answer", "explanation"]
            }
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) continue;

      try {
        const cards = JSON.parse(textOutput);
        
        const stmt = db.prepare(
          "INSERT INTO flashcards (id, document_id, page_number, source_snippet, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        const insertMany = db.transaction((cardsToInsert: Record<string, unknown>[]) => {
          for (const card of cardsToInsert) {
            const id = crypto.randomUUID();
            stmt.run(
              id,
              chunk.document_id,
              chunk.page_number,
              chunk.content,
              card.question,
              JSON.stringify(card.options),
              card.correct_answer,
              card.explanation
            );
            generatedFlashcards.push({
              id,
              document_id: chunk.document_id,
              page_number: chunk.page_number,
              source_snippet: chunk.content,
              question: card.question,
              options: card.options,
              correct_answer: card.correct_answer,
              explanation: card.explanation
            });
          }
        });
        
        insertMany(cards);
      } catch (parseError) {
        console.error("Error parsing Gemini JSON output:", parseError);
      }
    }

    return NextResponse.json({ success: true, flashcards: generatedFlashcards });
    
  } catch (error: unknown) {
    console.error("Failed to generate bulk flashcards:", error);
    return NextResponse.json({ error: "Failed to generate study deck" }, { status: 500 });
  }
}
