import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sparkles, Plus, Loader2, AlertCircle, Send, FileText, Star, Image, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EmailTemplate } from "../types";
import jarvisBg from "../assets/images/jarvis_cool_background_1783882128944.jpg";

// Classname utility helper locally
function hn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

// Client-Side Futuristic Sound Synthesizer (Web Audio API)
const playSciFiSound = (type: "thinking" | "ready" | "click" | "success" | "speak") => {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    if (type === "thinking") {
      // Ascending tech scan sweep
      const freqs = [220, 277.18, 329.63, 440, 554.37]; // A3, C#4, E4, A4, C#5
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + i * 0.06);
        gain.gain.setValueAtTime(0.06, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.45);
      });
    } else if (type === "success") {
      // Double success chime
      const f1 = 523.25; // C5
      const f2 = 783.99; // G5
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(f1, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(f2, now + 0.08);
      gain2.gain.setValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.08 + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.08 + 0.45);
    } else if (type === "click") {
      // Crisp retro-tech click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "ready") {
      // Deep energy hum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "speak") {
      // Interactive voice audio start click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    console.warn("Speech synthesis audio feedback error:", e);
  }
};

// Helper to extract links from an HTML string using DOMParser
const getHtmlLinks = (html: string) => {
  if (typeof window === "undefined" || !html) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const anchors = doc.querySelectorAll("a");
    const result: Array<{ text: string; href: string; index: number }> = [];
    anchors.forEach((a, index) => {
      result.push({
        text: a.textContent || a.innerText || `Link ${index + 1}`,
        href: a.getAttribute("href") || "",
        index
      });
    });
    return result;
  } catch (e) {
    return [];
  }
};

// Helper to update a link in an HTML string
const updateHtmlLink = (html: string, index: number, newText: string, newHref: string) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const anchors = doc.querySelectorAll("a");
    if (anchors[index]) {
      anchors[index].textContent = newText;
      anchors[index].setAttribute("href", newHref);
      if (html.toLowerCase().includes("<html")) {
        return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
      }
      return doc.body.innerHTML;
    }
  } catch (e) {
    console.error("Error updating link:", e);
  }
  return html;
};

interface LinkEditorProps {
  templateHtml: string;
  onLinkUpdate: (newHtml: string) => void;
}

