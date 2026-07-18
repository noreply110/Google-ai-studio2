/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import jarvisBg from "./assets/images/jarvis_cool_background_1783882128944.jpg";
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

// Gentle haptic feedback helper for mobile/Android WebViews
export function triggerVibration(ms = 12) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // Ignore vibration blocker errors
    }
  }
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

  // --- Keyboard Focus Detection ---
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

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

  // Monitor keyboard focus events globally
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.hasAttribute("contenteditable") ||
          target.isContentEditable)
      ) {
        setIsKeyboardActive(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (
          !activeEl ||
          (activeEl.tagName !== "INPUT" &&
            activeEl.tagName !== "TEXTAREA" &&
            !activeEl.hasAttribute("contenteditable") &&
            !(activeEl as HTMLElement).isContentEditable)
        ) {
          setIsKeyboardActive(false);
        }
      }, 100);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
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
  const hasLoggedInit = useRef(false);
  useEffect(() => {
    if (!hasLoggedInit.current) {
      addLog("info", "J.A.R.V.I.S Relay active. System ready.");
      checkBackendHealth();
      hasLoggedInit.current = true;
    }
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
      triggerVibration(10);
      setPasscodeError(false);
      setPasscode((prev) => {
        if (prev.length < 6) return prev + key;
        return prev;
      });
    };

    const handleKeypadBackspace = () => {
      triggerVibration(12);
      setPasscodeError(false);
      setPasscode((prev) => prev.slice(0, -1));
    };

    const handleKeypadClear = () => {
      triggerVibration(15);
      setPasscodeError(false);
      setPasscode("");
    };

    return (
      <div className="flex min-h-screen bg-gradient-to-b from-[#ffd445] via-[#ffb837] to-[#ffa133] items-center justify-center p-4 relative overflow-y-auto font-sans select-none text-[#1a1105] overflow-hidden">
        
        {/* Version watermark in top-right */}
        <div className="absolute top-6 right-6 text-right select-none pointer-events-none">
          <span className="text-[11px] font-medium text-black/45 tracking-tight">
            Versi 8.90.0 (10290)
          </span>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-[340px] sm:max-w-sm w-full flex flex-col items-center relative z-10 px-4 py-6"
        >
          {/* Main Title matching the requested screenshot */}
          <div className="w-full text-center flex flex-col gap-1 mb-8">
            <h1 className="text-[17px] font-bold text-[#1a1105] tracking-wide">
              Masukkan PIN kamu
            </h1>
          </div>

          {/* PIN Dots display: circles matching image */}
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
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border transition-all duration-200 ${
                    passcodeError
                      ? "border-rose-600 bg-rose-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      : isFilled 
                        ? "border-[#a23df5] bg-[#a23df5] scale-110 shadow-[0_2px_10px_rgba(162,61,245,0.6)]" 
                        : "border-white bg-white shadow-sm"
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
                  className="text-[10px] font-extrabold text-red-950 text-center uppercase tracking-wider bg-white/45 px-3 py-1 rounded-full border border-red-900/10 shadow-sm"
                >
                  PIN Salah! Silakan coba lagi
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Clean Keypad: Round solid light yellow-orange buttons matching image */}
          <div className="grid grid-cols-3 gap-y-5 gap-x-6 justify-items-center w-full max-w-[260px] sm:max-w-[280px] mx-auto mb-8">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.92, backgroundColor: "#a2854b", color: "#8ca0b7" }}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#fed782]/90 hover:bg-[#fee09c] text-neutral-900 font-normal text-3xl flex items-center justify-center transition-all cursor-pointer shadow-[0_6px_16px_rgba(139,60,0,0.26)] select-none outline-none border-none"
              >
                {num}
              </motion.button>
            ))}
            
            {/* Row 4: Column 1 is empty, Column 2 is "0", Column 3 is Backspace */}
            <div className="w-18 h-18 sm:w-20 sm:h-20" />
            <motion.button
              whileTap={{ scale: 0.92, backgroundColor: "#a2854b", color: "#8ca0b7" }}
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#fed782]/90 hover:bg-[#fee09c] text-neutral-900 font-normal text-3xl flex items-center justify-center transition-all cursor-pointer shadow-[0_6px_16px_rgba(139,60,0,0.26)] select-none outline-none border-none"
            >
              0
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleKeypadBackspace}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-neutral-900 hover:text-black/80 transition-colors cursor-pointer select-none outline-none"
              aria-label="Backspace"
            >
              <svg width="28" height="20" viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18L2 10L9 2H25C26.1 2 27 2.9 27 4V16C27 17.1 26.1 18 25 18H9Z" />
                <path d="M14 7L20 13M20 7L14 13" />
              </svg>
            </motion.button>
          </div>

        </motion.div>
      </div>
    );
  }

  // --- RENDER 3: MAIN SYSTEM APLET ---
  return (
    <div className="flex h-screen h-[100dvh] bg-[#F5F6F8] font-sans text-slate-800 overflow-hidden relative">
      {/* Top glowing bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-jago-orange via-jago to-jago-orange z-[60] shadow-sm" />

      {/* --- JARVIS BRANDED BACKGROUND (Ultra HD) --- */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${jarvisBg})` }}
      />
      {/* Subtle metallic texture and 'circuit-board' tech pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden z-[1]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 80%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M0 30 h40 l15 15 h30 l10 10 h25 M30 0 v40 l15 15 v20 l15 15 v30 M80 120 v-30 l-15 -15 v-25 l-15 -15 v-35' fill='none' stroke='rgba(255,179,0,0.04)' stroke-width='1.2' stroke-dasharray='3 3' /%3E%3Ccircle cx='40' cy='30' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='55' cy='45' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='85' cy='45' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='95' cy='55' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='45' cy='55' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Ccircle cx='60' cy='75' r='3' fill='rgba(255,179,0,0.08)' /%3E%3Cpath d='M10 10 h15 v15' fill='none' stroke='rgba(255,179,0,0.02)' stroke-width='1' /%3E%3Cpath d='M110 10 h-15 v15' fill='none' stroke='rgba(255,179,0,0.02)' stroke-width='1' /%3E%3Cpath d='M10 110 h15 v-15' fill='none' stroke='rgba(255,179,0,0.02)' stroke-width='1' /%3E%3Cpath d='M110 110 h-15 v-15' fill='none' stroke='rgba(255,179,0,0.02)' stroke-width='1' /%3E%3C/svg%3E"),
            linear-gradient(rgba(255, 179, 0, 0.006) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 179, 0, 0.006) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 120px 120px, 30px 30px, 30px 30px",
          opacity: 0.7,
        }}
      />

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

      {/* --- MAIN WORKSPACE --- */}
      <main className={hn(
        "flex-1 flex flex-col overflow-hidden relative z-10 transition-all duration-300",
        isKeyboardActive ? "pb-0" : "pb-[calc(64px+env(safe-area-inset-bottom,0px))]"
      )}>
        
        <header className="h-14 bg-white/75 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-[0_1px_10px_rgba(0,0,0,0.02)] z-30 relative">
          {/* Left Area (Key Button & Back Button) */}
          <div className="flex items-center gap-1.5 min-w-[40px] z-10">
            <button 
              onClick={() => {
                setPasscodeChangeError(null);
                setPasscodeChangeSuccess(null);
                setShowPasscodeModal(true);
              }}
              className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 rounded-lg transition-colors cursor-pointer border border-slate-200 shadow-sm"
              title="Ganti PIN Panel"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            {activeTab !== "send" && (
              <button 
                onClick={() => setActiveTab("send")}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                aria-label="Kembali"
              >
                <ChevronLeft className="w-5 h-5 text-slate-800" />
              </button>
            )}
          </div>
          
          {/* Centered Logo & Brand Text "JARVIS" (No Dots, Consistently Centered) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-0">
            <button 
              onClick={() => setIsAiOpen(!isAiOpen)}
              className="flex items-center gap-2.5 select-none hover:opacity-95 active:scale-[0.96] transition-all text-center focus:outline-none shrink-0 group relative"
              title="Buka Asisten AI JARVIS"
            >
              {/* Outer sci-fi ring decoration around button when hovered/active */}
              <div className="absolute -inset-1.5 rounded-xl border border-jago/25 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 pointer-events-none" />
              
              {/* High-tech Icon container */}
              <div className="w-8 h-8 bg-slate-950 border border-jago/80 text-jago rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,179,0,0.25)] shrink-0 relative overflow-hidden group-hover:border-jago transition-all duration-300">
                {/* Tech background matrix scan */}
                <div className="absolute inset-0 bg-[radial-gradient(#FFB300_1px,transparent_1px)] [background-size:6px_6px] opacity-25" />
                <div className="flex items-center justify-center animate-[spin_8s_linear_infinite]">
                  <Sparkles className="w-4 h-4 text-jago drop-shadow-[0_0_4px_#FFB300]" />
                </div>
                {/* Glowing status pulse dot */}
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-jago shadow-[0_0_6px_#FFB300]" />
              </div>
              
              {/* Cool Glowing "JARVIS" Text without dots */}
              <div className="flex flex-col items-start leading-none">
                <span 
                  className="font-mono font-black text-slate-900 tracking-[0.22em] text-sm sm:text-base uppercase transition-all duration-300 drop-shadow-[0_0_6px_rgba(255,179,0,0.15)] group-hover:text-jago group-hover:drop-shadow-[0_0_12px_rgba(255,179,0,0.65)]"
                  style={{ textShadow: "0 0 10px rgba(255, 179, 0, 0.45)" }}
                >
                  JARVIS
                </span>
                <span className="text-[7px] font-black tracking-[0.3em] text-jago/60 group-hover:text-jago/95 uppercase transition-colors duration-300 mt-0.5">
                  SYSTEM CORE
                </span>
              </div>
            </button>
          </div>

          {/* Right Area (Action buttons) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10">
            <button 
              onClick={handleLogout}
              className="bg-white hover:bg-slate-50 text-slate-700 hover:text-rose-600 border border-slate-200 px-2.5 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-extrabold transition-colors shadow-sm uppercase cursor-pointer hover:border-rose-100"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* --- WORKSPACE VIEW CONTROLLER --- */}
        <div className={hn("flex-1 bg-transparent flex flex-col min-h-0", activeTab === "send" ? "lg:overflow-hidden overflow-y-auto" : "overflow-y-auto")}>
          <AnimatePresence mode="wait">
            {activeTab === "send" ? (
              <SendTab 
                key="send"
                smtpConfig={smtpConfig}
                templates={templates}
                setActiveTab={setActiveTab}
                addLog={addLog}
                triggerConfetti={triggerConfetti}
                isKeyboardActive={isKeyboardActive}
              />
            ) : activeTab === "templates" ? (
              <TemplatesTab 
                key="templates"
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
            ) : activeTab === "terminal" ? (
              <TerminalTab 
                key="terminal"
                logs={logs}
                setLogs={setLogs}
              />
            ) : activeTab === "accounts" ? (
              <AccountsTab 
                key="accounts"
                smtpConfig={smtpConfig}
                setSmtpConfig={setSmtpConfig}
                setActiveTab={setActiveTab}
                addLog={addLog}
                triggerConfetti={triggerConfetti}
                checkBackendHealth={checkBackendHealth}
              />
            ) : null}
          </AnimatePresence>
        </div>

        {/* --- GLOBAL APP MODALS CONTROLLERS --- */}

        {/* Modal 1: Create or Edit Template Modal */}
        <AnimatePresence>
          {showTemplateModal && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white/95 backdrop-blur-md w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
              >
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingTemplateId ? "Ubah Template" : "Template Baru"}
                  </h3>
                  <button 
                    onClick={() => {
                      setShowTemplateModal(false);
                      setEditingTemplateId(null);
                      setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors border border-slate-200"
                  >
                    <ChevronLeft className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 no-scrollbar bg-transparent">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest px-1">
                        Nama Template
                      </label>
                      <input 
                        type="text" 
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="Contoh: Pembayaran Nasabah"
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-sm outline-none focus:border-jago focus:ring-1 focus:ring-jago/20 transition-all font-bold text-slate-800 placeholder:text-slate-400 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest px-1">
                        Kategori
                      </label>
                      <select 
                        value={templateForm.category}
                        onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-sm outline-none focus:border-jago focus:ring-1 focus:ring-jago/20 transition-all font-bold text-slate-800 shadow-sm cursor-pointer"
                      >
                        <option value="General" className="bg-white text-slate-800">General</option>
                        <option value="Marketing" className="bg-white text-slate-800">Marketing</option>
                        <option value="Support" className="bg-white text-slate-800">Support</option>
                        <option value="Personal" className="bg-white text-slate-800">Personal</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest px-1">
                      Subjek Bawaan
                    </label>
                    <input 
                      type="text" 
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="Subjek email otomatis"
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-sm outline-none focus:border-jago focus:ring-1 focus:ring-jago/20 transition-all font-bold text-slate-800 placeholder:text-slate-400 shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest px-1">
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

                <div className="px-6 py-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0">
                  <button 
                    onClick={handleSaveTemplateSubmit}
                    className="w-full sm:flex-1 py-4 bg-jago hover:bg-jago-hover text-white text-sm font-black rounded-2xl border border-jago-dark transition-all shadow-md active:scale-[0.98] order-1 sm:order-2 cursor-pointer uppercase tracking-wider"
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
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/95 backdrop-blur-md w-full max-w-2xl rounded-[24px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
              >
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      {previewTemplate.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold truncate">
                      {previewTemplate.subject}
                    </p>
                  </div>
                  <button 
                    onClick={() => setPreviewTemplate(null)}
                    className="p-1 hover:bg-slate-100 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-45 text-slate-400 hover:text-slate-700" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden p-4 bg-slate-100 flex flex-col min-h-[380px]">
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

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
                  <button 
                    onClick={() => setPreviewTemplate(null)}
                    className="flex-1 py-3 text-[11px] font-black text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all uppercase tracking-wider"
                  >
                    TUTUP
                  </button>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("use-template", { detail: previewTemplate }));
                      setActiveTab("send");
                      setPreviewTemplate(null);
                    }}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-xl border border-amber-600 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 uppercase tracking-wider"
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
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/95 backdrop-blur-md w-full max-w-[340px] rounded-3xl p-6 shadow-2xl border border-slate-200 flex flex-col items-center text-center relative overflow-hidden text-slate-800"
              >
                <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-500">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                  Hapus Template?
                </h3>
                
                <p className="text-xs text-slate-500 font-bold mb-6">
                  Apakah Anda yakin ingin menghapus template <span className="text-slate-800">"{templateToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setTemplateToDelete(null)}
                    className="flex-1 py-2 text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
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

        {/* Modal 4: Kirim Email Percobaan */}
        <AnimatePresence>
          {quickTestTemplate && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white/95 backdrop-blur-md w-full max-w-[320px] rounded-2xl border border-slate-200 shadow-2xl p-5 text-slate-800"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                    Kirim Email Percobaan
                  </h3>
                  <button 
                    onClick={() => setQuickTestTemplate(null)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-45" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-600 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200 font-medium">
                  Mengirim: <span className="font-black text-slate-800">{quickTestTemplate.name}</span>
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
                      className="w-full px-3 py-2 bg-white border border-slate-200/80 hover:border-slate-300 rounded-lg text-xs focus:outline-none focus:border-jago focus:ring-1 focus:ring-jago/20 transition-all font-bold text-slate-800 placeholder:text-slate-400 shadow-sm"
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
                    className="w-full py-3 bg-jago hover:bg-jago-hover text-white text-[10px] font-bold rounded-xl border border-jago-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-wider shadow-md shadow-jago/10"
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
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white/95 backdrop-blur-md w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl z-[1000] overflow-hidden text-slate-800"
              >
                {/* Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-jago-light via-jago to-jago-light" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-200 shadow-sm shrink-0">
                      <KeyRound className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Ganti PIN Panel
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">
                        Amankan akses konsol admin Anda dengan 6 digit angka
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPasscodeModal(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <hr className="border-slate-200 mb-4" />

                <form onSubmit={handleChangePasscode} className="space-y-4">
                  {passcodeChangeError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-[11px] font-bold flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{passcodeChangeError}</span>
                    </motion.div>
                  )}

                  {passcodeChangeSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-[11px] font-bold flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{passcodeChangeSuccess}</span>
                    </motion.div>
                  )}

                  <div className="space-y-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-600 px-1 uppercase tracking-wider">
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
                        className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-mono font-semibold focus:border-jago focus:ring-1 focus:ring-jago/20 outline-none transition-all text-slate-800 placeholder:text-slate-400 shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-600 px-1 uppercase tracking-wider">
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
                        className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-mono font-semibold focus:border-jago focus:ring-1 focus:ring-jago/20 outline-none transition-all text-slate-800 placeholder:text-slate-400 shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-slate-600 px-1 uppercase tracking-wider">
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
                        className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-mono font-semibold focus:border-jago focus:ring-1 focus:ring-jago/20 outline-none transition-all text-slate-800 placeholder:text-slate-400 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowPasscodeModal(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider border border-slate-200"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-jago hover:bg-jago-hover text-white text-[10px] font-black rounded-xl border border-jago-dark transition-all shadow-md flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
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
        <nav className={hn(
          "fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/90 h-[64px] flex items-center justify-around z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] px-2 safe-area-bottom overflow-hidden transition-all duration-300",
          isKeyboardActive ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        )}>
          <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-slate-200/10 via-slate-200/50 to-slate-200/10 z-10" />
          {[
            { id: "send", icon: Send, label: "Kirim" },
            { id: "templates", icon: FileText, label: "Templates" },
            { id: "accounts", icon: Settings, label: "SMTP" },
            { id: "terminal", icon: TerminalIcon, label: "Logs" }
          ].map((item) => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  triggerVibration(12);
                  setActiveTab(item.id as any);
                }}
                className="relative flex flex-col items-center justify-center gap-1 w-14 h-full transition-all duration-300"
              >
                <div className={hn(
                  "p-1.5 rounded-xl transition-all duration-300 relative z-10 border",
                  isTabActive 
                    ? "bg-jago text-white border-jago-dark/20 shadow-md shadow-jago/10" 
                    : "text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-50"
                )}>
                  <item.icon className={hn("w-4.5 h-4.5 transition-transform", isTabActive && "scale-105")} />
                </div>
                <span className={hn(
                  "text-[9px] font-black transition-all uppercase tracking-tight relative z-10",
                  isTabActive ? "text-jago-dark font-extrabold" : "text-slate-500"
                )}>
                  {item.label}
                </span>
                {isTabActive && (
                  <motion.div 
                    layoutId="activeTabMobile" 
                    className="absolute bottom-0 w-12 h-1 bg-gradient-to-r from-jago to-jago-orange rounded-t-full shadow-[0_-3px_10px_rgba(255,179,0,0.3)]"
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
                className="bg-[#0c1f3d]/95 backdrop-blur-md border-l-4 border-l-sky-500 border border-white/10 rounded-xl p-3.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] flex gap-2.5 text-white pointer-events-auto overflow-hidden relative"
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
