import pdfParse from "pdf-parse";

export interface DocumentChunk {
  pageNumber: number;
  content: string;
}

function render_page(pageData: Record<string, unknown>): Promise<string> {
  const render_options = {
    normalizeWhitespace: false,
    disableCombineTextItems: false
  };

  return (pageData.getTextContent as (opts: typeof render_options) => Promise<Record<string, unknown[]>>)(render_options).then(function(textContent) {
    const text = textContent.items.map((item) => (item as { str: string }).str).join(' ');
    // We add a reliable page separator, pageData.pageNumber or pageData.pageIndex
    const pageNum = (pageData.pageNumber as number) || (pageData.pageIndex as number) + 1 || 1;
    return `\n[PAGE_SEP_${pageNum}]\n${text}`;
  });
}

export async function extractAndChunkPdf(fileBuffer: Buffer | ArrayBuffer): Promise<DocumentChunk[]> {
  const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
  
  const data = await pdfParse(buffer, {
    pagerender: render_page
  });

  const rawText = data.text;
  const pageBlocks = rawText.split(/\[PAGE_SEP_(\d+)\]/g);
  
  const chunks: DocumentChunk[] = [];
  
  for (let i = 1; i < pageBlocks.length; i += 2) {
    const pageNum = parseInt(pageBlocks[i], 10);
    let pageText = pageBlocks[i + 1] || "";
    
    // Clean up excessive whitespace
    pageText = pageText.replace(/\s+/g, " ").trim();
    if (!pageText) continue;

    // Chunking: break by sentences if it's too long
    const sentences = pageText.match(/[^.!?]+[.!?]+/g) || [pageText];
    let currentChunk = "";
    
    for (const sentence of sentences) {
      if ((currentChunk.length + sentence.length) > 800) {
        if (currentChunk.trim()) {
          chunks.push({ pageNumber: pageNum, content: currentChunk.trim() });
        }
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({ pageNumber: pageNum, content: currentChunk.trim() });
    }
  }

  return chunks;
}
