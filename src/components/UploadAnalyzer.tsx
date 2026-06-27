/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Upload, FileCode, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";

interface UploadAnalyzerProps {
  onAnalyzeComplete: (report: {
    fileName: string;
    fileSize: number;
    fileType: string;
    hexSnippet: string;
    strings: string[];
    analysis: string;
  }) => void;
}

export default function UploadAnalyzer({ onAnalyzeComplete }: UploadAnalyzerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: number } | null>(null);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileDetails({ name: file.name, size: file.size });

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          throw new Error("Gagal membaca berkas.");
        }

        const uint8Array = new Uint8Array(arrayBuffer);
        
        // 1. Generate Hex representation (Limit to first 512 bytes for snippet preview)
        const hexParts: string[] = [];
        const previewLimit = Math.min(uint8Array.length, 512);
        for (let i = 0; i < previewLimit; i++) {
          hexParts.push(uint8Array[i].toString(16).padStart(2, "0").toUpperCase());
        }
        const hexSnippet = hexParts.join("");

        // 2. Extract printable strings (length >= 4 characters)
        const strings: string[] = [];
        let currentString = "";
        for (let i = 0; i < uint8Array.length && strings.length < 50; i++) {
          const char = uint8Array[i];
          if (char >= 32 && char <= 126) {
            currentString += String.fromCharCode(char);
          } else {
            if (currentString.length >= 4) {
              strings.push(currentString);
            }
            currentString = "";
          }
        }
        if (currentString.length >= 4) {
          strings.push(currentString);
        }

        // Determine magic bytes headers
        let fileType = "Unknown Binary (Custom)";
        if (uint8Array[0] === 0x7F && uint8Array[1] === 0x45 && uint8Array[2] === 0x4C && uint8Array[3] === 0x46) {
          fileType = "ELF Executable (Linux Binary)";
        } else if (uint8Array[0] === 0x4D && uint8Array[1] === 0x5A) {
          fileType = "Portable Executable (PE Windows EXE)";
        } else if (uint8Array[0] === 0xCA && uint8Array[1] === 0xFE && uint8Array[2] === 0xBA && uint8Array[3] === 0xBE) {
          fileType = "Java Class / Mach-O Binary (macOS)";
        } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
          fileType = "PNG Image File";
        }

        // Send to backend for Gemini AI advanced static analysis
        const response = await fetch("/api/analyze-binary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileType,
            hexSnippet,
            strings
          })
        });

        const data = await response.json();
        if (response.ok) {
          onAnalyzeComplete({
            fileName: file.name,
            fileSize: file.size,
            fileType,
            hexSnippet,
            strings,
            analysis: data.analysis
          });
        } else {
          throw new Error(data.error || "Gagal melakukan analisis Gemini.");
        }
      };

      reader.onerror = () => {
        throw new Error("Gagal membaca biner dari sistem.");
      };

      // Read as ArrayBuffer for binary parsing
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat memproses berkas.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl p-6 font-sans">
      <div className="flex items-center gap-3 mb-4">
        <FileCode className="w-5 h-5 text-sky-400" />
        <div>
          <h3 className="font-bold text-gray-200 text-sm">UPLOAD CUSTOM BINARY</h3>
          <p className="text-gray-500 text-xs">Unggah berkas biner (EXE, ELF, DLL, BIN) milik Anda untuk dianalisis oleh AI.</p>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition flex flex-col items-center justify-center cursor-pointer min-h-[200px] ${
          isDragging
            ? "border-sky-500 bg-sky-950/20 text-sky-300"
            : "border-gray-800 hover:border-gray-700 bg-gray-950/20 text-gray-400"
        }`}
        onClick={() => document.getElementById("binary-file-upload")?.click()}
      >
        <input
          id="binary-file-upload"
          type="file"
          className="hidden"
          onChange={handleFileInput}
          accept="*/*"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
            <p className="text-gray-200 text-sm font-semibold font-mono">
              MEMBACA & MENGANALISIS STRUKTUR BINER...
            </p>
            <p className="text-gray-500 text-xs">
              Mengekstrak strings, parsing magic headers, dan mengirimkan query static reversing ke Gemini API...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-8 h-8 text-sky-500 mx-auto opacity-70" />
            <div>
              <p className="text-gray-200 text-sm font-semibold">
                Drag & Drop file biner di sini, atau <span className="text-sky-400 underline">pilih dari sistem</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Mendukung file ELF, Portable Executable (EXE), Java Class, ZIP, atau file biner custom lainnya
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {fileDetails && !isLoading && !error && (
        <div className="mt-4 p-3 bg-emerald-950/10 border border-emerald-500/10 rounded-lg text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-mono">{fileDetails.name} ({(fileDetails.size / 1024).toFixed(2)} KB)</span>
          </div>
          <span className="text-[10px] bg-emerald-950/50 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
            Berhasil Diparsing
          </span>
        </div>
      )}
    </div>
  );
}
