import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Plus, Loader2, AlertCircle, Send, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EmailTemplate } from "../types";

// Classname utility helper locally
function hn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

interface AiCopilotWidgetProps {
  isAiOpen: boolean;
  setIsAiOpen: (open: boolean) => void;
  setActiveTab: (tab: "send" | "templates" | "terminal" | "accounts") => void;
  addLog: (type: "info" | "success" | "error" | "warning", msg: string) => void;
  templates: EmailTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<EmailTemplate[]>>;
}

export const AiCopilotWidget: React.FC<AiCopilotWidgetProps> = ({
  isAiOpen,
  setIsAiOpen,
  setActiveTab,
  addLog,
  templates,
  setTemplates
}) => {
  const [aiHistory, setAiHistory] = useState<Array<{ role: "user" | "model"; content: string; template?: any }>>([
    {
      role: "model",
      content: "Halo! Saya adalah G-Swift AI Copilot. Saya bisa membantu Anda merancang draf email profesional, merapikan struktur kalimat, mendesain bukti transfer HTML, atau mengecek deliverabilitas tulisan Anda.\n\nApa yang ingin Anda buat hari ini?"
    }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const aiChatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll chat to bottom when history or state changes
  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiHistory, isAiOpen]);

  const handleSendAiMessage = async (messageText: string) => {
    if (!messageText.trim()) return;
    
    const newUserMessage = { role: "user" as const, content: messageText };
    setAiHistory((prev) => [...prev, newUserMessage]);
    setAiInput("");
    setIsAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: aiHistory.map(h => ({ role: h.role, content: h.content }))
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
      console.error("AI Error:", err);
      setAiError(err.message || "Koneksi AI terputus atau API Key belum diset.");
      setAiHistory((prev) => [...prev, {
        role: "model" as const,
        content: `Maaf, saya mengalami kendala: ${err.message || "Gagal menghubungi AI. Pastikan Anda telah mengonfigurasi GEMINI_API_KEY di Settings."}`
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyAiTemplateToForm = (tpl: { subject: string; html: string }) => {
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
  };

  const saveAiTemplateToCollection = (tpl: { subject: string; html: string; category?: string }) => {
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
  };

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
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[140]"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-150 shadow-[0_0_50px_rgba(0,0,0,0.15)] z-[150] flex flex-col overflow-hidden"
          >
            {/* Header Banner */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0050b3]">
                  <Sparkles className="w-4 h-4 text-[#0050b3] animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                    G-Swift AI Copilot
                  </h3>
                  <p className="text-[9px] text-slate-500 font-bold leading-none mt-0.5">
                    Asisten email profesional berbasis Gemini AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            {/* Chat History & Stream Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
              {aiHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={hn(
                    "flex flex-col max-w-[85%] rounded-2xl p-3.5 shadow-sm text-xs",
                    msg.role === "user"
                      ? "bg-[#003A8F] text-white rounded-br-none ml-auto"
                      : "bg-white border border-slate-100 text-slate-800 rounded-bl-none mr-auto"
                  )}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider mb-1 opacity-60">
                    {msg.role === "user" ? "Anda" : "G-Swift AI"}
                  </span>
                  <p className="font-semibold leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>

                  {/* Display template suggestions inside the chat if present */}
                  {msg.template && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100/80 space-y-2.5">
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5">
                        <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                          Subjek Rekomendasi:
                        </div>
                        <div className="text-[11px] font-extrabold text-slate-950 leading-tight">
                          {msg.template.subject}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5">
                        <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                          Pratinjau Pesan / HTML:
                        </div>
                        <div
                          className="text-[10px] text-slate-600 max-h-[140px] overflow-y-auto border border-slate-150/60 bg-white p-2 rounded-lg font-mono whitespace-pre-wrap select-all truncate"
                          dangerouslySetInnerHTML={{ __html: msg.template.html }}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => applyAiTemplateToForm(msg.template)}
                          className="flex-1 py-2 bg-[#0050b3] hover:bg-blue-700 text-white text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all uppercase tracking-wider"
                        >
                          <Send className="w-3 h-3" /> Gunakan di Form
                        </button>
                        <button
                          onClick={() => saveAiTemplateToCollection(msg.template)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all uppercase tracking-wider border border-slate-200"
                        >
                          <FileText className="w-3 h-3" /> Simpan Koleksi
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isAiLoading && (
                <div className="bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-none p-3.5 shadow-sm max-w-[85%] mr-auto flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-[#0050b3] animate-spin" />
                  <span className="text-xs font-bold text-slate-500 animate-pulse">
                    G-Swift AI sedang merangkai kata...
                  </span>
                </div>
              )}

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <div ref={aiChatEndRef} />
            </div>

            {/* Prompt Quick Suggestion Strip */}
            <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
              {[
                { label: "Bukti Transfer", prompt: "Buat email bukti transfer Bank Mandiri sukses sebesar Rp 1.500.000 ke rekening BCA Sdr. Hendra Wijaya dengan catatan Pembayaran Invoice IT." },
                { label: "Email Promosi", prompt: "Buat email promosi diskon 50% yang menarik untuk akhir tahun." },
                { label: "Server Down", prompt: "Buat pemberitahuan pemeliharaan server darurat (Server Down) yang profesional kepada client." },
                { label: "Sambutan Baru", prompt: "Buat email selamat datang / onboarding yang hangat untuk member baru." },
                { label: "Optimasi Draf", prompt: "Tolong perbaiki dan buat email ini agar terdengar sangat formal dan sopan: [Masukkan draf Anda di sini]" }
              ].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendAiMessage(sug.prompt)}
                  disabled={isAiLoading}
                  className="px-2.5 py-1.5 bg-white border border-slate-200/60 rounded-full hover:border-[#0050b3] hover:text-[#0050b3] text-[9px] font-extrabold text-slate-600 shrink-0 transition-all cursor-pointer shadow-sm uppercase tracking-tight"
                >
                  {sug.label}
                </button>
              ))}
            </div>

            {/* Footer Send Prompt Panel */}
            <div className="p-3 border-t border-slate-100 bg-white shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAiMessage(aiInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  disabled={isAiLoading}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Tanya AI / Tulis prompt draf email..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !aiInput.trim()}
                  className="p-2.5 bg-[#0050b3] hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 transition-all disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
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
};
