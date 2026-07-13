import React, { useState, useEffect } from "react";
import { 
  Settings, Info, AlertCircle, Loader2, Sparkles, AlertTriangle, CheckCircle, Mail, ShieldCheck, Check, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SmtpConfig } from "../types";

// Classname utility helper locally
function hn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

interface AccountsTabProps {
  smtpConfig: SmtpConfig;
  setSmtpConfig: React.Dispatch<React.SetStateAction<SmtpConfig>>;
  setActiveTab: (tab: "send" | "templates" | "terminal" | "accounts") => void;
  addLog: (type: "info" | "success" | "error" | "warning", msg: string) => void;
  triggerConfetti: () => void;
  checkBackendHealth: () => void;
}

export const AccountsTab: React.FC<AccountsTabProps> = React.memo(({
  smtpConfig,
  setSmtpConfig,
  setActiveTab,
  addLog,
  triggerConfetti,
  checkBackendHealth
}) => {
  const [isDetectingSmtp, setIsDetectingSmtp] = useState(false);
  const [smtpRecommendation, setSmtpRecommendation] = useState<{
    host: string;
    port: string;
    connectionType: "STARTTLS" | "SSL" | "NONE";
    providerName: string;
    emailDetected: string;
    layer: number;
    source?: string;
  } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  
  // Local test states
  const [isSending, setIsSending] = useState(false);
  const [showRocketScreen, setShowRocketScreen] = useState(false);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState(false);
  const [smtpTestError, setSmtpTestError] = useState<string | null>(null);

  // Custom futuristic HUD states for Test Connection
  const [testProgress, setTestProgress] = useState(0);
  const [testStage, setTestStage] = useState("");
  const [testFailed, setTestFailed] = useState(false);

  // Auto-detection when email updates
  useEffect(() => {
    const email = smtpConfig.username.trim();
    if (!email || !email.includes("@")) {
      setSmtpRecommendation(null);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return;
    }

    if (smtpRecommendation && smtpRecommendation.emailDetected === email) {
      return;
    }

    const handleDetectSmtp = async (emailToDetect: string) => {
      setIsDetectingSmtp(true);
      try {
        const response = await fetch("/api/detect-smtp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToDetect })
        });
        const data = await response.json();
        if (data.success) {
          setSmtpRecommendation({
            host: data.host,
            port: data.port,
            connectionType: data.connectionType as "STARTTLS" | "SSL" | "NONE",
            providerName: data.providerName,
            emailDetected: emailToDetect,
            layer: data.layer || 1,
            source: data.source
          });
          
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
      } catch (err) {
        console.error("Gagal mendeteksi SMTP:", err);
        setSmtpRecommendation(null);
      } finally {
        setIsDetectingSmtp(false);
      }
    };

    const timer = setTimeout(() => {
      handleDetectSmtp(email);
    }, 800);

    return () => clearTimeout(timer);
  }, [smtpConfig.username, smtpConfig.host, smtpConfig.port, smtpConfig.connectionType, smtpRecommendation, setSmtpConfig, addLog]);

  // Logo load reset when logo changes
  useEffect(() => {
    setLogoLoadError(false);
  }, [smtpConfig.logoUrl]);

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

  const testSmtpConnection = async () => {
    if (!smtpConfig.username || !smtpConfig.password || !smtpConfig.host) {
      addLog("warning", "Harap isi kredensial SMTP sebelum melakukan pengetesan.");
      return;
    }

    setIsSending(true);
    setTestFailed(false);
    setTestProgress(5);
    setTestStage("Menghubungkan ke server SMTP...");
    setShowRocketScreen(true);
    setSmtpTestError(null);
    setSmtpTestSuccess(false);
    addLog("info", "Sedang menguji koneksi SMTP...");

    let currentProgress = 5;
    const progressInterval = setInterval(() => {
      let increment = 4;
      if (currentProgress > 40) increment = 2;
      if (currentProgress > 75) increment = 1;
      
      currentProgress = Math.min(95, currentProgress + increment);
      setTestProgress(Math.floor(currentProgress));

      if (currentProgress < 25) {
        setTestStage("Inisialisasi handshake aman...");
      } else if (currentProgress < 50) {
        setTestStage("Autentikasi kredensial SMTP...");
      } else if (currentProgress < 75) {
        setTestStage("Mengonstruksi payload email...");
      } else {
        setTestStage("Mengirim pesan pengujian...");
      }
    }, 150);

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

      clearInterval(progressInterval);
      const isJson = response.headers.get("content-type")?.includes("application/json");
      let data;
      if (isJson) {
        data = await response.json();
      } else {
        await response.text();
        throw new Error("Gagal menghubungi server. Silakan coba lagi.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Gagal melakukan pengetesan SMTP");
      }

      setTestFailed(false);
      setTestProgress(100);
      setTestStage("Uji Koneksi Berhasil!");
      setSmtpTestSuccess(true);
      triggerConfetti();
      addLog("success", "Uji coba SMTP berhasil. Silakan cek inbox email pengirim.");
      
      setTimeout(() => {
        setSmtpTestSuccess(prev => {
          if (prev) {
            setShowRocketScreen(false);
            setTestProgress(0);
            setTestStage("");
          }
          return false;
        });
      }, 4000);
    } catch (err: any) {
      clearInterval(progressInterval);
      setTestFailed(true);
      setTestProgress(100);
      setTestStage("Uji Koneksi Gagal!");
      setSmtpTestError(err.message);
      addLog("error", `Uji koneksi SMTP gagal: ${err.message}`);
      
      setTimeout(() => {
        setTestFailed(prev => {
          if (prev) {
            setShowRocketScreen(false);
            setTestProgress(0);
            setTestStage("");
          }
          return false;
        });
      }, 10000);
    } finally {
      setIsSending(false);
    }
  };

  const handleSmtpSave = () => {
    localStorage.setItem("relay_smtp_config", JSON.stringify(smtpConfig));
    addLog("success", "Konfigurasi SMTP berhasil diperbarui.");
    checkBackendHealth();
    setActiveTab("send");
  };

  return (
    <>
      <AnimatePresence>
        {showRocketScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={hn(
              "fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 font-mono select-none transition-colors duration-500",
              testFailed ? "text-rose-500" : "text-jago"
            )}
          >
            {/* Sci-Fi Background grid lines */}
            <div className={hn(
              "absolute inset-0 pointer-events-none transition-all duration-500",
              testFailed 
                ? "bg-[radial-gradient(circle_at_center,_rgba(244,63,94,0.12)_0%,_transparent_65%)]"
                : "bg-[radial-gradient(circle_at_center,_rgba(255,179,0,0.12)_0%,_transparent_65%)]"
            )} />
            <div 
              className="absolute inset-0 opacity-[0.03] pointer-events-none transition-colors duration-500"
              style={{
                backgroundImage: `
                  linear-gradient(${testFailed ? "#F43F5E" : "#FFB300"} 1px, transparent 1px),
                  linear-gradient(90deg, ${testFailed ? "#F43F5E" : "#FFB300"} 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px"
              }}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 120 }}
              className={hn(
                "w-full max-w-lg bg-black/60 border rounded-3xl p-6 sm:p-8 flex flex-col items-center relative overflow-visible transition-all duration-500",
                testFailed 
                  ? "border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.25)]" 
                  : "border-jago/30 shadow-[0_0_50px_rgba(255,179,0,0.15)]"
              )}
            >
              {/* Tech Corner brackets */}
              <div className={hn("absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 transition-colors duration-500", testFailed ? "border-rose-500/30" : "border-jago/40")} />
              <div className={hn("absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 transition-colors duration-500", testFailed ? "border-rose-500/30" : "border-jago/40")} />
              <div className={hn("absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 transition-colors duration-500", testFailed ? "border-rose-500/30" : "border-jago/40")} />
              <div className={hn("absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 transition-colors duration-500", testFailed ? "border-rose-500/30" : "border-jago/40")} />

              {/* Dynamic scanning line */}
              <div className={hn(
                "absolute inset-x-0 h-[2px] animate-scan opacity-60 transition-all duration-500",
                testFailed 
                  ? "bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#F43F5E]" 
                  : "bg-gradient-to-r from-transparent via-jago to-transparent shadow-[0_0_8px_#FFB300]"
              )} />

              {/* Top Status Header */}
              <div className={hn(
                "w-full flex justify-between items-center text-[10px] tracking-widest mb-6 uppercase transition-colors duration-500",
                testFailed ? "text-rose-500/60" : "text-jago/60"
              )}>
                <span>System: {testFailed ? "Error Alert" : "Active"}</span>
                <span className="animate-pulse">{testFailed ? "● System Failure Warning" : "● Jarvis Core Online"}</span>
                <span>Log: PRT_3000</span>
              </div>

              {/* Glowing Interactive Cybernetic Target Orbit Centerpiece */}
              <motion.div 
                className="relative w-48 h-48 flex items-center justify-center mb-8 shrink-0"
              >
                {/* Target Scope Crosshair Lines (Thin Futuristic Grid Coordinates) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className={hn(
                    "w-full h-[1px] transition-colors duration-500",
                    testFailed 
                      ? "bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" 
                      : "bg-gradient-to-r from-transparent via-jago/40 to-transparent"
                  )} />
                  <div className={hn(
                    "absolute h-full w-[1px] transition-colors duration-500",
                    testFailed 
                      ? "bg-gradient-to-b from-transparent via-rose-500/40 to-transparent" 
                      : "bg-gradient-to-b from-transparent via-jago/40 to-transparent"
                  )} />
                  {/* Decorative tick bounds */}
                  <div className={hn(
                    "absolute w-44 h-44 rounded-full border transition-colors duration-500 opacity-50",
                    testFailed ? "border-rose-500/10" : "border-jago/5"
                  )} />
                </div>

                {/* Outer Orbit */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className={hn(
                    "absolute inset-0 rounded-full border border-dashed transition-colors duration-500",
                    testFailed ? "border-rose-500/25" : "border-jago/25"
                  )}
                />
                {/* Middle Ring with tick marks */}
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className={hn(
                    "absolute inset-4 rounded-full border-2 border-double border-t-transparent border-b-transparent transition-colors duration-500",
                    testFailed ? "border-rose-500/45" : "border-jago/45"
                  )}
                />
                {/* Inner Fast Orbit */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className={hn(
                    "absolute inset-10 rounded-full border border-l-transparent border-r-transparent transition-colors duration-500",
                    testFailed ? "border-rose-500/75" : "border-jago/75"
                  )}
                />
                {/* Glowing Center Core */}
                <div className="absolute inset-11 flex flex-col items-center justify-center z-20 pointer-events-none">
                  {/* Pulsing Core ambient glow behind the text */}
                  <div className={hn(
                    "absolute w-24 h-24 rounded-full blur-xl animate-pulse pointer-events-none transition-colors duration-500",
                    testFailed ? "bg-rose-500/15" : "bg-jago/15"
                  )} />
                  
                  {/* Futuristic Core tech grid lines inside the center space */}
                  <div 
                    className="absolute inset-4 opacity-[0.25] [background-size:10px_10px] pointer-events-none transition-all duration-500" 
                    style={{
                      backgroundImage: `radial-gradient(${testFailed ? "#F43F5E" : "#FFB300"} 1.5px, transparent 1.5px)`
                    }}
                  />
                  
                  {/* Modern Stylized Glowing JARVIS text */}
                  <span className={hn(
                    "text-[20px] font-black tracking-[0.25em] font-mono animate-pulse uppercase pl-[0.25em] z-10 transition-all duration-500",
                    testFailed 
                      ? "text-rose-100 drop-shadow-[0_0_15px_rgba(244,63,94,1)]" 
                      : "text-white drop-shadow-[0_0_15px_rgba(255,179,0,1)]"
                  )}>
                    JARVIS
                  </span>
                  <span className={hn(
                    "text-[8px] font-bold uppercase tracking-[0.3em] mt-2 z-10 transition-all duration-500",
                    testFailed 
                      ? "text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" 
                      : "text-jago/90 drop-shadow-[0_0_5px_rgba(255,179,0,0.5)]"
                  )}>
                    {testFailed ? "BLOCKED" : "CORE ACTIVE"}
                  </span>
                </div>

                {/* Cyber HUD Shockwaves & Spreading Particles at 100% progress */}
                {testProgress === 100 && (
                  <>
                    {/* Central expanding light flare */}
                    <motion.div
                      initial={{ scale: 0.2, opacity: 1 }}
                      animate={{ scale: 6, opacity: 0 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className={hn(
                        "absolute inset-0 rounded-full blur-2xl pointer-events-none z-10",
                        testFailed ? "bg-rose-500/30" : "bg-jago/30"
                      )}
                    />

                    {/* Shockwave circle 1 */}
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0.95 }}
                      animate={{ scale: 8.5, opacity: 0 }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                      className={hn(
                        "absolute inset-0 rounded-full border-2 pointer-events-none z-10 transition-all duration-500",
                        testFailed 
                          ? "border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.7)]" 
                          : "border-jago shadow-[0_0_35px_rgba(255,179,0,0.7)]"
                      )}
                    />
                    {/* Shockwave circle 2 */}
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0.95 }}
                      animate={{ scale: 11.0, opacity: 0 }}
                      transition={{ duration: 1.8, delay: 0.2, ease: "easeOut" }}
                      className={hn(
                        "absolute inset-0 rounded-full border-2 pointer-events-none z-10 transition-all duration-500",
                        testFailed 
                          ? "border-red-600 shadow-[0_0_35px_rgba(220,38,38,0.65)]" 
                          : "border-jago-orange shadow-[0_0_35px_rgba(255,94,19,0.65)]"
                      )}
                    />
                    {/* Shockwave circle 3 (Outermost Sonic Barrier) */}
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0.8 }}
                      animate={{ scale: 14.5, opacity: 0 }}
                      transition={{ duration: 2.0, delay: 0.4, ease: "easeOut" }}
                      className={hn(
                        "absolute inset-0 rounded-full border pointer-events-none z-10 transition-all duration-500",
                        testFailed 
                          ? "border-rose-400 shadow-[0_0_50px_rgba(244,63,94,0.4)]" 
                          : "border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.4)]"
                      )}
                    />

                    {/* Rotating Expanding Tech Diamond / Grid Crosshair */}
                    <motion.div
                      initial={{ scale: 0.3, rotate: 0, opacity: 0.9 }}
                      animate={{ scale: 10, rotate: 135, opacity: 0 }}
                      transition={{ duration: 2.2, ease: "easeOut" }}
                      className={hn(
                        "absolute inset-0 border-2 border-dashed pointer-events-none z-10 transition-all duration-500",
                        testFailed ? "border-rose-500/50" : "border-jago/50"
                      )}
                    />

                    {/* Cosmic Spreading Particle Dots (Upgraded to 24 particles with multi-range travel) */}
                    <div className="absolute inset-0 overflow-visible pointer-events-none z-10">
                      {[...Array(24)].map((_, index) => {
                        const angle = (index * 360) / 24;
                        // alternate travel distance for organic explosion layout
                        const distance = index % 2 === 0 ? 350 : 550; 
                        const x = Math.cos((angle * Math.PI) / 180) * distance;
                        const y = Math.sin((angle * Math.PI) / 180) * distance;
                        const successColors = [
                          "bg-jago shadow-[0_0_12px_rgba(255,179,0,0.9)]",
                          "bg-jago-orange shadow-[0_0_12px_rgba(255,94,19,0.9)]",
                          "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]",
                          "bg-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.95)]"
                        ];
                        const failedColors = [
                          "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]",
                          "bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.9)]",
                          "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.9)]",
                          "bg-red-400 shadow-[0_0_15px_rgba(248,113,113,0.95)]"
                        ];
                        const colors = testFailed ? failedColors : successColors;
                        const colorClass = colors[index % colors.length];
                        return (
                          <motion.div
                            key={index}
                            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }}
                            animate={{ x, y, scale: [0.2, 1.8, 0], opacity: [1, 0.9, 0] }}
                            transition={{ 
                              duration: 1.8 + (index % 3) * 0.2, 
                              ease: "easeOut",
                              delay: (index % 4) * 0.05 
                            }}
                            className={`absolute left-[calc(50%-4px)] top-[calc(50%-4px)] w-2.5 h-2.5 rounded-full ${colorClass}`}
                          />
                        );
                      })}

                      {/* Rising Data Packet vertical streak lines */}
                      {[...Array(6)].map((_, idx) => {
                        const randomX = (idx - 2.5) * 60;
                        return (
                          <motion.div
                            key={`rising-${idx}`}
                            initial={{ x: randomX, y: 0, height: 2, opacity: 0.8 }}
                            animate={{ y: -450, height: [2, 40, 2], opacity: [0, 0.9, 0] }}
                            transition={{ duration: 1.5, delay: idx * 0.1, ease: "circOut" }}
                            className={hn(
                              "absolute left-1/2 top-1/2 w-[1.5px] rounded-full pointer-events-none",
                              testFailed ? "bg-rose-400" : "bg-jago"
                            )}
                          />
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Core tech data overlay readouts (left and right) */}
                <div className={hn(
                  "absolute -left-12 top-1/2 -translate-y-1/2 text-[8px] space-y-1 leading-none text-right hidden sm:block transition-colors duration-500",
                  testFailed ? "text-rose-500/50" : "text-jago/50"
                )}>
                  <div>SYS.STAT: {testFailed ? "ERROR" : "OK"}</div>
                  <div>STB.VAL: {testFailed ? "0.0%" : "99.8%"}</div>
                  <div>BPS.PORT: 3000</div>
                </div>
                <div className={hn(
                  "absolute -right-12 top-1/2 -translate-y-1/2 text-[8px] space-y-1 leading-none text-left hidden sm:block transition-colors duration-500",
                  testFailed ? "text-rose-500/50" : "text-jago/50"
                )}>
                  <div>ANT.SPM: {testFailed ? "ALERT" : "SECURE"}</div>
                  <div>MX_DL: ENABLED</div>
                  <div>CRYP.TLS: v1.3</div>
                </div>
              </motion.div>

              {/* Stage and Progress bar */}
              <div className="w-full space-y-3 px-4">
                <div className="text-center">
                  <span className={hn(
                    "text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500",
                    testFailed 
                      ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" 
                      : "text-white drop-shadow-[0_0_8px_rgba(255,179,0,0.3)]"
                  )}>
                    {testStage}
                  </span>
                </div>

                {/* Animated Matrix style Progress tracker */}
                <div className="grid grid-cols-10 gap-1.5 py-1">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const active = testProgress >= (i + 1) * 10;
                    return (
                      <div 
                        key={i} 
                        className={hn(
                          "h-3 rounded-sm border transition-all duration-300", 
                          active 
                            ? (testFailed 
                                ? "bg-rose-600/80 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] scale-y-110" 
                                : "bg-jago/80 border-jago shadow-[0_0_8px_rgba(255,179,0,0.5)] scale-y-110")
                            : (testFailed ? "bg-slate-950/80 border-rose-950/40" : "bg-slate-950/80 border-jago/20")
                        )} 
                      />
                    );
                  })}
                </div>

                <div className={hn("flex justify-between items-center text-[9px] transition-colors duration-500", testFailed ? "text-rose-400/70" : "text-jago/70")}>
                  <span>CONNECTION STATUS</span>
                  <span className="font-mono font-bold text-white text-xs">{testFailed ? "FAILED" : `${testProgress}%`}</span>
                </div>
              </div>

              {/* Live diagnostics sub-feed */}
              <div className={hn(
                "w-full mt-6 bg-slate-950/80 border rounded-xl p-3 h-24 overflow-hidden text-[9px] font-mono space-y-1 relative transition-all duration-500",
                testFailed ? "border-rose-500/25 text-rose-400/80" : "border-jago/15 text-jago/65"
              )}>
                <div className="absolute top-2 right-3 flex items-center gap-1">
                  <div className={hn("w-1.5 h-1.5 rounded-full animate-ping", testFailed ? "bg-rose-500" : "bg-emerald-500")} />
                  <span className={hn("text-[7px] tracking-wider", testFailed ? "text-rose-500" : "text-emerald-500")}>
                    {testFailed ? "ALERT LOG" : "LIVE FEED"}
                  </span>
                </div>
                <div className={hn(
                  "text-[8px] uppercase tracking-widest border-b pb-1 mb-1.5 flex justify-between transition-colors duration-500",
                  testFailed ? "border-rose-500/20 text-rose-500/60" : "border-jago/15 text-jago/40"
                )}>
                  <span>Diagnostic Logs</span>
                  <span>{testFailed ? "Connection Disrupted" : "TLS Handshake Active"}</span>
                </div>
                <div className="space-y-0.5 max-h-16 overflow-y-auto no-scrollbar">
                  <div className={testProgress >= 5 ? (testFailed ? "text-rose-400" : "text-jago") : "text-jago/30"}>[0.05s] SYSTEM INIT: JARVIS SMTP tester booted.</div>
                  <div className={testProgress >= 25 ? (testFailed ? "text-rose-400" : "text-jago") : "text-jago/30"}>[0.42s] HANDSHAKE: Establishing secure TLS channel via Port {smtpConfig.port || "587"}.</div>
                  <div className={testProgress >= 50 ? (testFailed ? "text-rose-400" : "text-jago") : "text-jago/30"}>[1.15s] CREDENTIALS: Authenticating SMTP credentials.</div>
                  <div className={testProgress >= 75 ? (testFailed ? "text-rose-400" : "text-jago") : "text-jago/30"}>[1.98s] PAYLOAD: Injecting test email headers & ping message.</div>
                  {testProgress === 100 && !testFailed && (
                    <div className="text-emerald-400 font-bold animate-pulse">[2.45s] SUCCESS: Connection verified! Test email dispatched safely.</div>
                  )}
                  {testFailed && (
                    <div className="text-rose-500 font-bold animate-pulse">
                      [ALERT] TEST_FAILED: {smtpTestError || "SMTP Connection timeout / credentials rejected!"}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button for finished status (Success / Fail) */}
              {testProgress === 100 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="z-20 pointer-events-auto"
                >
                  {testFailed ? (
                    <button
                      onClick={() => {
                        setTestFailed(false);
                        setShowRocketScreen(false);
                        setTestProgress(0);
                        setTestStage("");
                      }}
                      className="mt-5 px-6 py-2.5 border border-rose-500/40 rounded-xl text-[10px] uppercase font-black tracking-widest text-white bg-rose-500/10 hover:bg-rose-500/25 active:scale-95 transition-all shadow-[0_0_15px_rgba(244,63,94,0.15)] flex items-center gap-2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      TUTUP DIAGNOSTIK
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSmtpTestSuccess(false);
                        setShowRocketScreen(false);
                        setTestProgress(0);
                        setTestStage("");
                      }}
                      className="mt-5 px-6 py-2.5 border border-jago/30 rounded-xl text-[10px] uppercase font-black tracking-widest text-white bg-jago/10 hover:bg-jago/25 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,179,0,0.1)] flex items-center gap-2 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-jago animate-pulse" />
                      TUTUP DIAGNOSTIK
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key="accounts-view"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="p-4 max-w-2xl mx-auto pb-32"
      >
        <div className="flex items-center gap-4 mb-6 px-1">
          <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center shadow-md shrink-0">
            <Settings className="w-6 h-6 text-slate-800" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
              Konfigurasi SMTP
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Pengaturan super cerdas dengan deteksi otomatis dan status transmisi aktif.
            </p>
          </div>
        </div>

        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 flex items-center gap-2 overflow-hidden shadow-sm">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex-1 overflow-hidden">
            <marquee className="text-[10px] text-slate-600 font-bold tracking-wide block animate-[marquee_20s_linear_infinite]" scrollamount="3">
              ⚠️ Kebijakan Sistem: Aplikasi ini didesain eksklusif untuk pengiriman outbound SMTP relay saja (Hanya Kirim). Server tidak menyediakan fungsionalitas IMAP/POP3 untuk menerima balasan/pesan masuk (No Incoming / Inbox).
            </marquee>
          </div>
        </div>

        <div className="space-y-4">
          
          {/* --- INTEGRATED FORM & STATUS CARD --- */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.04)] space-y-5">
            
            {/* --- SEAMLESS LIVE ANIMATED SMTP CONNECTION STATUS INDICATOR --- */}
            {smtpConfig.username && smtpConfig.password ? (
              <div className="relative overflow-hidden bg-slate-50 rounded-2xl p-4 border border-slate-200">
                {/* High-tech animated signal wave sweep */}
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-jago/30 to-transparent opacity-60 animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%' }} />
                
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
                  <div className="flex items-center gap-3.5">
                    {/* Professional Radar Light / Profile Photo Fallback Icon */}
                    <div className="relative w-10 h-10 flex items-center justify-center shrink-0 bg-slate-200/50 rounded-full border-2 border-slate-300 shadow-sm overflow-hidden text-slate-700">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="absolute inset-0 rounded-full border-2 border-jago/20 animate-pulse pointer-events-none" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase bg-slate-200 px-2 py-0.5 rounded-md border border-slate-300 shadow-sm">
                          RELAY SMTP AKTIF
                        </span>
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jago opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-jago"></span>
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 font-mono truncate max-w-[180px] sm:max-w-xs">
                        {smtpConfig.username}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Server: <span className="text-slate-600 font-mono">{smtpConfig.host || "smtp.gmail.com"}</span>:<span className="text-slate-600 font-mono">{smtpConfig.port || "587"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Signal Indicator with highly prominent animation */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center sm:text-right sm:border-l sm:border-slate-200 sm:pl-3 min-w-[100px] border-t border-slate-200 pt-2 sm:pt-0 sm:border-t-0">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest hidden sm:inline">
                      Sinyal Transmisi
                    </span>
                    <div className="flex items-end gap-1 h-5 mt-1">
                      <div className="w-1 h-5 bg-jago rounded-full animate-eq-1" />
                      <div className="w-1 h-5 bg-jago-hover rounded-full animate-eq-2" />
                      <div className="w-1 h-5 bg-jago rounded-full animate-eq-3" />
                      <div className="w-1 h-5 bg-jago-hover rounded-full animate-eq-4" />
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono ml-auto sm:ml-0 sm:mt-1 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 shadow-sm">
                      READY
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-slate-400 animate-bounce" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    Sistem Menunggu Kredensial
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold leading-normal">
                    Isi email kustom dan password Anda di bawah. Server SMTP akan terdeteksi secara otomatis secara real-time.
                  </p>
                </div>
              </div>
            )}

            <hr className="border-slate-100" />
            
            <div className="grid grid-cols-1 gap-4">
              {/* 1. Nama Pengirim */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-600 px-1 uppercase tracking-wider flex items-center gap-1">
                  Nama Pengirim
                </label>
                <input 
                  type="text" 
                  enterKeyHint="next"
                  value={smtpConfig.fromName}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                  placeholder="Contoh: Info Layanan"
                  className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-base lg:text-sm focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none transition-all font-semibold text-slate-800 shadow-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 3. Email Pengirim (Username) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-600 px-1 uppercase tracking-wider flex items-center gap-1">
                  Email SMTP
                </label>
                <div className="relative">
                  <input 
                    type="email" 
                    inputMode="email"
                    enterKeyHint="next"
                    value={smtpConfig.username}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                    placeholder="user@domain.com"
                    className="w-full px-4 py-3 bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl text-base lg:text-sm focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none transition-all font-semibold text-slate-800 shadow-sm placeholder:text-slate-400/80"
                  />
                </div>

                {/* Smart SMTP Auto-detection Loading */}
                {isDetectingSmtp && (
                  <div className="flex items-center gap-1.5 mt-2 px-1 text-[10px] text-jago-dark font-extrabold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>MENGANALISIS SERVER DOMAIN...</span>
                  </div>
                )}

                {/* Smart SMTP Auto-detection Applied Indicator */}
                {!isDetectingSmtp && smtpRecommendation && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                        <span className="inline-block shrink-0 animate-spin [animation-duration:2s]">
                          <Sparkles className="w-3.5 h-3.5 text-jago" />
                        </span>
                        SMTP Terdeteksi Otomatis
                      </span>
                      <span className="text-[8px] font-extrabold px-2 py-0.5 bg-jago text-white rounded-full uppercase tracking-wider">
                        APPLIED
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-bold text-slate-800">
                        Server: <strong className="text-slate-950">{smtpRecommendation.providerName}</strong> ({smtpConfig.host}:{smtpConfig.port})
                      </span>
                      
                      {/* Layer Detection Visual Pipeline */}
                      <div className="mt-1.5 pt-2 border-t border-slate-200">
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
                                    ? "bg-slate-200 text-slate-800 ring-2 ring-slate-300 scale-105 shadow-sm" 
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {layerItem.label}
                              </span>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold mt-2 block italic">
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
                <label className="text-[11px] font-extrabold text-slate-600 px-1 uppercase tracking-wider">
                  Password / App Password
                </label>
                <input 
                  type="password" 
                  enterKeyHint="done"
                  value={smtpConfig.password}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value as any })}
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-3 bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl text-base lg:text-sm focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none transition-all font-semibold text-slate-800 shadow-sm font-mono placeholder:text-slate-400/80"
                />
              </div>
            </div>

            {/* --- ADVANCED COLLAPSIBLE DRAWER --- */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
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
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Host SMTP</label>
                        <input 
                          type="text" 
                          enterKeyHint="next"
                          value={smtpConfig.host}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                          placeholder="smtp.gmail.com"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base lg:text-xs font-mono font-bold text-slate-800 focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none shadow-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Port SMTP</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          enterKeyHint="next"
                          value={smtpConfig.port}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                          placeholder="587"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base lg:text-xs font-mono font-bold text-slate-800 focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none shadow-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Enkripsi</label>
                        <select 
                          value={smtpConfig.connectionType}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, connectionType: e.target.value as any })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base lg:text-xs font-mono font-bold text-slate-800 focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none shadow-sm"
                        >
                          <option value="STARTTLS">STARTTLS</option>
                          <option value="SSL">SSL</option>
                          <option value="NONE">NONE</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Limit Harian</label>
                        <input 
                          type="number" 
                          inputMode="numeric"
                          enterKeyHint="done"
                          value={smtpConfig.dailyLimit}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, dailyLimit: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base lg:text-xs font-mono font-bold text-slate-800 focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none shadow-sm"
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
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-rose-700 font-black uppercase tracking-wider text-[11px]">
                      {diagnostic.title}
                    </h4>
                    <p className="text-rose-600/90 font-semibold mt-1 leading-relaxed">
                      {diagnostic.reason}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200 flex flex-col gap-2 shadow-sm">
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

                <div className="pt-2 border-t border-rose-200 flex flex-col gap-1 text-[10px] text-rose-600 font-mono">
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
              className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold rounded-[28px] shadow-sm transition-all active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-xs"
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
              className="flex-1 py-3.5 bg-jago hover:bg-jago-hover text-white font-extrabold border border-jago-dark rounded-[28px] shadow-md shadow-jago/10 transition-all active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <CheckCircle className="w-4 h-4" /> Simpan & Selesai
            </button>
          </div>

        </div>
      </motion.div>
    </>
  );
});
