/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Terminal as TerminalIcon, FileText, Settings, KeyRound, CheckCircle, 
  ChevronLeft, Loader2, AlertCircle, AlertTriangle, Mail, Globe, Sparkle, Sparkles
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
    return saved ? JSON.parse(saved) : [];
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

  // Handle global banking-notif event
  useEffect(() => {
    const handleBankingNotif = (e: Event) => {
      const customEvt = e as CustomEvent<BankingNotification>;
      if (customEvt.detail) {
        setBankingNotifications(prev => [customEvt.detail, ...prev]);
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
      <div className="flex h-screen bg-gradient-to-tr from-[#d6e6ff] via-[#f0f5ff] to-[#fafcff] items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 via-blue-400 to-blue-500 z-[60] shadow-[0_1px_3px_rgba(0,0,0,0.1)]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(0,58,143,0.12)] border border-slate-100 flex flex-col items-center ring-1 ring-blue-100/50 relative z-10"
        >
          {smtpConfig.logoUrl && !logoLoadError ? (
            <img 
              src={smtpConfig.logoUrl} 
              alt="Logo" 
              className="h-10 w-auto object-contain mb-4 max-h-12"
              referrerPolicy="no-referrer"
              onError={() => {
                setLogoLoadError(true);
              }}
            />
          ) : (
            <div className="flex items-center gap-2 mb-4 select-none bg-blue-50/50 px-3.5 py-1.5 rounded-xl border border-blue-100/30 shadow-sm">
              <div className="w-7 h-7 bg-gradient-to-tr from-[#0050b3] to-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-800 tracking-tight text-xs uppercase">
                Swift<span className="text-[#0050b3]">Relay</span>
              </span>
            </div>
          )}

          <div className="w-full text-center flex flex-col gap-1 mb-4">
            <h1 className="text-base font-bold text-slate-800 tracking-tight">
              Akses Admin Panel
            </h1>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">
              Silakan Masukkan PIN 6 Angka
            </p>
          </div>

          {/* PIN Dots display */}
          <motion.div 
            animate={passcodeError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex justify-center gap-4 py-3 my-1 w-full"
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = passcode.length > index;
              return (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                    passcodeError
                      ? "border-rose-500 bg-rose-100"
                      : isFilled 
                        ? "border-[#0050b3] bg-[#0050b3] scale-110 shadow-md shadow-blue-500/25" 
                        : "border-slate-300 bg-slate-50"
                  }`}
                />
              );
            })}
          </motion.div>

          <AnimatePresence mode="wait">
            {passcodeError && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -5 }}
                className="text-[10px] font-bold text-rose-500 text-center uppercase tracking-wider mb-2 h-4"
              >
                PIN Salah! Silakan coba lagi
              </motion.p>
            )}
            {!passcodeError && (
              <div className="h-4 mb-2" />
            )}
          </AnimatePresence>

          {/* Remember Me toggle */}
          <label className="flex items-center gap-2 justify-center cursor-pointer mb-5 group w-fit mx-auto">
            <div 
              className={`w-4 h-4 rounded-md flex items-center justify-center transition-all bg-slate-50 ring-1 ${
                rememberMe 
                  ? "bg-[#0050b3] ring-[#0050b3] text-white shadow-sm" 
                  : "bg-slate-50 ring-slate-300 group-hover:ring-blue-400 text-transparent"
              }`}
            >
              <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
            <input 
              type="checkbox" 
              className="hidden"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none pt-0.5">
              Ingat Saya
            </span>
          </label>

          {/* Interactive Keyboard */}
          <div className="grid grid-cols-3 gap-y-4 gap-x-6 justify-items-center w-full max-w-[270px] mx-auto mb-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.88, backgroundColor: "#0050b3", color: "#ffffff", borderColor: "#003a8f" }}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="w-14 h-14 rounded-full bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-lg flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.06)] select-none"
              >
                {num}
              </motion.button>
            ))}
            
            {/* Clear Button */}
            <motion.button
              whileTap={{ scale: 0.88, backgroundColor: "#dc2626", color: "#ffffff", borderColor: "#b91c1c" }}
              type="button"
              onClick={handleKeypadClear}
              className="w-14 h-14 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 font-bold text-[10px] tracking-wider uppercase flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.04)] select-none"
            >
              CLEAR
            </motion.button>

            {/* Zero Button */}
            <motion.button
              whileTap={{ scale: 0.88, backgroundColor: "#0050b3", color: "#ffffff", borderColor: "#003a8f" }}
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="w-14 h-14 rounded-full bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-lg flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.06)] select-none"
            >
              0
            </motion.button>

            {/* Backspace Button */}
            <motion.button
              whileTap={{ scale: 0.88, backgroundColor: "#475569", color: "#ffffff", borderColor: "#334155" }}
              type="button"
              onClick={handleKeypadBackspace}
              className="w-14 h-14 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.04)] select-none"
            >
              <ChevronLeft className="w-5 h-5 pointer-events-none" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- RENDER 3: MAIN SYSTEM APLET ---
  return (
    <div className="flex h-screen bg-gradient-to-tr from-[#d6e6ff] via-[#f0f5ff] to-[#fafcff] font-sans text-slate-800 overflow-hidden relative">
      {/* Top glowing bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 via-blue-400 to-blue-500 z-[60] shadow-[0_1px_3px_rgba(0,0,0,0.1)]" />

      {/* --- GLOWING AMBIENT BACKGROUND ORBS --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full filter blur-[120px] will-change-transform"
        />
        <div 
          className="absolute -bottom-40 -right-40 w-[450px] h-[450px] bg-amber-400/10 rounded-full filter blur-[140px] will-change-transform"
        />
        <div className="absolute inset-0 bg-[radial-gradient(#0050b3_1px,transparent_1px)] [background-size:24px_24px] opacity-5" />
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
            <div className="min-w-0">
              {smtpConfig.logoUrl && !logoLoadError ? (
                <img 
                  src={smtpConfig.logoUrl} 
                  alt="Logo" 
                  className="h-12 w-auto object-contain brightness-0 invert shrink-0 max-h-14"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setLogoLoadError(true);
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 select-none">
                  <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-[#0050b3] text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white tracking-tight text-sm uppercase shrink-0">
                    Swift<span className="text-blue-400">Relay</span>
                  </span>
                </div>
              )}
            </div>

            {/* PIN key icon */}
            <button 
              onClick={() => {
                setPasscodeChangeError(null);
                setPasscodeChangeSuccess(null);
                setShowPasscodeModal(true);
              }}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-amber-400 hover:text-amber-300 rounded-xl transition-all cursor-pointer shadow-sm relative group shrink-0"
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
            { id: "terminal", icon: TerminalIcon, label: "Relay Terminal" },
            { id: "accounts", icon: Settings, label: "Pengaturan SMTP" }
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
                    className="absolute inset-0 bg-gradient-to-r from-[#0050b3] to-[#003a8f] rounded-xl border-t border-white/15 shadow-md shadow-blue-950/40 z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                {/* Active Indicator moving bar */}
                {isTabActive && (
                  <motion.div
                    layoutId="activeSidebarBar"
                    className="absolute left-1 top-2.5 bottom-2.5 w-1 bg-gradient-to-b from-amber-400 to-yellow-300 rounded-full z-10 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Content wrapper with z-10 to stay above the sliding pill */}
                <div className="relative flex items-center gap-3 z-10 w-full">
                  <item.icon className={hn(
                    "w-4 h-4 transition-transform duration-300", 
                    isTabActive ? "text-amber-300 scale-110 animate-pulse" : "text-slate-400 group-hover:scale-110 group-hover:text-slate-200"
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
              apiStatus?.smtp_configured || smtpConfig.username ? "bg-emerald-500" : "bg-amber-500"
            }`} />
            
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1.5 tracking-widest relative z-10">
              Status Koneksi
            </div>
            <div className={hn(
              "flex items-center gap-2 relative z-10",
              apiStatus?.smtp_configured || smtpConfig.username ? "text-emerald-400" : "text-amber-400"
            )}>
              <div className="relative flex items-center justify-center w-3 h-3">
                <div
                  className={`absolute w-full h-full rounded-full animate-ping opacity-75 ${
                    apiStatus?.smtp_configured || smtpConfig.username ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <div className={`w-1.5 h-1.5 rounded-full relative z-10 ${
                  apiStatus?.smtp_configured || smtpConfig.username ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
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
        
        <header className="h-14 bg-white border-b border-slate-100 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-sm z-30 relative">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-2">
            {activeTab !== "send" && (
              <button 
                onClick={() => setActiveTab("send")}
                className="p-1.5 hover:bg-slate-100 rounded-full lg:hidden transition-colors shrink-0"
                aria-label="Kembali"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            
            <div className="flex items-center gap-2 min-w-0 truncate">
              {smtpConfig.logoUrl && !logoLoadError ? (
                <img 
                  src={smtpConfig.logoUrl} 
                  alt="Brand Logo" 
                  className="h-10 sm:h-12 w-auto object-contain shrink-0 max-w-[120px] xs:max-w-[160px] max-h-14"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setLogoLoadError(true);
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 select-none">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-tr from-[#0050b3] to-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="font-bold text-slate-800 tracking-tight text-xs sm:text-sm uppercase shrink-0">
                    Swift<span className="text-[#0050b3]">Relay</span>
                  </span>
                </div>
              )}
              
              <span className="h-4 w-px bg-slate-200 hidden xs:inline shrink-0" />
              
              <h1 className="text-xs sm:text-xs font-bold text-[#003A8F] uppercase tracking-tight truncate">
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
              onClick={() => {
                setPasscodeChangeError(null);
                setPasscodeChangeSuccess(null);
                setShowPasscodeModal(true);
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-amber-500 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
              title="Ganti PIN Panel"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button 
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-colors shadow-sm uppercase cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* --- WORKSPACE VIEW CONTROLLER --- */}
        <div className={hn("flex-1 bg-white/40 flex flex-col min-h-0", activeTab === "send" ? "overflow-hidden" : "overflow-y-auto")}>
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
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-black text-slate-950 tracking-tight">
                    {editingTemplateId ? "Ubah Template" : "Template Baru"}
                  </h3>
                  <button 
                    onClick={() => {
                      setShowTemplateModal(false);
                      setEditingTemplateId(null);
                      setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:text-slate-700 transition-colors border border-slate-200"
                  >
                    <ChevronLeft className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 no-scrollbar bg-slate-50/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest px-1">
                        Nama Template
                      </label>
                      <input 
                        type="text" 
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="Contoh: Pembayaran Nasabah"
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#0050b3] transition-all font-bold text-slate-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest px-1">
                        Kategori
                      </label>
                      <select 
                        value={templateForm.category}
                        onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#0050b3] transition-all font-bold text-slate-950"
                      >
                        <option value="General">General</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Support">Support</option>
                        <option value="Personal">Personal</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest px-1">
                      Subjek Bawaan
                    </label>
                    <input 
                      type="text" 
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="Subjek email otomatis"
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#0050b3] transition-all font-bold text-slate-950"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest px-1">
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

                <div className="px-6 py-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0">
                  <button 
                    onClick={handleSaveTemplateSubmit}
                    className="w-full sm:flex-1 py-4 bg-[#0050b3] hover:bg-blue-700 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-[0.98] transition-all order-1 sm:order-2 cursor-pointer uppercase tracking-wider"
                  >
                    Simpan Template
                  </button>
                  <button 
                    onClick={() => {
                      setShowTemplateModal(false);
                      setEditingTemplateId(null);
                      setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                    }}
                    className="w-full sm:w-auto px-6 py-4 text-sm font-black text-slate-500 hover:text-slate-800 order-2 sm:order-1 transition-colors cursor-pointer"
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
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight">
                      {previewTemplate.name}
                    </h3>
                    <p className="text-[10px] text-slate-600 font-bold truncate">
                      {previewTemplate.subject}
                    </p>
                  </div>
                  <button 
                    onClick={() => setPreviewTemplate(null)}
                    className="p-1 hover:bg-slate-100 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-45 text-slate-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50">
                  <div 
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-h-[100px]"
                    dangerouslySetInnerHTML={{ __html: previewTemplate.message }}
                  />
                </div>

                <div className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0">
                  <button 
                    onClick={() => setPreviewTemplate(null)}
                    className="flex-1 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    TUTUP
                  </button>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("use-template", { detail: previewTemplate }));
                      setActiveTab("send");
                      setPreviewTemplate(null);
                    }}
                    className="flex-1 py-2.5 bg-[#0050b3] text-white text-[10px] font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    <Send className="w-3 h-3" /> GUNAKAN SEKARANG
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Custom Delete Confirmation */}
        <AnimatePresence>
          {templateToDelete && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-[340px] rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                
                <h3 className="text-sm font-extrabold text-slate-950 mb-1">
                  Hapus Template?
                </h3>
                
                <p className="text-xs text-slate-500 font-bold mb-6">
                  Apakah Anda yakin ingin menghapus template <span className="text-slate-800">"{templateToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setTemplateToDelete(null)}
                    className="flex-1 py-2 text-[10px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    BATAL
                  </button>
                  <button 
                    onClick={() => {
                      deleteTemplate(templateToDelete.id);
                      setTemplateToDelete(null);
                    }}
                    className="flex-1 py-2 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-lg shadow-rose-100"
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
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white w-full max-w-[320px] rounded-2xl shadow-2xl p-5"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-black text-slate-950 uppercase tracking-tight">
                    Kirim Email Percobaan
                  </h3>
                  <button 
                    onClick={() => setQuickTestTemplate(null)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-45" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-700 mb-4 bg-slate-100 p-2 rounded-lg border border-slate-200 font-medium">
                  Mengirim: <span className="font-black text-[#0050b3]">{quickTestTemplate.name}</span>
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase mb-1 ml-1">
                      Alamat Penerima Tes
                    </label>
                    <input 
                      type="email"
                      value={quickTestRecipient}
                      onChange={(e) => setQuickTestRecipient(e.target.value)}
                      placeholder="test@example.com"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#0050b3] focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-900"
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
                    className="w-full py-3 bg-[#0050b3] hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-wider"
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
                className="relative bg-white w-full max-w-md rounded-3xl p-6 border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] z-[1000] overflow-hidden"
              >
                {/* Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-amber-500" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm shrink-0">
                      <KeyRound className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#003A8F] uppercase tracking-wider">
                        Ganti PIN Panel
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">
                        Amankan akses konsol admin Anda dengan 6 digit angka
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPasscodeModal(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <hr className="border-slate-100 mb-4" />

                <form onSubmit={handleChangePasscode} className="space-y-4">
                  {passcodeChangeError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[11px] font-bold flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{passcodeChangeError}</span>
                    </motion.div>
                  )}

                  {passcodeChangeSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl text-[11px] font-bold flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{passcodeChangeSuccess}</span>
                    </motion.div>
                  )}

                  <div className="space-y-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider">
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-mono font-semibold focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider">
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-mono font-semibold focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider">
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-mono font-semibold focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowPasscodeModal(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-700 to-[#0050b3] hover:from-blue-800 hover:to-[#003a8f] text-white text-[10px] font-black rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-[64px] flex items-center justify-around z-50 lg:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.1)] px-2 safe-area-bottom overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-blue-700 via-blue-400 to-blue-500 z-10" />
          {[
            { id: "send", icon: Send, label: "Kirim" },
            { id: "templates", icon: FileText, label: "Templates" },
            { id: "terminal", icon: TerminalIcon, label: "Logs" },
            { id: "accounts", icon: Settings, label: "Akun" }
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
                  isTabActive ? "bg-blue-50 text-[#0050b3] shadow-sm" : "text-slate-400 hover:text-slate-800"
                )}>
                  <item.icon className={hn("w-5 h-5 transition-transform", isTabActive && "scale-110 animate-pulse")} />
                </div>
                <span className={hn(
                  "text-[9px] font-black transition-all uppercase tracking-tighter relative z-10",
                  isTabActive ? "text-[#0050b3]" : "text-slate-600"
                )}>
                  {item.label}
                </span>
                {isTabActive && (
                  <motion.div 
                    layoutId="activeTabMobile" 
                    className="absolute bottom-0 w-12 h-1.5 bg-gradient-to-r from-[#0050b3] to-[#003a8f] rounded-t-full shadow-[0_-5px_15px_rgba(0,58,143,0.3)]"
                    transition={{ type: "spring", stiffness: 380, damping: 25 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* --- BANK-GRADE TOAST NOTIFICATION STACK --- */}
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          <AnimatePresence>
            {bankingNotifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: 100, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
                className="bg-slate-950/95 backdrop-blur-md border border-amber-400/80 rounded-2xl p-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] flex gap-3 text-white pointer-events-auto overflow-hidden relative group"
              >
                {/* Bank Gold Indicator line */}
                <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 w-full" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.15em] font-mono">
                      {notif.title}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold ml-auto font-mono">
                      {notif.timestamp}
                    </span>
                  </div>

                  <p className="text-xs font-black leading-snug text-white">
                    {notif.message}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-y-1 gap-x-3 text-[9px] text-slate-400 font-bold font-mono">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" />
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
                  className="p-1 hover:bg-slate-800 rounded-full shrink-0 h-fit self-start text-slate-500 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 rotate-45" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* --- FLOATING AI ASSISTANT ACTION BUTTON (FAB) --- */}
        <div className="fixed bottom-[84px] right-4 lg:bottom-6 lg:right-6 z-[90]">
          <motion.button
            drag
            dragMomentum={false}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => setIsAiOpen(!isAiOpen)}
            className="w-12 h-12 lg:w-14 lg:h-14 bg-transparent border-none flex items-center justify-center cursor-grab active:cursor-grabbing relative touch-none select-none focus:outline-none"
            title="Asisten AI G-Swift (Seret untuk memindahkan)"
          >
            {/* Rotating Star Icon using Framer Motion */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="pointer-events-none flex items-center justify-center relative"
            >
              {/* Outer Blue Sparkle */}
              <Sparkle className="w-10 h-10 lg:w-12 lg:h-12 text-blue-400 fill-blue-400 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              {/* Inner Amber Sparkle (creating beautiful Gemini depth) */}
              <Sparkle className="w-5 h-5 lg:w-6 lg:h-6 text-amber-300 fill-amber-300 absolute filter drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
            </motion.div>

            {/* Simple Status Dot positioned cleanly */}
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 pointer-events-none shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
          </motion.button>
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
