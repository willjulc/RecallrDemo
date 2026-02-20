"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function UploadDropzone() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [ingestionComplete, setIngestionComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateFiles = (selectedFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.type !== "application/pdf") {
        setError(`File ${file.name} is not a valid PDF.`);
        return [];
      }
      if (file.size > 50 * 1024 * 1024) {
        setError(`File ${file.name} exceeds the 50MB size limit.`);
        return [];
      }
      validFiles.push(file);
    }
    setError(null);
    return validFiles;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const validFiles = validateFiles(e.dataTransfer.files);
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = validateFiles(e.target.files);
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    if (files.length === 1) {
      setIngestionComplete(false);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: files.length });
    
    try {
        let totalChunks = 0;
        for (let i = 0; i < files.length; i++) {
          setUploadProgress(prev => ({ ...prev, current: i + 1 }));
          const formData = new FormData();
          formData.append("file", files[i]);
  
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          
          let data;
          const textResponse = await response.text();
          try {
            data = JSON.parse(textResponse);
          } catch {
            throw new Error(`Server returned an error: ${textResponse.substring(0, 50)}...`);
          }
          
          if (!response.ok) {
            throw new Error(data?.error || `Upload failed for ${files[i].name}`);
          }
          if (data?.chunksCount) {
             totalChunks += data.chunksCount;
          }
        }
        
        setIsUploading(false);
        setIngestionComplete(true);
      } catch (err: unknown) {
        setError((err as Error).message);
        setIsUploading(false);
      }
    };
  
    // Poll the process queue in the background once parsing is complete
    useEffect(() => {
        if (!ingestionComplete) return;

        const interval = setInterval(async () => {
             try {
                 const res = await fetch("/api/process-queue", { method: "POST" });
                 const data = await res.json();
                 if (data.status === "idle") {
                     // Queue is empty for now
                 } else if (data.status === "processed") {
                     console.log(`[Queue] Processed chunk ${data.chunkId}, extracted ${data.conceptsExtracted} concepts.`);
                 } else if (data.status === "generated") {
                     console.log(`[Queue] Generated ${data.cardsGenerated} flashcards for concept ${data.conceptId}.`);
                 }
             } catch (e) {
                 console.error("Background queue polling error:", e);
             }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [ingestionComplete]);

    const handleGenerateDeck = () => {
      router.push('/study/library');
    };
  
    return (
      <div className="w-full max-w-xl mx-auto mt-4 relative">
        <input 
          type="file" 
          accept="application/pdf"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        
        {files.length === 0 ? (
          <div className="w-full flex flex-col gap-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              w-full h-64 rounded-[var(--r-2xl)] p-[var(--sp8)] flex flex-col items-center justify-center cursor-pointer
              transition-all duration-[var(--dur-base)] border-[1.5px] border-dashed
              ${isDragging 
                ? "border-[var(--amber-500)] bg-[var(--chip-amber-bg)] scale-[1.02] shadow-[var(--sh-glow-amber)]" 
                : "border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:border-[var(--violet-400)] hover:bg-[var(--chip-violet-bg)]"
              }
            `}
          >
            <div className={`w-16 h-16 rounded-[var(--r-md)] flex items-center justify-center mb-[var(--sp4)] transition-colors text-3xl ${isDragging ? "bg-[var(--amber-500)]" : "bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-sm"}`}>
              📄
            </div>
            <h3 className="type-heading-md mb-[var(--sp1)] mt-[var(--sp2)]">
              Upload Course Materials
            </h3>
            <p className="type-body text-[var(--text-sm)] text-center text-[var(--color-text-muted)] max-w-sm mt-[var(--sp2)]">
              Drag and drop PDFs here, or click to browse. Max 50MB each.
            </p>
          </div>

          <div className="mt-[var(--sp8)] text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <p className="type-mono text-[var(--color-text-muted)] mb-[var(--sp4)] tracking-widest">— OR —</p>
            <button 
                onClick={handleGenerateDeck}
                className="btn btn-launch w-full justify-center py-4 text-lg"
            >
                🚀 Quick Start: Try Demo Course
            </button>
            <p className="type-mono text-[var(--color-text-secondary)] mt-[var(--sp3)] leading-relaxed">
               Instantly try Recallr with a pre-loaded Business Operations course.
            </p>
          </div>
          </div>
        ) : (
          <div className="surface animate-fade-in-up">
            <div className="flex items-center justify-between mb-[var(--sp4)] border-b border-[var(--color-border)] pb-[var(--sp3)]">
              <h3 className="type-heading-md">📚 Document Queue</h3>
              <span className="chip chip-amber">{files.length} Files</span>
            </div>
            
            <div className="space-y-[var(--sp2)] max-h-[280px] overflow-y-auto mb-[var(--sp4)] pr-1">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-[var(--sp3)] bg-[var(--color-surface-sunken)] p-[var(--sp3)] rounded-[var(--r-md)] border border-[var(--color-border)] shadow-sm">
                  <div className="w-10 h-10 rounded-[var(--r-xs)] bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0 text-lg shadow-[var(--sh-sm)] border border-[var(--color-border)]">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="type-body text-[var(--text-sm)] font-[600] truncate">{file.name}</p>
                    <p className="type-mono text-[var(--color-text-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {!isUploading && !ingestionComplete && (
                    <button 
                      onClick={() => removeFile(idx)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--rose-500)] transition-colors p-1 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                  {isUploading && uploadProgress.current > idx + 1 && (
                    <span className="text-[var(--lime-500)] text-lg">✅</span>
                  )}
                  {isUploading && uploadProgress.current === idx + 1 && (
                    <span className="text-[var(--amber-400)] animate-spin text-lg">⏳</span>
                  )}
                  {ingestionComplete && <span className="text-[var(--lime-500)] text-lg">✅</span>}
                </div>
              ))}
            </div>
  
            {/* Progress bar during upload */}
            {isUploading && (
              <div className="mb-4">
                <div className="progress-bar-track">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <p className="type-mono text-xs text-center mt-2">
                  📊 Parsing PDF... (Fast)
                </p>
              </div>
            )}
  
            {ingestionComplete ? (
              <div className="flex flex-col gap-4">
                  <div className="toast toast-success w-full max-w-none">
                      <div className="toast-icon bg-[var(--chip-lime-bg)]">▲</div>
                      <div>
                          <div className="toast-title">Documents Ready</div>
                          <div className="toast-body">
                              Your documents are being analyzed. AI-generated study questions will be ready in moments.
                          </div>
                      </div>
                  </div>
                  <button 
                      onClick={handleGenerateDeck}
                      className="btn btn-primary w-full justify-center py-4 text-lg"
                  >
                      🎯 Start Studying
                  </button>
              </div>
            ) : (
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className={`btn w-full justify-center py-4 text-lg ${
                  isUploading 
                    ? "btn-secondary opacity-60 cursor-not-allowed" 
                    : "btn-primary"
                }`}
              >
                {isUploading 
                  ? `⏳ Uploading ${uploadProgress.current} of ${uploadProgress.total}...`
                  : "📥 Upload & Process"
                }
              </button>
            )}
          </div>
        )}
  
        {error && (
          <div className="mt-4 toast toast-alert w-full max-w-none animate-slide-in">
            <div className="toast-icon bg-[var(--chip-rose-bg)]">⚠️</div>
            <div>
              <div className="toast-title">Upload Error</div>
              <div className="toast-body">{error}</div>
            </div>
          </div>
        )}
      </div>
    );
  }
