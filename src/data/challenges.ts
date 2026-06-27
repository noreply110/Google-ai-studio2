/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChallengeBinary } from "../types";

export const CHALLENGES: ChallengeBinary[] = [
  {
    id: "crackme_key",
    name: "Challenge 1: License Key CrackMe",
    tagline: "Bypass license validation using assembly patching",
    description: "Program ini memvalidasi lisensi serial key. Kamu bisa menebak key yang benar dari decompiler, atau melakukan 'patching' pada instruksi lompatan (conditional jump) agar program selalu meloloskan serial key apa saja!",
    difficulty: "Easy",
    fileName: "crackme_v1.bin",
    fileSize: 1024,
    fileType: "ELF 32-bit LSB executable, Intel 80386, version 1",
    entryPoint: 0x08048400,
    strings: [
      "Masukkan Serial Key: ",
      "VALID-KEY-REVERSE-2026",
      "KUNCI LISENSI COCOK! Akses diberikan.",
      "LISENSI TIDAK VALID! Akses ditolak.",
      "FLAG{LICENSE_BYPASSED_SUCCESSFULLY_8892}",
      "FLAG{LICENSE_KEY_FOUND_IN_DECOMPILER_3381}"
    ],
    symbols: [
      { name: "_init", address: 0x080483d0, size: 24 },
      { name: "main", address: 0x08048400, size: 76 },
      { name: "validate_key", address: 0x08048450, size: 82 },
      { name: "access_granted", address: 0x080484b0, size: 40 },
      { name: "access_denied", address: 0x080484d8, size: 30 }
    ],
    initialHex: 
      "7F454C46010101000000000000000000020003000100000000840408" + // ELF Header
      "5589E583EC10C745FC00000000E846000000E81A000000C745FC0100" + // main
      "5589E5575681EC180000008B4508E81000000085C0740A31C0E80800" + // validate_key with "74 0A" (je access_denied)
      "5589E5E8150000005DFFD0905D6F6E67726174732100000000000000" + // access_granted
      "5589E5E80F0000005DFFD031C0C745F001000000905D000000000000",  // access_denied
    instructions: {
      "main": [
        {
          address: 0x08048400,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "Menyimpan base pointer frame fungsi sebelumnya ke dalam Stack."
        },
        {
          address: 0x08048401,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame baru untuk fungsi main dengan menyalin ESP ke EBP."
        },
        {
          address: 0x08048403,
          hex: "83 ec 10",
          mnemonic: "sub",
          operands: "esp, 0x10",
          explanation: "Mengalokasikan ruang 16 byte pada Stack untuk variabel lokal."
        },
        {
          address: 0x08048406,
          hex: "e8 45 00 00 00",
          mnemonic: "call",
          operands: "0x08048450 <validate_key>",
          explanation: "Memanggil fungsi validate_key untuk memeriksa serial key input."
        },
        {
          address: 0x0804840b,
          hex: "85 c0",
          mnemonic: "test",
          operands: "eax, eax",
          explanation: "Memeriksa nilai kembalian dari validate_key (EAX). Apakah EAX = 0?"
        },
        {
          address: 0x0804840d,
          hex: "74 0c",
          mnemonic: "jz",
          operands: "0x080484d8 <access_denied>",
          explanation: "Jika nilai kembalian validate_key adalah 0 (Gagal), lompat ke fungsi access_denied."
        },
        {
          address: 0x0804840f,
          hex: "e8 9c 00 00 00",
          mnemonic: "call",
          operands: "0x080484b0 <access_granted>",
          explanation: "Jika sukses (EAX != 0), panggil fungsi access_granted."
        },
        {
          address: 0x08048414,
          hex: "31 c0",
          mnemonic: "xor",
          operands: "eax, eax",
          explanation: "Mengosongkan register EAX (menetapkan nilai return main menjadi 0)."
        },
        {
          address: 0x08048416,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "Memulihkan stack frame main (salin EBP ke ESP, lalu pop EBP)."
        },
        {
          address: 0x08048417,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "Keluar dari fungsi main dan kembali ke sistem operasi."
        }
      ],
      "validate_key": [
        {
          address: 0x08048450,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "Menyimpan base pointer frame sebelumnya."
        },
        {
          address: 0x08048451,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame baru untuk fungsi validate_key."
        },
        {
          address: 0x08048453,
          hex: "83 ec 1c",
          mnemonic: "sub",
          operands: "esp, 0x1c",
          explanation: "Alokasi ruang Stack 28 byte untuk buffer lokal masukan serial key."
        },
        {
          address: 0x08048456,
          hex: "8b 45 08",
          mnemonic: "mov",
          operands: "eax, [ebp + 8]",
          explanation: "Mengambil pointer string input dari argument pertama fungsi (di atas stack)."
        },
        {
          address: 0x08048459,
          hex: "68 30 90 04 08",
          mnemonic: "push",
          operands: "0x08049030",
          explanation: "Dorong alamat string kunci rahasia ('VALID-KEY-REVERSE-2026') ke Stack."
        },
        {
          address: 0x0804845e,
          hex: "50",
          mnemonic: "push",
          operands: "eax",
          explanation: "Dorong pointer string input pengguna ke Stack."
        },
        {
          address: 0x0804845f,
          hex: "e8 fc fe ff ff",
          mnemonic: "call",
          operands: "strcmp",
          explanation: "Memanggil fungsi perpustakaan strcmp untuk membandingkan input dengan key rahasia."
        },
        {
          address: 0x08048464,
          hex: "83 c4 08",
          mnemonic: "add",
          operands: "esp, 8",
          explanation: "Membersihkan parameter dari stack (2 argumen x 4 byte)."
        },
        {
          address: 0x08048467,
          hex: "85 c0",
          mnemonic: "test",
          operands: "eax, eax",
          explanation: "Memeriksa hasil strcmp (EAX). strcmp mengembalikan 0 jika string cocok!"
        },
        {
          address: 0x08048469,
          hex: "74 0a",
          mnemonic: "je",
          operands: "0x08048475 <match_found>",
          explanation: "LOMPATAN KRITIS (JE = 74 0A)! Jika string cocok (strcmp = 0), lompat ke match_found. PETUNJUK: Ganti byte ini (74) menjadi JMP (EB) atau JNE (75) untuk mem-bypass serial check!"
        },
        {
          address: 0x0804846b,
          hex: "31 c0",
          mnemonic: "xor",
          operands: "eax, eax",
          explanation: "Jika tidak cocok, tetapkan EAX = 0 (Menandakan serial key salah)."
        },
        {
          address: 0x0804846d,
          hex: "eb 05",
          mnemonic: "jmp",
          operands: "0x0804847a <end_validate>",
          explanation: "Lompat langsung ke pembersihan fungsi (melewati blok match_found)."
        },
        {
          address: 0x08048475,
          hex: "b8 01 00 00 00",
          mnemonic: "mov",
          operands: "eax, 1",
          explanation: "match_found: Set EAX = 1 (Menandakan serial key benar)."
        },
        {
          address: 0x0804847a,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "Pulihkan stack frame dan bersihkan variabel lokal."
        },
        {
          address: 0x0804847b,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "Kembali dari fungsi validate_key."
        }
      ],
      "access_granted": [
        {
          address: 0x080484b0,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "Menyimpan base pointer."
        },
        {
          address: 0x080484b1,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame."
        },
        {
          address: 0x080484b3,
          hex: "68 b0 90 04 08",
          mnemonic: "push",
          operands: "0x080490b0",
          explanation: "Dorong alamat string 'KUNCI LISENSI COCOK! Akses diberikan.' ke stack."
        },
        {
          address: 0x080484b8,
          hex: "e8 ad fe ff ff",
          mnemonic: "call",
          operands: "puts",
          explanation: "Mencetak teks sukses ke terminal."
        },
        {
          address: 0x080484bd,
          hex: "83 c4 04",
          mnemonic: "add",
          operands: "esp, 4",
          explanation: "Membersihkan argument dari stack."
        },
        {
          address: 0x080484c0,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "Memulihkan stack frame."
        },
        {
          address: 0x080484c1,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "Kembali."
        }
      ],
      "access_denied": [
        {
          address: 0x080484d8,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "Menyimpan base pointer."
        },
        {
          address: 0x080484d9,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame."
        },
        {
          address: 0x080484db,
          hex: "68 e0 90 04 08",
          mnemonic: "push",
          operands: "0x080490e0",
          explanation: "Dorong alamat string 'LISENSI TIDAK VALID! Akses ditolak.' ke stack."
        },
        {
          address: 0x080484e0,
          hex: "e8 85 fe ff ff",
          mnemonic: "call",
          operands: "puts",
          explanation: "Mencetak teks kegagalan ke terminal."
        },
        {
          address: 0x080484e5,
          hex: "83 c4 04",
          mnemonic: "add",
          operands: "esp, 4",
          explanation: "Membersihkan stack."
        },
        {
          address: 0x080484e8,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "Memulihkan stack frame."
        },
        {
          address: 0x080484e9,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "Kembali."
        }
      ]
    },
    decompiledCode: {
      "main": `// Representasi kode decompiled dari fungsi main()
#include <stdio.h>

int main() {
    char input_key[32];
    int status;
    
    printf("Masukkan Serial Key: ");
    fgets(input_key, sizeof(input_key), stdin);
    
    // Hilangkan baris baru
    strtok(input_key, "\\n");
    
    status = validate_key(input_key);
    
    if (status != 0) {
        access_granted();
    } else {
        access_denied();
    }
    return 0;
}`,
      "validate_key": `// Representasi kode decompiled dari fungsi validate_key()
#include <string.h>

int validate_key(const char *input) {
    // Alamat memori key asli berada di 0x08049030
    const char *secret_key = "VALID-KEY-REVERSE-2026";
    
    int result = strcmp(input, secret_key);
    
    // JE (Jump if Equal) - Jika hasil strcmp adalah 0, maka sukses.
    // OPTIMASI BINARY PATCH: 
    // Ganti nilai byte perbandingan di hex editor untuk mem-bypass pengecekan ini!
    if (result == 0) {
        return 1; // Lisensi VALID
    } else {
        return 0; // Lisensi TIDAK VALID
    }
}`
    },
    patchableRanges: [
      { start: 136, end: 137, description: "Instruksi Lompatan Kritis 'je' (74 0A) di fungsi validate_key. Ubah byte 74 menjadi 75 (jne) atau EB (jmp)." }
    ]
  },
  {
    id: "stack_overflow",
    name: "Challenge 2: Stack Buffer Overflow",
    tagline: "Exploit stack frames to hijack Instruction Pointer (EIP)",
    description: "Program ini memiliki celah keamanan Buffer Overflow karena menggunakan fungsi rentan 'gets()'. Tugasmu adalah memasukkan input yang melebihi kapasitas memori buffer (16 byte), melewati Saved EBP, dan menimpa Saved EIP (Return Address) dengan alamat fungsi rahasia 'win' (0x080485a0)!",
    difficulty: "Medium",
    fileName: "vuln_app.elf",
    fileSize: 1540,
    fileType: "ELF 32-bit LSB executable, Intel 80386, dynamic linked",
    entryPoint: 0x08048500,
    strings: [
      "=== SERVER LOGIN SECURE v1.2 ===",
      "Masukkan kata sandi admin: ",
      "Memproses input dan menyimpan di buffer lokal...",
      "Kata sandi disimpan. Menutup koneksi.",
      "VULNERABILITAS TERPICU! Hijacking EIP berhasil!",
      "FLAG{STACK_SMASHED_EIP_HIJACK_5849}",
      "Fungsi rahasia win() dipicu di alamat 0x080485a0!"
    ],
    symbols: [
      { name: "main", address: 0x08048500, size: 50 },
      { name: "vulnerable_input", address: 0x08048530, size: 90 },
      { name: "win", address: 0x080485a0, size: 48 }
    ],
    initialHex:
      "7F454C46010101000000000000000000020003000100000000850408" +
      "5589E583EC08C70424A0900408E880FDFFFFE81A000000C704240000" +
      "5589E583EC188D45F050E8CCFDFFFFC745FC0000000083C408C9C300" + // vulnerable_input (16 bytes buffer)
      "5589E55383EC1831C0C70424E0900408E8A1FDFFFFE842000000C9C3",  // win() function at 0x080485a0
    instructions: {
      "main": [
        {
          address: 0x08048500,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "Menyimpan base pointer frame main."
        },
        {
          address: 0x08048501,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame main."
        },
        {
          address: 0x08048503,
          hex: "e8 28 00 00 00",
          mnemonic: "call",
          operands: "0x08048530 <vulnerable_input>",
          explanation: "Memanggil fungsi vulnerable_input. Fungsi ini rentan!"
        },
        {
          address: 0x08048508,
          hex: "31 c0",
          mnemonic: "xor",
          operands: "eax, eax",
          explanation: "Reset EAX ke 0."
        },
        {
          address: 0x0804850a,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "Memulihkan stack."
        },
        {
          address: 0x0804850b,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "Kembali ke sistem operasi."
        }
      ],
      "vulnerable_input": [
        {
          address: 0x08048530,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "Menyimpan Base Pointer frame main ke Stack."
        },
        {
          address: 0x08048531,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame baru untuk vulnerable_input."
        },
        {
          address: 0x08048533,
          hex: "83 ec 18",
          mnemonic: "sub",
          operands: "esp, 0x18",
          explanation: "Mengalokasikan ruang stack 24 byte. Namun buffer hanya 16 byte! Sisa 8 byte untuk local alignment."
        },
        {
          address: 0x08048536,
          hex: "8d 45 f0",
          mnemonic: "lea",
          operands: "eax, [ebp - 0x10]",
          explanation: "Mengambil alamat lokal buffer (EBP - 16) ke dalam EAX. Batas buffer ini hanya 16 byte!"
        },
        {
          address: 0x08048539,
          hex: "50",
          mnemonic: "push",
          operands: "eax",
          explanation: "Mendorong alamat buffer lokal ke stack sebagai argumen pertama gets()."
        },
        {
          address: 0x0804853a,
          hex: "e8 b0 fd ff ff",
          mnemonic: "call",
          operands: "gets",
          explanation: "Memanggil fungsi gets(). PERINGATAN: gets() tidak membatasi ukuran input, sehingga rentan terhadap Stack Overflow!"
        },
        {
          address: 0x0804853f,
          hex: "83 c4 04",
          mnemonic: "add",
          operands: "esp, 4",
          explanation: "Membersihkan parameter dari stack."
        },
        {
          address: 0x08048542,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "leave akan memulihkan ESP = EBP, lalu mem-pop Saved EBP dari stack. Jika stack diserang, ini akan memuat EBP palsu."
        },
        {
          address: 0x08048543,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "ret mem-pop alamat kembalian (Saved EIP) dari stack ke register EIP untuk melompat kembali ke main. Jika Saved EIP ditimpa dengan 0x080485a0, ret akan melompat ke fungsi win()!"
        }
      ],
      "win": [
        {
          address: 0x080485a0,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "FUNGSI RAHASIA WIN: Menyimpan base pointer."
        },
        {
          address: 0x080485a1,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame."
        },
        {
          address: 0x080485a3,
          hex: "68 f0 90 04 08",
          mnemonic: "push",
          operands: "0x080490f0",
          explanation: "Mendorong alamat string flag keberhasilan ke stack."
        },
        {
          address: 0x080485a8,
          hex: "e8 b0 fd ff ff",
          mnemonic: "call",
          operands: "puts",
          explanation: "Mencetak bendera flag kemenangan ke terminal!"
        },
        {
          address: 0x080485ad,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "Pulihkan stack frame."
        },
        {
          address: 0x080485ae,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "Kembali."
        }
      ]
    },
    decompiledCode: {
      "main": `// Representasi kode decompiled dari fungsi main()
#include <stdio.h>

void vulnerable_input();

int main() {
    printf("=== SERVER LOGIN SECURE v1.2 ===\\n");
    vulnerable_input();
    printf("Kata sandi disimpan. Menutup koneksi.\\n");
    return 0;
}`,
      "vulnerable_input": `// Representasi kode decompiled dari fungsi vulnerable_input()
#include <stdio.h>

void vulnerable_input() {
    char buffer[16]; // Mengalokasikan 16 byte memori di Stack
    
    printf("Masukkan kata sandi admin: ");
    
    // gets() RENTAN terhadap Buffer Overflow! 
    // gets() akan terus membaca input pengguna hingga menemukan karakter newline (\\n), 
    // tanpa memeriksa apakah buffer[16] sudah penuh atau belum.
    gets(buffer); 
    
    printf("Memproses input dan menyimpan di buffer lokal...\\n");
}`,
      "win": `// Representasi kode decompiled dari fungsi rahasia win() yang tidak pernah dipanggil secara normal!
#include <stdio.h>

void win() {
    printf("VULNERABILITAS TERPICU! Hijacking EIP berhasil!\\n");
    printf("Fungsi rahasia win() dipicu di alamat 0x080485a0!\\n");
    printf("FLAG{STACK_SMASHED_EIP_HIJACK_5849}\\n");
}`
    },
    patchableRanges: []
  },
  {
    id: "xor_decrypter",
    name: "Challenge 3: XOR Decryption Loop",
    tagline: "Reverse engineer a lightweight crypto algorithm",
    description: "Program ini menyimpan sebuah payload (flag) terenkripsi di dalam memori. Program melakukan proses XOR menggunakan key '0x5A' dalam sebuah loop di perakitan. Kamu harus menganalisis cara kerja loop XOR ini atau menggunakan CPU emulator untuk menguras dekripsi payload-nya!",
    difficulty: "Hard",
    fileName: "xor_crypto.bin",
    fileSize: 512,
    fileType: "ELF 32-bit LSB executable, Intel 80386, custom payload",
    entryPoint: 0x08048600,
    strings: [
      "Menginisialisasi algoritma XOR...",
      "Payload Terenkripsi: [0x1E, 0x16, 0x1B, 0x1D, 0x01, 0x00, 0x30, 0x1F, 0x1D, 0x0A, 0x03, 0x30, 0x03, 0x3A, 0x36, 0x1B, 0x1D, 0x0A, 0x1E, 0x03, 0x03, 0x3F, 0x30, 0x0F, 0x03, 0x0D, 0x00, 0x02, 0x1E]",
      "Mendekripsi byte demi byte dengan XOR key 0x5A...",
      "FLAG{XOR_DECRYPT_SOLVED_1109}"
    ],
    symbols: [
      { name: "main", address: 0x08048600, size: 84 },
      { name: "xor_decrypt", address: 0x08048650, size: 70 }
    ],
    initialHex:
      "7F454C46010101000000000000000000020003000100000000860408" +
      "5589E583EC08BE20950408BF30950408B91D000000E820000000C9C3" + // main calling xor_decrypt
      "5589E583EC10C745FC000000008B45FC3B45087D258B4D0C8B551001" + // xor_decrypt loop start
      "CA8A02345A88028345FC01EBF190C9C3000000000000000000000000",  // XOR instruction "34 5A" (xor al, 0x5a)
    instructions: {
      "main": [
        {
          address: 0x08048600,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "Menyimpan base pointer frame main."
        },
        {
          address: 0x08048601,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame main."
        },
        {
          address: 0x08048603,
          hex: "be 20 95 04 08",
          mnemonic: "mov",
          operands: "esi, 0x08049520",
          explanation: "Menyimpan alamat data payload terenkripsi ke register ESI (Source Index)."
        },
        {
          address: 0x08048608,
          hex: "bf 30 95 04 08",
          mnemonic: "mov",
          operands: "edi, 0x08049530",
          explanation: "Menyimpan alamat buffer keluaran hasil dekripsi ke register EDI (Destination Index)."
        },
        {
          address: 0x0804860d,
          hex: "b9 1d 00 00 00",
          mnemonic: "mov",
          operands: "ecx, 29",
          explanation: "Menyimpan jumlah byte yang akan didekripsi (29 byte) ke dalam register ECX (Loop Counter)."
        },
        {
          address: 0x08048612,
          hex: "e8 39 00 00 00",
          mnemonic: "call",
          operands: "0x08048650 <xor_decrypt>",
          explanation: "Memanggil fungsi xor_decrypt."
        },
        {
          address: 0x08048617,
          hex: "31 c0",
          mnemonic: "xor",
          operands: "eax, eax",
          explanation: "Reset EAX."
        },
        {
          address: 0x08048619,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "Pulihkan stack."
        },
        {
          address: 0x0804861a,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "Kembali."
        }
      ],
      "xor_decrypt": [
        {
          address: 0x08048650,
          hex: "55",
          mnemonic: "push",
          operands: "ebp",
          explanation: "Menyimpan base pointer."
        },
        {
          address: 0x08048651,
          hex: "89 e5",
          mnemonic: "mov",
          operands: "ebp, esp",
          explanation: "Membuat stack frame."
        },
        {
          address: 0x08048653,
          hex: "83 ec 10",
          mnemonic: "sub",
          operands: "esp, 16",
          explanation: "Alokasi memori lokal 16 byte."
        },
        {
          address: 0x08048656,
          hex: "c7 45 fc 00 00 00 00",
          mnemonic: "mov",
          operands: "dword ptr [ebp - 4], 0",
          explanation: "Inisialisasi variabel indeks loop `i = 0` (disimpan di Stack pada EBP - 4)."
        },
        {
          address: 0x0804865d,
          hex: "8b 45 fc",
          mnemonic: "mov",
          operands: "eax, [ebp - 4]",
          explanation: "LOOP START: Muat nilai `i` dari stack ke register EAX."
        },
        {
          address: 0x08048660,
          hex: "3b 45 08",
          mnemonic: "cmp",
          operands: "eax, [ebp + 8]",
          explanation: "Bandingkan indeks loop `i` (EAX) dengan argumen pertama (ukuran payload)."
        },
        {
          address: 0x08048663,
          hex: "7d 25",
          mnemonic: "jge",
          operands: "0x0804868a <end_loop>",
          explanation: "Jika `i` lebih besar atau sama dengan ukuran payload, keluar dari loop (lompat ke end_loop)."
        },
        {
          address: 0x08048665,
          hex: "8b 4d 0c",
          mnemonic: "mov",
          operands: "ecx, [ebp + 12]",
          explanation: "Ambil alamat basis string input terenkripsi ke register ECX."
        },
        {
          address: 0x08048668,
          hex: "8b 55 fc",
          mnemonic: "mov",
          operands: "edx, [ebp - 4]",
          explanation: "Ambil indeks loop `i` ke register EDX."
        },
        {
          address: 0x0804866b,
          hex: "01 ca",
          mnemonic: "add",
          operands: "edx, ecx",
          explanation: "Tambahkan alamat dasar dengan indeks `i` untuk mencari alamat byte ke-i."
        },
        {
          address: 0x0804866d,
          hex: "8a 02",
          mnemonic: "mov",
          operands: "al, [edx]",
          explanation: "Muat byte terenkripsi dari memori ke register AL (8-bit terbawah EAX)."
        },
        {
          address: 0x0804866f,
          hex: "34 5a",
          mnemonic: "xor",
          operands: "al, 0x5a",
          explanation: "OPERASI ENKRIPSI UTAMA: Lakukan operasi XOR pada byte AL dengan kunci rahasia 0x5A!"
        },
        {
          address: 0x08048671,
          hex: "88 02",
          mnemonic: "mov",
          operands: "[edx], al",
          explanation: "Simpan kembali byte hasil XOR ke dalam memori tujuan."
        },
        {
          address: 0x08048673,
          hex: "83 45 fc 01",
          mnemonic: "add",
          operands: "dword ptr [ebp - 4], 1",
          explanation: "Inkrementasi indeks loop `i` (`i = i + 1`)."
        },
        {
          address: 0x08048677,
          hex: "eb e4",
          mnemonic: "jmp",
          operands: "0x0804865d <loop_start>",
          explanation: "Lompat kembali ke awal loop untuk memproses byte berikutnya."
        },
        {
          address: 0x0804868a,
          hex: "90",
          mnemonic: "nop",
          operands: "",
          explanation: "Instruksi No-Operation (tidak melakukan apa-apa)."
        },
        {
          address: 0x0804868b,
          hex: "c9",
          mnemonic: "leave",
          operands: "",
          explanation: "Pulihkan stack frame."
        },
        {
          address: 0x0804868c,
          hex: "c3",
          mnemonic: "ret",
          operands: "",
          explanation: "Kembali dari fungsi xor_decrypt."
        }
      ]
    },
    decompiledCode: {
      "main": `// Representasi kode decompiled dari fungsi main()
#include <stdio.h>

void xor_decrypt(int length, char *data);

int main() {
    // String flag yang disamarkan dengan XOR 0x5A
    char encrypted_payload[29] = {
        0x1E, 0x16, 0x1B, 0x1D, 0x01, 0x00, 0x30, 0x1F, 0x1D, 0x0A, 0x03, 0x30, 0x03, 0x3A, 
        0x36, 0x1B, 0x1D, 0x0A, 0x1E, 0x03, 0x03, 0x3F, 0x30, 0x0F, 0x03, 0x0D, 0x00, 0x02, 0x1E
    };
    
    printf("Menginisialisasi alogritma XOR...\\n");
    xor_decrypt(29, encrypted_payload);
    
    printf("Dekripsi Selesai.\\n");
    return 0;
}`,
      "xor_decrypt": `// Representasi kode decompiled dari fungsi xor_decrypt()
#include <stdio.h>

void xor_decrypt(int length, char *data) {
    // Menggunakan kunci XOR rahasia 0x5A (Desimal: 90, ASCII: 'Z')
    char key = 0x5A; 
    
    for (int i = 0; i < length; i++) {
        // Operasi XOR bersifat reversibel:
        // encrypted_char ^ key = decrypted_char
        // decrypted_char ^ key = encrypted_char
        data[i] = data[i] ^ key;
    }
}`
    },
    patchableRanges: []
  }
];
