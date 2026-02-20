"use client";

import { useState, useRef } from "react";
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
      }
      
      setIsUploading(false);
      setIngestionComplete(true);
    } catch (err: unknown) {
      setError((err as Error).message);
      setIsUploading(false);
    }
  };

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
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full h-56 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer
            border-2 border-dashed transition-all duration-300
            ${isDragging 
              ? "border-green-500 bg-green-50 scale-[1.02]" 
              : "border-navy-200 bg-surface hover:border-green-400 hover:bg-green-50/50"
            }
          `}
          style={{ boxShadow: '0 4px 0 var(--color-navy-200)' }}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors text-3xl ${isDragging ? "bg-green-100" : "bg-navy-100"}`}>
            📄
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">
            Upload Course Materials
          </h3>
          <p className="text-text-muted text-sm font-semibold text-center max-w-sm">
            Drag and drop PDFs here, or click to browse. Max 50MB each.
          </p>
        </div>
      ) : (
        <div className="surface animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary">📚 Library Queue</h3>
            <span className="chip chip-green font-bold">{files.length} Files</span>
          </div>
          
          <div className="space-y-2 max-h-56 overflow-y-auto mb-4 pr-1">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-navy-50 p-3 rounded-xl border border-navy-200">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 text-lg">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{file.name}</p>
                  <p className="text-xs text-text-muted font-semibold">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {!isUploading && !ingestionComplete && (
                  <button 
                    onClick={() => removeFile(idx)}
                    className="text-text-muted hover:text-coral-500 transition-colors p-1 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
                {isUploading && uploadProgress.current > idx + 1 && (
                  <span className="text-green-500 text-lg">✅</span>
                )}
                {isUploading && uploadProgress.current === idx + 1 && (
                  <span className="text-gold-400 animate-spin text-lg">⏳</span>
                )}
                {ingestionComplete && <span className="text-green-500 text-lg">✅</span>}
              </div>
            ))}
          </div>

          {/* Progress bar during upload */}
          {isUploading && (
            <div className="mb-4">
              <div className="progress-track">
                <div 
                  className="progress-fill"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {ingestionComplete ? (
            <button 
              onClick={handleGenerateDeck}
              className="btn-bounce btn-primary-3d w-full py-4 text-lg"
            >
              🎯 Generate Study Deck
            </button>
          ) : (
            <button 
              onClick={handleUpload}
              disabled={isUploading}
              className={`btn-bounce w-full py-4 text-lg ${
                isUploading 
                  ? "btn-secondary-3d opacity-60 cursor-not-allowed" 
                  : "btn-primary-3d"
              }`}
            >
              {isUploading 
                ? `⏳ Processing ${uploadProgress.current} of ${uploadProgress.total}...`
                : "📥 Ingest Documents"
              }
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-coral-50 border-2 border-coral-200 p-4 rounded-xl flex items-start gap-3 animate-slide-in">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-coral-600 font-bold">{error}</p>
        </div>
      )}
    </div>
  );
}
