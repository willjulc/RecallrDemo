import * as lancedb from "@lancedb/lancedb";
import { GoogleGenAI } from "@google/genai";
import { DocumentChunk } from "./pdfProcessing";

const DB_PATH = process.env.VECTOR_STORE_PATH || "./.vector_cache";

// Initialize Gemini SDK securely on the server
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function embedWithRetry(text: string, maxRetries = 5): Promise<number[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
      });
      if (!res.embeddings || !res.embeddings[0].values) {
        throw new Error("Failed to get embedding from Gemini API");
      }
      return res.embeddings[0].values;
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      const msg = error.message || "";
      const isRateLimit = error.status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
      if (isRateLimit && attempt < maxRetries - 1) {
        // Start at 15s and double: 15s, 30s, 60s, 60s
        const waitMs = Math.min(15000 * Math.pow(2, attempt), 60000);
        console.log(`Rate limited. Waiting ${waitMs / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Exceeded max retries for embedding API");
}

export async function storeDocumentEmbeddings(chunks: DocumentChunk[], documentId: string) {
  const db = await lancedb.connect(DB_PATH);
  
  const embeddings: number[][] = [];
  
  // Process ONE chunk at a time with a delay to stay safely under the 100 RPM free tier limit
  // 700ms per chunk ≈ ~85 calls/min, with headroom for retries
  const DELAY_BETWEEN_CHUNKS_MS = 700;
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Embedding chunk ${i + 1}/${chunks.length} for doc ${documentId}`);
    const embedding = await embedWithRetry(chunks[i].content);
    embeddings.push(embedding);
    
    // Delay between each call to avoid rate limits
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_CHUNKS_MS));
    }
  }

  // Construct our record shape
  const data = chunks.map((chunk, i) => ({
    vector: embeddings[i],
    documentId,
    pageNumber: chunk.pageNumber,
    content: chunk.content
  }));

  // Create or append to a LanceDB table
  const tableNames = await db.tableNames();
  let table;
  if (tableNames.includes("document_chunks")) {
    table = await db.openTable("document_chunks");
    await table.add(data);
  } else {
    table = await db.createTable("document_chunks", data);
  }

  return table;
}
