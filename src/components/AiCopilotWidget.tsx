import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sparkles, Plus, Loader2, AlertCircle, Send, FileText, Star, Image, X, Volume2, VolumeX, Play, Square } from "lucide-react";
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

// Holographic JARVIS Voice Waveform Visualizer
const JarvisVoiceVisualizer: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  const [bars, setBars] = useState<number[]>(Array(16).fill(6));
  
  useEffect(() => {
    if (!isSpeaking) {
      setBars(Array(16).fill(4));
      return;
    }
    
    const interval = setInterval(() => {
      setBars(Array(16).fill(0).map(() => Math.floor(Math.random() * 22) + 4));
    }, 60);
    
    return () => clearInterval(interval);
  }, [isSpeaking]);
  
  return (
    <div className="mx-4 my-2 px-3 py-2 bg-slate-950/90 border border-amber-500/20 rounded-xl shadow-[0_0_15px_rgba(255,179,0,0.1)] flex items-center justify-between overflow-hidden relative z-10">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-cyan-500/5 to-amber-500/5 animate-pulse pointer-events-none" />
      <div className="flex items-center gap-1.5 shrink-0 select-none">
        <span className="relative flex h-2 w-2">
          <span className={hn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isSpeaking ? "bg-amber-400" : "bg-cyan-400")} />
          <span className={hn("relative inline-flex rounded-full h-2 w-2", isSpeaking ? "bg-amber-500" : "bg-cyan-500")} />
        </span>
        <span className="text-[8px] font-black tracking-[0.2em] text-slate-300 font-mono uppercase">
          JARVIS NEURAL CORE
        </span>
      </div>
      
      {/* Animated bars */}
      <div className="flex items-center gap-[3px] h-6 justify-center">
        {bars.map((h, i) => (
          <div
            key={i}
            className={hn(
              "w-1 rounded-full transition-all duration-75", 
              isSpeaking 
                ? "bg-gradient-to-t from-amber-500 to-cyan-400 opacity-95 shadow-[0_0_6px_rgba(255,179,0,0.3)]" 
                : "bg-slate-700 opacity-50"
            )}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      
      <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-widest animate-pulse">
        {isSpeaking ? "SPEAKING" : "STANDBY"}
      </span>
    </div>
  );
};

// Word-by-word streaming typewriter text
interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
  active: boolean;
}