const LinkEditor: React.FC<LinkEditorProps> = React.memo(({ templateHtml, onLinkUpdate }) => {
  const links = useMemo(() => getHtmlLinks(templateHtml), [templateHtml]);

  if (links.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-amber-600 uppercase tracking-widest font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Kustomisasi Tombol & Link Draf:
      </div>
      <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
        {links.map((link, linkIdx) => (
          <div key={linkIdx} className="p-2 bg-white border border-slate-200/60 rounded-lg space-y-2">
            <div className="text-[9px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Tombol #{linkIdx + 1}: "{link.text}"</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Teks Tombol
                </label>
                <input
                  type="text"
                  value={link.text}
                  onChange={(e) => {
                    const newHtml = updateHtmlLink(templateHtml, link.index, e.target.value, link.href);
                    onLinkUpdate(newHtml);
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-semibold focus:outline-none focus:border-amber-500 text-slate-800 placeholder:text-slate-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Link Tujuan (URL)
                </label>
                <input
                  type="text"
                  value={link.href}
                  onChange={(e) => {
                    const newHtml = updateHtmlLink(templateHtml, link.index, link.text, e.target.value);
                    onLinkUpdate(newHtml);
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-semibold focus:outline-none focus:border-amber-500 text-slate-800 placeholder:text-slate-400 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const getSafeSrcDoc = (html: string) => {
  if (!html) return "";
  
  const scalingScript = `
    <script>
      (function() {
        function init() {
          if (document.getElementById('email-wrapper')) return; // already initialized
          var wrapper = document.createElement('div');
          wrapper.id = 'email-wrapper';
          wrapper.style.width = '600px';
          wrapper.style.position = 'absolute';
          wrapper.style.left = '50%';
          wrapper.style.top = '0';
          wrapper.style.transformOrigin = 'top center';
          wrapper.style.boxSizing = 'border-box';
          
          while (document.body.firstChild) {
            wrapper.appendChild(document.body.firstChild);
          }
          document.body.appendChild(wrapper);
          
          function adjustScale() {
            var viewportWidth = window.innerWidth;
            var targetWidth = viewportWidth - 8;
            if (targetWidth < 200) targetWidth = viewportWidth;
            var scale = targetWidth / 600;
            
            if (scale < 1) {
              wrapper.style.transform = 'translateX(-50%) scale(' + scale + ')';
              document.body.style.height = (wrapper.offsetHeight * scale + 16) + 'px';
            } else {
              wrapper.style.transform = 'translateX(-50%)';
              document.body.style.height = (wrapper.offsetHeight + 16) + 'px';
            }
          }
          
          window.addEventListener('resize', adjustScale);
          window.addEventListener('load', adjustScale);
          adjustScale();
          setTimeout(adjustScale, 50);
          setTimeout(adjustScale, 200);
          setTimeout(adjustScale, 500);
          setInterval(adjustScale, 1000);
        }
        
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          init();
        } else {
          document.addEventListener('DOMContentLoaded', init);
        }
      })();
    </script>
  `;

  if (html.toLowerCase().includes("</body>")) {
    return html.replace(/<\/body>/i, `${scalingScript}</body>`);
  }
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            background-color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #333333;
            overflow-x: hidden !important;
            position: relative;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${html}
        ${scalingScript}
      </body>
    </html>
  `;
};

interface ChatMessageItemProps {
  msg: {
    role: "user" | "model";
    content: string;
    template?: any;
    image?: { data: string; mimeType: string; name: string };
  };
  idx: number;
  editMode: "preview" | "html";
  setEditMode: (mode: "preview" | "html") => void;
  isAiLoading: boolean;
  handleSendAiMessage: (prompt: string) => void;
  applyAiTemplateToForm: () => void;
  saveAiTemplateToCollection: () => void;
  onTemplateSubjectChange: (newSubject: string) => void;
  onTemplateHtmlChange: (newHtml: string) => void;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({
  msg,
  idx,
  editMode,
  setEditMode,
  isAiLoading,
  handleSendAiMessage,
  applyAiTemplateToForm,
  saveAiTemplateToCollection,
  onTemplateSubjectChange,
  onTemplateHtmlChange
}) => {
  return (
    <div
      className={hn(
        "flex flex-col max-w-[85%] rounded-2xl p-3.5 shadow-sm text-xs transition-all duration-300 relative z-10",
        msg.role === "user"
          ? "bg-amber-500 text-white rounded-br-none ml-auto border border-amber-600 shadow-md shadow-amber-500/10 font-extrabold animate-fade-in"
          : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none mr-auto shadow-sm animate-fade-in"
      )}
    >
      <div className="flex items-center justify-between mb-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
        <span className={msg.role === "user" ? "text-amber-100" : "text-slate-400"}>
          {msg.role === "user" ? "Anda" : "JARVIS"}
        </span>
      </div>
      
      {msg.image && (
        <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 max-w-[180px]">
          <img 
            src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
            alt={msg.image.name} 
            className="w-full h-auto object-cover max-h-[140px]"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <p className={hn("font-semibold leading-relaxed whitespace-pre-wrap", msg.role === "user" ? "text-white" : "text-slate-800")}>
        {msg.content}
      </p>

      {/* Contextual instant actions cards under generated drafts */}
      {!isAiLoading && msg.role === "model" && msg.template && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap gap-1.5">
          <div className="w-full text-[7px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1">
            ⚡ MODIFIKASI CEPAT JARVIS:
          </div>
          <button
            type="button"
            onClick={() => handleSendAiMessage("Terjemahkan draf email di atas ke Bahasa Inggris (English) dengan struktur formal perbankan.")}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-600 rounded-lg text-[9px] font-black text-slate-600 transition-all cursor-pointer hover:bg-amber-50"
          >
            🇬🇧 Inggris
          </button>
          <button
            type="button"
            onClick={() => handleSendAiMessage("Perpendek draf email di atas agar sangat padat, singkat, dan langsung pada intinya.")}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-600 rounded-lg text-[9px] font-black text-slate-600 transition-all cursor-pointer hover:bg-amber-50"
          >
            ⚡ Singkatkan
          </button>
          <button
            type="button"
            onClick={() => handleSendAiMessage("Ubah gaya bahasa draf email di atas menjadi jauh lebih formal, sopan, elegan, dan profesional.")}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-600 rounded-lg text-[9px] font-black text-slate-600 transition-all cursor-pointer hover:bg-amber-50"
          >
            👔 Lebih Formal
          </button>
          <button
            type="button"
            onClick={() => handleSendAiMessage("Tulis ulang draf email di atas dengan menambahkan penekanan urgensi keamanan tingkat tinggi agar nasabah segera bertindak.")}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-600 rounded-lg text-[9px] font-black text-slate-600 transition-all cursor-pointer hover:bg-amber-50"
          >
            🚨 Tambah Urgensi
          </button>
        </div>
      )}

      {/* Display template suggestions inside the chat if present */}
      {msg.template && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-200 space-y-2.5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
            <div className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
              Subjek Rekomendasi (Dapat Diedit):
            </div>
            <input
              type="text"
              value={msg.template.subject}
              onChange={(e) => onTemplateSubjectChange(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 focus:outline-none transition-all placeholder:text-slate-400"
              placeholder="Masukkan subjek draf..."
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                Isi Pesan / Desain Template:
              </div>
              
              {/* Segmented Mode Control */}
              <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setEditMode('preview')}
                  className={hn(
                    "px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider rounded transition-all",
                    editMode !== 'html' 
                      ? "bg-amber-500 text-white font-black" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Pratinjau
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode('html')}
                  className={hn(
                    "px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider rounded transition-all",
                    editMode === 'html' 
                      ? "bg-amber-500 text-white font-black" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Edit Teks & HTML
                </button>
              </div>
            </div>

            {editMode === 'html' ? (
              <div className="w-full h-[220px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex flex-col relative">
                <textarea
                  value={msg.template.html}
                  onChange={(e) => onTemplateHtmlChange(e.target.value)}
                  className="w-full h-full p-3 bg-transparent text-slate-800 font-mono text-[10px] resize-none focus:outline-none focus:ring-0 leading-relaxed overflow-y-auto"
                  placeholder="Ketik atau edit semua teks/kode HTML di sini..."
                />
                <div className="absolute bottom-2 right-2 bg-slate-200 border border-slate-300 text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded text-slate-500 select-none font-mono">
                  Kode Sumber / Teks
                </div>
              </div>
            ) : (
              <div className="w-full h-[220px] rounded-lg overflow-hidden border border-slate-200 bg-white">
                <iframe
                  title="AI Template Preview"
                  srcDoc={getSafeSrcDoc(msg.template.html)}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-popups allow-scripts"
                />
              </div>
            )}
          </div>

          {/* Custom Button & Link Editor Panel */}
          <LinkEditor
            templateHtml={msg.template.html}
            onLinkUpdate={onTemplateHtmlChange}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyAiTemplateToForm}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all uppercase tracking-wider border border-amber-600 cursor-pointer"
            >
              <Send className="w-3 h-3" /> Gunakan di Form
            </button>
            <button
              type="button"
              onClick={saveAiTemplateToCollection}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all uppercase tracking-wider border border-slate-200 cursor-pointer"
            >
              <FileText className="w-3 h-3" /> Simpan Koleksi
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
ChatMessageItem.displayName = "ChatMessageItem";

interface AiCopilotWidgetProps {
  isAiOpen: boolean;
  setIsAiOpen: (open: boolean) => void;
  setActiveTab: (tab: "send" | "templates" | "terminal" | "accounts") => void;
  addLog: (type: "info" | "success" | "error" | "warning", msg: string) => void;
  templates: EmailTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<EmailTemplate[]>>;
}

export const AiCopilotWidget: React.FC<AiCopilotWidgetProps> = React.memo(({
  isAiOpen,
  setIsAiOpen,
  setActiveTab,
  addLog,
  templates,
  setTemplates
}) => {
  const [aiHistory, setAiHistory] = useState<Array<{ 
    role: "user" | "model"; 
    content: string; 
    template?: any;
    image?: { data: string; mimeType: string; name: string };
  }>>(() => {
    const defaultGreeting = "Hallo...Saya JARVIS,\nServer ready silahkan berikan perintah..!!";
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("jarvis_ai_history_v3");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Enforce brief sapaan on mount: if the cached sapaan is too long or from old versions, replace it
            if (parsed[0] && parsed[0].role === "model") {
              const content = parsed[0].content || "";
              if (content.length > 100 || content.includes("bantuan") || !content.includes("Server ready")) {
                parsed[0].content = defaultGreeting;
              }
            }
            return parsed;
          }
        }
      } catch (e) {
        console.error("Gagal membaca riwayat chat J.A.R.V.I.S:", e);
      }
    }
    return [
      {
        role: "model",
        content: defaultGreeting
      }
    ];
  });

  // Save history to local backup storage whenever it changes with a debounce to prevent typing lag
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        localStorage.setItem("jarvis_ai_history_v3", JSON.stringify(aiHistory));
      } catch (e) {
        console.error("Gagal menyimpan riwayat chat J.A.R.V.I.S:", e);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [aiHistory]);

  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [editModes, setEditModes] = useState<Record<number, "preview" | "html">>({});
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState("JARVIS sedang merangkai kata...");
  const [resetConfirm, setResetConfirm] = useState(false);

  // Auto-reset the warning state after 3 seconds of inactivity
  useEffect(() => {
    if (resetConfirm) {
      const timer = setTimeout(() => {
        setResetConfirm(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [resetConfirm]);

  const aiChatEndRef = useRef<HTMLDivElement | null>(null);

  // Play sound on open
  useEffect(() => {
    if (isAiOpen) {
      playSciFiSound("ready");
    }
  }, [isAiOpen]);

  // Dynamically cycle thinking text during isAiLoading to represent JARVIS workflow step-by-step
  useEffect(() => {
    if (!isAiLoading) return;

    const lastMsg = aiHistory[aiHistory.length - 1];
    const textLower = (lastMsg?.content || "").toLowerCase();
    const hasImage = !!lastMsg?.image;

    let steps = [
      "Membaca pesan instruksi & konteks draf...",
      "Melacak pola keamanan bank & kecocokan data...",
      "Menyusun struktur tata letak HTML e-mail responsif...",
      "Menyisipkan tombol taktis, tautan, & placeholder...",
      "Finalisasi respons & validasi intonasi vokal..."
    ];

    if (hasImage) {
      steps = [
        "Memproses gambar lampiran & ekstraksi visual...",
        "Melacak pola keamanan bank & kecocokan data...",
        "Menyusun struktur tata letak HTML e-mail responsif...",
        "Menyisipkan tombol taktis, tautan, & placeholder...",
        "Finalisasi respons & validasi intonasi vokal..."
      ];
    } else if (textLower.includes("promosi") || textLower.includes("diskon") || textLower.includes("marketing") || textLower.includes("pemasaran")) {
      steps = [
        "Menganalisis segmentasi nasabah & gaya marketing...",
        "Menghitung kalkulasi diskon & penawaran promosi...",
        "Menyusun struktur tata letak HTML email promosi...",
        "Menambahkan tombol CTA (Call-to-Action) interaktif...",
        "Menyelaraskan intonasi komunikasi promosi..."
      ];
    } else if (textLower.includes("optimasi") || textLower.includes("poles") || textLower.includes("perbaiki") || textLower.includes("sunting")) {
      steps = [
        "Menganalisis draf email yang ingin dioptimasi...",
        "Memperbaiki kesalahan tata bahasa & penyusunan kalimat...",
        "Meningkatkan kompatibilitas HTML & gaya visual...",
        "Mengoptimalkan performa tombol & tautan penting...",
        "Mematangkan intonasi vokal profesional..."
      ];
    } else if (textLower.includes("analis") || textLower.includes("cek") || textLower.includes("kualitas") || textLower.includes("score")) {
      steps = [
        "Mengevaluasi keseluruhan konten draf email...",
        "Menguji kepatuhan keamanan perbankan (Spam/Phishing)...",
        "Menilai tingkat keterbacaan & estetika visual...",
        "Mengkalkulasi skor performa & saran perbaikan...",
        "Mempersiapkan laporan audit JARVIS..."
      ];
    } else if (textLower.includes("terjemah") || textLower.includes("translate") || textLower.includes("inggris") || textLower.includes("english")) {
      steps = [
        "Mengidentifikasi bahasa sumber & bahasa tujuan...",
        "Menerjemahkan kosakata ke padanan terminologi perbankan...",
        "Menyesuaikan tata bahasa agar terdengar alami...",
        "Mengintegrasikan kembali teks ke struktur template HTML...",
        "Menyempurnakan intonasi pelafalan dwi-bahasa..."
      ];
    }

    let currentIdx = 0;
    setThinkingText(steps[0]);

    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < steps.length) {
        setThinkingText(steps[currentIdx]);
      } else {
        setThinkingText("Sedang merangkai kata terakhir...");
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isAiLoading, aiHistory]);



  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addLog("error", "Format file tidak didukung. Harap pilih gambar/foto.");
      return;
    }

    addLog("info", "Sedang mengompresi gambar untuk performa optimal...");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        // Set maximum dimension
        const MAX_DIM = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as optimized JPEG
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          const commaIdx = optimizedDataUrl.indexOf(",");
          if (commaIdx !== -1) {
            const base64Data = optimizedDataUrl.substring(commaIdx + 1);
            setSelectedImage({
              data: base64Data,
              mimeType: "image/jpeg",
              name: file.name.replace(/\.[^/.]+$/, "") + ".jpg"
            });
            addLog("success", `Gambar "${file.name}" berhasil dikompresi & dimuat!`);
            playSciFiSound("success");
          } else {
            addLog("error", "Gagal mengompresi data gambar.");
          }
        } else {
          // Fallback if canvas context is not supported
          const resultStr = reader.result as string;
          const commaIdx = resultStr.indexOf(",");
          if (commaIdx !== -1) {
            const base64Data = resultStr.substring(commaIdx + 1);
            setSelectedImage({
              data: base64Data,
              mimeType: file.type,
              name: file.name
            });
            addLog("success", `Gambar "${file.name}" berhasil dimuat.`);
          }
        }
      };
      img.onerror = () => {
        addLog("error", "Gagal memproses gambar.");
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      addLog("error", "Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [addLog]);

  // Auto scroll chat to bottom when history or state changes
  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiHistory, isAiOpen, isAiLoading]);

  const handleSendAiMessage = useCallback(async (messageText: string) => {
    let finalMsg = messageText.trim();
    if (!finalMsg && selectedImage) {
      finalMsg = "Buatkan draf email yang serupa atau berdasarkan gambar yang saya kirim ini.";
    }
    if (!finalMsg) return;

    const textLower = finalMsg.toLowerCase();
    let currentThinking = "JARVIS sedang merangkai kata...";
    
    if (textLower.includes("bukti") || textLower.includes("transaksi") || textLower.includes("resi") || textLower.includes("pembayaran") || textLower.includes("alert") || textLower.includes("pemakaian") || textLower.includes("kartu") || textLower.includes("shopee") || textLower.includes("fraud") || selectedImage) {
      currentThinking = "JARVIS sedang memproses gambar & merancang email...";
    } else if (textLower.includes("promosi") || textLower.includes("diskon") || textLower.includes("marketing") || textLower.includes("pemasaran") || textLower.includes("onboarding") || textLower.includes("selamat datang")) {
      currentThinking = "JARVIS sedang merancang email promosi...";
    } else if (textLower.includes("optimasi") || textLower.includes("poles") || textLower.includes("perbaiki") || textLower.includes("rapikan") || textLower.includes("sunting")) {
      currentThinking = "JARVIS sedang mengoptimalkan draf email...";
    } else if (textLower.includes("analis") || textLower.includes("cek") || textLower.includes("kualitas") || textLower.includes("score")) {
      currentThinking = "JARVIS sedang menganalisis kualitas email...";
    } else if (textLower.includes("terjemah") || textLower.includes("translate") || textLower.includes("inggris") || textLower.includes("english")) {
      currentThinking = "JARVIS sedang menerjemahkan draf email...";
    } else if (textLower.includes("balas") || textLower.includes("reply") || textLower.includes("jawaban")) {
      currentThinking = "JARVIS sedang menyusun balasan email...";
    }
    
    setThinkingText(currentThinking);
    playSciFiSound("thinking");

    const imageToSend = selectedImage ? { ...selectedImage } : undefined;
    const newUserMessage = { 
      role: "user" as const, 
      content: finalMsg,
      image: imageToSend
    };
    
    setAiHistory((prev) => [...prev, newUserMessage]);
    setAiInput("");
    setSelectedImage(null);
    setIsAiLoading(true);
    setAiError(null);
 
    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMsg,
          history: aiHistory.map(h => ({ role: h.role, content: h.content })),
          image: imageToSend ? { data: imageToSend.data, mimeType: imageToSend.mimeType } : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghubungi AI.");
      }

      const data = await response.json();
      const nextModelMessage = {
        role: "model" as const,
        content: data.message || "Berikut hasil draf email yang berhasil saya buat:",
        template: data.template || null
      };

      setAiHistory((prev) => {
        const updated = [...prev, nextModelMessage];
        setTimeout(() => {
          playSciFiSound("success");
        }, 150);
        return updated;
      });

    } catch (err: any) {
      console.log("[AI Client] Request handled.", err?.message || err);
      setAiError(err.message || "Koneksi AI terputus atau API Key belum diset.");
      setAiHistory((prev) => [...prev, {
        role: "model" as const,
        content: `Maaf, saya mengalami kendala: ${err.message || "Gagal menghubungi AI. Pastikan Anda telah mengonfigurasi GEMINI_API_KEY di Settings."}`
      }]);
    } finally {
      setIsAiLoading(false);
    }
  }, [aiHistory, selectedImage]);

  const applyAiTemplateToForm = useCallback((tpl: { subject: string; html: string }) => {
    window.dispatchEvent(new CustomEvent("apply-template", { detail: tpl }));
    setActiveTab("send");
    setIsAiOpen(false);
    playSciFiSound("success");

    // Trigger visual notification
    window.dispatchEvent(new CustomEvent("banking-notif", {
      detail: {
        id: String(Date.now()),
        title: "AI COPILOT",
        message: "Draf email dari AI berhasil diterapkan ke form pengiriman!",
        timestamp: new Date().toLocaleTimeString(),
        recipient: "Form Pengiriman",
        ip: "Local"
      }
    }));
  }, [setActiveTab, setIsAiOpen]);

  const saveAiTemplateToCollection = useCallback((tpl: { subject: string; html: string; category?: string }) => {
    const newTemplate: EmailTemplate = {
      id: "tpl_" + Date.now(),
      name: "AI: " + (tpl.subject.substring(0, 20) || "Draf Tanpa Judul"),
      category: (tpl.category as any) || "General",
      subject: tpl.subject,
      message: tpl.html,
      createdAt: Date.now()
    };
    
    const updated = [newTemplate, ...templates];
    setTemplates(updated);
    localStorage.setItem("email_templates", JSON.stringify(updated));
    addLog("success", `Template AI "${newTemplate.name}" disimpan ke koleksi.`);
    playSciFiSound("success");
    
    // Trigger visual notification
    window.dispatchEvent(new CustomEvent("banking-notif", {
      detail: {
        id: String(Date.now()),
        title: "AI TEMPLATE",
        message: `Template "${newTemplate.name}" berhasil disimpan ke koleksi!`,
        timestamp: new Date().toLocaleTimeString(),
        recipient: "Template Manager",
        ip: "Local"
      }
    }));
  }, [templates, setTemplates, addLog]);

  const handleTemplateSubjectChange = useCallback((idx: number, newSubject: string) => {
    setAiHistory(prev => {
      const copy = [...prev];
      if (copy[idx]?.template) {
        copy[idx].template = { ...copy[idx].template, subject: newSubject };
      }
      return copy;
    });
  }, []);

  const handleTemplateHtmlChange = useCallback((idx: number, newHtml: string) => {
    setAiHistory(prev => {
      const copy = [...prev];
      if (copy[idx]?.template) {
        copy[idx].template = { ...copy[idx].template, html: newHtml };
      }
      return copy;
    });
  }, []);

  return (
    <AnimatePresence>
      {isAiOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAiOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[140]"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#F5F6F8] border-l border-slate-200 shadow-[-10px_0_40px_rgba(0,0,0,0.08)] z-[150] flex flex-col overflow-hidden text-slate-800"
          >
            {/* --- JARVIS BRANDED BACKGROUND inside drawer (Matching other pages perfectly) --- */}
            <div 
              className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${jarvisBg})` }}
            />
            {/* Subtle metallic texture and 'circuit-board' tech pattern overlay with CSS overlay blend-mode */}
            <div 
              className="absolute inset-0 pointer-events-none overflow-hidden z-[1]"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 80%),
                  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0 30 h40 l15 15 h30 l10 10 h25 M30 0 v40 l15 15 v20 l15 15 v30 M80 120 v-30 l-15 -15 v-25 l-15 -15 v-35' fill='none' stroke='rgba(255,179,0,0.04)' stroke-width='1.2' stroke-dasharray='3 3' /%3E%3Ccircle cx='40' cy='30' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='55' cy='45' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='85' cy='45' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='95' cy='55' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='45' cy='55' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='60' cy='75' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Cpath d='M10 10 h15 v15' fill='none' stroke='rgba(255,179,0,0.02)' stroke-width='1' /%3E%3Cpath d='M110 10 h-15 v-15' fill='none' stroke='rgba(255,179,0,0.02)' stroke-width='1' /%3E%3Cpath d='M10 110 h15 v-15' fill='none' stroke='rgba(255,179,0,0.02)' stroke-width='1' /%3E%3Cpath d='M110 110 h-15 v-15' fill='none' stroke='rgba(255,179,0,0.02)' stroke-width='1' /%3E%3C/svg%3E"),
                  linear-gradient(rgba(255, 179, 0, 0.006) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255, 179, 0, 0.006) 1px, transparent 1px)
                `,
                backgroundSize: "100% 100%, 120px 120px, 30px 30px, 30px 30px",
                opacity: 0.7,
              }}
            />

            {/* Header Banner */}
            <div className="p-4 border-b border-slate-200/80 bg-white/75 backdrop-blur-md flex justify-between items-center shrink-0 relative z-10 shadow-[0_1px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3">
                {/* High-tech Icon container */}
                <div className="w-8 h-8 bg-slate-950 border border-jago/80 text-jago rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,179,0,0.25)] shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#FFB300_1px,transparent_1px)] [background-size:6px_6px] opacity-25" />
                  <div className="flex items-center justify-center animate-[spin_8s_linear_infinite]">
                    <Sparkles className="w-4 h-4 text-jago drop-shadow-[0_0_4px_#FFB300]" />
                  </div>
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-jago shadow-[0_0_6px_#FFB300]" />
                </div>
                
                {/* Cool Glowing "JARVIS" Text */}
                <div className="flex flex-col items-start leading-none">
                  <span 
                    className="font-mono font-black text-slate-900 tracking-[0.22em] text-sm uppercase transition-all duration-300 drop-shadow-[0_0_6px_rgba(255,179,0,0.15)]"
                    style={{ textShadow: "0 0 10px rgba(255, 179, 0, 0.45)" }}
                  >
                    JARVIS
                  </span>
                  <span className="text-[7px] font-black tracking-[0.3em] text-jago/60 uppercase transition-colors duration-300 mt-0.5">
                    SYSTEM CO-PILOT
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {aiHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!resetConfirm) {
                        setResetConfirm(true);
                        playSciFiSound("click");
                      } else {
                        const cleared = [
                          {
                            role: "model" as const,
                            content: "Hallo...Saya JARVIS,\nServer ready silahkan berikan perintah..!!"
                          }
                        ];
                        setAiHistory(cleared);
                        try {
                          localStorage.setItem("jarvis_ai_history_v3", JSON.stringify(cleared));
                        } catch (e) {
                          console.error(e);
                        }
                        setResetConfirm(false);
                        addLog("warning", "Riwayat percakapan JARVIS dibersihkan.");
                        playSciFiSound("click");
                      }
                    }}
                    className={hn(
                      "px-2 py-1 border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      resetConfirm 
                        ? "border-rose-400 bg-rose-500 text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                        : "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600"
                    )}
                    title={resetConfirm ? "Klik sekali lagi untuk konfirmasi hapus" : "Reset obrolan"}
                  >
                    {resetConfirm ? "YAKIN HAPUS?" : "RESET CHAT"}
                  </button>
                )}
                <button
                  onClick={() => setIsAiOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
            </div>

            {/* Chat History & Stream Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent relative z-10">
              {aiHistory.map((msg, idx) => {
                const editMode = editModes[idx] || "preview";
                const setEditMode = (mode: "preview" | "html") => {
                  setEditModes(prev => ({ ...prev, [idx]: mode }));
                };
                
                return (
                  <ChatMessageItem
                    key={idx}
                    msg={msg}
                    idx={idx}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    isAiLoading={isAiLoading}
                    handleSendAiMessage={handleSendAiMessage}
                    applyAiTemplateToForm={() => applyAiTemplateToForm(msg.template)}
                    saveAiTemplateToCollection={() => saveAiTemplateToCollection(msg.template)}
                    onTemplateSubjectChange={(newSubject) => handleTemplateSubjectChange(idx, newSubject)}
                    onTemplateHtmlChange={(newHtml) => handleTemplateHtmlChange(idx, newHtml)}
                  />
                );
              })}

              {isAiLoading && (
                <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl rounded-bl-none mr-auto shadow-sm p-3.5 max-w-[85%] flex flex-col gap-1.5 animate-fade-in relative z-10 min-w-0">
                  <div className="flex items-center justify-between mb-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                    <span>JARVIS</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex gap-1 items-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-sans tracking-wide animate-pulse whitespace-nowrap truncate max-w-[160px] xs:max-w-[220px] sm:max-w-[340px]" title={thinkingText}>
                      {thinkingText}
                    </span>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[10px] font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <div ref={aiChatEndRef} />
            </div>

            {/* Prompt Quick Suggestion Strip */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-none shrink-0 relative z-10">
              {[
                { label: "Peringatan Shopee 5Jt", prompt: "Buat draf email peringatan transaksi kartu kredit tidak dikenal di merchant Shopee sebesar Rp 5.000.000 lengkap dengan tombol Batalkan Transaksi." },
                { label: "Klarifikasi Transaksi", prompt: "Buat email klarifikasi keamanan mengenai pemakaian kartu kredit nasabah di merchant Shopee CO ID Jakarta senilai 5 juta rupiah yang membutuhkan verifikasi pembatalan segera." },
                { label: "Batalkan Transaksi Link", prompt: "Susun email peringatan transaksi mencurigakan Shopee senilai 5 juta rupiah yang menyertakan link pembatalan transaksi langsung agar nasabah bisa mengamankan kartunya." },
                { label: "Notifikasi Fraud Shopee", prompt: "Tulis notifikasi fraud alert transaksi kartu kredit di Shopee sebesar Rp 5.000.000 dengan tombol Batalkan Transaksi yang mengarah ke link verifikasi keamanan nasabah." }
              ].map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendAiMessage(sug.prompt)}
                  disabled={isAiLoading}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-full hover:border-amber-500 hover:text-amber-600 text-[9px] font-extrabold text-slate-600 hover:bg-amber-50 shrink-0 transition-all cursor-pointer shadow-sm uppercase tracking-tight"
                >
                  {sug.label}
                </button>
              ))}
            </div>

            {/* Footer Send Prompt Panel */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 backdrop-blur-md shrink-0 space-y-2 relative z-10">
              {/* Image Preview if selected */}
              {selectedImage && (
                <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                      <img 
                        src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                        alt="Selected" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-800 truncate max-w-[150px]">
                        {selectedImage.name}
                      </span>
                      <span className="text-[8px] font-extrabold text-amber-500 uppercase tracking-wider">
                        Foto Siap Dikirim
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      playSciFiSound("click");
                    }}
                    className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAiMessage(aiInput);
                }}
                className="flex gap-2"
              >
                {/* Hidden File Input */}
                <input
                  type="file"
                  id="ai-image-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isAiLoading}
                />
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => {
                    playSciFiSound("click");
                    document.getElementById("ai-image-upload")?.click();
                  }}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    selectedImage 
                      ? "bg-amber-100 text-amber-700 border-amber-300" 
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                  title="Upload Foto/Gambar"
                >
                  <Image className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  disabled={isAiLoading}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder={selectedImage ? "Beri instruksi draf (opsional)..." : "Tanya AI / Tulis prompt draf email..."}
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500 text-slate-800 placeholder:text-slate-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || (!aiInput.trim() && !selectedImage)}
                  className="p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md border border-amber-600 transition-all disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
