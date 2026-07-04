import React, { useState, useEffect } from "react";
import { 
  Send, ShieldCheck, Trash2, Plus, AlertCircle, CheckCircle, Info, 
  Loader2, AlertTriangle, Mail, Sparkles, Wand2, Gauge, Languages, X, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RichTextEditor } from "./RichTextEditor";
import { EmailTemplate, SmtpConfig, SpamReport } from "../types";

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

interface SendTabProps {
  smtpConfig: SmtpConfig;
  templates: EmailTemplate[];
  setActiveTab: (tab: "send" | "templates" | "terminal" | "accounts") => void;
  addLog: (type: "info" | "success" | "error" | "warning", msg: string) => void;
  triggerConfetti: () => void;
}

export const SendTab: React.FC<SendTabProps> = ({
  smtpConfig,
  templates,
  setActiveTab,
  addLog,
  triggerConfetti
}) => {
  // --- Email Composer State ---
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    message: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [sendingStage, setSendingStage] = useState("");
  
  // --- Banners ---
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // --- Spam Score Calculation ---
  const [spamReport, setSpamReport] = useState<SpamReport>({
    score: 100,
    level: "Excellent",
    color: "text-emerald-500",
    tips: []
  });

  // Handle logo load reset when config updates
  useEffect(() => {
    setLogoLoadError(false);
  }, [smtpConfig.logoUrl]);

  // Listen to custom apply-template events
  useEffect(() => {
    const handleApplyTemplate = (e: Event) => {
      const customEvt = e as CustomEvent<{ subject: string; html: string }>;
      if (customEvt.detail) {
        setEmailForm({
          to: emailForm.to, // preserve recipient
          subject: customEvt.detail.subject,
          message: customEvt.detail.html
        });
        addLog("info", "Template AI berhasil diterapkan ke form pengiriman.");
      }
    };

    const handleUseTemplate = (e: Event) => {
      const customEvt = e as CustomEvent<EmailTemplate>;
      if (customEvt.detail) {
        setEmailForm({
          to: emailForm.to, // preserve recipient
          subject: customEvt.detail.subject,
          message: customEvt.detail.message
        });
        addLog("info", `Menggunakan template: ${customEvt.detail.name}`);
      }
    };

    window.addEventListener("apply-template", handleApplyTemplate);
    window.addEventListener("use-template", handleUseTemplate);
    return () => {
      window.removeEventListener("apply-template", handleApplyTemplate);
      window.removeEventListener("use-template", handleUseTemplate);
    };
  }, [emailForm.to]);

  // Real-time Gmail/Anti-spam score checker (runs when subject/message is edited)
  useEffect(() => {
    const timer = setTimeout(() => {
      let score = 100;
      const tips: string[] = [];
      const { subject, message } = emailForm;

      if (!subject) return;

      if (subject.length < 3) {
        score -= 10;
        tips.push("Judul terlalu pendek");
      }
      if (subject.toUpperCase() === subject && subject.length > 5) {
        score -= 20;
        tips.push("Hindari HURUF KAPITAL di judul");
      }
      if ((subject.match(/!/g) || []).length > 1) {
        score -= 15;
        tips.push("Kurangi tanda seru di judul");
      }

      // Check spam trigger keywords
      const spamKeywords = ["FREE", "HADIAH", "GRATIS", "WINNER", "URGENT", "CASH", "OFFER", "CLICK HERE", "PROMO", "DISKON"];
      const detectedSpam = spamKeywords.filter(
        word => subject.toUpperCase().includes(word) || message.toUpperCase().includes(word)
      );

      if (detectedSpam.length > 0) {
        score -= detectedSpam.length * 15;
        tips.push(`Kata berisiko tinggi: ${detectedSpam.join(", ")}`);
      }

      if (message.length > 0 && message.length < 20) {
        score -= 10;
        tips.push("Isi pesan terlalu singkat (rawan ditandai bot)");
      }

      if ((message.match(/https?:\/\//g) || []).length > 3) {
        score -= 20;
        tips.push("Terlalu banyak tautan/link");
      }

      score = Math.max(0, score);

      let level: "Excellent" | "Good" | "Risky" | "Likely Spam" = "Excellent";
      let color = "text-emerald-500";

      if (score < 40) {
        level = "Likely Spam";
        color = "text-rose-500";
      } else if (score < 70) {
        level = "Risky";
        color = "text-amber-500";
      } else if (score < 90) {
        level = "Good";
        color = "text-blue-500";
      }

      setSpamReport({ score, level, color, tips });
    }, 400);

    return () => clearTimeout(timer);
  }, [emailForm.subject, emailForm.message]);

  // Main SMTP send trigger
  const runSmtpForwarder = async (toEmail: string, subjectLine: string, messageBody: string) => {
    setIsSending(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    addLog("info", `Forwarding email payload to ${toEmail}...`);

    try {
      const isHtml = /<[a-z][\s\S]*>/i.test(messageBody);
      let richHtml = "";
      if (isHtml) {
        richHtml = messageBody;
      } else {
        richHtml = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px;">
            ${smtpConfig.logoUrl ? `
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${smtpConfig.logoUrl}" alt="Logo" style="height: 50px; width: auto; display: inline-block;" />
            </div>` : ""}
            <div style="font-size: 14px; line-height: 1.6;">
              ${messageBody.replace(/\n/g, "<br>")}
            </div>
          </div>
        `;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          to: toEmail,
          subject: subjectLine,
          text: messageBody.replace(/<[^>]*>/g, ""),
          html: richHtml,
          smtpConfig: smtpConfig.username ? smtpConfig : undefined
        })
      });

      clearTimeout(timeoutId);
      const isJson = response.headers.get("content-type")?.includes("application/json");
      let data;
      
      if (isJson) {
        data = await response.json();
      } else {
        await response.text();
        throw new Error("Gagal menghubungi server. Silakan coba lagi.");
      }

      if (!response.ok) {
        const errorMsg = data.error || "Gagal mengirim email";
        throw new Error(errorMsg);
      }

      setSuccessBanner("Email berhasil dikirim!");
      addLog("success", `Relay sukses. MessageID: ${data.messageId}`);

      return true;
    } catch (err: any) {
      if (err.name === "AbortError") {
        setErrorBanner("Koneksi timeout. Server SMTP gagal terhubung atau port terblokir.");
        addLog("error", "Relay timeout: SMTP Server non-responsif.");
      } else {
        setErrorBanner(err.message);
        addLog("error", `Relay gagal: ${err.message}`);
      }
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.to || !emailForm.subject || !emailForm.message) {
      addLog("warning", "Lengkapi seluruh field sebelum meluncurkan relay.");
      return;
    }

    setSendingProgress(5);
    setSendingStage("Menghubungkan ke server SMTP...");

    let currentProgress = 5;
    const progressInterval = setInterval(() => {
      let increment = 4;
      if (currentProgress > 40) increment = 2;
      if (currentProgress > 75) increment = 1;
      
      currentProgress = Math.min(95, currentProgress + increment);
      setSendingProgress(Math.floor(currentProgress));

      if (currentProgress < 25) {
        setSendingStage("Inisialisasi handshake aman...");
      } else if (currentProgress < 50) {
        setSendingStage("Autentikasi kredensial SMTP...");
      } else if (currentProgress < 75) {
        setSendingStage("Mengonstruksi payload email...");
      } else {
        setSendingStage("Mengunggah data & lampiran...");
      }
    }, 150);

    const isSuccess = await runSmtpForwarder(emailForm.to, emailForm.subject, emailForm.message);
    
    clearInterval(progressInterval);

    if (isSuccess) {
      setSendingProgress(100);
      setSendingStage("Email Berhasil Terkirim!");
      setEmailForm({ to: "", subject: "", message: "" });
      triggerConfetti();
      setTimeout(() => {
        setSuccessBanner(null);
        setSendingProgress(0);
        setSendingStage("");
      }, 4000);
    } else {
      setSendingProgress(0);
      setSendingStage("");
    }
  };

  const useTemplateContent = (t: EmailTemplate) => {
    setEmailForm({
      to: emailForm.to,
      subject: t.subject,
      message: t.message
    });
    addLog("info", `Menggunakan template: ${t.name}`);
  };

  return (
    <>
      <motion.div
        key="send-view"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="p-4 sm:p-5 max-w-[420px] mx-auto flex flex-col w-full h-full min-h-0 overflow-hidden"
      >
        <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden">
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Floating Scan Header Banner */}
            <div className="px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02] flex flex-col gap-1.5 relative shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] font-extrabold text-white/45 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="relative flex items-center justify-center w-2 h-2">
                    <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  </div>
                  Sistem Anti-Spam Gmail
                </h2>
                <span className="text-[9px] sm:text-[10px] font-black text-white/60 uppercase flex items-center gap-1">
                  <div className="w-1 h-2.5 bg-white/10 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] animate-[scan_1.5s_linear_infinite]" />
                  </div>
                  AKTIF
                </span>
              </div>

              {/* Display current active sender SMTP account */}
              {smtpConfig.username ? (
                <div className="flex items-center gap-2 bg-white/[0.04] p-2 rounded-xl shadow-md border border-white/10 hover:bg-white/[0.08] group transition-all">
                  <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-inner shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[6.5px] font-black text-white/40 uppercase tracking-wider">
                      Pengirim: {smtpConfig.fromName || "Tanpa Nama"}
                    </span>
                    <span className="text-[11px] font-black text-white truncate drop-shadow-sm">
                      {smtpConfig.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/10 shrink-0">
                    <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    <span className="text-[7.5px] font-bold text-white uppercase">
                      Relay
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white/[0.01] p-2 rounded-xl border border-white/10 border-dashed justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wide italic">
                    Belum Ada Akun Pengirim. Atur di "Akun".
                  </span>
                </div>
              )}
            </div>

            {/* Email Compose Form */}
            <form onSubmit={handleSendEmailSubmit} className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
              {/* Perfect fit-screen container for inputs and editor */}
              <div className="flex-1 flex flex-col gap-2.5 min-h-0 overflow-hidden">
                {/* Banners */}
                {errorBanner && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl flex flex-col gap-2 relative shrink-0"
                  >
                    <button 
                      type="button" 
                      onClick={() => setErrorBanner(null)}
                      className="absolute top-2 right-2 text-rose-400 hover:text-rose-300"
                    >
                      <Plus className="w-3.5 h-3.5 rotate-45" />
                    </button>
                    <div className="flex gap-2 items-start pr-6">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-200 font-medium leading-normal flex-1">
                        {errorBanner}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("accounts")}
                        className="text-[10px] font-black text-white bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-all uppercase"
                      >
                        Perbaiki SMTP
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("terminal")}
                        className="text-[10px] font-black text-white/70 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-all uppercase"
                      >
                        Lihat Terminal Log
                      </button>
                    </div>
                  </motion.div>
                )}

                {successBanner && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex gap-2.5 items-center relative shrink-0"
                  >
                    <button 
                      type="button" 
                      onClick={() => setSuccessBanner(null)}
                      className="absolute top-2 right-2 text-emerald-400/60 hover:text-emerald-400 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 rotate-45" />
                    </button>
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-200 font-bold uppercase tracking-tight pr-6">
                      {successBanner}
                    </p>
                  </motion.div>
                )}

                {/* Fields */}
                <div className="space-y-2 shrink-0">
                  <div className="relative">
                    <input 
                      required 
                      type="email"
                      value={emailForm.to}
                      onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                      placeholder="Email Penerima" 
                      className="w-full px-3.5 py-2 sm:py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs sm:text-[13px] focus:outline-none focus:bg-white/[0.08] focus:border-white/30 transition-all font-semibold text-white placeholder:text-white/30 shadow-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/40 pointer-events-none uppercase">
                      KE
                    </div>
                  </div>

                  <div className="relative">
                    <input 
                      required 
                      type="text"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                      placeholder="Subjek Email" 
                      className="w-full px-3.5 py-2 sm:py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs sm:text-[13px] focus:outline-none focus:bg-white/[0.08] focus:border-white/30 transition-all font-semibold text-white placeholder:text-white/30 shadow-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      {emailForm.subject && (
                        <div className={`text-[9px] font-black flex items-center gap-1 bg-slate-900/80 ring-1 ring-white/10 px-2 py-1 rounded-full shadow-sm ${spamReport.color}`}>
                          {spamReport.score < 70 ? (
                            <AlertCircle className="w-2.5 h-2.5" />
                          ) : (
                            <ShieldCheck className="w-2.5 h-2.5" />
                          )}
                          {spamReport.level}
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-white/40 uppercase">
                        SUB
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anti-spam Diagnostics Tips */}
                <AnimatePresence>
                  {spamReport.tips.length > 0 && emailForm.subject && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 overflow-hidden shadow-sm shrink-0"
                    >
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[11px] font-extrabold text-white/80 uppercase tracking-wide">
                            Deteksi Proteksi Spam:
                          </p>
                          <ul className="flex flex-wrap gap-x-4 gap-y-1">
                            {spamReport.tips.map((tip, idx) => (
                              <li key={idx} className="text-[10px] font-bold text-white/70 flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-white/60" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* HTML Message Textarea - flex-1 min-h-0 allows it to stretch perfectly */}
                <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between px-1 shrink-0">
                    <label className="text-[11px] font-extrabold text-white/70 uppercase tracking-widest">
                      Isi Pesan (Mendukung HTML & Teks)
                    </label>
                    {emailForm.message && (
                      <button 
                        type="button" 
                        onClick={() => setEmailForm({ ...emailForm, message: "" })}
                        className="flex items-center gap-1 px-2 py-1 hover:bg-rose-950/25 text-white/40 hover:text-rose-400 rounded-lg transition-all active:scale-95 group"
                        title="Hapus Isi Pesan"
                      >
                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                          Hapus Pesan
                        </span>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col gap-1.5">
                    <RichTextEditor 
                      value={emailForm.message}
                      onChange={(val) => setEmailForm({ ...emailForm, message: val })}
                      placeholder="Tulis pesan Anda... (Mendukung paste Rich Text / HTML)"
                      minHeight="80px"
                    />
                  </div>
                </div>
              </div>

              {/* Static Footer (Templates Carousel & Action Button) */}
              <div className="pt-2 flex flex-col gap-2 shrink-0 border-t border-white/10 mt-2">
                {templates.length > 0 && (
                  <div className="flex flex-col gap-1 px-1">
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                      Gunakan Template Tersimpan
                    </span>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => useTemplateContent(t)}
                          className="shrink-0 group flex flex-col items-start p-2 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/35 transition-all shadow-sm active:scale-95 min-w-[90px]"
                        >
                          <span className="text-[9px] font-black text-white group-hover:text-white truncate w-full text-left">
                            {t.name}
                          </span>
                          <span className="text-[7px] font-bold text-white/40 uppercase tracking-tighter truncate w-full text-left">
                            {t.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Elegant Progress Bar */}
                <AnimatePresence>
                  {sendingProgress > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 5, height: 0 }}
                      className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1.5 overflow-hidden shadow-inner mb-1"
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-extrabold text-white/70 uppercase tracking-wider flex items-center gap-1.5 truncate pr-2">
                          {sendingProgress === 100 ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Loader2 className="w-3 h-3 text-emerald-400 animate-spin shrink-0" />
                          )}
                          <span className={`${sendingProgress === 100 ? 'text-emerald-400' : 'text-white/70'} truncate`}>{sendingStage}</span>
                        </span>
                        <span className="font-mono font-black text-emerald-400 shrink-0">
                          {sendingProgress}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900/60 rounded-full overflow-hidden border border-white/5 relative">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all duration-300 ease-out"
                          style={{ width: `${sendingProgress}%` }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit"
                  disabled={isSending}
                  className="w-full py-2 sm:py-2.5 bg-white hover:bg-white/90 text-slate-950 text-[11px] font-bold rounded-xl transition-all shadow-lg shadow-white/5 border border-white/10 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.08em]"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isSending ? "Meneruskan..." : "Relay Sekarang"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </motion.div>
    </>
  );
};