const TypewriterText: React.FC<TypewriterTextProps> = React.memo(({ text, onComplete, active }) => {
  const [displayed, setDisplayed] = useState(active ? "" : text);
  
  useEffect(() => {
    if (!active) {
      setDisplayed(text);
      return;
    }
    
    let currentIdx = 0;
    const words = text.split(" ");
    let currentText = "";
    
    const interval = setInterval(() => {
      if (currentIdx < words.length) {
        currentText += (currentIdx === 0 ? "" : " ") + words[currentIdx];
        setDisplayed(currentText);
        currentIdx++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 25); // natural fast typing pace
    
    return () => clearInterval(interval);
  }, [text, active, onComplete]);
  
  return <p className="font-semibold leading-relaxed whitespace-pre-wrap text-slate-800">{displayed}</p>;
});

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
      window.addEventListener('DOMContentLoaded', function() {
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
        setTimeout(adjustScale, 50);
        setTimeout(adjustScale, 200);
        setTimeout(adjustScale, 500);
        setInterval(adjustScale, 1000);
      });
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
  isSpeakingThisMessage: boolean;
  speakText: () => void;
  isTypingThisMessage: boolean;
  handleTypewriterComplete: () => void;
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
  isSpeakingThisMessage,
  speakText,
  isTypingThisMessage,
  handleTypewriterComplete,
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
        {msg.role === "model" && (
          <button
            type="button"
            onClick={speakText}
            className={hn(
              "px-1.5 py-0.5 rounded border text-[7px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer",
              isSpeakingThisMessage 
                ? "bg-amber-500 text-white border-amber-600 animate-pulse" 
                : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"
            )}
            title="Dengarkan Suara JARVIS"
          >
            {isSpeakingThisMessage ? (
              <>
                <Square className="w-2 h-2 fill-current" /> Stop
              </>
            ) : (
              <>
                <Volume2 className="w-2 h-2" /> Speak
              </>
            )}
          </button>
        )}
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

      {/* Render Typewriter Effect for the active model message stream, else static */}
      {msg.role === "model" && isTypingThisMessage ? (
        <TypewriterText 
          text={msg.content} 
          active={true} 
          onComplete={handleTypewriterComplete} 
        />
      ) : (
        <p className={hn("font-semibold leading-relaxed whitespace-pre-wrap", msg.role === "user" ? "text-white" : "text-slate-800")}>
          {msg.content}
        </p>
      )}

      {/* Contextual instant actions cards under generated drafts */}
      {!isAiLoading && msg.role === "model" && msg.template && !isTypingThisMessage && (
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
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("jarvis_ai_history");
        return saved ? JSON.parse(saved) : [
          {
            role: "model",
            content: "Halo! Saya J.A.R.V.I.S, Asisten AI Co-pilot Anda untuk rancangan email premium dan analisis draf email secara real-time. 🚀\n\nSaya hadir untuk mendesain secara interaktif bersama Anda! Anda bisa mengajak saya berinteraksi dengan cara:\n1. 📸 **Mengirimkan tangkapan layar (screenshot)** bukti transaksi/resi pembayaran agar saya menganalisis dan menduplikasi desain emailnya secara instan.\n2. 🎨 **Menyesuaikan estetika & gaya draf**, seperti mengganti warna aksen brand perbankan (Mandiri, BCA, CIMB Niaga, dll.), menyisipkan tabel, atau mengedit teks tombol.\n3. 🗣️ **Menggunakan fitur Speak** untuk mendengarkan pelafalan draf, serta menyunting nada bahasa (menjadi lebih tegas, bersahabat, mendesak, atau santun).\n\n**Bagaimana, apa yang ingin kita rancang hari ini?** Tuliskan ide Anda atau klik tombol rekomendasi cepat di bawah untuk langsung menguji kepiawaian saya!"
          }
        ];
      } catch (e) {
        console.error("Gagal membaca riwayat chat J.A.R.V.I.S:", e);
      }
    }
    return [
      {
        role: "model",
        content: "Halo! Saya J.A.R.V.I.S, Asisten AI Co-pilot Anda untuk rancangan email premium dan analisis draf email secara real-time. 🚀\n\nSaya hadir untuk mendesain secara interaktif bersama Anda! Anda bisa mengajak saya berinteraksi dengan cara:\n1. 📸 **Mengirimkan tangkapan layar (screenshot)** bukti transaksi/resi pembayaran agar saya menganalisis dan menduplikasi desain emailnya secara instan.\n2. 🎨 **Menyesuaikan estetika & gaya draf**, seperti mengganti warna aksen brand perbankan (Mandiri, BCA, CIMB Niaga, dll.), menyisipkan tabel, atau mengedit teks tombol.\n3. 🗣️ **Menggunakan fitur Speak** untuk mendengarkan pelafalan draf, serta menyunting nada bahasa (menjadi lebih tegas, bersahabat, mendesak, atau santun).\n\n**Bagaimana, apa yang ingin kita rancang hari ini?** Tuliskan ide Anda atau klik tombol rekomendasi cepat di bawah untuk langsung menguji kepiawaian saya!"
      }
    ];
  });

  // Save history to local backup storage whenever it changes with a debounce to prevent typing lag
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        localStorage.setItem("jarvis_ai_history", JSON.stringify(aiHistory));
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
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null);
  const [aiSteps, setAiSteps] = useState<Array<{ id: number; label: string; status: "pending" | "active" | "completed" }>>([]);

  // Voice States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingTextId, setSpeakingTextId] = useState<number | null>(null);
  const [autoVoice, setAutoVoice] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jarvis_auto_voice") === "true";
    }
    return false;
  });

  const aiChatEndRef = useRef<HTMLDivElement | null>(null);

  // Play sound on open
  useEffect(() => {
    if (isAiOpen) {
      playSciFiSound("ready");
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setSpeakingTextId(null);
      }
    }
  }, [isAiOpen]);

  // Handle unmount speech cancel
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Set up Replit-Agent style real-time pipeline progress steps whenever AI begins loading
  useEffect(() => {
    if (!isAiLoading) {
      setAiSteps([]);
      return;
    }

    const hasImage = !!selectedImage;
    const initialSteps = [
      { id: 1, label: hasImage ? "Memproses gambar lampiran & ekstraksi visual..." : "Membaca pesan instruksi & konteks draf...", status: "active" as const },
      { id: 2, label: "Melacak pola keamanan bank & kecocokan data...", status: "pending" as const },
      { id: 3, label: "Menyusun struktur tata letak HTML e-mail responsif...", status: "pending" as const },
      { id: 4, label: "Menyisipkan tombol taktis, tautan, & placeholder...", status: "pending" as const },
      { id: 5, label: "Finalisasi respons & validasi intonasi vokal...", status: "pending" as const }
    ];
    setAiSteps(initialSteps);

    let currentStep = 1;
    const interval = setInterval(() => {
      setAiSteps(prev => {
        if (currentStep >= 5) {
          clearInterval(interval);
          return prev.map(s => s.id === 5 ? { ...s, status: "completed" as const } : s);
        }
        
        const nextSteps = prev.map(s => {
          if (s.id === currentStep) {
            return { ...s, status: "completed" as const };
          }
          if (s.id === currentStep + 1) {
            return { ...s, status: "active" as const };
          }
          return s;
        });
        currentStep++;
        return nextSteps;
      });
    }, 1100); // Super responsive, fast paced ticks for immediate satisfaction

    return () => clearInterval(interval);
  }, [isAiLoading]);

  const toggleAutoVoice = () => {
    const newValue = !autoVoice;
    setAutoVoice(newValue);
    localStorage.setItem("jarvis_auto_voice", String(newValue));
    addLog("info", `Auto Voice JARVIS: ${newValue ? 'ACTIVE' : 'MUTED'}`);
    playSciFiSound("click");
    if (!newValue && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingTextId(null);
    }
  };

  const speakText = useCallback((text: string, id: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    // If already speaking this message, cancel it
    if (isSpeaking && speakingTextId === id) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingTextId(null);
      playSciFiSound("click");
      return;
    }
    
    window.speechSynthesis.cancel();
    playSciFiSound("speak");
    
    // Strip markdown elements & HTML tags to read plain text
    let cleanText = text
      .replace(/<[^>]*>/g, "")
      .replace(/\*+/g, "")
      .replace(/_+/g, "")
      .replace(/`+/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Replace acronyms/abbreviations with smooth human-readable phonetic equivalent
    // Lowercase "yarvis" prevents any TTS engine from spelling out individual letters.
    cleanText = cleanText
      .replace(/J\.A\.R\.V\.I\.S\./gi, "yarvis")
      .replace(/J\.A\.R\.V\.I\.S/gi, "yarvis")
      .replace(/JARVIS/gi, "yarvis")
      .replace(/Jarvis/gi, "yarvis")
      .replace(/AI/g, "A.I.") // Let it pronounce as "A I" smoothly
      .substring(0, 400); // limit spoken duration for premium comfort
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set moderate, soft volume to sound polite and non-aggressive
    utterance.volume = 0.85; 
    
    // Attempt Indonesian voice matching with preference for gentle male voices
    const voices = window.speechSynthesis.getVoices();
    const idVoices = voices.filter(v => 
      v.lang.toLowerCase().includes("id") || 
      v.lang.toLowerCase().includes("in-id")
    );
    
    if (idVoices.length > 0) {
      // Prioritize male Indonesian voice (e.g. ArdiNeural, Microsoft Ardi, or names with ardi/wira/male/hari/pria)
      const maleVoice = idVoices.find(v => 
        v.name.toLowerCase().includes("ardi") || 
        v.name.toLowerCase().includes("hari") || 
        v.name.toLowerCase().includes("wira") || 
        v.name.toLowerCase().includes("male") ||
        v.name.toLowerCase().includes("man") ||
        v.name.toLowerCase().includes("cowok") ||
        v.name.toLowerCase().includes("pria")
      );
      
      if (maleVoice) {
        utterance.voice = maleVoice;
        utterance.pitch = 0.90; // Calmer, softer warm male voice
      } else {
        // Fallback: If only female ID voices are available, we adjust pitch and rate
        // to sound extremely warm, slow, and sophisticated.
        utterance.voice = idVoices[0];
        utterance.pitch = 0.65; // Soften the frequency distortion so it's pleasant, gentle and robotic-chic
      }
    } else {
      // General voice fallback, searching for english male voice with lowered pitch
      const engMale = voices.find(v => 
        (v.lang.toLowerCase().includes("en")) && 
        (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("guy"))
      );
      if (engMale) {
        utterance.voice = engMale;
        utterance.pitch = 0.70;
      } else {
        utterance.pitch = 0.65;
      }
    }
    
    // 0.88 - Slower speed for maximum elegance, poise, and calm interaction
    utterance.rate = 0.88; 
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingTextId(id);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingTextId(null);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingTextId(null);
    };
    
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, speakingTextId]);

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
  }, [aiHistory, isAiOpen, typingMessageIndex, isAiLoading]);

  const handleSendAiMessage = useCallback(async (messageText: string) => {
    let finalMsg = messageText.trim();
    if (!finalMsg && selectedImage) {
      finalMsg = "Buatkan draf email yang serupa atau berdasarkan gambar yang saya kirim ini.";
    }
    if (!finalMsg) return;
    
    // Stop speaking if active
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingTextId(null);
    }

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
        // Set typing index for the newly added model message
        setTypingMessageIndex(updated.length - 1);
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

  const handleTypewriterComplete = useCallback((idx: number, content: string) => {
    setTypingMessageIndex(null);
    if (autoVoice) {
      speakText(content, idx);
    } else {
      playSciFiSound("success");
    }
  }, [autoVoice, speakText]);

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
                {/* Auto Voice Toggle with pulsing status ring */}
                <button
                  type="button"
                  onClick={toggleAutoVoice}
                  className={hn(
                    "px-2 py-1 border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                    autoVoice 
                      ? "bg-amber-500 border-amber-600 text-white shadow-[0_0_10px_rgba(255,179,0,0.35)]" 
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  )}
                  title="Suara Otomatis JARVIS setelah mengetik"
                >
                  <span className={hn("w-1.5 h-1.5 rounded-full", autoVoice ? "bg-white animate-ping" : "bg-slate-400")} />
                  VOICE: {autoVoice ? "ON" : "OFF"}
                </button>

                {aiHistory.length > 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm("Bersihkan seluruh riwayat obrolan dengan JARVIS?")) {
                        setAiHistory([
                          {
                            role: "model",
                            content: "Halo...Saya JARVIS asisten draf email taktis. Sistem siap mendengarkan perintah Anda!"
                          }
                        ]);
                        addLog("warning", "Riwayat percakapan JARVIS dibersihkan.");
                        playSciFiSound("click");
                      }
                    }}
                    className="px-2 py-1 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    title="Reset obrolan"
                  >
                    Reset
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

            {/* Neural core active wave state */}
            <JarvisVoiceVisualizer isSpeaking={isSpeaking} />

            {/* Chat History & Stream Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent relative z-10">
              {aiHistory.map((msg, idx) => {
                const editMode = editModes[idx] || "preview";
                const setEditMode = (mode: "preview" | "html") => {
                  setEditModes(prev => ({ ...prev, [idx]: mode }));
                };
                const isSpeakingThisMessage = speakingTextId === idx;
                const isTypingThisMessage = typingMessageIndex === idx;
                
                return (
                  <ChatMessageItem
                    key={idx}
                    msg={msg}
                    idx={idx}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    isSpeakingThisMessage={isSpeakingThisMessage}
                    speakText={() => speakText(msg.content, idx)}
                    isTypingThisMessage={isTypingThisMessage}
                    handleTypewriterComplete={() => handleTypewriterComplete(idx, msg.content)}
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
                <div className="bg-slate-900 border border-amber-500/30 text-white rounded-2xl rounded-bl-none p-4 shadow-[0_4px_20px_rgba(255,179,0,0.12)] max-w-[88%] mr-auto space-y-3 relative overflow-hidden z-10 animate-fade-in">
                  {/* Glowing background circuit pulse */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
                  
                  {/* Core Status Header */}
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                    <div className="relative flex items-center justify-center shrink-0">
                      <span className="absolute inline-flex h-3 w-3 rounded-full bg-amber-500/30 animate-ping" />
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin relative" />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[10px] font-mono font-black text-slate-100 tracking-wider uppercase">
                        JARVIS CO-PILOT AGENT
                      </span>
                      <span className="text-[7px] font-mono font-black text-amber-400 uppercase tracking-widest animate-pulse">
                        PIPELINE STATUS: PROCESSING...
                      </span>
                    </div>
                  </div>

                  {/* Real-time Ticking Activity Logs (Replit Agent Style) */}
                  <div className="space-y-2 py-0.5">
                    {aiSteps.map((step) => (
                      <div key={step.id} className="flex items-start gap-2.5 text-[10px] transition-all duration-300">
                        {step.status === "completed" && (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 flex items-center justify-center text-[8px] font-extrabold shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                            ✓
                          </div>
                        )}
                        {step.status === "active" && (
                          <div className="w-4 h-4 rounded-full bg-amber-500/10 border border-amber-500 text-amber-400 flex items-center justify-center text-[7px] font-black shrink-0 relative shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                            <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                            ●
                          </div>
                        )}
                        {step.status === "pending" && (
                          <div className="w-4 h-4 rounded-full bg-slate-800/60 border border-slate-700/80 text-slate-500 flex items-center justify-center text-[7px] font-bold shrink-0">
                            ○
                          </div>
                        )}
                        <span className={hn(
                          "font-semibold transition-colors duration-200 leading-snug",
                          step.status === "completed" && "text-slate-500 line-through decoration-slate-600/60",
                          step.status === "active" && "text-amber-400 font-bold drop-shadow-[0_0_2px_rgba(245,158,11,0.2)]",
                          step.status === "pending" && "text-slate-600"
                        )}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Real-time micro status banner */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[7px] font-mono font-black text-slate-400 uppercase tracking-widest">
                    <span className="truncate max-w-[150px]">AKTIVITAS: {thinkingText}</span>
                    <span className="text-cyan-400 animate-pulse uppercase shrink-0">ONLINE</span>
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
