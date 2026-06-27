/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AssemblyInstruction {
  address: number;
  hex: string;
  mnemonic: string;
  operands: string;
  explanation: string;
}

export interface RegisterState {
  EAX: number;
  EBX: number;
  ECX: number;
  EDX: number;
  ESI: number;
  EDI: number;
  ESP: number;
  EBP: number;
  EIP: number;
}

export interface FlagState {
  ZF: boolean;
  CF: boolean;
  SF: boolean;
}

export interface StackSlot {
  address: number;
  value: string; // Hex representation
  ascii: string; // ASCII characters
  label: string; // Description e.g., "buffer[0..3]", "Saved EBP", "Saved EIP"
  isOverwritten: boolean;
  isReturnAddress: boolean;
}

export interface FunctionSymbol {
  name: string;
  address: number;
  size: number;
}

export interface ChallengeBinary {
  id: string;
  name: string;
  tagline: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  fileName: string;
  fileSize: number;
  fileType: string;
  entryPoint: number;
  strings: string[];
  symbols: FunctionSymbol[];
  initialHex: string; // Hex representation of the compiled binary
  instructions: { [funcName: string]: AssemblyInstruction[] };
  decompiledCode: { [funcName: string]: string };
  patchableRanges: { start: number; end: number; description: string }[];
}

export interface AnalysisReport {
  fileName: string;
  fileSize: number;
  fileType: string;
  entropy?: number;
  architecture: string;
  strings: string[];
  magicBytes: string;
  sections: { name: string; start: number; size: number; flags: string }[];
}
