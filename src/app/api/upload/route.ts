import { NextRequest, NextResponse } from "next/server";
import { extractAndChunkPdf } from "@/lib/pdfProcessing";
import { supabase } from "@/lib/supabase";
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

    // Store document metadata
    await supabase
      .from("documents")
      .insert({ id: documentId, name: file.name });

    // Extract and chunk text
    const chunks = await extractAndChunkPdf(buffer);
    console.log(`Extracted ${chunks.length} chunks from ${file.name}`);

    // Store raw text chunks
    await supabase.from("chunks").insert(
      chunks.map((chunk) => ({
        document_id: documentId,
        page_number: chunk.pageNumber,
        content: chunk.content,
      }))
    );

    console.log(`Stored ${chunks.length} pending chunks for ${file.name}. Ready for background processing.`);

    return NextResponse.json({
      success: true,
      documentId,
      message: "Document parsed and queued for background processing",
      chunksCount: chunks.length,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Upload process failed:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to process PDF" }, { status: 500 });
  }
}
