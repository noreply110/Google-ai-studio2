/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Play, SkipForward, RotateCcw, AlertTriangle, ShieldCheck, Database, HelpCircle } from "lucide-react";
import { AssemblyInstruction, RegisterState, FlagState, StackSlot } from "../types";

interface CpuEmulatorProps {
  instructions: AssemblyInstruction[];
  symbols: { name: string; address: number; size: number }[];
  userInput?: string;
  onSuccess?: (flag: string) => void;
  challengeId: string;
}

const DEFAULT_REGISTERS: RegisterState = {
  EAX: 0,
  EBX: 0,
  ECX: 0,
  EDX: 0,
  ESI: 0x08049520, // encrypted payload address
  EDI: 0x08049530, // output buffer address
  ESP: 0xBF8000A0, // top of the stack
  EBP: 0xBF8000C0, // base pointer
  EIP: 0x08048400, // starting entry instruction pointer
};

const DEFAULT_FLAGS: FlagState = {
  ZF: false,
  CF: false,
  SF: false
};

export default function CpuEmulator({
  instructions,
  symbols,
  userInput = "",
  onSuccess,
  challengeId
}: CpuEmulatorProps) {
  const [registers, setRegisters] = useState<RegisterState>({ ...DEFAULT_REGISTERS });
  const [flags, setFlags] = useState<FlagState>({ ...DEFAULT_FLAGS });
  const [currentIpIndex, setCurrentIpIndex] = useState(0);
  const [stack, setStack] = useState<StackSlot[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [decryptedFlag, setDecryptedFlag] = useState<string | null>(null);

  // Initialize Stack slots based on EBP/ESP layout and challenge parameters
  const initStack = () => {
    const defaultStack: StackSlot[] = [];
    const baseAddr = 0xBF800090;

    if (challengeId === "stack_overflow") {
      // Stack representation showing Buffer[16], padding, Saved EBP, and Saved EIP
      // Offset -16 to EBP is the local buffer space
      for (let i = 0; i < 12; i++) {
        const offset = i * 4;
        const addr = baseAddr + offset;
        let value = "00000000";
        let ascii = "....";
        let label = "Unallocated Mem";
        let isOverwritten = false;
        let isReturnAddress = false;

        if (addr >= 0xBF800090 && addr <= 0xBF8000A0) {
          label = `buffer[${(addr - 0xBF800090)}]`;
          value = "00000000";
          // If user provided long string, simulate overwrite
          if (userInput.length > 0) {
            const chunkIndex = (addr - 0xBF800090);
            const chunk = userInput.substring(chunkIndex, chunkIndex + 4);
            if (chunk) {
              value = Array.from(chunk).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').padEnd(8, '0');
              ascii = chunk.padEnd(4, '.');
              isOverwritten = true;
            }
          }
        } else if (addr === 0xBF8000AC) {
          label = "Saved EBP (Frame Pointer)";
          if (userInput.length > 16) {
            value = "41414141"; // 'AAAA'
            ascii = "AAAA";
            isOverwritten = true;
          } else {
            value = "BF8000C0";
            ascii = "....";
          }
        } else if (addr === 0xBF8000B0) {
          label = "Saved EIP (Return Address)";
          isReturnAddress = true;
          // Check for exploit success
          // Address of win() is 0x080485a0
          // User needs input of exactly 20 character length (16 buffer + 4 saved EBP) + 4 bytes return address "A0850408" (in little-endian, or just matching 0x080485a0)
          if (userInput.length > 20) {
            const eipBytes = userInput.substring(20, 24);
            // Let's allow either actual address characters or simple string check "win!" or "0x080485a0"
            if (userInput.includes("0x080485a0") || userInput.includes("\xa0\x85\x04\x08") || userInput.length >= 24) {
              value = "080485A0";
              ascii = "win!";
              isOverwritten = true;
            } else {
              value = "41414141";
              ascii = "AAAA";
              isOverwritten = true;
            }
          } else {
            value = "08048508"; // default ret pointer to main+8
            ascii = "....";
          }
        }

        defaultStack.push({
          address: addr,
          value: value,
          ascii: ascii,
          label: label,
          isOverwritten: isOverwritten,
          isReturnAddress: isReturnAddress
        });
      }
    } else {
      // Normal stacked layout
      defaultStack.push(
        { address: 0xBF8000B4, value: "BF8000C8", ascii: "....", label: "Caller Saved Frame", isOverwritten: false, isReturnAddress: false },
        { address: 0xBF8000B0, value: "080483C0", ascii: "....", label: "Saved EIP (Return)", isOverwritten: false, isReturnAddress: true },
        { address: 0xBF8000AC, value: "BF8000C0", ascii: "....", label: "Saved EBP", isOverwritten: false, isReturnAddress: false },
        { address: 0xBF8000A8, value: "00000000", ascii: "....", label: "Local Variable (i)", isOverwritten: false, isReturnAddress: false },
        { address: 0xBF8000A4, value: "00000000", ascii: "....", label: "Local Buffer[0..3]", isOverwritten: false, isReturnAddress: false }
      );
    }
    setStack(defaultStack);
  };

  const resetEmulator = () => {
    // Determine start EIP based on instructions available
    const startEip = instructions.length > 0 ? instructions[0].address : 0x08048400;
    setRegisters({
      ...DEFAULT_REGISTERS,
      EIP: startEip
    });
    setFlags({ ...DEFAULT_FLAGS });
    setCurrentIpIndex(0);
    setIsDone(false);
    setDecryptedFlag(null);
    initStack();
    setLogs(["[SYSTEM] CPU Emulator diinisialisasi. Siap untuk dieksekusi."]);
  };

  useEffect(() => {
    resetEmulator();
  }, [instructions, userInput, challengeId]);

  const stepInstruction = () => {
    if (isDone || instructions.length === 0 || currentIpIndex >= instructions.length) {
      setLogs(prev => [...prev, "[WARNING] Tidak ada instruksi perakitan berikutnya untuk dieksekusi."]);
      return;
    }

    const instr = instructions[currentIpIndex];
    const newLogs = [...logs];
    const newRegs = { ...registers };
    const newFlags = { ...flags };

    newLogs.push(`[CPU] Executing: 0x${instr.address.toString(16).toUpperCase()} ${instr.hex.toUpperCase().padEnd(10, ' ')} | ${instr.mnemonic} ${instr.operands}`);

    // Simplify instruction execution modeling
    switch (instr.mnemonic) {
      case "push":
        newRegs.ESP -= 4;
        newLogs.push(`[STACK] ESP berkurang menjadi 0x${newRegs.ESP.toString(16).toUpperCase()}. Nilai '${instr.operands}' dimasukkan.`);
        break;
      case "mov":
        // simple register assignments
        if (instr.operands.includes("ebp, esp")) {
          newRegs.EBP = newRegs.ESP;
          newLogs.push(`[REG] EBP disamakan dengan ESP (0x${newRegs.ESP.toString(16).toUpperCase()}) untuk membuat stack frame.`);
        } else if (instr.operands.startsWith("eax, ")) {
          const valStr = instr.operands.split(", ")[1];
          if (valStr.startsWith("[")) {
            newRegs.EAX = 0x1; // mock loaded address value
          } else {
            const intVal = parseInt(valStr);
            if (!isNaN(intVal)) newRegs.EAX = intVal;
          }
        } else if (instr.operands.startsWith("esi, ")) {
          const hexVal = instr.operands.split(", ")[1];
          newRegs.ESI = parseInt(hexVal);
        } else if (instr.operands.startsWith("edi, ")) {
          const hexVal = instr.operands.split(", ")[1];
          newRegs.EDI = parseInt(hexVal);
        } else if (instr.operands.startsWith("ecx, ")) {
          newRegs.ECX = parseInt(instr.operands.split(", ")[1]) || 0;
        }
        break;
      case "sub":
        if (instr.operands.startsWith("esp, ")) {
          const size = parseInt(instr.operands.split(", ")[1]) || 0;
          newRegs.ESP -= size;
          newLogs.push(`[STACK] ESP dialokasikan ${size} byte. ESP baru: 0x${newRegs.ESP.toString(16).toUpperCase()}`);
        }
        break;
      case "test":
        if (instr.operands === "eax, eax") {
          // sets Zero Flag if EAX is 0
          newFlags.ZF = (newRegs.EAX === 0);
          newLogs.push(`[FLAGS] Memeriksa EAX. ZF diset ke ${newFlags.ZF ? "TRUE (EAX=0)" : "FALSE (EAX!=0)"}`);
        }
        break;
      case "cmp":
        // simple comparison simulator
        // if user input fits license key, set ZF
        if (challengeId === "crackme_key") {
          const isCorrect = userInput.trim() === "VALID-KEY-REVERSE-2026";
          newFlags.ZF = isCorrect;
          newLogs.push(`[FLAGS] Membandingkan input pengguna '${userInput}' dengan serial key orisinal. ZF diset ke: ${newFlags.ZF ? "TRUE (Match)" : "FALSE (Mismatch)"}`);
        }
        break;
      case "je":
      case "jz":
        if (newFlags.ZF) {
          newLogs.push(`[BRANCH] Lompatan bersyarat terpenuhi! Melompat ke ${instr.operands}`);
          // Simulate branch target search
          const targetAddr = parseInt(instr.operands.split(" <")[0]);
          const targetIdx = instructions.findIndex(i => i.address === targetAddr);
          if (targetIdx !== -1) {
            newRegs.EIP = targetAddr;
            setRegisters(newRegs);
            setFlags(newFlags);
            setCurrentIpIndex(targetIdx);
            setLogs(newLogs);
            return;
          }
        } else {
          newLogs.push("[BRANCH] Lompatan bersyarat diabaikan (ZF=FALSE). Melanjutkan ke baris berikutnya.");
        }
        break;
      case "jmp":
        const jmpAddr = parseInt(instr.operands.split(" <")[0]);
        newLogs.push(`[BRANCH] Lompatan langsung (JMP) ke 0x${jmpAddr.toString(16).toUpperCase()}`);
        const jmpIdx = instructions.findIndex(i => i.address === jmpAddr);
        if (jmpIdx !== -1) {
          newRegs.EIP = jmpAddr;
          setRegisters(newRegs);
          setFlags(newFlags);
          setCurrentIpIndex(jmpIdx);
          setLogs(newLogs);
          return;
        }
        break;
      case "xor":
        if (instr.operands === "al, 0x5a") {
          // Perform XOR decryption in a simulated visual loop
          const encryptedBytes = [
            0x1E, 0x16, 0x1B, 0x1D, 0x01, 0x00, 0x30, 0x1F, 0x1D, 0x0A, 0x03, 0x30, 0x03, 0x3A, 
            0x36, 0x1B, 0x1D, 0x0A, 0x1E, 0x03, 0x03, 0x3F, 0x30, 0x0F, 0x03, 0x0D, 0x00, 0x02, 0x1E
          ];
          const decChars = encryptedBytes.map(b => String.fromCharCode(b ^ 0x5A)).join('');
          setDecryptedFlag(decChars);
          newLogs.push(`[CRYPTO] Operasi XOR Terdeteksi: byte ^ 0x5A. Payload didekripsi: "${decChars}"`);
          if (onSuccess) onSuccess("FLAG{XOR_DECRYPT_SOLVED_1109}");
        } else if (instr.operands.startsWith("eax, eax")) {
          newRegs.EAX = 0;
          newLogs.push("[REG] Reset EAX menjadi 0.");
        }
        break;
      case "call":
        if (instr.operands.includes("access_granted") || (challengeId === "crackme_key" && userInput === "VALID-KEY-REVERSE-2026")) {
          newLogs.push("[SUCCESS] Validasi License Sukses! FLAG Terbuka!");
          if (onSuccess) onSuccess("FLAG{LICENSE_KEY_FOUND_IN_DECOMPILER_3381}");
          setIsDone(true);
        } else if (instr.operands.includes("access_denied")) {
          newLogs.push("[FAILED] Pengecekan Serial Gagal. Akses ditolak.");
          setIsDone(true);
        } else if (instr.operands.includes("gets")) {
          // Handle stack overflow payload checking
          // if buffer contains more than 20 characters and matches EIP override of 0x080485a0
          newLogs.push(`[gets] Mengisi input: "${userInput}"`);
          if (userInput.length > 20) {
            newLogs.push("[EXPLOIT] Buffer Overflow Terpicu! Stack frame hancur.");
            if (userInput.includes("0x080485a0") || userInput.length >= 24) {
              newLogs.push("[HIJACK] Saved EIP berhasil ditimpa dengan alamat win() [0x080485A0]!");
              newRegs.EIP = 0x080485a0; // jump to win()
              // find index of win() in instructions
              setIsDone(true);
              if (onSuccess) onSuccess("FLAG{STACK_SMASHED_EIP_HIJACK_5849}");
            } else {
              newLogs.push("[CRASH] Segmentasi Fault! EIP dialihkan ke alamat sampah (0x41414141). Program crash.");
              setIsDone(true);
            }
          }
        }
        break;
      case "ret":
        // simulated return pop
        newLogs.push("[RET] Pop Return address dari Stack ke register EIP.");
        if (challengeId === "stack_overflow" && userInput.length > 20) {
          newLogs.push("[HIJACK] Ret dialihkan ke fungsi eksploitasi rahasia!");
        } else {
          setIsDone(true);
        }
        break;
      default:
        newLogs.push(`[CPU] Instruksi '${instr.mnemonic}' dijalankan.`);
    }

    // Set next instruction pointer
    const nextIdx = currentIpIndex + 1;
    if (nextIdx < instructions.length && !isDone) {
      newRegs.EIP = instructions[nextIdx].address;
      setCurrentIpIndex(nextIdx);
    } else {
      setIsDone(true);
      newLogs.push("[SYSTEM] Eksekusi program berakhir.");
    }

    setRegisters(newRegs);
    setFlags(newFlags);
    setLogs(newLogs);
  };

  const runAllInstructions = () => {
    let limit = 0;
    while (!isDone && limit < 100) {
      stepInstruction();
      limit++;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono text-xs">
      {/* Assembly Listing Pane */}
      <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
            <h4 className="font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              Disassembler Code
            </h4>
            <span className="text-[10px] bg-sky-950 text-sky-400 font-semibold px-2 py-0.5 rounded-full">
              x86 ELF
            </span>
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {instructions.map((instr, idx) => {
              const isActive = idx === currentIpIndex && !isDone;
              return (
                <div
                  key={idx}
                  className={`group p-1.5 rounded flex items-start gap-2 transition-all ${
                    isActive
                      ? "bg-sky-500/10 border-l-2 border-sky-400 text-sky-300 font-bold"
                      : "hover:bg-gray-800/40 text-gray-400"
                  }`}
                >
                  <span className="text-[10px] text-gray-600 select-none min-w-[70px]">
                    0x{instr.address.toString(16).toUpperCase()}
                  </span>
                  <span className="text-amber-500/80 min-w-[50px] font-medium">{instr.hex}</span>
                  <div className="flex-1">
                    <span className={isActive ? "text-sky-300" : "text-gray-200"}>
                      {instr.mnemonic}
                    </span>{" "}
                    <span className="text-gray-300">{instr.operands}</span>
                    <div className="hidden group-hover:block mt-1 text-[10px] text-sky-400/80 leading-relaxed max-w-xs transition">
                      {instr.explanation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-3 border-t border-gray-800 flex gap-2">
          <button
            onClick={stepInstruction}
            disabled={isDone}
            className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg py-2 font-semibold transition"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Step (F7)</span>
          </button>
          <button
            onClick={runAllInstructions}
            disabled={isDone}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg py-2 font-semibold transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run (F9)</span>
          </button>
          <button
            onClick={() => resetEmulator()}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg p-2 transition"
            title="Reset CPU State"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Registers and Stack Pane */}
      <div className="lg:col-span-7 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Registers Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg">
            <h4 className="font-semibold text-gray-200 uppercase mb-3 border-b border-gray-800 pb-2">
              CPU Registers
            </h4>
            <div className="space-y-1.5">
              {Object.entries(registers).map(([reg, val]) => (
                <div key={reg} className="flex justify-between items-center py-0.5 border-b border-gray-800/40">
                  <span className="text-sky-400 font-bold">{reg}</span>
                  <span className="text-gray-300 font-bold">
                    0x{Number(val).toString(16).toUpperCase().padStart(8, "0")}
                  </span>
                </div>
              ))}
            </div>

            {/* Flag status */}
            <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between gap-2">
              <span className="text-gray-400 text-[10px]">Flags:</span>
              <div className="flex gap-3">
                {Object.entries(flags).map(([flag, isActive]) => (
                  <span
                    key={flag}
                    className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                      isActive ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Memory Stack frame simulation */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-gray-200 uppercase mb-3 border-b border-gray-800 pb-2 flex items-center justify-between">
                <span>Stack Memory</span>
                <span className="text-[10px] text-gray-500">ESP → EBP</span>
              </h4>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {stack.map((slot, i) => {
                  let borderStyle = "border-gray-800";
                  let bgStyle = "bg-gray-950/40 text-gray-400";

                  if (slot.isReturnAddress) {
                    borderStyle = "border-rose-500/40";
                    bgStyle = "bg-rose-500/10 text-rose-300";
                  } else if (slot.isOverwritten) {
                    borderStyle = "border-amber-500/40";
                    bgStyle = "bg-amber-500/10 text-amber-300";
                  }

                  return (
                    <div
                      key={i}
                      className={`p-1.5 border rounded flex flex-col gap-0.5 ${borderStyle} ${bgStyle}`}
                      title={slot.label}
                    >
                      <div className="flex justify-between text-[10px]">
                        <span className="text-sky-500 font-semibold">0x{slot.address.toString(16).toUpperCase()}</span>
                        <span className="text-gray-500 italic">{slot.label}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>{slot.value}</span>
                        <span className="text-gray-500">"{slot.ascii}"</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {challengeId === "stack_overflow" && (
              <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] rounded-lg leading-relaxed flex gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>
                  Kapasitas buffer lokal adalah 16 byte. Tulis minimal 24 karakter (20 byte buffer + Saved EBP) diikuti alamat target 0x080485a0 untuk membelokkan alur eksekusi EIP!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Output Console / Logs logs */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 shadow-lg">
          <h4 className="font-semibold text-gray-300 uppercase mb-2 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            CONSOLE OUTPUT & LOGS
          </h4>
          <div className="bg-gray-900 border border-gray-950 rounded p-3 h-32 overflow-y-auto space-y-1 text-gray-300">
            {logs.map((log, i) => {
              let color = "text-gray-300";
              if (log.startsWith("[SYSTEM]")) color = "text-sky-400 font-semibold";
              if (log.startsWith("[SUCCESS]")) color = "text-emerald-400 font-bold bg-emerald-950/20 px-1 rounded";
              if (log.startsWith("[FAILED]")) color = "text-rose-400 font-bold bg-rose-950/20 px-1 rounded";
              if (log.startsWith("[EXPLOIT]")) color = "text-amber-400 font-bold animate-pulse";
              if (log.startsWith("[CRASH]")) color = "text-rose-500 font-bold uppercase";

              return (
                <div key={i} className={color}>
                  {log}
                </div>
              );
            })}
          </div>

          {decryptedFlag && (
            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Payload Berhasil Didekripsi:</span>
              </div>
              <div className="text-sm font-bold tracking-wider select-all mt-1 bg-gray-900 px-2 py-1 rounded inline-block">
                {decryptedFlag}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
