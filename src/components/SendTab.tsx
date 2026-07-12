import React, { useState, useEffect } from "react";
import { 
  Send, ShieldCheck, Trash2, Plus, AlertCircle, CheckCircle, Info, 
  Loader2, AlertTriangle, Mail, Globe, Sparkles, Wand2, Gauge, Languages, X, Check
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

export const SendTab: React.FC<SendTabProps> = React.memo(({
  smtpConfig,
  templates,
  setActiveTab,
  addLog,
  triggerConfetti
}) => {
  // --- Email Composer State ---
  const [emailForm, setEmailForm] = useState(() => {
    let initialTo = "";
    let initialSubject = "";
    let initialMessage = "";
    if (typeof window !== "undefined") {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const toParam = searchParams.get("to") || searchParams.get("recipient") || searchParams.get("email") || "";
        if (toParam) {
          initialTo = decodeURIComponent(toParam).trim();
        }
        
        const subjectParam = searchParams.get("subject") || searchParams.get("title") || "";
        if (subjectParam) {
          initialSubject = decodeURIComponent(subjectParam).trim();
        }
        
        const messageParam = searchParams.get("body") || searchParams.get("message") || searchParams.get("html") || "";
        if (messageParam) {
          initialMessage = decodeURIComponent(messageParam).trim();
        }
      } catch (err) {
        console.error("Error parsing query params", err);
      }
    }
    return {
      to: initialTo,
      subject: initialSubject,
      message: initialMessage
    };
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
        setEmailForm(prev => ({
          ...prev,
          subject: customEvt.detail.subject,
          message: customEvt.detail.html
        }));
        addLog("info", "Template AI berhasil diterapkan ke form pengiriman.");
      }
    };

    const handleUseTemplate = (e: Event) => {
      const customEvt = e as CustomEvent<EmailTemplate>;
      if (customEvt.detail) {
        setEmailForm(prev => ({
          ...prev,
          subject: customEvt.detail.subject,
          message: customEvt.detail.message
        }));
        addLog("info", `Menggunakan template: ${customEvt.detail.name}`);
      }
    };

    window.addEventListener("apply-template", handleApplyTemplate);
    window.addEventListener("use-template", handleUseTemplate);
    return () => {
      window.removeEventListener("apply-template", handleApplyTemplate);
      window.removeEventListener("use-template", handleUseTemplate);
    };
  }, []);

  // Handle auto-filled email from URL query string on mount
  useEffect(() => {
    if (emailForm.to) {
      addLog("success", `Auto-fill email penerima terdeteksi: ${emailForm.to}`);
      // Clean query params to keep address bar pristine
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (e) {
        console.error("Gagal membersihkan URL query", e);
      }
    }
  }, []);

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
        className="p-4 sm:p-5 max-w-[420px] lg:max-w-[960px] xl:max-w-[1100px] mx-auto flex flex-col w-full h-full min-h-0 overflow-hidden"
      >
        <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Floating Scan Header Banner */}
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-1.5 relative shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="relative flex items-center justify-center w-2 h-2">
                    <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                  </div>
                  Sistem Anti-Spam Gmail
                </h2>
                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                  <div className="w-1 h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 animate-[scan_1.5s_linear_infinite]" />
                  </div>
                  AKTIF
                </span>
              </div>

              {/* Display current active sender SMTP account on mobile (hidden on desktop right side) */}
              <div className="lg:hidden">
                {smtpConfig.username ? (
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-100 group transition-all">
                    <div className="w-7 h-7 rounded-full bg-slate-200/50 flex items-center justify-center border border-slate-300 shadow-inner shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-700 animate-pulse" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider">
                        Pengirim: {smtpConfig.fromName || "Tanpa Nama"}
                      </span>
                      <span className="text-[11px] font-black text-slate-800 truncate">
                        {smtpConfig.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-200 shrink-0">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      <span className="text-[7.5px] font-bold text-slate-600 uppercase">
                        Relay
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-200 border-dashed justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide italic">
                      Belum Ada Akun Pengirim. Atur di "Akun".
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Email Compose Form */}
            <form onSubmit={handleSendEmailSubmit} className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
              {/* Responsive Split Container */}
              <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
                
                {/* Left Column: Form Fields */}
                <div className="flex-1 flex flex-col gap-2.5 min-h-0 overflow-hidden">
                  {/* Banners */}
                  {errorBanner && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-2 relative shrink-0"
                    >
                      <button 
                        type="button" 
                        onClick={() => setErrorBanner(null)}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-600"
                      >
                        <Plus className="w-3.5 h-3.5 rotate-45" />
                      </button>
                      <div className="flex gap-2 items-start pr-6">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-700 font-medium leading-normal flex-1">
                          {errorBanner}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button 
                          type="button" 
                          onClick={() => setActiveTab("accounts")}
                          className="text-[10px] font-black text-rose-700 bg-rose-100/50 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition-all uppercase"
                        >
                          Perbaiki SMTP
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setActiveTab("terminal")}
                          className="text-[10px] font-black text-rose-600/70 bg-rose-100/30 px-3 py-1.5 rounded-lg border border-rose-200/50 hover:bg-rose-100/50 transition-all uppercase"
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
                      className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-2.5 items-center relative shrink-0"
                    >
                      <button 
                        type="button" 
                        onClick={() => setSuccessBanner(null)}
                        className="absolute top-2 right-2 text-emerald-500 hover:text-emerald-600 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 rotate-45" />
                      </button>
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-xs text-emerald-700 font-bold uppercase tracking-tight pr-6">
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
                        className="w-full px-3.5 py-2 sm:py-2.5 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] focus:outline-none focus:border-jago focus:ring-1 focus:ring-jago/20 transition-all font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none uppercase">
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
                        className="w-full px-3.5 py-2 sm:py-2.5 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] focus:outline-none focus:border-jago focus:ring-1 focus:ring-jago/20 transition-all font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        {emailForm.subject && (
                          <div className="text-[9px] font-black flex items-center gap-1 bg-slate-100 ring-1 ring-slate-200 px-2 py-1 rounded-full shadow-sm">
                            {spamReport.score < 70 ? (
                              <AlertCircle className={`w-2.5 h-2.5 ${spamReport.color}`} />
                            ) : (
                              <ShieldCheck className={`w-2.5 h-2.5 ${spamReport.color}`} />
                            )}
                            <span className={spamReport.color}>{spamReport.level}</span>
                          </div>
                        )}
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          SUB
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Anti-spam Diagnostics Tips on Mobile (hidden on desktop) */}
                  <div className="lg:hidden">
                    <AnimatePresence>
                      {spamReport.tips.length > 0 && emailForm.subject && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 overflow-hidden shadow-sm shrink-0 mb-2"
                        >
                          <div className="flex gap-2">
                            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                                Deteksi Proteksi Spam:
                              </p>
                              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                                {spamReport.tips.map((tip, idx) => (
                                  <li key={idx} className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-400" />
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* HTML Message Textarea - flex-1 min-h-0 allows it to stretch perfectly */}
                  <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between px-1 shrink-0">
                      <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
                        Isi Pesan (Mendukung HTML & Teks)
                      </label>
                      {emailForm.message && (
                        <button 
                          type="button" 
                          onClick={() => setEmailForm({ ...emailForm, message: "" })}
                          className="flex items-center gap-1 px-2 py-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all active:scale-95 group"
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
                        minHeight="120px"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Diagnostics & Templates (Only on desktop lg size) */}
                <div className="hidden lg:flex w-full lg:w-[280px] xl:w-[320px] shrink-0 flex-col gap-3.5 min-h-0 overflow-y-auto no-scrollbar lg:border-l lg:border-slate-200 lg:pl-5">
                  {/* Sender SMTP Info Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2 shadow-sm">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kredensial Aktif</span>
                    {smtpConfig.username ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center border border-slate-300 shadow-inner shrink-0">
                          <ShieldCheck className="w-4 h-4 text-slate-700 animate-pulse" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[11px] font-black text-slate-800 truncate">
                            {smtpConfig.username}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                            Host: {smtpConfig.host}:{smtpConfig.port}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 border-dashed justify-center bg-slate-50/50">
                        <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide italic text-center">
                          Belum Ada SMTP Aktif
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Circular visual for Spam Score */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Skor Proteksi Spam</span>
                    <div className="relative flex items-center justify-center w-24 h-24 mb-2">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="rgba(0,0,0,0.05)" strokeWidth="6" fill="transparent" />
                        <circle 
                          cx="48" 
                          cy="48" 
                          r="40" 
                          stroke="currentColor" 
                          strokeWidth="6" 
                          fill="transparent" 
                          className={spamReport.color}
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - (emailForm.subject ? spamReport.score : 100) / 100)}
                          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-slate-800">{emailForm.subject ? spamReport.score : 100}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{emailForm.subject ? spamReport.level : "Excellent"}</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 leading-tight">
                      {(!emailForm.subject || spamReport.score >= 90) 
                        ? "Email Anda sangat aman dari filter spam Gmail!" 
                        : "Perbaiki saran berikut agar email lolos filter spam utama."}
                    </p>
                  </div>

                  {/* Anti-spam Diagnostics Tips list */}
                  {spamReport.tips.length > 0 && emailForm.subject && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                      <p className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        Saran Anti-Spam:
                      </p>
                      <ul className="space-y-1.5">
                        {spamReport.tips.map((tip, idx) => (
                          <li key={idx} className="text-[10px] font-bold text-slate-600 flex items-start gap-1.5 leading-snug">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Templates Quick selector in right sidebar */}
                  {templates.length > 0 && (
                    <div className="flex flex-col gap-2 mt-auto">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        Gunakan Template Cepat
                      </span>
                      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto no-scrollbar">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => useTemplateContent(t)}
                            className="group flex flex-col items-start p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-jago transition-all shadow-sm active:scale-95 text-left truncate cursor-pointer"
                          >
                            <span className="text-[9px] font-black text-slate-800 group-hover:text-jago-dark truncate w-full">
                              {t.name}
                            </span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full">
                              {t.category}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Static Footer (Mobile Templates Carousel & Action Button) */}
              <div className="pt-2 flex flex-col gap-2 shrink-0 border-t border-slate-200 mt-2">
                {/* Mobile templates carousel only visible on mobile (hidden on desktop right-side is active) */}
                <div className="lg:hidden">
                  {templates.length > 0 && (
                    <div className="flex flex-col gap-1 px-1">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        Gunakan Template Tersimpan
                      </span>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => useTemplateContent(t)}
                            className="shrink-0 group flex flex-col items-start p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-jago transition-all shadow-sm active:scale-95 min-w-[90px] cursor-pointer"
                          >
                            <span className="text-[9px] font-black text-slate-800 group-hover:text-jago-dark truncate w-full text-left">
                              {t.name}
                            </span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full text-left">
                              {t.category}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Elegant Progress Bar */}
                <AnimatePresence>
                  {sendingProgress > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 5, height: 0 }}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 overflow-hidden shadow-inner mb-1"
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 truncate pr-2">
                          {sendingProgress === 100 ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Loader2 className="w-3 h-3 text-emerald-500 animate-spin shrink-0" />
                          )}
                          <span className={`${sendingProgress === 100 ? 'text-emerald-500' : 'text-slate-600'} truncate`}>{sendingStage}</span>
                        </span>
                        <span className="font-mono font-black text-emerald-500 shrink-0">
                          {sendingProgress}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
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
                  className="w-full py-2 sm:py-2.5 bg-jago hover:bg-jago-hover text-white text-[11px] font-extrabold rounded-xl transition-all shadow-md shadow-jago/10 border border-jago-dark flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.08em] cursor-pointer"
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
});
