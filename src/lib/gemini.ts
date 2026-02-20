import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./db";
import { DocumentChunk } from "./pdfProcessing";
import crypto from "crypto";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const promptConstraint = "You are a rigorous academic study assistant. Your task is to create high-quality, multiple-choice flashcards strictly based on the provided text.\nCRITICAL CONSTRAINTS:\n1. ONLY use the provided text. Never introduce outside knowledge.\n2. Formulate questions that test comprehension.\n3. Provide exactly 3 options.\n4. Ensure the correct_answer is exactly one of the options.";

export async function generateFlashcardsForChunks(chunks: DocumentChunk[], documentId: string) {
  try {
    for (const chunk of chunks) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptConstraint + "\n\nSOURCE TEXT (Page " + chunk.pageNumber + "):\n" + chunk.content,
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
            stmt.run(
              crypto.randomUUID(),
              documentId,
              chunk.pageNumber,
              chunk.content,
              card.question,
              JSON.stringify(card.options),
              card.correct_answer,
              card.explanation
            );
          }
        });
        
        insertMany(cards);
      } catch (parseError) {
        console.error("Error parsing Gemini JSON output:", parseError);
      }
    }
    
    console.log("Finished generating cache of flashcards for document " + documentId);
  } catch (error) {
    console.error("Failed to generate flashcards:", error);
  }
}
