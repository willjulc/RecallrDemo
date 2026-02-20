import { NextRequest, NextResponse } from "next/server";
import { extractAndChunkPdf } from "@/lib/pdfProcessing";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const documentId = crypto.randomUUID();
    
    // Store document metadata in SQLite
    db.prepare("INSERT INTO documents (id, name) VALUES (?, ?)").run(documentId, file.name);
    
    // Extract and chunk text
    const chunks = await extractAndChunkPdf(buffer);
    console.log(`Extracted ${chunks.length} chunks from ${file.name}`);

    // Store raw text chunks in SQLite (fast, no API calls needed)
    const insertChunk = db.prepare(
      "INSERT INTO chunks (document_id, page_number, content) VALUES (?, ?, ?)"
    );
    const insertAll = db.transaction((chunkList: typeof chunks) => {
      for (const chunk of chunkList) {
        insertChunk.run(documentId, chunk.pageNumber, chunk.content);
      }
    });
    insertAll(chunks);
    
    console.log(`Stored ${chunks.length} chunks for ${file.name} in SQLite. Ready for generation.`);

    return NextResponse.json({ 
      success: true, 
      documentId,
      message: "Document parsed and stored successfully",
      chunksCount: chunks.length 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Upload process failed:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to process PDF" }, { status: 500 });
  }
}
