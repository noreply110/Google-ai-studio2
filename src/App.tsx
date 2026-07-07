/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Terminal as TerminalIcon, FileText, Settings, KeyRound, CheckCircle, 
  ChevronLeft, Loader2, AlertCircle, AlertTriangle, Mail, Globe, Sparkle, Sparkles, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { EmailTemplate, SmtpConfig, LogEntry, BankingNotification } from "./types";
import { SendTab } from "./components/SendTab";
import { TemplatesTab } from "./components/TemplatesTab";
import { TerminalTab } from "./components/TerminalTab";
import { AccountsTab } from "./components/AccountsTab";
import { AiCopilotWidget } from "./components/AiCopilotWidget";
import { RichTextEditor } from "./components/RichTextEditor";

// Classname utility helper locally
function hn(...args: any[]) {
  return args.filter(Boolean).join(" ").trim();
}

export default function App() {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("admin_logged_in") === "true";
  });
  const [passcode, setPasscode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);
  const [savedPasscode, setSavedPasscode] = useState(() => {
    const saved = localStorage.getItem("app_passcode");
    if (saved && /^\d{6}$/.test(saved)) return saved;
    return "030819";
  });

  // --- Passcode Change States ---
  const [currentPasscodeForm, setCurrentPasscodeForm] = useState("");
  const [newPasscodeForm, setNewPasscodeForm] = useState("");
  const [confirmPasscodeForm, setConfirmPasscodeForm] = useState("");
  const [passcodeChangeError, setPasscodeChangeError] = useState<string | null>(null);
  const [passcodeChangeSuccess, setPasscodeChangeSuccess] = useState<string | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

  // --- Navigation & Core Views ---
  const [activeTab, setActiveTab] = useState<"send" | "templates" | "terminal" | "accounts">("send");

  // --- Email Tracking State ---
  const [bankingNotifications, setBankingNotifications] = useState<BankingNotification[]>([]);

  // --- Status and Alerts ---
  const [apiStatus, setApiStatus] = useState<any>(null);

  // --- Beautiful Visual Effects States ---
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<any[]>([]);

  // --- Streaming Terminal Logs ---
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // --- Templates CRUD & Modal ---
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    const saved = localStorage.getItem("email_templates");
    if (saved) return JSON.parse(saved);
    return [];
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "General" as const,
    subject: "",
    message: ""
  });

  // --- Preview & Quick-Test Modals ---
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [quickTestTemplate, setQuickTestTemplate] = useState<EmailTemplate | null>(null);
  const [quickTestRecipient, setQuickTestRecipient] = useState("");
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  // --- AI Assistant Toggle State ---
  const [isAiOpen, setIsAiOpen] = useState(false);

  // --- SMTP Configuration State ---
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    const defaultLogo = "";
    const saved = localStorage.getItem("relay_smtp_config") || localStorage.getItem("smtp_account");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.logoUrl === undefined) {
        parsed.logoUrl = defaultLogo;
      }
      return parsed;
    }
    return {
      host: "smtp.gmail.com",
      port: "587",
      username: "",
      password: "",
      senderEmail: "",
      fromName: "",
      replyTo: "",
      dailyLimit: "200",
      connectionType: "STARTTLS",
      logoUrl: defaultLogo
    };
  });

  const [logoLoadError, setLogoLoadError] = useState(false);

  useEffect(() => {
    setLogoLoadError(false);
  }, [smtpConfig.logoUrl]);

  // Handle global banking-notif event with auto-dismiss
  useEffect(() => {
    const handleBankingNotif = (e: Event) => {
      const customEvt = e as CustomEvent<BankingNotification>;
      if (customEvt.detail) {
        const id = customEvt.detail.id || String(Date.now() + Math.random());
        const newNotif = { ...customEvt.detail, id };
        setBankingNotifications(prev => [newNotif, ...prev]);

        // Auto-dismiss after 3.5 seconds
        setTimeout(() => {
          setBankingNotifications(prev => prev.filter(n => n.id !== id));
        }, 3500);
      }
    };
    window.addEventListener("banking-notif", handleBankingNotif);
    return () => window.removeEventListener("banking-notif", handleBankingNotif);
  }, []);

  const triggerConfetti = () => {
    setShowConfetti(true);
    const colors = ["#fbbf24", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#f43f5e", "#00ffff"];
    const shapes = ["circle", "star", "square", "triangle"];
    const particles = Array.from({ length: 80 }).map((_, i) => {
      const angle = (Math.random() * 360 * Math.PI) / 180;
      const velocity = Math.random() * 15 + 10;
      return {
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 10, // upward initial push
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: Math.random() * 12 + 6,
        rotate: Math.random() * 360,
        rotateSpeed: (Math.random() - 0.5) * 15,
        duration: Math.random() * 2 + 1.5,
        delay: Math.random() * 0.1,
      };
    });
    setConfettiParticles(particles);
    setTimeout(() => {
      setShowConfetti(false);
      setConfettiParticles([]);
    }, 4000);
  };

  const addLog = (type: "info" | "success" | "error" | "warning", msg: string) => {
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [...prev, { timestamp, type, message: msg }].slice(-50));
  };

  const checkBackendHealth = async () => {
    try {
      const res = await fetch("/api/health");
      const contentType = res.headers.get("content-type");
      
      if (!res.ok) {
        const text = await res.text();
        addLog("error", `API Connection Error (${res.status}): ${text.substring(0, 30)}...`);
        return;
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setApiStatus(data);
        if (data.smtp_configured || smtpConfig.username) {
          addLog("success", "Koneksi Relay terjalin.");
        }
      } else {
        addLog("error", "Respons API tidak valid (Bukan JSON).");
      }
    } catch {
      addLog("error", "API tidak terjangkau. Server sedang restart atau belum siap.");
    }
  };

  // Initial Bootup Connection Diagnostics
  useEffect(() => {
    addLog("info", "G-Swift Relay active. System ready.");
    checkBackendHealth();
  }, []);

  // Auto-verify PIN when it reaches 6 digits
  useEffect(() => {
    if (!isLoggedIn && passcode.length === 6) {
      if (passcode === savedPasscode) {
        setIsLoggedIn(true);
        if (rememberMe) {
          localStorage.setItem("admin_logged_in", "true");
        }
        setPasscodeError(false);
      } else {
        setPasscodeError(true);
        const timer = setTimeout(() => {
          setPasscode("");
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [passcode, savedPasscode, rememberMe, isLoggedIn]);

  // Listen to physical keyboard for PIN login when not logged in
  useEffect(() => {
    if (isLoggedIn) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        setPasscodeError(false);
        setPasscode((prev) => {
          if (prev.length < 6) return prev + e.key;
          return prev;
        });
      } else if (e.key === "Backspace") {
        setPasscodeError(false);
        setPasscode((prev) => prev.slice(0, -1));
      } else if (e.key === "Escape" || e.key === "Delete") {
        setPasscodeError(false);
        setPasscode("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoggedIn]);

  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeChangeError(null);
    setPasscodeChangeSuccess(null);

    if (currentPasscodeForm !== savedPasscode) {
      setPasscodeChangeError("PIN saat ini tidak benar.");
      addLog("error", "Gagal mengganti PIN: PIN lama salah.");
      return;
    }

    if (!newPasscodeForm) {
      setPasscodeChangeError("PIN baru tidak boleh kosong.");
      return;
    }

    if (!/^\d{6}$/.test(newPasscodeForm)) {
      setPasscodeChangeError("PIN baru harus berupa 6 digit angka.");
      addLog("error", "Gagal mengganti PIN: PIN harus 6 digit angka.");
      return;
    }

    if (newPasscodeForm !== confirmPasscodeForm) {
      setPasscodeChangeError("Konfirmasi PIN baru tidak cocok.");
      return;
    }

    localStorage.setItem("app_passcode", newPasscodeForm);
    setSavedPasscode(newPasscodeForm);
    setPasscodeChangeSuccess("PIN keamanan berhasil diperbarui!");
    addLog("success", "PIN keamanan panel berhasil diubah.");
    
    setCurrentPasscodeForm("");
    setNewPasscodeForm("");
    setConfirmPasscodeForm("");
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    localStorage.setItem("email_templates", JSON.stringify(updated));
    addLog("warning", "Template berhasil dihapus.");
  };

  const handleSaveTemplateSubmit = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.message) {
      return;
    }

    if (editingTemplateId) {
      const updated = templates.map((t) =>
        t.id === editingTemplateId
          ? {
              ...t,
              name: templateForm.name,
              category: templateForm.category,
              subject: templateForm.subject,
              message: templateForm.message
            }
          : t
      );
      setTemplates(updated);
      localStorage.setItem("email_templates", JSON.stringify(updated));
      addLog("info", `Template "${templateForm.name}" diperbarui.`);
    } else {
      const newTemplate: EmailTemplate = {
        id: Math.random().toString(36).substring(7),
        name: templateForm.name,
        category: templateForm.category,
        subject: templateForm.subject,
        message: templateForm.message,
        createdAt: Date.now()
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      localStorage.setItem("email_templates", JSON.stringify(updated));
      addLog("success", `Template "${templateForm.name}" disimpan.`);
    }

    setShowTemplateModal(false);
    setEditingTemplateId(null);
    setTemplateForm({ name: "", category: "General", subject: "", message: "" });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPasscode("");
    localStorage.removeItem("admin_logged_in");
    addLog("warning", "Admin keluar dari sistem.");
  };

  // --- RENDER 2: LOGIN PAGE ---
  if (!isLoggedIn) {
    const handleKeypadPress = (key: string) => {
      setPasscodeError(false);
      setPasscode((prev) => {
        if (prev.length < 6) return prev + key;
        return prev;
      });
    };

    const handleKeypadBackspace = () => {
      setPasscodeError(false);
      setPasscode((prev) => prev.slice(0, -1));
    };

    const handleKeypadClear = () => {
      setPasscodeError(false);
      setPasscode("");
    };

    return (
      <div className="flex min-h-screen bg-gradient-to-b from-[#132c4a] via-[#0b132b] to-[#05070c] items-center justify-center p-4 relative overflow-y-auto font-sans select-none text-white">
        
        {/* Subtle top indicator bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900/40 via-blue-500/20 to-blue-900/40 z-[60]" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-[340px] sm:max-w-sm w-full flex flex-col items-center relative z-10 px-4 py-6"
        >
          {/* Main Title matching the requested screenshot */}
          <div className="w-full text-center flex flex-col gap-2 mb-8">
            <h1 className="text-xl sm:text-2xl font-normal text-white/95 tracking-wide">
              Masukkan Kata sandi
            </h1>
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em]">
              SwiftRelay Admin
            </p>
          </div>

          {/* PIN Dots display: thin hollow circles when empty, solid white when filled */}
          <motion.div 
            animate={passcodeError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex justify-center gap-4.5 py-2 my-2 w-full"
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = passcode.length > index;
              return (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 transition-all duration-200 ${
                    passcodeError
                      ? "border-rose-500 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      : isFilled 
                        ? "border-white bg-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.8)]" 
                        : "border-white/30 bg-transparent"
                  }`}
                />
              );
            })}
          </motion.div>

          <div className="h-6 flex items-center justify-center mb-3">
            <AnimatePresence mode="wait">
              {passcodeError && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="text-[10px] font-bold text-rose-400 text-center uppercase tracking-wider bg-rose-950/40 px-3 py-1 rounded-full border border-rose-800/30"
                >
                  PIN Salah! Silakan coba lagi
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Remember Me toggle (integrated sleekly) */}
          <label className="flex items-center gap-2 justify-center cursor-pointer mb-8 group w-fit mx-auto">
            <div 
              className={`w-4 h-4 rounded-md flex items-center justify-center transition-all border ${
                rememberMe 
                  ? "bg-white border-white text-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                  : "border-white/30 bg-transparent group-hover:border-white/50 text-transparent"
              }`}
            >
              <CheckCircle className={`w-3 h-3 ${rememberMe ? "text-slate-950" : "text-transparent"}`} strokeWidth={3.5} />
            </div>
            <input 
              type="checkbox" 
              className="hidden"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest select-none pt-0.5 group-hover:text-white/80 transition-colors">
              Ingat Saya
            </span>
          </label>

          {/* Clean Keypad: Round semi-transparent circle buttons matching image */}
          <div className="grid grid-cols-3 gap-y-5 gap-x-6 justify-items-center w-full max-w-[260px] sm:max-w-[280px] mx-auto mb-8">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.9, backgroundColor: "rgba(255, 255, 255, 0.22)" }}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/[0.08] hover:bg-white/[0.13] text-white font-normal text-3xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/[0.03] select-none"
              >
                {num}
              </motion.button>
            ))}
            
            {/* Row 4: Empty space, "0" button, Empty space */}
            <div className="w-16 h-16 sm:w-18 sm:h-18" />
            <motion.button
              whileTap={{ scale: 0.9, backgroundColor: "rgba(255, 255, 255, 0.22)" }}
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/[0.08] hover:bg-white/[0.13] text-white font-normal text-3xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/[0.03] select-none"
            >
              0
            </motion.button>
            <div className="w-16 h-16 sm:w-18 sm:h-18" />
          </div>

          {/* Bottom Controls: "Darurat" on left, "Kembali" on right matching image */}
          <div className="flex justify-between items-center w-full max-w-[240px] sm:max-w-[260px] px-2 mt-4 text-xs font-normal text-white/70 select-none">
            <button 
              type="button"
              onClick={handleKeypadClear}
              className="hover:text-white transition-colors cursor-pointer active:scale-95 py-2 px-1 font-medium tracking-wide"
            >
              Darurat
            </button>
            <button 
              type="button"
              onClick={handleKeypadBackspace}
              className="hover:text-white transition-colors cursor-pointer active:scale-95 py-2 px-1 font-medium tracking-wide"
            >
              Kembali
            </button>
          </div>

        </motion.div>
      </div>
    );
  }

  // --- RENDER 3: MAIN SYSTEM APLET ---
  return (
    <div className="flex h-screen bg-gradient-to-b from-[#132c4a] via-[#0b132b] to-[#05070c] font-sans text-white overflow-hidden relative">
      {/* Top glowing bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900/40 via-blue-500/20 to-blue-900/40 z-[60]" />

      {/* --- GLOWING AMBIENT BACKGROUND ORBS --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.035)_0%,transparent_45%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.035)_0%,transparent_45%)]">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      </div>

      {/* --- CONFETTI CELEBRATION LAYER --- */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-[99] overflow-hidden">
          {confettiParticles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: "50vw", y: "45vh", scale: 0, rotate: p.rotate, opacity: 1 }}
              animate={{
                x: `calc(50vw + ${p.vx * 24}px)`,
                y: `calc(45vh + ${p.vy * 24 + 300}px)`,
                rotate: p.rotate + p.rotateSpeed * 35,
                scale: [0, 1, 1, 0.6, 0],
                opacity: [1, 1, 1, 0.8, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.1, 0.8, 0.25, 1],
              }}
              style={{
                position: "absolute",
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "triangle" ? "0 50% 50% 50%" : "2px",
                boxShadow: `0 0 10px ${p.color}40`,
              }}
            />
          ))}
        </div>
      )}

      {/* --- SIDEBAR DESKTOP VIEW --- */}
      <aside className="hidden lg:flex w-64 bg-slate-950 flex-col text-slate-200 shrink-0 z-30">
        <div className="p-6 flex flex-col gap-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between gap-3 w-full">
            <button 
              onClick={() => setIsAiOpen(!isAiOpen)}
              className="flex items-center gap-2 select-none hover:opacity-80 active:scale-95 transition-all text-left focus:outline-none shrink-0 group min-w-0"
              title="Buka Asisten AI G-Swift"
            >
              <div className="w-8 h-8 bg-white/10 border border-white/20 text-white rounded-xl flex items-center justify-center shadow-md shrink-0 relative overflow-hidden">
                <div className="flex items-center justify-center animate-[spin_12s_linear_infinite]">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
              <span className="font-bold text-white tracking-tight text-sm uppercase shrink-0 group-hover:text-white/95 transition-colors">
                Swift<span className="text-white/60">Relay</span>
              </span>
            </button>

            {/* Settings gear button */}
            <button 
              onClick={() => setActiveTab("accounts")}
              className={`p-2 rounded-xl transition-all cursor-pointer shadow-sm relative group shrink-0 border ${
                activeTab === "accounts"
                  ? "bg-white/20 text-white border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-white"
              }`}
              title="Pengaturan SMTP"
            >
              <Settings className="w-4 h-4" />
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-9 px-2 py-1 bg-slate-900 border border-slate-800 text-[9px] font-bold text-white uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-50">
                SMTP
              </span>
            </button>

            {/* PIN key icon */}
            <button 
              onClick={() => {
                setPasscodeChangeError(null);
                setPasscodeChangeSuccess(null);
                setShowPasscodeModal(true);
              }}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-white/80 hover:text-white rounded-xl transition-all cursor-pointer shadow-sm relative group shrink-0"
              title="Ganti PIN Panel"
            >
              <KeyRound className="w-4 h-4" />
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-9 px-2 py-1 bg-slate-900 border border-slate-850 text-[9px] font-bold text-white uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-50">
                Ganti PIN
              </span>
            </button>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Sistem Relay Email Cepat
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 relative">
          {[
            { id: "send", icon: Send, label: "Kirim" },
            { id: "templates", icon: FileText, label: "Templates" },
            { id: "terminal", icon: TerminalIcon, label: "Relay Terminal" }
          ].map((item) => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={hn(
                  "relative w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-[13px] font-medium outline-none cursor-pointer overflow-hidden group",
                  isTabActive
                    ? "text-white font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/20"
                )}
              >
                {/* Active Tab sliding background pill */}
                {isTabActive && (
                  <motion.div
                    layoutId="activeSidebarTab"
                    className="absolute inset-0 bg-white/10 rounded-xl border border-white/25 shadow-md shadow-slate-950/40 z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                {/* Active Indicator moving bar */}
                {isTabActive && (
                  <motion.div
                    layoutId="activeSidebarBar"
                    className="absolute left-1 top-2.5 bottom-2.5 w-1 bg-white rounded-full z-10 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Content wrapper with z-10 to stay above the sliding pill */}
                <div className="relative flex items-center gap-3 z-10 w-full">
                  <item.icon className={hn(
                    "w-4 h-4 transition-transform duration-300", 
                    isTabActive ? "text-white scale-110 animate-pulse" : "text-slate-400 group-hover:scale-110 group-hover:text-slate-200"
                  )} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden group">
            {/* Ambient dynamic container glow */}
            <div className={`absolute -right-6 -bottom-6 w-16 h-16 rounded-full filter blur-[20px] opacity-20 transition-all duration-500 ${
              apiStatus?.smtp_configured || smtpConfig.username ? "bg-emerald-500" : "bg-slate-600"
            }`} />
            
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1.5 tracking-widest relative z-10">
              Status Koneksi
            </div>
            <div className={hn(
              "flex items-center gap-2 relative z-10",
              apiStatus?.smtp_configured || smtpConfig.username ? "text-emerald-400" : "text-slate-400"
            )}>
              <div className="relative flex items-center justify-center w-3 h-3">
                <div
                  className={`absolute w-full h-full rounded-full animate-ping opacity-75 ${
                    apiStatus?.smtp_configured || smtpConfig.username ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                />
                <div className={`w-1.5 h-1.5 rounded-full relative z-10 ${
                  apiStatus?.smtp_configured || smtpConfig.username ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-slate-500 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                }`} />
              </div>
              <span className="text-[11px] font-extrabold tracking-wider">
                {apiStatus?.smtp_configured || smtpConfig.username ? "SECURE ONLINE" : "OFFLINE / LOCAL"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col overflow-hidden pb-[72px] lg:pb-0 relative z-10">
        
        <header className="h-14 bg-[#132c4a]/90 backdrop-blur-md border-b border-white/10 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-md z-30 relative">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-2">
            {activeTab !== "send" && (
              <button 
                onClick={() => setActiveTab("send")}
                className="p-1.5 hover:bg-white/10 rounded-full lg:hidden transition-colors shrink-0"
                aria-label="Kembali"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            
            <div className="flex items-center gap-2 min-w-0 truncate">
              <button 
                onClick={() => setIsAiOpen(!isAiOpen)}
                className="flex items-center gap-2 select-none hover:opacity-80 active:scale-[0.97] transition-all text-left focus:outline-none shrink-0 group"
                title="Buka Asisten AI G-Swift"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/10 border border-white/20 text-white rounded-lg flex items-center justify-center shadow-md shrink-0 relative overflow-hidden">
                  <div className="flex items-center justify-center animate-[spin_12s_linear_infinite]">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </div>
                <span className="font-bold text-white tracking-tight text-xs sm:text-sm uppercase shrink-0 group-hover:text-white/95 transition-colors">
                  Swift<span className="text-white/60">Relay</span>
                </span>
              </button>
              
              <span className="h-4 w-px bg-white/20 hidden xs:inline shrink-0" />
              
              <h1 className="text-xs sm:text-xs font-black text-white uppercase tracking-tight truncate">
                {activeTab === "accounts" 
                  ? "SMTP" 
                  : activeTab === "terminal" 
                  ? "Terminal" 
                  : activeTab === "templates" 
                  ? "Templates" 
                  : "Pengirim"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
             <button 
              onClick={() => setActiveTab("accounts")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                activeTab === "accounts"
                  ? "bg-white/20 text-white border-white/40 shadow-inner"
                  : "bg-white/10 hover:bg-white/20 text-white hover:text-white border-white/10"
              }`}
              title="Pengaturan SMTP"
            >
              <Settings className="w-4 h-4" />
            </button>
             <button 
              onClick={() => {
                setPasscodeChangeError(null);
                setPasscodeChangeSuccess(null);
                setShowPasscodeModal(true);
              }}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer border border-white/10"
              title="Ganti PIN Panel"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button 
              onClick={handleLogout}
              className="bg-white/5 hover:bg-white/10 text-white/90 border border-white/15 px-2.5 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-extrabold transition-colors shadow-md uppercase cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* --- WORKSPACE VIEW CONTROLLER --- */}
        <div className={hn("flex-1 bg-transparent flex flex-col min-h-0", activeTab === "send" ? "overflow-hidden" : "overflow-y-auto")}>
          <AnimatePresence mode="wait">
            
            {/* View 1: Send Interface */}
            {activeTab === "send" && (
              <SendTab 
                smtpConfig={smtpConfig}
                templates={templates}
                setActiveTab={setActiveTab}
                addLog={addLog}
                triggerConfetti={triggerConfetti}
              />
            )}

            {/* View 2: Templates Management */}
            {activeTab === "templates" && (
              <TemplatesTab 
                templates={templates}
                setActiveTab={setActiveTab}
                setEditingTemplateId={setEditingTemplateId}
                setTemplateForm={setTemplateForm}
                setShowTemplateModal={setShowTemplateModal}
                setTemplateToDelete={setTemplateToDelete}
                setPreviewTemplate={setPreviewTemplate}
                setQuickTestTemplate={setQuickTestTemplate}
                setQuickTestRecipient={setQuickTestRecipient}
              />
            )}

            {/* View 3: Terminal Console logs */}
            {activeTab === "terminal" && (
              <TerminalTab 
                logs={logs}
                setLogs={setLogs}
              />
            )}

            {/* View 4: SMTP Account Settings */}
            {activeTab === "accounts" && (
              <AccountsTab 
                smtpConfig={smtpConfig}
                setSmtpConfig={setSmtpConfig}
                setActiveTab={setActiveTab}
                addLog={addLog}
                triggerConfetti={triggerConfetti}
                checkBackendHealth={checkBackendHealth}
              />
            )}

          </AnimatePresence>
        </div>

        {/* --- GLOBAL APP MODALS CONTROLLERS --- */}

        {/* Modal 1: Create or Edit Template Modal */}
        <AnimatePresence>
          {showTemplateModal && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#0b132b]/95 backdrop-blur-md w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
              >
                <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {editingTemplateId ? "Ubah Template" : "Template Baru"}
                  </h3>
                  <button 
                    onClick={() => {
                      setShowTemplateModal(false);
                      setEditingTemplateId(null);
                      setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-white/60 hover:text-white transition-colors border border-white/10"
                  >
                    <ChevronLeft className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 no-scrollbar bg-transparent">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold text-white/70 uppercase tracking-widest px-1">
                        Nama Template
                      </label>
                      <input 
                        type="text" 
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="Contoh: Pembayaran Nasabah"
                        className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-sm outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all font-bold text-white placeholder:text-white/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold text-white/70 uppercase tracking-widest px-1">
                        Kategori
                      </label>
                      <select 
                        value={templateForm.category}
                        onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                        className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-sm outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all font-bold text-white"
                      >
                        <option value="General" className="bg-[#0b132b] text-white">General</option>
                        <option value="Marketing" className="bg-[#0b132b] text-white">Marketing</option>
                        <option value="Support" className="bg-[#0b132b] text-white">Support</option>
                        <option value="Personal" className="bg-[#0b132b] text-white">Personal</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-white/70 uppercase tracking-widest px-1">
                      Subjek Bawaan
                    </label>
                    <input 
                      type="text" 
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="Subjek email otomatis"
                      className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-sm outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all font-bold text-white placeholder:text-white/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-white/70 uppercase tracking-widest px-1">
                      Isi Pesan (HTML)
                    </label>
                    <RichTextEditor 
                      value={templateForm.message}
                      onChange={(val) => setTemplateForm({ ...templateForm, message: val })}
                      placeholder="Tulis draft template Anda di sini... (Mendukung visual kustom & HTML)"
                      minHeight="180px"
                    />
                  </div>
                </div>

                <div className="px-6 py-6 bg-transparent border-t border-white/10 flex flex-col sm:flex-row gap-3 shrink-0">
                  <button 
                    onClick={handleSaveTemplateSubmit}
                    className="w-full sm:flex-1 py-4 bg-white/10 hover:bg-white/15 text-white text-sm font-black rounded-2xl border border-white/20 hover:border-white/30 transition-all shadow-md active:scale-[0.98] order-1 sm:order-2 cursor-pointer uppercase tracking-wider"
                  >
                    Simpan Template
                  </button>
                  <button 
                    onClick={() => {
                      setShowTemplateModal(false);
                      setEditingTemplateId(null);
                      setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                    }}
                    className="w-full sm:w-auto px-6 py-4 text-sm font-black text-white/60 hover:text-white order-2 sm:order-1 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal 2: Template Preview Modal */}
        <AnimatePresence>
          {previewTemplate && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0b132b]/95 backdrop-blur-md w-full max-w-2xl rounded-[24px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
              >
                <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-tight">
                      {previewTemplate.name}
                    </h3>
                    <p className="text-[10px] text-white/60 font-bold truncate">
                      {previewTemplate.subject}
                    </p>
                  </div>
                  <button 
                    onClick={() => setPreviewTemplate(null)}
                    className="p-1 hover:bg-white/5 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-45 text-white/60" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden p-4 bg-slate-950/40 flex flex-col min-h-[380px]">
                  <iframe
                    title="Real Template Preview"
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
                          ${previewTemplate.message}
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
                                var targetWidth = viewportWidth - 16;
                                if (targetWidth < 280) targetWidth = viewportWidth;
                                var scale = targetWidth / 600;
                                
                                if (scale < 1) {
                                  wrapper.style.transform = 'translateX(-50%) scale(' + scale + ')';
                                  document.body.style.height = (wrapper.offsetHeight * scale + 24) + 'px';
                                } else {
                                  wrapper.style.transform = 'translateX(-50%)';
                                  document.body.style.height = (wrapper.offsetHeight + 24) + 'px';
                                }
                              }
                              
                              window.addEventListener('resize', adjustScale);
                              window.addEventListener('load', adjustScale);
                              
                              if (typeof ResizeObserver !== 'undefined') {
                                var ro = new ResizeObserver(adjustScale);
                                ro.observe(wrapper);
                              }
                              
                              setTimeout(adjustScale, 50);
                              setTimeout(adjustScale, 200);
                              setTimeout(adjustScale, 500);
                              setInterval(adjustScale, 1000);
                            });
                          </script>
                        </body>
                      </html>
                    `}
                    className="w-full flex-1 border-0 rounded-2xl bg-white shadow-inner"
                    sandbox="allow-popups allow-scripts"
                  />
                </div>

                <div className="p-4 border-t border-white/10 bg-[#0b132b] flex gap-3 shrink-0">
                  <button 
                    onClick={() => setPreviewTemplate(null)}
                    className="flex-1 py-3 text-[11px] font-black text-white/60 hover:bg-white/5 rounded-xl border border-white/10 transition-all uppercase tracking-wider"
                  >
                    TUTUP
                  </button>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("use-template", { detail: previewTemplate }));
                      setActiveTab("send");
                      setPreviewTemplate(null);
                    }}
                    className="flex-1 py-3 bg-white hover:bg-white/90 text-slate-950 text-[11px] font-black rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5 uppercase tracking-wider"
                  >
                    <Send className="w-3.5 h-3.5" /> GUNAKAN SEKARANG
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Custom Delete Confirmation */}
        <AnimatePresence>
          {templateToDelete && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0b132b]/95 backdrop-blur-md w-full max-w-[340px] rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden text-white"
              >
                <div className="w-14 h-14 bg-rose-950/30 border border-rose-500/20 rounded-full flex items-center justify-center mb-4 text-rose-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                
                <h3 className="text-sm font-extrabold text-white mb-1">
                  Hapus Template?
                </h3>
                
                <p className="text-xs text-white/60 font-bold mb-6">
                  Apakah Anda yakin ingin menghapus template <span className="text-white">"{templateToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setTemplateToDelete(null)}
                    className="flex-1 py-2 text-[10px] font-black text-white/60 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                  >
                    BATAL
                  </button>
                  <button 
                    onClick={() => {
                      deleteTemplate(templateToDelete.id);
                      setTemplateToDelete(null);
                    }}
                    className="flex-1 py-2 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-lg"
                  >
                    HAPUS
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal 3: Kirim Email Percobaan */}
        <AnimatePresence>
          {quickTestTemplate && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[#0b132b]/95 backdrop-blur-md w-full max-w-[320px] rounded-2xl border border-white/10 shadow-2xl p-5 text-white"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-black text-white uppercase tracking-tight">
                    Kirim Email Percobaan
                  </h3>
                  <button 
                    onClick={() => setQuickTestTemplate(null)}
                    className="text-white/60 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-45" />
                  </button>
                </div>

                <p className="text-[10px] text-white/80 mb-4 bg-white/5 p-2 rounded-lg border border-white/10 font-medium">
                  Mengirim: <span className="font-black text-white">{quickTestTemplate.name}</span>
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-white/40 uppercase mb-1 ml-1">
                      Alamat Penerima Tes
                    </label>
                    <input 
                      type="email"
                      value={quickTestRecipient}
                      onChange={(e) => setQuickTestRecipient(e.target.value)}
                      placeholder="test@example.com"
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-xs focus:outline-none focus:border-white/30 transition-all font-bold text-white placeholder:text-white/30"
                      autoFocus
                    />
                  </div>

                  <button 
                    disabled={!quickTestRecipient}
                    onClick={async () => {
                      // Dispatch test send trigger to SendTab using custom event
                      window.dispatchEvent(new CustomEvent("apply-template", { detail: { subject: quickTestTemplate.subject, html: quickTestTemplate.message } }));
                      setActiveTab("send");
                      setQuickTestTemplate(null);
                    }}
                    className="w-full py-3 bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-wider"
                  >
                    <Send className="w-3.5 h-3.5" />
                    KIRIM SEKARANG (FORM)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- DYNAMIC PIN CHANGE MODAL --- */}
        <AnimatePresence>
          {showPasscodeModal && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPasscodeModal(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-[#0b132b]/95 backdrop-blur-md w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] z-[1000] overflow-hidden text-white"
              >
                {/* Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-white/10 via-white/40 to-white/10" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10 shadow-sm shrink-0">
                      <KeyRound className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Ganti PIN Panel
                      </h3>
                      <p className="text-[10px] text-white/55 font-semibold leading-none mt-0.5">
                        Amankan akses konsol admin Anda dengan 6 digit angka
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPasscodeModal(false)}
                    className="p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <hr className="border-white/10 mb-4" />

                <form onSubmit={handleChangePasscode} className="space-y-4">
                  {passcodeChangeError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-2xl text-[11px] font-bold flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{passcodeChangeError}</span>
                    </motion.div>
                  )}

                  {passcodeChangeSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-2xl text-[11px] font-bold flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{passcodeChangeSuccess}</span>
                    </motion.div>
                  )}

                  <div className="space-y-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-white/60 px-1 uppercase tracking-wider">
                        PIN Saat Ini
                      </label>
                      <input 
                        type="password" 
                        required
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        value={currentPasscodeForm}
                        onChange={(e) => setCurrentPasscodeForm(e.target.value.replace(/\D/g, ''))}
                        placeholder="Masukkan PIN lama Anda (6 digit)"
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-2xl text-xs font-mono font-semibold focus:bg-white/[0.08] focus:border-white/30 outline-none transition-all text-white placeholder:text-white/30"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-white/60 px-1 uppercase tracking-wider">
                        PIN Baru
                      </label>
                      <input 
                        type="password" 
                        required
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        value={newPasscodeForm}
                        onChange={(e) => setNewPasscodeForm(e.target.value.replace(/\D/g, ''))}
                        placeholder="6 digit angka baru"
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-2xl text-xs font-mono font-semibold focus:bg-white/[0.08] focus:border-white/30 outline-none transition-all text-white placeholder:text-white/30"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-white/60 px-1 uppercase tracking-wider">
                        Ulangi PIN Baru
                      </label>
                      <input 
                        type="password" 
                        required
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        value={confirmPasscodeForm}
                        onChange={(e) => setConfirmPasscodeForm(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ketik ulang PIN baru Anda"
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-2xl text-xs font-mono font-semibold focus:bg-white/[0.08] focus:border-white/30 outline-none transition-all text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowPasscodeModal(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-[10px] font-black rounded-xl border border-white/20 hover:border-white/30 transition-all shadow-md flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Perbarui
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- BOTTOM RESPONSIVE VIEWBAR FOR MOBILE/TABLET --- */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0b132b]/95 backdrop-blur-md border-t border-white/5 h-[64px] flex items-center justify-around z-50 lg:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.4)] px-2 safe-area-bottom overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-white/10 via-white/40 to-white/10 z-10" />
          {[
            { id: "send", icon: Send, label: "Kirim" },
            { id: "templates", icon: FileText, label: "Templates" },
            { id: "terminal", icon: TerminalIcon, label: "Logs" }
          ].map((item) => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all duration-300"
              >
                <div className={hn(
                  "p-1.5 rounded-xl transition-all duration-300 relative z-10",
                  isTabActive ? "bg-white/15 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-white/10" : "text-white/40 hover:text-white"
                )}>
                  <item.icon className={hn("w-5 h-5 transition-transform", isTabActive && "scale-110 animate-pulse")} />
                </div>
                <span className={hn(
                  "text-[9px] font-extrabold transition-all uppercase tracking-tighter relative z-10",
                  isTabActive ? "text-white" : "text-white/40"
                )}>
                  {item.label}
                </span>
                {isTabActive && (
                  <motion.div 
                    layoutId="activeTabMobile" 
                    className="absolute bottom-0 w-12 h-1.5 bg-gradient-to-r from-white to-white/60 rounded-t-full shadow-[0_-5px_15px_rgba(255,255,255,0.4)]"
                    transition={{ type: "spring", stiffness: 380, damping: 25 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* --- BANK-GRADE TOAST NOTIFICATION STACK --- */}
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          <AnimatePresence>
            {bankingNotifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: 50, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
                className="bg-[#0b132b]/95 backdrop-blur-md border-l-4 border-l-emerald-500 border border-white/10 rounded-xl p-3.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] flex gap-2.5 text-white pointer-events-auto overflow-hidden relative"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em] font-mono">
                      {notif.title}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold ml-auto font-mono">
                      {notif.timestamp}
                    </span>
                  </div>

                  <p className="text-xs font-bold leading-snug text-white/95">
                    {notif.message}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-3 text-[9px] text-slate-400 font-bold font-mono">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-emerald-500/70" />
                      <span className="text-slate-300 font-extrabold max-w-[120px] truncate">{notif.recipient}</span>
                    </div>
                    {notif.ip && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-300">IP: {notif.ip}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setBankingNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
                  className="p-1 hover:bg-white/10 rounded-full shrink-0 h-fit self-start text-slate-500 hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 rotate-45" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>



        <AiCopilotWidget 
          isAiOpen={isAiOpen}
          setIsAiOpen={setIsAiOpen}
          setActiveTab={setActiveTab}
          addLog={addLog}
          templates={templates}
          setTemplates={setTemplates}
        />

      </main>
    </div>
  );
}
