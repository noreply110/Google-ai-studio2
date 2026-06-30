import React, { useState, useEffect } from "react";
import { 
  Send, ShieldCheck, Trash2, Plus, AlertCircle, CheckCircle, Info, 
  Loader2, AlertTriangle, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RichTextEditor } from "./RichTextEditor";
import { EmailTemplate, SmtpConfig, SpamReport } from "../types";

// Classname utility helper locally
function hn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

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
  const [showRocketScreen, setShowRocketScreen] = useState(false);
  
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

      // Dispatch a standard global banking notification event for visual feedback
      window.dispatchEvent(new CustomEvent("banking-notif", {
        detail: {
          id: String(Date.now()),
          type: "sent",
          title: "SISTEM RELAY",
          message: `Email sukses dikirim ke ${toEmail}`,
          timestamp: new Date().toLocaleTimeString(),
          recipient: toEmail,
          subject: subjectLine,
          ip: "Server Node"
        }
      }));

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

    setShowRocketScreen(true);
    // Mimic the streaming delay before trigger
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const isSuccess = await runSmtpForwarder(emailForm.to, emailForm.subject, emailForm.message);
    if (isSuccess) {
      setEmailForm({ to: "", subject: "", message: "" });
      triggerConfetti();
      setTimeout(() => setSuccessBanner(null), 4000);
      setTimeout(() => setShowRocketScreen(false), 800);
    } else {
      setShowRocketScreen(false);
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
      {/* --- ROCKET OVERLAY FOR THIS VIEW --- */}
      <AnimatePresence>
        {showRocketScreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center overflow-hidden bg-slate-950/60 backdrop-blur-sm"
          >
            <div className="relative flex flex-col items-center justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute w-48 h-48 border border-dashed border-blue-500/20 rounded-full"
              />
              {[...Array(5)].map((_, idx) => (
                <motion.div 
                  key={idx}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, delay: idx * 0.2, repeat: Infinity, ease: "linear" }}
                  className="absolute w-40 h-40"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_#0067ac]" />
                </motion.div>
              ))}

              <motion.div 
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ 
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.5, 1, 0.5],
                  boxShadow: ["0 0 30px rgba(0, 103, 172, 0.5)", "0 0 90px rgba(0, 103, 172, 0.8)", "0 0 30px rgba(0, 103, 172, 0.5)"]
                }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="w-32 h-32 bg-white rounded-full flex items-center justify-center relative z-10 border-4 border-[#003A8F] shadow-2xl overflow-hidden p-0"
              >
                {smtpConfig.logoUrl && !logoLoadError ? (
                  <img 
                    src={smtpConfig.logoUrl} 
                    alt="Relay Logo" 
                    className="w-full h-full object-contain p-3"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setLogoLoadError(true);
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#003A8F] p-3">
                    <Mail className="w-10 h-10 mb-1 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#003A8F]/70">Swift</span>
                  </div>
                )}
                <motion.div 
                  animate={{ x: ["100%", "-100%"] }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-45"
                />
              </motion.div>

              {[...Array(12)].map((_, idx) => (
                <motion.div 
                  key={`p-${idx}`}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{ 
                    x: (Math.random() - 0.5) * 650, 
                    y: (Math.random() - 0.5) * 650, 
                    opacity: [0, 1, 0],
                    scale: [0, 2.5, 0]
                  }}
                  transition={{ duration: 0.5, delay: Math.random() * 0.3, repeat: Infinity, ease: "circOut" }}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full"
                />
              ))}
            </div>

            <div className="absolute bottom-1/4 flex flex-col items-center gap-3">
              <motion.div 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                className="flex items-center gap-2"
              >
                <span className="text-blue-300 font-mono text-[10px] font-black uppercase tracking-[0.4em]">
                  Speed Relay Active
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.3, delay: i * 0.1, repeat: Infinity }}
                      className="w-1 h-1 bg-blue-400 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>

              <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="h-full bg-blue-500 shadow-[0_0_15px_#0050B3]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key="send-view"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="p-1.5 sm:p-4 max-w-md mx-auto flex flex-col w-full h-full min-h-0 overflow-hidden"
      >
        <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden">
          <div className="bg-white rounded-2xl border border-white shadow-[0_20px_50px_rgba(0,58,143,0.18)] ring-1 ring-blue-100/50 flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Floating Scan Header Banner */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/80 flex flex-col gap-1.5 relative shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="relative flex items-center justify-center w-2 h-2">
                    <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600 shadow-[0_0_8px_#22c55e]" />
                  </div>
                  Sistem Anti-Spam Gmail
                </h2>
                <span className="text-[9px] sm:text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">
                  <div className="w-1 h-2.5 bg-emerald-500/20 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_4px_#3b82f6] animate-[scan_1.5s_linear_infinite]" />
                  </div>
                  AKTIF
                </span>
              </div>

              {/* Display current active sender SMTP account */}
              {smtpConfig.username ? (
                <div className="flex items-center gap-2 bg-gradient-to-r from-[#0050b3] to-[#003a8f] p-2 rounded-xl shadow-md border border-blue-400/30 group transition-all">
                  <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner overflow-hidden shrink-0">
                    {smtpConfig.logoUrl && !logoLoadError ? (
                      <img 
                        src={smtpConfig.logoUrl} 
                        alt="Sender Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setLogoLoadError(true)}
                      />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[6.5px] font-black text-blue-200 uppercase tracking-wider">
                      Pengirim: {smtpConfig.fromName || "Tance Nama"}
                    </span>
                    <span className="text-[11px] font-black text-white truncate drop-shadow-sm">
                      {smtpConfig.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/10 shrink-0">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_#4ade80]" />
                    <span className="text-[7.5px] font-bold text-white uppercase">
                      Relay
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 border-dashed justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide italic">
                    Belum Ada Akun Pengirim. Atur di "Akun".
                  </span>
                </div>
              )}
            </div>

            {/* Email Compose Form */}
            <form onSubmit={handleSendEmailSubmit} className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
              {/* Scrollable inputs & message editor */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-0.5 min-h-0">
                {/* Banners */}
                {errorBanner && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex flex-col gap-2 relative shrink-0"
                  >
                    <button 
                      type="button" 
                      onClick={() => setErrorBanner(null)}
                      className="absolute top-2 right-2 text-rose-400 hover:text-rose-600"
                    >
                      <Plus className="w-3.5 h-3.5 rotate-45" />
                    </button>
                    <div className="flex gap-2 items-start pr-6">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-800 font-medium leading-normal flex-1">
                        {errorBanner}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("accounts")}
                        className="text-[10px] font-black text-rose-700 bg-white px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-all uppercase"
                      >
                        Perbaiki SMTP
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("terminal")}
                        className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all uppercase"
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
                    className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-2 items-center relative shrink-0"
                  >
                    <button 
                      type="button" 
                      onClick={() => setSuccessBanner(null)}
                      className="absolute top-2 right-2 text-emerald-300 hover:text-emerald-500"
                    >
                      <Plus className="w-3.5 h-3.5 rotate-45" />
                    </button>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-800 font-bold uppercase tracking-tight pr-6">
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
                      className="w-full px-3.5 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-[13px] focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#0050b3] transition-all font-semibold text-slate-900 placeholder:text-slate-400 shadow-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 pointer-events-none uppercase">
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
                      className="w-full px-3.5 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-[13px] focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#0050b3] transition-all font-semibold text-slate-900 placeholder:text-slate-400 shadow-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      {emailForm.subject && (
                        <div className={`text-[9px] font-black flex items-center gap-1 bg-white ring-1 ring-slate-200 px-2 py-1 rounded-full shadow-sm ${spamReport.color}`}>
                          {spamReport.score < 70 ? (
                            <AlertCircle className="w-2.5 h-2.5" />
                          ) : (
                            <ShieldCheck className="w-2.5 h-2.5" />
                          )}
                          {spamReport.level}
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-slate-500 uppercase">
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
                      className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 overflow-hidden shadow-sm shrink-0"
                    >
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wide">
                            Deteksi Proteksi Spam:
                          </p>
                          <ul className="flex flex-wrap gap-x-4 gap-y-1">
                            {spamReport.tips.map((tip, idx) => (
                              <li key={idx} className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-amber-400" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* HTML Message Textarea */}
                <div className="flex flex-col gap-2 flex-1 min-h-[160px] sm:min-h-[220px]">
                  <div className="flex items-center justify-between px-1 shrink-0">
                    <label className="text-[11px] font-extrabold text-[#003A8F] uppercase tracking-widest">
                      Isi Pesan (Mendukung HTML & Teks)
                    </label>
                    {emailForm.message && (
                      <button 
                        type="button" 
                        onClick={() => setEmailForm({ ...emailForm, message: "" })}
                        className="flex items-center gap-1 px-2 py-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all active:scale-95 group"
                        title="Hapus Isi Pesan"
                      >
                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                          Hapus Pesan
                        </span>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-h-0">
                    <RichTextEditor 
                      value={emailForm.message}
                      onChange={(val) => setEmailForm({ ...emailForm, message: val })}
                      placeholder="Tulis pesan Anda... (Mendukung paste Rich Text / HTML)"
                      minHeight="100%"
                    />
                  </div>
                </div>
              </div>

              {/* Static Footer (Templates Carousel & Action Button) */}
              <div className="pt-2 flex flex-col gap-2.5 shrink-0 border-t border-slate-100 mt-2">
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
                          className="shrink-0 group flex flex-col items-start p-2 bg-white border border-slate-200 rounded-xl hover:border-[#003A8F] transition-all shadow-sm hover:shadow-blue-100 active:scale-95 min-w-[90px]"
                        >
                          <span className="text-[9px] font-black text-slate-800 group-hover:text-[#003A8F] truncate w-full text-left">
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

                <button 
                  type="submit"
                  disabled={isSending}
                  className="w-full py-2 sm:py-2.5 bg-gradient-to-b from-[#0050b3] via-[#003a8f] to-[#002c6c] hover:from-[#003a8f] hover:to-[#002150] text-white text-[11px] font-bold rounded-xl transition-all shadow-lg shadow-blue-900/15 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.08em]"
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
