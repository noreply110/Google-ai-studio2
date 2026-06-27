/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Shield, Check, RotateCcw, HelpCircle, Save } from "lucide-react";

interface HexEditorProps {
  initialHex: string;
  onPatchApplied?: (patchedHex: string, patchAddress: number, originalByte: string, newByte: string) => void;
  patchableRanges?: { start: number; end: number; description: string }[];
  onReset?: () => void;
}

export default function HexEditor({
  initialHex,
  onPatchApplied,
  patchableRanges = [],
  onReset
}: HexEditorProps) {
  const [hexString, setHexString] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [patchedPositions, setPatchedPositions] = useState<{ [index: number]: { original: string; patched: string } }>({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  useEffect(() => {
    setHexString(initialHex);
    setPatchedPositions({});
    setEditingIndex(null);
    setMessage(null);
  }, [initialHex]);

  // Convert hex string into array of byte strings (2 characters each)
  const bytes: string[] = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(hexString.substring(i, i + 2));
  }

  const handleByteClick = (index: number) => {
    // Check if index is in a patchable range or highlight
    const isPatchable = patchableRanges.some(
      (range) => index >= range.start && index <= range.end
    );

    if (!isPatchable && patchableRanges.length > 0) {
      setMessage({
        text: "Byte ini bukan bagian dari instruksi penentu keputusan / validasi. Silakan cari byte instruksi 'je' (74 0A) yang bisa di-patch!",
        type: "info"
      });
    }

    setEditingIndex(index);
    setEditValue(bytes[index]);
  };

  const handleSaveByte = () => {
    if (editingIndex === null) return;

    // Validate if it is correct 2-character hex
    const hexPattern = /^[0-9A-Fa-f]{2}$/;
    if (!hexPattern.test(editValue)) {
      setMessage({
        text: "Nilai byte tidak valid! Masukkan 2 karakter heksadesimal (0-9, A-F).",
        type: "error"
      });
      return;
    }

    const originalByte = bytes[editingIndex];
    const newByte = editValue.toUpperCase();

    if (originalByte === newByte) {
      setEditingIndex(null);
      return;
    }

    // Apply the patch locally
    const updatedBytes = [...bytes];
    updatedBytes[editingIndex] = newByte;
    const newHexString = updatedBytes.join("");
    setHexString(newHexString);

    // Save history
    setPatchedPositions({
      ...patchedPositions,
      [editingIndex]: { original: originalByte, patched: newByte }
    });

    setEditingIndex(null);
    setMessage({
      text: `Berhasil mengubah byte di offset 0x${editingIndex.toString(16).toUpperCase()} dari ${originalByte} menjadi ${newByte}!`,
      type: "success"
    });

    if (onPatchApplied) {
      onPatchApplied(newHexString, editingIndex, originalByte, newByte);
    }
  };

  const handleReset = () => {
    setHexString(initialHex);
    setPatchedPositions({});
    setEditingIndex(null);
    setMessage({
      text: "Binary dipulihkan ke versi orisinal.",
      type: "info"
    });
    if (onReset) onReset();
  };

  // Convert byte to printable ASCII representation
  const byteToChar = (byteStr: string): string => {
    const code = parseInt(byteStr, 16);
    if (code >= 32 && code <= 126) {
      return String.fromCharCode(code);
    }
    return ".";
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Hex Header Toolbar */}
      <div className="bg-gray-800/80 px-4 py-3 border-b border-gray-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-gray-200">INTERACTIVE HEX EDITOR</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-gray-200 rounded-lg transition"
            title="Reset Binary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Binary</span>
          </button>
        </div>
      </div>

      {/* Description / Instructions */}
      <div className="p-4 bg-gray-950/40 border-b border-gray-800/80 text-gray-400 leading-relaxed text-[11px]">
        <div className="flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-gray-300 font-medium mb-1">Cara Melakukan Binary Patching:</p>
            <p>1. Cari byte instruksi lompatan bersyarat <span className="text-amber-400">74 (JE - Jump if Equal)</span>.</p>
            <p>2. Klik byte tersebut di bawah ini, ubah menjadi <span className="text-emerald-400">EB (JMP - Unconditional Jump)</span> atau <span className="text-emerald-400">75 (JNE)</span>.</p>
            <p>3. Tekan Simpan untuk menyuntikkan instruksi baru ke dalam memori aplikasi!</p>
          </div>
        </div>

        {/* Patchable Guides */}
        {patchableRanges.length > 0 && (
          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg">
            <strong>Petunjuk Lokasi Patch:</strong>{" "}
            {patchableRanges.map((r, i) => (
              <span key={i}>{r.description}</span>
            ))}
          </div>
        )}
      </div>

      {/* Hex Panel Grid */}
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[580px] grid grid-cols-[80px_1fr_160px] gap-4">
          {/* Offset Header */}
          <div className="text-gray-500 border-b border-gray-800 pb-1 font-semibold">Address</div>
          <div className="text-gray-500 border-b border-gray-800 pb-1 font-semibold">
            00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F
          </div>
          <div className="text-gray-500 border-b border-gray-800 pb-1 font-semibold">ASCII Preview</div>

          {/* Hex bytes renderer */}
          {Array.from({ length: Math.ceil(bytes.length / 16) }).map((_, rowIndex) => {
            const startIdx = rowIndex * 16;
            const rowBytes = bytes.slice(startIdx, startIdx + 16);
            const addressStr = (startIdx).toString(16).padStart(8, "0").toUpperCase();

            return (
              <React.Fragment key={rowIndex}>
                {/* Address column */}
                <div className="text-sky-500/80 font-semibold py-1">0x{addressStr}</div>

                {/* Bytes column */}
                <div className="flex flex-wrap gap-x-1.5 py-1">
                  {rowBytes.map((byte, idx) => {
                    const globalIdx = startIdx + idx;
                    const isPatched = patchedPositions[globalIdx] !== undefined;
                    const isEditing = editingIndex === globalIdx;
                    const isPatchableRange = patchableRanges.some(
                      (range) => globalIdx >= range.start && globalIdx <= range.end
                    );

                    let bgClass = "hover:bg-gray-800 text-gray-300";
                    let borderClass = "border border-transparent";

                    if (isPatched) {
                      bgClass = "bg-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/30";
                      borderClass = "border border-emerald-500/30";
                    } else if (isPatchableRange) {
                      bgClass = "bg-amber-500/10 text-amber-300 font-medium hover:bg-amber-500/20";
                      borderClass = "border border-dashed border-amber-500/30";
                    }

                    if (isEditing) {
                      bgClass = "bg-sky-500/30 text-sky-300 font-bold";
                      borderClass = "border border-sky-400";
                    }

                    return (
                      <span
                        key={idx}
                        id={`hex-byte-${globalIdx}`}
                        onClick={() => handleByteClick(globalIdx)}
                        className={`inline-block w-6 text-center cursor-pointer rounded transition py-0.5 ${bgClass} ${borderClass}`}
                        title={`Offset: 0x${globalIdx.toString(16).toUpperCase()} (${globalIdx})`}
                      >
                        {byte}
                      </span>
                    );
                  })}
                </div>

                {/* ASCII Column */}
                <div className="text-gray-400 tracking-wider py-1 border-l border-gray-800/80 pl-3">
                  {rowBytes.map((byte, idx) => {
                    const globalIdx = startIdx + idx;
                    const isPatched = patchedPositions[globalIdx] !== undefined;
                    return (
                      <span
                        key={idx}
                        className={isPatched ? "text-emerald-400 font-bold" : "text-gray-400"}
                      >
                        {byteToChar(byte)}
                      </span>
                    );
                  })}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Editing dialog footer */}
      {editingIndex !== null && (
        <div className="bg-gray-950 p-3 border-t border-gray-800 flex items-center justify-between gap-3">
          <div className="text-gray-300">
            Edit byte di offset{" "}
            <span className="text-sky-400 font-semibold">
              0x{editingIndex.toString(16).toUpperCase()}
            </span>
            :
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={2}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-12 bg-gray-800 border border-gray-700 text-center text-sky-400 rounded px-2 py-1 font-bold focus:outline-none focus:border-sky-500"
              placeholder="FF"
              onKeyDown={(e) => e.key === "Enter" && handleSaveByte()}
              autoFocus
            />
            <button
              onClick={handleSaveByte}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded px-3 py-1 font-semibold transition shadow-md shadow-emerald-950/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
            <button
              onClick={() => setEditingIndex(null)}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-3 py-1 transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div
          className={`px-4 py-2.5 flex items-center justify-between border-t border-gray-800 font-sans ${
            message.type === "success"
              ? "bg-emerald-950/20 text-emerald-400"
              : message.type === "error"
              ? "bg-rose-950/20 text-rose-400"
              : "bg-sky-950/20 text-sky-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" && <Check className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-500 hover:text-gray-400 text-sm font-semibold ml-2"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
