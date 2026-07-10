import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sparkles, Plus, Loader2, AlertCircle, Send, FileText, Star, Image, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EmailTemplate } from "../types";
import backgroundImage from "../assets/images/background_wallpaper_1783625776258.jpg";

// Classname utility helper locally
function hn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

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
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-amber-400 uppercase tracking-widest font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Kustomisasi Tombol & Link Draf:
      </div>
      <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
        {links.map((link, linkIdx) => (
          <div key={linkIdx} className="p-2 bg-white/[0.03] border border-white/10 rounded-lg space-y-2">
            <div className="text-[9px] font-black text-white/80 uppercase tracking-wider flex items-center justify-between">
              <span>Tombol #{linkIdx + 1}: "{link.text}"</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-extrabold text-white/40 uppercase tracking-wider block mb-1">
                  Teks Tombol
                </label>
                <input
                  type="text"
                  value={link.text}
                  onChange={(e) => {
                    const newHtml = updateHtmlLink(templateHtml, link.index, e.target.value, link.href);
                    onLinkUpdate(newHtml);
                  }}
                  className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/10 rounded-md text-[10px] font-semibold focus:outline-none focus:border-amber-400/50 text-white placeholder:text-white/20 transition-all"
                />
              </div>
              <div>
                <label className="text-[8px] font-extrabold text-white/40 uppercase tracking-wider block mb-1">
                  Link Tujuan (URL)
                </label>
                <input
                  type="text"
                  value={link.href}
                  onChange={(e) => {
                    const newHtml = updateHtmlLink(templateHtml, link.index, link.text, e.target.value);
                    onLinkUpdate(newHtml);
                  }}
                  className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/10 rounded-md text-[10px] font-semibold focus:outline-none focus:border-amber-400/50 text-white placeholder:text-white/20 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

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
  }>>([
    {
      role: "model",
      content: "Halo! Saya adalah G-Swift AI Copilot. Saya bisa membantu Anda merancang draf email profesional, merapikan struktur kalimat, mendesain bukti transfer HTML, atau mengecek deliverabilitas tulisan Anda.\n\nApa yang ingin Anda buat hari ini?"
    }
  ]);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [editModes, setEditModes] = useState<Record<number, "preview" | "html">>({});
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState("G-Swift AI sedang merangkai kata...");

  const aiChatEndRef = useRef<HTMLDivElement | null>(null);

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
  }, [aiHistory, isAiOpen]);

  const handleSendAiMessage = useCallback(async (messageText: string) => {
    let finalMsg = messageText.trim();
    if (!finalMsg && selectedImage) {
      finalMsg = "Buatkan draf email yang serupa atau berdasarkan gambar yang saya kirim ini.";
    }
    if (!finalMsg) return;
    
    const textLower = finalMsg.toLowerCase();
    let currentThinking = "G-Swift AI sedang merangkai kata...";
    
    if (textLower.includes("bukti") || textLower.includes("transaksi") || textLower.includes("resi") || textLower.includes("pembayaran") || textLower.includes("alert") || textLower.includes("pemakaian") || textLower.includes("kartu") || textLower.includes("shopee") || textLower.includes("fraud") || selectedImage) {
      currentThinking = "G-Swift AI sedang memproses gambar & merancang email...";
    } else if (textLower.includes("promosi") || textLower.includes("diskon") || textLower.includes("marketing") || textLower.includes("pemasaran") || textLower.includes("onboarding") || textLower.includes("selamat datang")) {
      currentThinking = "G-Swift AI sedang merancang email promosi...";
    } else if (textLower.includes("optimasi") || textLower.includes("poles") || textLower.includes("perbaiki") || textLower.includes("rapikan") || textLower.includes("sunting")) {
      currentThinking = "G-Swift AI sedang mengoptimalkan draf email...";
    } else if (textLower.includes("analis") || textLower.includes("cek") || textLower.includes("kualitas") || textLower.includes("score")) {
      currentThinking = "G-Swift AI sedang menganalisis kualitas email...";
    } else if (textLower.includes("terjemah") || textLower.includes("translate") || textLower.includes("inggris") || textLower.includes("english")) {
      currentThinking = "G-Swift AI sedang menerjemahkan draf email...";
    } else if (textLower.includes("balas") || textLower.includes("reply") || textLower.includes("jawaban")) {
      currentThinking = "G-Swift AI sedang menyusun balasan email...";
    }
    
    setThinkingText(currentThinking);

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
      setAiHistory((prev) => [...prev, {
        role: "model" as const,
        content: data.message || "Berikut hasil draf email yang berhasil saya buat:",
        template: data.template || null
      }]);
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
            className="fixed inset-0 bg-[#040914]/65 backdrop-blur-sm z-[140]"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#040914] border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[150] flex flex-col overflow-hidden text-white"
          >
            {/* Wallpaper background matching the main app */}
            <img 
              src={backgroundImage} 
              alt="Background Wallpaper" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-40 select-none" 
              referrerPolicy="no-referrer"
            />
            
            {/* Modern dark luxury overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c244b]/15 via-[#040914]/40 to-[#040914]/90 pointer-events-none z-0" />

            {/* Header Banner */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex justify-between items-center shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white overflow-hidden">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    G-Swift AI Copilot
                  </h3>
                  <p className="text-[9px] text-white/60 font-bold leading-none mt-0.5">
                    Asisten email profesional berbasis Gemini AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white/85 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            {/* Chat History & Stream Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent relative z-10">
              {aiHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={hn(
                    "flex flex-col max-w-[85%] rounded-2xl p-3.5 shadow-sm text-xs",
                    msg.role === "user"
                      ? "bg-white text-slate-950 rounded-br-none ml-auto border border-white/20 shadow-lg shadow-white/5 font-extrabold"
                      : "bg-white/[0.03] border border-white/10 text-white rounded-bl-none mr-auto shadow-md"
                  )}
                >
                  <span className={`text-[8px] font-black uppercase tracking-wider mb-1 ${msg.role === "user" ? "text-slate-950/65" : "text-white/65"}`}>
                    {msg.role === "user" ? "Anda" : "G-Swift AI"}
                  </span>
                  
                  {msg.image && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-[180px]">
                      <img 
                        src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                        alt={msg.image.name} 
                        className="w-full h-auto object-cover max-h-[140px]"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <p className={`font-semibold leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "text-slate-900" : "text-white/90"}`}>
                    {msg.content}
                  </p>

                  {/* Display template suggestions inside the chat if present */}
                  {msg.template && (
                    <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-2.5">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 space-y-1.5">
                        <div className="text-[8px] font-extrabold text-white/40 uppercase tracking-widest font-mono">
                          Subjek Rekomendasi (Dapat Diedit):
                        </div>
                        <input
                          type="text"
                          value={msg.template.subject}
                          onChange={(e) => {
                            const updatedHistory = [...aiHistory];
                            updatedHistory[idx].template = {
                              ...msg.template,
                              subject: e.target.value
                            };
                            setAiHistory(updatedHistory);
                          }}
                          className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-amber-400/50 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white focus:outline-none transition-all placeholder:text-white/20"
                          placeholder="Masukkan subjek draf..."
                        />
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[8px] font-extrabold text-white/40 uppercase tracking-widest font-mono">
                            Isi Pesan / Desain Template:
                          </div>
                          
                          {/* Segmented Mode Control */}
                          <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditModes(prev => ({ ...prev, [idx]: 'preview' }));
                              }}
                              className={hn(
                                "px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider rounded transition-all",
                                editModes[idx] !== 'html' 
                                  ? "bg-amber-400 text-slate-950 font-black" 
                                  : "text-white/60 hover:text-white"
                              )}
                            >
                              Pratinjau
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditModes(prev => ({ ...prev, [idx]: 'html' }));
                              }}
                              className={hn(
                                "px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider rounded transition-all",
                                editModes[idx] === 'html' 
                                  ? "bg-amber-400 text-slate-950 font-black" 
                                  : "text-white/60 hover:text-white"
                              )}
                            >
                              Edit Teks & HTML
                            </button>
                          </div>
                        </div>

                        {editModes[idx] === 'html' ? (
                          <div className="w-full h-[220px] rounded-lg overflow-hidden border border-white/10 bg-[#0a0f1d] flex flex-col relative">
                            <textarea
                              value={msg.template.html}
                              onChange={(e) => {
                                const updatedHistory = [...aiHistory];
                                updatedHistory[idx].template = {
                                  ...msg.template,
                                  html: e.target.value
                                };
                                setAiHistory(updatedHistory);
                              }}
                              className="w-full h-full p-3 bg-transparent text-white font-mono text-[10px] resize-none focus:outline-none focus:ring-0 leading-relaxed overflow-y-auto"
                              placeholder="Ketik atau edit semua teks/kode HTML di sini..."
                            />
                            <div className="absolute bottom-2 right-2 bg-slate-950/80 border border-white/10 text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded text-white/60 select-none font-mono">
                              Kode Sumber / Teks
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-[220px] rounded-lg overflow-hidden border border-white/10 bg-white">
                            <iframe
                              title="AI Template Preview"
                              srcDoc={`
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
                                    ${msg.template.html}
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
                                  </body>
                                </html>
                              `}
                              className="w-full h-full border-0 bg-white"
                              sandbox="allow-popups allow-scripts"
                            />
                          </div>
                        )}
                      </div>

                      {/* Custom Button & Link Editor Panel */}
                      <LinkEditor
                        templateHtml={msg.template.html}
                        onLinkUpdate={(newHtml) => {
                          const updatedHistory = [...aiHistory];
                          updatedHistory[idx].template = {
                            ...msg.template,
                            html: newHtml
                          };
                          setAiHistory(updatedHistory);
                        }}
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => applyAiTemplateToForm(msg.template)}
                          className="flex-1 py-2 bg-white hover:bg-white/90 text-slate-950 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all uppercase tracking-wider border border-white/10"
                        >
                          <Send className="w-3 h-3" /> Gunakan di Form
                        </button>
                        <button
                          onClick={() => saveAiTemplateToCollection(msg.template)}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/80 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all uppercase tracking-wider border border-white/10"
                        >
                          <FileText className="w-3 h-3" /> Simpan Koleksi
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isAiLoading && (
                <div className="bg-white/[0.03] border border-white/10 text-white rounded-2xl rounded-bl-none p-3.5 shadow-sm max-w-[85%] mr-auto flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-spin shrink-0" />
                  <span className="text-xs font-bold text-white/60 animate-pulse">
                    {thinkingText}
                  </span>
                </div>
              )}

              {aiError && (
                <div className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl text-[10px] font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <div ref={aiChatEndRef} />
            </div>

            {/* Prompt Quick Suggestion Strip */}
            <div className="px-4 py-2 bg-white/[0.01] border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none shrink-0 relative z-10">
              {[
                { label: "Peringatan Shopee 5Jt", prompt: "Buat draf email peringatan transaksi kartu kredit tidak dikenal di merchant Shopee sebesar Rp 5.000.000 lengkap dengan tombol Batalkan Transaksi." },
                { label: "Klarifikasi Transaksi", prompt: "Buat email klarifikasi keamanan mengenai pemakaian kartu kredit nasabah di merchant Shopee CO ID Jakarta senilai 5 juta rupiah yang membutuhkan verifikasi pembatalan segera." },
                { label: "Batalkan Transaksi Link", prompt: "Susun email peringatan transaksi mencurigakan Shopee senilai 5 juta rupiah yang menyertakan link pembatalan transaksi langsung agar nasabah bisa mengamankan kartunya." },
                { label: "Notifikasi Fraud Shopee", prompt: "Tulis notifikasi fraud alert transaksi kartu kredit di Shopee sebesar Rp 5.000.000 dengan tombol Batalkan Transaksi yang mengarah ke link verifikasi keamanan nasabah." }
              ].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendAiMessage(sug.prompt)}
                  disabled={isAiLoading}
                  className="px-2.5 py-1.5 bg-white/[0.04] border border-white/10 rounded-full hover:border-white/40 hover:text-white text-[9px] font-extrabold text-white/70 hover:bg-white/[0.08] shrink-0 transition-all cursor-pointer shadow-sm uppercase tracking-tight"
                >
                  {sug.label}
                </button>
              ))}
            </div>

            {/* Footer Send Prompt Panel */}
            <div className="p-3 border-t border-white/10 bg-slate-950/50 backdrop-blur-md shrink-0 space-y-2 relative z-10">
              {/* Image Preview if selected */}
              {selectedImage && (
                <div className="flex items-center justify-between p-2 bg-white/[0.03] border border-white/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black shrink-0">
                      <img 
                        src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                        alt="Selected" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-white truncate max-w-[150px]">
                        {selectedImage.name}
                      </span>
                      <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-wider">
                        Foto Siap Dikirim
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="p-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all"
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
                  onClick={() => document.getElementById("ai-image-upload")?.click()}
                  className={`p-2.5 rounded-xl border border-white/10 transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    selectedImage 
                      ? "bg-amber-400/10 text-amber-400 border-amber-400/35" 
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
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
                  className="flex-1 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs font-semibold focus:bg-white/[0.08] focus:outline-none focus:border-white/30 text-white placeholder:text-white/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || (!aiInput.trim() && !selectedImage)}
                  className="p-2.5 bg-white hover:bg-white/90 text-slate-950 rounded-xl shadow-lg shadow-white/5 border border-white/10 transition-all disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
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
