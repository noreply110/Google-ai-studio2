/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, Terminal as TerminalIcon, FileText, Settings, ShieldCheck, 
  Trash2, Plus, Pen, Search, Eye, AlertCircle, CheckCircle, 
  ChevronLeft, Info, Loader2, AlertTriangle, Mail,
  Activity, MousePointer, Laptop, Globe, RefreshCw, Clock, ArrowUpRight,
  Sparkles, KeyRound
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types definition for easy editing
interface EmailTemplate {
  id: string;
  name: string;
  category: "General" | "Marketing" | "Support" | "Personal";
  subject: string;
  message: string;
  createdAt: number;
}

interface SmtpConfig {
  host: string;
  port: string;
  username: string;
  password: "";
  senderEmail: string;
  fromName: string;
  replyTo: string;
  dailyLimit: string;
  connectionType: "STARTTLS" | "SSL" | "NONE";
  logoUrl: string;
}

interface LogEntry {
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

interface SpamReport {
  score: number;
  level: "Excellent" | "Good" | "Risky" | "Likely Spam";
  color: string;
  tips: string[];
}

interface BankingNotification {
  id: string;
  type: "sent" | "opened" | "clicked";
  title: string;
  message: string;
  recipient: string;
  subject: string;
  ip?: string;
  timestamp: string;
}

export default function App() {
  // --- Maintenance State ---
  const [maintenance, setMaintenance] = useState(false);

  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("admin_logged_in") === "true";
  });
  const [passcode, setPasscode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);
  const [savedPasscode, setSavedPasscode] = useState(() => {
    return localStorage.getItem("app_passcode") || "Jefri110";
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

  // --- Email Composer State ---
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    message: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [showRocketScreen, setShowRocketScreen] = useState(false);

  // --- Status and Alerts ---
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [smtpTestError, setSmtpTestError] = useState<string | null>(null);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState<boolean>(false);

  const getSmtpDiagnostic = (errorStr: string) => {
    const err = errorStr.toLowerCase();
    
    if (err.includes("smtpclientauthentication is disabled") || err.includes("smtp_auth_disabled")) {
      return {
        title: "SmtpClientAuthentication Disabled (Microsoft 365 / Outlook)",
        reason: "Fitur Authenticated SMTP dinonaktifkan oleh kebijakan keamanan administrator (Security Defaults) di penyewa Microsoft 365 / Exchange Online Anda.",
        steps: [
          "Minta Administrator IT Anda membuka Admin Center Microsoft 365 (admin.microsoft.com).",
          "Buka Pengguna Aktif (Active Users) > pilih nama pengguna Anda > tab Email > Kelola aplikasi email (Manage email apps).",
          "Beri tanda centang pada 'SMTP Terautentikasi' (Authenticated SMTP) lalu simpan perubahan.",
          "Alternatif (PowerShell): Jalankan perintah 'Set-CASMailbox -Identity \"email@domain.com\" -SmtpClientAuthenticationDisabled $false'.",
          "Tunggu 5-15 menit agar Microsoft menerapkan perubahan sebelum mencoba kembali."
        ]
      };
    }
    
    if (err.includes("app-specific password") || err.includes("application-specific password") || err.includes("app password") || (err.includes("gmail") && err.includes("535")) || (err.includes("google") && err.includes("535"))) {
      return {
        title: "Diperlukan Sandi Aplikasi (Gmail / Google Workspace)",
        reason: "Google melarang login menggunakan password utama demi keamanan Anda, kecuali menggunakan Sandi Aplikasi khusus.",
        steps: [
          "Buka setelan Akun Google Anda (myaccount.google.com).",
          "Aktifkan Verifikasi 2 Langkah (2-Step Verification) jika belum aktif.",
          "Masuk ke Keamanan (Security) > cari/pilih 'Sandi Aplikasi' (App Passwords).",
          "Buat sandi baru untuk aplikasi 'Lainnya' (Sebut saja 'Relay Panel') lalu klik Buat.",
          "Salin kode 16 digit yang muncul, lalu gunakan kode tersebut sebagai password SMTP di sini (tanpa spasi)."
        ]
      };
    }
    
    if (err.includes("zoho") && err.includes("535")) {
      return {
        title: "Diperlukan Sandi Aplikasi Zoho Mail",
        reason: "Akun Zoho Anda mengaktifkan Autentikasi Dua Faktor (2FA) atau mewajibkan Sandi Aplikasi khusus untuk integrasi SMTP.",
        steps: [
          "Masuk ke Zoho Directory / Zoho Mail Control Panel.",
          "Buka My Account > Security > Application-Specific Passwords.",
          "Buat sandi baru, beri nama 'Relay Panel'.",
          "Salin sandi aplikasi tersebut dan masukkan sebagai Password SMTP Anda di panel ini."
        ]
      };
    }

    if (err.includes("timeout") || err.includes("refused") || err.includes("econnrefused") || err.includes("etimedout")) {
      return {
        title: "Koneksi Terputus / Timeout (Blokir Port)",
        reason: "Server tidak merespons atau menolak koneksi pada port yang ditentukan. Banyak penyedia jaringan/cloud memblokir port SMTP default untuk mencegah spam.",
        steps: [
          "Pastikan Host SMTP dan Port yang Anda masukkan sudah benar.",
          "Port 25 seringkali diblokir total oleh penyedia internet/cloud. Gunakan Port 465 (dengan SSL) atau Port 587 (dengan STARTTLS).",
          "Periksa apakah kombinasi Port dan Tipe Enkripsi cocok: SSL untuk port 465, STARTTLS untuk port 587."
        ]
      };
    }

    if (err.includes("invalid login") || err.includes("authentication unsuccessful") || err.includes("535 5.7.8") || err.includes("authentication failed")) {
      return {
        title: "Username atau Password Salah (Kredensial Tidak Valid)",
        reason: "Server SMTP menolak kombinasi email dan password yang Anda masukkan.",
        steps: [
          "Periksa kembali apakah penulisan email/username SMTP sudah benar-benar sesuai.",
          "Pastikan tidak ada salah ketik (typo) atau spasi ekstra di awal atau akhir password Anda.",
          "Jika akun Anda menggunakan otentikasi Single Sign-On (SSO) or 2FA, pastikan menggunakan Sandi Aplikasi (App Password), bukan password utama Anda."
        ]
      };
    }

    return {
      title: "Kegagalan Pengiriman / Otentikasi Umum",
      reason: "Server SMTP merespons dengan kesalahan yang mencegah pengiriman email pengetesan.",
      steps: [
        "Periksa kembali pengaturan Host, Port, dan Protokol Keamanan Anda.",
        "Coba gunakan kombinasi port lain (misal beralih dari Port 587 ke Port 465).",
        "Pastikan akun email pengirim Anda aktif dan tidak dalam keadaan ditangguhkan (suspended)."
      ]
    };
  };

  // --- Streaming Terminal Logs ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // --- Templates CRUD & Modal ---
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    const saved = localStorage.getItem("email_templates");
    return saved ? JSON.parse(saved) : [];
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
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

  // --- SMTP Configuration State ---
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    const defaultLogo = "";
    const saved = localStorage.getItem("smtp_account");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.logoUrl === undefined) {
        parsed.logoUrl = defaultLogo;
        localStorage.setItem("smtp_account", JSON.stringify(parsed));
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

  // --- Spam Score Calculation ---
  const [spamReport, setSpamReport] = useState<SpamReport>({
    score: 100,
    level: "Excellent",
    color: "text-emerald-500",
    tips: []
  });

  // --- Smart SMTP Detection State ---
  const [isDetectingSmtp, setIsDetectingSmtp] = useState(false);
  const [smtpRecommendation, setSmtpRecommendation] = useState<{
    host: string;
    port: string;
    connectionType: "STARTTLS" | "SSL" | "NONE";
    providerName: string;
    emailDetected: string;
    layer?: number;
    source?: string;
  } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Scroll to terminal bottom on log stream
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Initial Bootup Connection Diagnostics
  useEffect(() => {
    checkBackendHealth();
    addLog("info", "G-Swift Relay active. System ready.");
  }, []);

  // BeforeUnload confirm warning for unsaved drafts
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (emailForm.to || emailForm.subject || emailForm.message) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [emailForm.to, emailForm.subject, emailForm.message]);

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

  // Real-time SMTP Auto-Detection Handler
  const handleDetectSmtp = async (email: string) => {
    if (!email || !email.includes("@")) {
      setSmtpRecommendation(null);
      return;
    }

    setIsDetectingSmtp(true);
    try {
      const response = await fetch("/api/detect-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        setSmtpRecommendation({
          host: data.host,
          port: data.port,
          connectionType: data.connectionType as "STARTTLS" | "SSL" | "NONE",
          providerName: data.providerName,
          emailDetected: email,
          layer: data.layer || 1,
          source: data.source
        });
        
        // Auto-apply SMTP settings directly
        setSmtpConfig(prev => ({
          ...prev,
          host: data.host,
          port: data.port,
          connectionType: data.connectionType as any
        }));

        const layerNum = data.layer || 1;
        const sourceName = data.source || "Unknown";
        addLog("info", `Deteksi SMTP Cerdas (Layer ${layerNum} - ${sourceName}): Terdeteksi ${data.providerName}`);
        addLog("success", `Konfigurasi server ${data.host}:${data.port} (${data.connectionType}) diterapkan otomatis.`);
      } else {
        setSmtpRecommendation(null);
      }
    } catch (err: any) {
      console.error("Gagal mendeteksi SMTP:", err);
      setSmtpRecommendation(null);
    } finally {
      setIsDetectingSmtp(false);
    }
  };

  // Debounced Effect for Auto SMTP Detection
  useEffect(() => {
    const email = smtpConfig.username.trim();
    if (!email || !email.includes("@")) {
      setSmtpRecommendation(null);
      return;
    }

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return;
    }

    // If already detected for this email, skip to avoid duplicate requests
    if (smtpRecommendation && smtpRecommendation.emailDetected === email) {
      return;
    }

    const timer = setTimeout(() => {
      handleDetectSmtp(email);
    }, 800);

    return () => clearTimeout(timer);
  }, [smtpConfig.username]);

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
        const text = await res.text();
        addLog("error", "Respons API tidak valid (Bukan JSON).");
      }
    } catch {
      addLog("error", "API tidak terjangkau. Server sedang restart atau belum siap.");
    }
  };

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
        const raw = await response.text();
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

  const deleteTemplate = (id: string) => {
    if (confirm("Apakah anda yakin ingin menghapus template ini?")) {
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      localStorage.setItem("email_templates", JSON.stringify(updated));
      addLog("warning", "Template berhasil dihapus.");
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
      setTimeout(() => setSuccessBanner(null), 3000);
      setTimeout(() => setShowRocketScreen(false), 800);
    } else {
      setShowRocketScreen(false);
    }
  };

  const handleSmtpSave = () => {
    localStorage.setItem("smtp_account", JSON.stringify(smtpConfig));
    addLog("success", "Konfigurasi SMTP berhasil diperbarui.");
    checkBackendHealth();
    setActiveTab("send");
  };

  const testSmtpConnection = async () => {
    if (!smtpConfig.username || !smtpConfig.password || !smtpConfig.host) {
      addLog("warning", "Harap isi kredensial SMTP sebelum melakukan pengetesan.");
      return;
    }

    setIsSending(true);
    setShowRocketScreen(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    setSmtpTestError(null);
    setSmtpTestSuccess(false);
    addLog("info", "Sedang menguji koneksi SMTP...");

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: smtpConfig.senderEmail || smtpConfig.username,
          subject: "Test Connection - Relay Console",
          text: "Jika Anda menerima email ini, konfigurasi SMTP Anda sudah berjalan dengan baik.",
          html: `
            <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #eef4ff; border-radius: 20px; border: 1px solid #dce9fe;">
              <h1 style="color: #003A8F; margin-bottom: 12px;">Koneksi Berhasil!</h1>
              <p style="color: #64748b; font-size: 14px;">Relay console Anda telah berhasil terhubung dengan server pengiriman.</p>
              <div style="margin-top: 20px; font-size: 11px; color: #94a3b8; font-weight: bold;">TIMESTAMP: ${new Date().toLocaleString()}</div>
            </div>
          `,
          smtpConfig: smtpConfig
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal melakukan pengetesan SMTP");
      }

      setSuccessBanner("Test koneksi SMTP berhasil!");
      setSmtpTestSuccess(true);
      addLog("success", "Uji coba SMTP berhasil. Silakan cek inbox email pengirim.");
      setTimeout(() => setShowRocketScreen(false), 800);
    } catch (err: any) {
      setErrorBanner(`Koneksi Gagal: ${err.message}`);
      setSmtpTestError(err.message);
      addLog("error", `SMTP Test Gagal: ${err.message}`);
      setShowRocketScreen(false);
    } finally {
      setIsSending(false);
    }
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

  const startEditTemplate = (t: EmailTemplate) => {
    setTemplateForm({
      name: t.name,
      category: t.category,
      subject: t.subject,
      message: t.message
    });
    setEditingTemplateId(t.id);
    setShowTemplateModal(true);
  };

  const useTemplateContent = (t: EmailTemplate) => {
    setEmailForm({
      to: emailForm.to,
      subject: t.subject,
      message: t.message
    });
    setActiveTab("send");
    addLog("info", `Menggunakan template: ${t.name}`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("admin_logged_in");
    setPasscode("");
    setPasscodeError(false);
    setActiveTab("send");
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === savedPasscode) {
      setIsLoggedIn(true);
      if (rememberMe) {
        localStorage.setItem("admin_logged_in", "true");
      }
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeChangeError(null);
    setPasscodeChangeSuccess(null);

    if (currentPasscodeForm !== savedPasscode) {
      setPasscodeChangeError("Passcode sekarang tidak benar.");
      addLog("error", "Gagal mengganti passcode: Passcode lama salah.");
      return;
    }

    if (!newPasscodeForm) {
      setPasscodeChangeError("Passcode baru tidak boleh kosong.");
      return;
    }

    if (newPasscodeForm.length < 4) {
      setPasscodeChangeError("Passcode baru minimal 4 karakter.");
      return;
    }

    if (newPasscodeForm !== confirmPasscodeForm) {
      setPasscodeChangeError("Konfirmasi passcode baru tidak cocok.");
      return;
    }

    // Save
    localStorage.setItem("app_passcode", newPasscodeForm);
    setSavedPasscode(newPasscodeForm);
    setPasscodeChangeSuccess("Passcode berhasil diperbarui!");
    addLog("success", "Passcode keamanan panel berhasil diubah.");
    
    // Clear fields
    setCurrentPasscodeForm("");
    setNewPasscodeForm("");
    setConfirmPasscodeForm("");
  };

  // Filter templates list
  const filteredTemplates = templates
    .filter((t) => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // --- RENDER 1: MAINTENANCE PAGE ---
  if (maintenance && localStorage.getItem("bypass_maintenance") !== "active") {
    return (
      <div className="flex h-screen bg-gradient-to-tr from-[#d6e6ff] via-[#f0f5ff] to-[#fafcff] items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,66,122,0.05),transparent)] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFD700] via-[#FFC000] to-[#E6AC00] z-[60]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-[0_40px_100px_-20px_rgba(0,58,143,0.3)] border border-slate-100 flex flex-col items-center text-center relative z-10"
        >
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 relative">
            <Settings className="w-12 h-12 text-[#003A8F] animate-spin" style={{ animationDuration: "8s" }} />
            <div className="absolute -right-1 -top-1 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>

          {smtpConfig.logoUrl && !logoLoadError ? (
            <img 
              src={smtpConfig.logoUrl} 
              alt="Logo" 
              className="h-14 w-auto mb-6 object-contain max-h-16"
              referrerPolicy="no-referrer"
              onError={() => {
                setLogoLoadError(true);
              }}
            />
          ) : (
            <div className="flex items-center gap-2 mb-6 select-none bg-blue-50/50 px-4 py-2 rounded-2xl border border-blue-100/30 shadow-sm">
              <div className="w-9 h-9 bg-gradient-to-tr from-[#0050b3] to-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <span className="font-black text-slate-800 tracking-tight text-base uppercase">
                Swift<span className="text-[#0050b3]">Relay</span>
              </span>
            </div>
          )}

          <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
            Sedang Pemeliharaan
          </h1>
          <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
            Kami sedang melakukan peningkatan sistem untuk memberikan layanan pengiriman yang lebih cepat, andal, dan aman.
          </p>

          <div className="mt-8 w-full">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]" />
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                Estimasi Selesai: Segera
              </span>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 w-full">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
              Terhubung dengan Tim IT Support
            </p>
            <div className="flex justify-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                <TerminalIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Hidden input to bypass maintenance screen */}
          <input 
            type="password" 
            className="opacity-0 absolute bottom-0 h-1 w-1 pointer-events-none"
            onChange={(e) => {
              if (e.target.value === "mantap") {
                localStorage.setItem("bypass_maintenance", "active");
                setMaintenance(false);
              }
            }}
          />
        </motion.div>
        
        <p className="absolute bottom-8 text-[10px] font-black text-[#003A8F] uppercase tracking-widest opacity-30 select-none">
          G-Swift Relay System v1.0.8
        </p>
      </div>
    );
  }

  // --- RENDER 2: LOGIN PAGE ---
  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-gradient-to-tr from-[#d6e6ff] via-[#f0f5ff] to-[#fafcff] items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 via-blue-400 to-blue-500 z-[60] shadow-[0_1px_3px_rgba(0,0,0,0.1)]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-white flex flex-col items-center ring-1 ring-blue-100/50 relative z-10"
        >
          {smtpConfig.logoUrl && !logoLoadError ? (
            <img 
              src={smtpConfig.logoUrl} 
              alt="Logo" 
              className="h-14 w-auto object-contain mb-8 max-h-16"
              referrerPolicy="no-referrer"
              onError={() => {
                setLogoLoadError(true);
              }}
            />
          ) : (
            <div className="flex items-center gap-2 mb-8 select-none bg-blue-50/50 px-4 py-2 rounded-2xl border border-blue-100/30 shadow-sm">
              <div className="w-9 h-9 bg-gradient-to-tr from-[#0050b3] to-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <span className="font-black text-slate-800 tracking-tight text-base uppercase">
                Swift<span className="text-[#0050b3]">Relay</span>
              </span>
            </div>
          )}

          <div className="w-full text-center flex flex-col gap-1 mb-6">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Admin Area
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Sistem Pengiriman Email
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2 relative">
              <label className="text-[10px] font-extrabold text-[#003A8F] uppercase tracking-widest pl-2">
                Passcode
              </label>
              <input 
                type="password" 
                placeholder="••••••"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPasscodeError(false);
                }}
                className={`w-full text-center tracking-[0.5em] font-mono font-bold text-lg px-4 py-4 rounded-2xl bg-slate-50 border outline-none transition-all shadow-inner ${
                  passcodeError 
                    ? "border-rose-500 text-rose-600 focus:ring-4 focus:ring-rose-100 placeholder:text-rose-300" 
                    : "border-slate-200 text-slate-900 focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100 placeholder:text-slate-300"
                }`}
                autoFocus 
              />
              <AnimatePresence>
                {passcodeError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -5 }}
                    className="text-[10px] font-bold text-rose-500 text-center uppercase absolute -bottom-5 w-full"
                  >
                    Passcode Salah
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <label className="flex items-center gap-2.5 justify-center cursor-pointer mt-3 group w-fit mx-auto">
              <div 
                className={`w-4 h-4 rounded-md flex items-center justify-center transition-all bg-slate-50 ring-1 ${
                  rememberMe 
                    ? "bg-[#0050b3] ring-[#0050b3] text-white shadow-sm" 
                    : "bg-slate-50 ring-slate-300 group-hover:ring-blue-400 text-transparent"
                }`}
              >
                <CheckCircle className="w-3 h-3" strokeWidth={3} />
              </div>
              <input 
                type="checkbox" 
                className="hidden"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest select-none pt-0.5">
                Ingat Saya
              </span>
            </label>

            <button 
              type="submit"
              className="w-full mt-2 py-4 bg-gradient-to-b from-[#0050b3] to-[#003a8f] hover:from-[#003a8f] hover:to-[#002c6c] text-white text-[11px] font-black rounded-2xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-[0.98] uppercase tracking-[0.1em]"
            >
              <ShieldCheck className="w-4 h-4" /> Masuk Sistem
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // --- RENDER 3: MAIN SYSTEM APLET ---
  return (
    <div className="flex h-screen bg-gradient-to-tr from-[#d6e6ff] via-[#f0f5ff] to-[#fafcff] font-sans text-slate-800 overflow-hidden relative">
      {/* Top glowing bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 via-blue-400 to-blue-500 z-[60] shadow-[0_1px_3px_rgba(0,0,0,0.1)]" />

      {/* --- SIDEBAR DESKTOP VIEW --- */}
      <aside className="hidden lg:flex w-64 bg-slate-950 flex-col text-slate-200">
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
                  <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-[#0050b3] text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <span className="font-black text-white tracking-tight text-base uppercase shrink-0">
                    Swift<span className="text-blue-400">Relay</span>
                  </span>
                </div>
              )}
            </div>

            {/* Passcode key icon */}
            <button 
              onClick={() => {
                setPasscodeChangeError(null);
                setPasscodeChangeSuccess(null);
                setShowPasscodeModal(true);
              }}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-amber-400 hover:text-amber-300 rounded-xl transition-all cursor-pointer shadow-sm relative group shrink-0"
              title="Ganti Passcode Panel"
            >
              <KeyRound className="w-4 h-4" />
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-9 px-2 py-1 bg-slate-900 border border-slate-850 text-[9px] font-bold text-white uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-50">
                Ganti Passcode
              </span>
            </button>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
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
                  "relative w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-[13.5px] font-bold outline-none cursor-pointer overflow-hidden group",
                  isTabActive
                    ? "text-white font-black"
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
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1.5 tracking-widest">
              Status Koneksi
            </div>
            <div className={hn(
              "flex items-center gap-2",
              apiStatus?.smtp_configured || smtpConfig.username ? "text-green-400" : "text-amber-400"
            )}>
              <div className={hn(
                "w-1.5 h-1.5 rounded-full",
                apiStatus?.smtp_configured || smtpConfig.username ? "bg-green-500 animate-pulse" : "bg-amber-500"
              )} />
              <span className="text-[11px] font-bold">
                {apiStatus?.smtp_configured || smtpConfig.username ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col overflow-hidden pb-[72px] lg:pb-0 relative">
        
        {/* --- GLOBAL SENDING ROCKET ANIMATION OVERLAY --- */}
        <AnimatePresence>
          {showRocketScreen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] pointer-events-auto flex items-center justify-center overflow-hidden bg-slate-950/60 backdrop-blur-sm"
            >
              <div className="relative flex flex-col items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: 1 / 0, ease: "linear" }}
                  className="absolute w-48 h-48 border border-dashed border-blue-500/20 rounded-full"
                />
                {[...Array(5)].map((_, idx) => (
                  <motion.div 
                    key={idx}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, delay: idx * 0.2, repeat: 1 / 0, ease: "linear" }}
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
                  transition={{ duration: 0.6, repeat: 1 / 0 }}
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
                    transition={{ duration: 0.7, repeat: 1 / 0, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-45"
                  />
                </motion.div>

                {/* Floating particle sparkle dots */}
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
                    transition={{ duration: 0.5, delay: Math.random() * 0.3, repeat: 1 / 0, ease: "circOut" }}
                    className="absolute w-1 h-1 bg-blue-400 rounded-full"
                  />
                ))}
              </div>

              <div className="absolute bottom-1/4 flex flex-col items-center gap-3">
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.7, repeat: 1 / 0 }}
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
                        transition={{ duration: 0.3, delay: i * 0.1, repeat: 1 / 0 }}
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

        {/* --- DYNAMIC APP HEADER --- */}
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-[#0050b3] to-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="font-black text-slate-800 tracking-tight text-sm sm:text-base uppercase shrink-0">
                    Swift<span className="text-[#0050b3]">Relay</span>
                  </span>
                </div>
              )}
              
              <span className="h-4 w-px bg-slate-200 hidden xs:inline shrink-0" />
              
              <h1 className="text-xs sm:text-sm font-extrabold text-[#003A8F] uppercase tracking-tight truncate">
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
            {activeTab === "accounts" && (
              <button 
                onClick={handleSmtpSave}
                className="bg-[#0050b3] hover:bg-blue-700 text-white px-2.5 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-colors shadow-sm uppercase cursor-pointer"
              >
                Simpan
              </button>
            )}
            <button 
              onClick={() => {
                setPasscodeChangeError(null);
                setPasscodeChangeSuccess(null);
                setShowPasscodeModal(true);
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-amber-500 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
              title="Ganti Passcode Panel"
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
        <div className="flex-1 overflow-y-auto bg-white/40">
          <AnimatePresence mode="wait">
            
            {/* View 1: Send Interface */}
            {activeTab === "send" && (
              <motion.div
                key="send-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-4 max-w-lg mx-auto flex flex-col gap-4 min-h-full"
              >
                <div className="space-y-4 max-w-4xl mx-auto w-full">
                  <div className="bg-white rounded-2xl border border-white shadow-[0_25px_60px_rgba(0,58,143,0.25)] overflow-hidden ring-1 ring-blue-100/50">
                    
                    {/* Floating Scan Header Banner */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-col gap-2 relative">
                      <div className="flex justify-between items-center mb-1">
                        <h2 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <div className="relative flex items-center justify-center w-2.5 h-2.5">
                            <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600 shadow-[0_0_8px_#22c55e]" />
                          </div>
                          Sistem Anti-Spam Gmail – Pengirim
                        </h2>
                        <span className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1.5">
                          <div className="w-1 h-3 bg-emerald-500/20 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_4px_#3b82f6] animate-[scan_1.5s_linear_infinite]" />
                          </div>
                          AKTIF
                        </span>
                      </div>

                      {/* Display current active sender SMTP account */}
                      {smtpConfig.username ? (
                        <div className="flex items-center gap-2.5 bg-gradient-to-r from-[#0050b3] to-[#003a8f] p-2.5 rounded-xl shadow-lg border border-blue-400/30 group transition-all hover:shadow-blue-200/50">
                          <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[7px] font-black text-blue-200 uppercase tracking-[0.2em] mb-0.5">
                              Pengirim: {smtpConfig.fromName || "Tanpa Nama"}
                            </span>
                            <span className="text-xs font-black text-white truncate drop-shadow-sm">
                              {smtpConfig.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#4ade80]" />
                            <span className="text-[8px] font-bold text-white uppercase tracking-tighter">
                              Secure Relay
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 bg-slate-100 p-3 rounded-xl border border-slate-200 border-dashed justify-center">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                            Belum Ada Akun Pengirim. Silakan konfigurasi di tab "Akun".
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Email Compose Form */}
                    <form onSubmit={handleSendEmailSubmit} className="p-4 space-y-4">
                      {/* Banners */}
                      {errorBanner && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex flex-col gap-2 relative"
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
                          className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-2 items-center relative"
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
                      <div className="space-y-3">
                        <div className="relative">
                          <input 
                            required 
                            type="email"
                            value={emailForm.to}
                            onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                            placeholder="Email Penerima" 
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#0050b3] transition-all font-semibold text-slate-900 placeholder:text-slate-400 shadow-sm"
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
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#0050b3] transition-all font-semibold text-slate-900 placeholder:text-slate-400 shadow-sm"
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
                            className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 overflow-hidden shadow-sm"
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
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
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

                        <div className="border border-slate-300 rounded-2xl bg-white min-h-[160px] max-h-[400px] flex flex-col shadow-inner overflow-hidden ring-1 ring-slate-100">
                          <textarea 
                            required
                            rows={8}
                            value={emailForm.message}
                            onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                            placeholder="Tulis pesan anda di sini... (Mendukung tag HTML)"
                            className="flex-1 p-4 text-sm outline-none shadow-none focus:ring-0 resize-none bg-transparent leading-relaxed font-semibold text-slate-800 placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Reusable Templates Shortcut Carousel */}
                      <div className="pt-2 flex flex-col gap-3">
                        {templates.length > 0 && (
                          <div className="flex flex-col gap-1.5 px-1">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                              Gunakan Template Tersimpan
                            </span>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                              {templates.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => useTemplateContent(t)}
                                  className="shrink-0 group flex flex-col items-start p-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#003A8F] transition-all shadow-sm hover:shadow-blue-100 active:scale-95 min-w-[100px]"
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
                          className="w-full py-4 bg-gradient-to-b from-[#0050b3] via-[#003a8f] to-[#002c6c] hover:from-[#003a8f] hover:to-[#002150] text-white text-[11px] font-black rounded-2xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.1em]"
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
            )}

            {/* View 2: Templates Management */}
            {activeTab === "templates" && (
              <motion.div
                key="templates-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 lg:p-10 max-w-7xl mx-auto pb-32"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-1">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Template Email
                    </h2>
                    <p className="text-sm text-slate-500 font-bold mt-1">
                      Kelola dan gunakan kembali draf pengiriman email kustom Anda.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Cari template..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                      />
                    </div>

                    <button 
                      onClick={() => {
                        setEditingTemplateId(null);
                        setTemplateForm({ name: "", category: "General", subject: "", message: "" });
                        setShowTemplateModal(true);
                      }}
                      className="w-10 h-10 bg-[#0050b3] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 transition-all active:scale-90 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredTemplates.map((t) => (
                    <motion.div 
                      key={t.id}
                      layout
                      className="bg-white border-2 border-white rounded-[28px] overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,58,143,0.18)] hover:shadow-[0_30px_70px_-12px_rgba(0,58,143,0.35)] transition-all group hover:-translate-y-1 ring-1 ring-blue-100/30"
                    >
                      <div className="p-4 sm:p-6 flex flex-col h-full justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <span className="px-3 py-1 bg-blue-50 text-blue-800 text-[10px] font-extrabold uppercase rounded-full">
                              {t.category}
                            </span>
                            <button 
                              onClick={() => deleteTemplate(t.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <h3 className="font-extrabold text-slate-900 mb-1 leading-tight text-sm">
                            {t.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-bold mb-6 line-clamp-2 leading-relaxed">
                            {t.subject}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex gap-1.5 xs:gap-2 items-center">
                          <button 
                            onClick={() => startEditTemplate(t)}
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-blue-700 rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center shrink-0"
                            title="Edit Draft"
                          >
                            <Pen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button 
                            onClick={() => setPreviewTemplate(t)}
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center shrink-0"
                            title="Pratinjau"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setQuickTestTemplate(t);
                              setQuickTestRecipient("");
                            }}
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center shrink-0"
                            title="Kirim Tes"
                          >
                            <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
                          </button>
                          <button 
                            onClick={() => useTemplateContent(t)}
                            className="flex-1 h-8 sm:h-10 bg-[#0050b3] text-white text-[9px] sm:text-[10px] font-black rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center shadow-md shadow-blue-500/20 truncate px-1"
                          >
                            PAKAI TEMPLATE
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {templates.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-900 font-black">Belum Ada Template</h3>
                    <p className="text-sm text-slate-500 font-bold mt-1">
                      Mulai dengan membuat draf email pertama Anda untuk pengiriman cepat.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
            {/* View 3: Terminal Console logs */}
            {activeTab === "terminal" && (
              <motion.div
                key="terminal-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="p-4 max-w-lg mx-auto h-full flex flex-col gap-4"
              >
                <div className="bg-[#020617] rounded-[24px] border border-slate-800 shadow-2xl flex flex-col h-[70vh] overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <div className="flex flex-col">
                      <h2 className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        RELAY CONSOLE
                      </h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                        <span className="text-[9px] text-[#0050b3] font-bold uppercase tracking-wider">
                          Streaming live
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setLogs([])}
                      className="p-2 bg-slate-800 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Clear logs"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Logs stream body */}
                  <div className="p-4 flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] no-scrollbar">
                    {logs.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
                        <TerminalIcon className="w-8 h-8 opacity-20" />
                        <p className="italic text-xs font-semibold">Console idle...</p>
                      </div>
                    )}
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <span className="text-slate-500 shrink-0 select-none font-bold">
                          [{log.timestamp}]
                        </span>
                        <span className={hn(
                          "leading-relaxed break-words font-semibold",
                          log.type === "error" 
                            ? "text-rose-400" 
                            : log.type === "success" 
                            ? "text-emerald-400" 
                            : log.type === "warning" 
                            ? "text-amber-400 animate-pulse" 
                            : "text-slate-200"
                        )}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>

                  <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center px-4 shrink-0">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                      Log Count: {logs.length}/50
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#0050b3] rounded-full shadow-[0_0_8px_rgba(0,80,179,0.6)]" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                        GF-V104
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* View 4: SMTP Account Settings */}
            {activeTab === "accounts" && (
              <motion.div
                key="accounts-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 max-w-2xl mx-auto pb-32"
              >
                <div className="flex items-center gap-4 mb-6 px-1">
                  <div className="w-12 h-12 bg-[#003A8F] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-800/20">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950 leading-tight">
                      Konfigurasi SMTP
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold">
                      Pengaturan super cerdas dengan deteksi otomatis dan status transmisi aktif.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  
                  {/* --- INTEGRATED FORM & STATUS CARD --- */}
                  <div className="bg-white rounded-3xl p-6 border-2 border-white shadow-[0_15px_50px_-5px_rgba(0,58,143,0.18)] ring-1 ring-blue-100/50 space-y-5">
                    
                    {/* --- SEAMLESS LIVE ANIMATED SMTP CONNECTION STATUS INDICATOR --- */}
                    {smtpConfig.username && smtpConfig.password ? (
                      <div className="relative overflow-hidden bg-emerald-50/40 rounded-2xl p-4 border border-emerald-100/80">
                        {/* High-tech animated signal wave sweep */}
                        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%' }} />
                        
                        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
                          <div className="flex items-center gap-3.5">
                            {/* Professional Radar Light */}
                            <div className="relative w-9 h-9 flex items-center justify-center shrink-0 bg-white rounded-xl border border-emerald-200 shadow-sm">
                              <span className="absolute w-7 h-7 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              </div>
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-emerald-600 tracking-wider uppercase bg-white px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                                  RELAY SMTP AKTIF
                                </span>
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-slate-800 font-mono truncate max-w-[180px] sm:max-w-xs">
                                {smtpConfig.username}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-bold">
                                Server: <span className="text-[#0050b3] font-mono">{smtpConfig.host || "smtp.gmail.com"}</span>:<span className="text-[#0050b3] font-mono">{smtpConfig.port || "587"}</span>
                              </p>
                            </div>
                          </div>

                          {/* Dynamic Signal Indicator with highly prominent animation */}
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center sm:text-right sm:border-l sm:border-slate-100 sm:pl-3 min-w-[100px] border-t border-slate-100 pt-2 sm:pt-0 sm:border-t-0">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest hidden sm:inline">
                              Sinyal Transmisi
                            </span>
                            <div className="flex items-end gap-1 h-5 mt-1">
                              <motion.div 
                                animate={{ height: ["8px", "18px", "8px"] }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                                className="w-1 bg-emerald-500 rounded-full" 
                              />
                              <motion.div 
                                animate={{ height: ["14px", "6px", "14px"] }}
                                transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                                className="w-1 bg-emerald-400 rounded-full" 
                              />
                              <motion.div 
                                animate={{ height: ["6px", "20px", "6px"] }}
                                transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                                className="w-1 bg-emerald-500 rounded-full" 
                              />
                              <motion.div 
                                animate={{ height: ["16px", "10px", "16px"] }}
                                transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
                                className="w-1 bg-emerald-400 rounded-full" 
                              />
                            </div>
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest font-mono ml-auto sm:ml-0 sm:mt-1 bg-white px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm">
                              READY
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden bg-slate-50/60 rounded-2xl p-4 border border-dashed border-slate-200 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                          <AlertCircle className="w-4 h-4 text-slate-400 animate-bounce" />
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                            Sistem Menunggu Kredensial
                          </h3>
                          <p className="text-[10px] text-slate-500 font-bold leading-normal">
                            Isi email kustom dan password Anda di bawah. Server SMTP akan terdeteksi secara otomatis secara real-time.
                          </p>
                        </div>
                      </div>
                    )}

                    <hr className="border-slate-100" />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 1. Nama Pengirim */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider flex items-center gap-1">
                          Nama Pengirim
                        </label>
                        <input 
                          type="text" 
                          value={smtpConfig.fromName}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                          placeholder="Contoh: Info Layanan"
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all font-semibold text-slate-900 shadow-sm"
                        />
                      </div>

                      {/* 2. Logo URL */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider flex items-center gap-1">
                          Logo URL
                        </label>
                        <input 
                          type="text" 
                          value={smtpConfig.logoUrl}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, logoUrl: e.target.value })}
                          placeholder="https://linklogo.com/logo.png"
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all font-semibold text-slate-900 shadow-sm"
                        />
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 3. Email Pengirim (Username) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider flex items-center gap-1">
                          Email SMTP
                        </label>
                        <div className="relative">
                          <input 
                            type="email" 
                            value={smtpConfig.username}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                            placeholder="user@domain.com"
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all font-semibold text-slate-900 shadow-sm"
                          />
                        </div>

                        {/* Smart SMTP Auto-detection Loading */}
                        {isDetectingSmtp && (
                          <div className="flex items-center gap-1.5 mt-2 px-1 text-[10px] text-blue-600 font-extrabold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>MENGANALISIS SERVER DOMAIN...</span>
                          </div>
                        )}

                        {/* Smart SMTP Auto-detection Applied Indicator */}
                        {!isDetectingSmtp && smtpRecommendation && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2.5 p-3.5 bg-[#f0f7ff] border border-blue-200 rounded-2xl flex flex-col gap-2.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-blue-800 tracking-wider flex items-center gap-1.5">
                                <motion.span
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                  className="inline-block shrink-0"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                </motion.span>
                                SMTP Terdeteksi Otomatis
                              </span>
                              <span className="text-[8px] font-extrabold px-2 py-0.5 bg-emerald-500 text-white rounded-full uppercase tracking-wider">
                                APPLIED
                              </span>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                              <span className="text-[12px] font-bold text-slate-800">
                                Server: <strong className="text-[#003A8F]">{smtpRecommendation.providerName}</strong> ({smtpConfig.host}:{smtpConfig.port})
                              </span>
                              
                              {/* Layer Detection Visual Pipeline */}
                              <div className="mt-1.5 pt-2 border-t border-blue-100/70">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                                  Sumber Deteksi (Strategi Hibrida):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { num: 1, label: "L1: DB Pusat / MX", key: ["database_pusat", "mx_signature"] },
                                    { num: 2, label: "L2: Mozilla XML", key: ["mozilla_autoconfig"] },
                                    { num: 3, label: "L3: MS Autodiscover", key: ["microsoft_autodiscover"] },
                                    { num: 4, label: "L4: DNS SRV", key: ["dns_srv_records"] },
                                    { num: 5, label: "L5: Active Probing", key: ["active_probing"] },
                                    { num: 6, label: "L6: AI Fallback", key: ["gemini_ai_fallback"] },
                                    { num: 7, label: "L7: Heuristic", key: ["heuristic_fallback"] },
                                  ].map((layerItem) => {
                                    const isActive = smtpRecommendation.layer === layerItem.num || layerItem.key.includes(smtpRecommendation.source || "");
                                    return (
                                      <span 
                                        key={layerItem.num}
                                        className={`text-[8px] font-black px-2 py-1 rounded-lg transition-all ${
                                          isActive 
                                            ? "bg-[#003A8F] text-white ring-2 ring-blue-200 scale-105 shadow-sm" 
                                            : "bg-slate-100 text-slate-400"
                                        }`}
                                      >
                                        {layerItem.label}
                                      </span>
                                    );
                                  })}
                                </div>
                                <span className="text-[10px] text-blue-700/85 font-semibold mt-2 block italic">
                                  * Berhasil dikonfigurasi melalui <strong>{
                                    smtpRecommendation.layer === 1 ? "Layer 1 (Database Pusat / MX Record)" :
                                    smtpRecommendation.layer === 2 ? "Layer 2 (Protokol Mozilla Autoconfig)" :
                                    smtpRecommendation.layer === 3 ? "Layer 3 (Microsoft Autodiscover XML)" :
                                    smtpRecommendation.layer === 4 ? "Layer 4 (DNS SRV Records RFC 6186)" :
                                    smtpRecommendation.layer === 5 ? "Layer 5 (Smart Guessing & Active Port Probing)" :
                                    smtpRecommendation.layer === 6 ? "Layer 6 (AI-Powered Gemini Intuition)" :
                                    "Layer 7 (Default Heuristic Fallback)"
                                  }</strong>.
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* 4. App Password */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider">
                          Password / App Password
                        </label>
                        <input 
                          type="password" 
                          value={smtpConfig.password}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value as any })}
                          placeholder="••••••••••••••••"
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all font-semibold text-slate-900 shadow-sm font-mono"
                        />
                      </div>
                    </div>

                    {/* --- ADVANCED COLLAPSIBLE DRAWER --- */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        {showAdvanced ? "Sembunyikan Server Override" : "Tampilkan Detail Server (Manual Override)"}
                      </button>

                      <AnimatePresence>
                        {showAdvanced && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 grid grid-cols-2 gap-4 pb-1">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Host SMTP</label>
                                <input 
                                  type="text" 
                                  value={smtpConfig.host}
                                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                  placeholder="smtp.gmail.com"
                                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Port SMTP</label>
                                <input 
                                  type="text" 
                                  value={smtpConfig.port}
                                  onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                                  placeholder="587"
                                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Enkripsi</label>
                                <select 
                                  value={smtpConfig.connectionType}
                                  onChange={(e) => setSmtpConfig({ ...smtpConfig, connectionType: e.target.value as any })}
                                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none"
                                >
                                  <option value="STARTTLS">STARTTLS</option>
                                  <option value="SSL">SSL</option>
                                  <option value="NONE">NONE</option>
                                </select>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Limit Harian</label>
                                <input 
                                  type="number" 
                                  value={smtpConfig.dailyLimit}
                                  onChange={(e) => setSmtpConfig({ ...smtpConfig, dailyLimit: e.target.value })}
                                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>


                  {/* Smart Diagnostic Alert for SMTP testing */}
                  {smtpTestSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-2 shadow-sm text-xs"
                    >
                      <div className="flex items-center gap-2 text-emerald-800 font-extrabold uppercase tracking-wider">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Uji Koneksi Berhasil!
                      </div>
                      <p className="text-emerald-700 font-semibold leading-relaxed">
                        Server SMTP berhasil menerima koneksi dan mengirim email uji coba. Konfigurasi Anda sudah 100% benar dan siap digunakan.
                      </p>
                    </motion.div>
                  )}

                  {smtpTestError && (() => {
                    const diagnostic = getSmtpDiagnostic(smtpTestError);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-3 shadow-md text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-rose-900 font-black uppercase tracking-wider text-[11px]">
                              {diagnostic.title}
                            </h4>
                            <p className="text-rose-700 font-semibold mt-1 leading-relaxed">
                              {diagnostic.reason}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-white/80 rounded-xl border border-rose-100 flex flex-col gap-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
                            Langkah Solusi Pemecahan Masalah:
                          </span>
                          <ol className="list-decimal list-inside space-y-1.5 text-slate-700 font-medium leading-relaxed">
                            {diagnostic.steps.map((step, idx) => (
                              <li key={idx} className="pl-1">
                                <span className="text-slate-800 font-semibold">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="pt-2 border-t border-rose-100/80 flex flex-col gap-1 text-[10px] text-rose-600/80 font-mono">
                          <span className="font-bold uppercase tracking-wider text-[8px]">LOG ERROR SYSTEM:</span>
                          <span className="break-all">{smtpTestError}</span>
                        </div>
                      </motion.div>
                    );
                  })()}


                  {/* Action buttons row */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button 
                      onClick={testSmtpConnection}
                      disabled={isSending}
                      className="flex-1 py-3.5 bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-700 font-extrabold rounded-[28px] shadow-lg shadow-blue-100/30 transition-all active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-xs"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Test Koneksi
                    </button>
                    <button 
                      onClick={handleSmtpSave}
                      className="flex-1 py-3.5 bg-gradient-to-b from-[#0050b3] to-[#003a8f] hover:from-[#003a8f] hover:to-[#002150] text-white font-black rounded-[28px] shadow-xl shadow-blue-500/30 transition-all active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <CheckCircle className="w-4 h-4" /> Simpan & Selesai
                    </button>
                  </div>
                </div>
              </motion.div>
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
                    <Plus className="w-6 h-6 rotate-45" />
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
                    <textarea 
                      rows={6}
                      value={templateForm.message}
                      onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
                      placeholder="Tulis draft anda..."
                      className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#0050b3] transition-all font-bold text-slate-950 resize-none min-h-[150px]"
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
                    <Plus className="w-5 h-5 rotate-45 text-slate-500" />
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
                      useTemplateContent(previewTemplate);
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
                    <Plus className="w-4 h-4 rotate-45" />
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
                    disabled={isSending || !quickTestRecipient}
                    onClick={async () => {
                      const success = await runSmtpForwarder(quickTestRecipient, quickTestTemplate.subject, quickTestTemplate.message);
                      if (success) setQuickTestTemplate(null);
                    }}
                    className="w-full py-3 bg-[#0050b3] hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-wider"
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isSending ? "MENGIRIM..." : "KIRIM SEKARANG"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- DYNAMIC PASSCODE CHANGE MODAL --- */}
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
                        Ganti Passcode Panel
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">
                        Amankan akses konsol admin Anda
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPasscodeModal(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
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
                        Passcode Saat Ini
                      </label>
                      <input 
                        type="password" 
                        required
                        value={currentPasscodeForm}
                        onChange={(e) => setCurrentPasscodeForm(e.target.value)}
                        placeholder="Masukkan passcode lama Anda"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-mono font-semibold focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider">
                        Passcode Baru
                      </label>
                      <input 
                        type="password" 
                        required
                        value={newPasscodeForm}
                        onChange={(e) => setNewPasscodeForm(e.target.value)}
                        placeholder="Minimal 4 karakter"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-mono font-semibold focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider">
                        Ulangi Passcode Baru
                      </label>
                      <input 
                        type="password" 
                        required
                        value={confirmPasscodeForm}
                        onChange={(e) => setConfirmPasscodeForm(e.target.value)}
                        placeholder="Ketik ulang passcode baru Anda"
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
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}

// Utility tailwind merger to mirror exactly the minified implementation
function hn(...args: any[]) {
  return args.filter(Boolean).join(" ").trim();
}
