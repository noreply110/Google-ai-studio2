import React, { useState, useEffect } from "react";
import { 
  Settings, Info, AlertCircle, Loader2, Sparkles, AlertTriangle, CheckCircle, Mail, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SmtpConfig } from "../types";

interface AccountsTabProps {
  smtpConfig: SmtpConfig;
  setSmtpConfig: React.Dispatch<React.SetStateAction<SmtpConfig>>;
  setActiveTab: (tab: "send" | "templates" | "terminal" | "accounts") => void;
  addLog: (type: "info" | "success" | "error" | "warning", msg: string) => void;
  triggerConfetti: () => void;
  checkBackendHealth: () => void;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({
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
    setShowRocketScreen(true);
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

      setSmtpTestSuccess(true);
      triggerConfetti();
      addLog("success", "Uji coba SMTP berhasil. Silakan cek inbox email pengirim.");
      setTimeout(() => setShowRocketScreen(false), 800);
    } catch (err: any) {
      setSmtpTestError(err.message);
      addLog("error", `Uji koneksi SMTP gagal: ${err.message}`);
      setShowRocketScreen(false);
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

        <div className="mb-4 bg-amber-50/60 border border-amber-100 rounded-xl py-1.5 px-3 flex items-center gap-2 overflow-hidden shadow-sm">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <div className="flex-1 overflow-hidden">
            <marquee className="text-[10px] text-slate-600 font-bold tracking-wide block" scrollamount="3">
              ⚠️ Kebijakan Sistem: Aplikasi ini didesain eksklusif untuk pengiriman outbound SMTP relay saja (Hanya Kirim). Server tidak menyediakan fungsionalitas IMAP/POP3 untuk menerima balasan/pesan masuk (No Incoming / Inbox).
            </marquee>
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
                    {/* Professional Radar Light / Profile Photo */}
                    <div className="relative w-10 h-10 flex items-center justify-center shrink-0 bg-white rounded-full border-2 border-emerald-200 shadow-sm overflow-hidden">
                      {smtpConfig.logoUrl && !logoLoadError ? (
                        <img 
                          src={smtpConfig.logoUrl} 
                          alt="Sender Profile" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={() => setLogoLoadError(true)}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-300 text-white flex items-center justify-center select-none overflow-hidden">
                          <svg className="w-full h-full scale-105 mt-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                      )}
                      <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-pulse opacity-45 pointer-events-none" />
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
                      <div className="w-1 h-5 bg-emerald-500 rounded-full animate-eq-1" />
                      <div className="w-1 h-5 bg-emerald-400 rounded-full animate-eq-2" />
                      <div className="w-1 h-5 bg-emerald-500 rounded-full animate-eq-3" />
                      <div className="w-1 h-5 bg-emerald-400 rounded-full animate-eq-4" />
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

              {/* 2. Logo / Foto Profil URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-[#003A8F] px-1 uppercase tracking-wider flex items-center gap-1">
                  URL Foto Profil / Logo
                </label>
                <div className="flex gap-3 items-center">
                  <input 
                    type="text" 
                    value={smtpConfig.logoUrl}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, logoUrl: e.target.value })}
                    placeholder="https://linklogo.com/foto_profil.png"
                    className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-sm focus:bg-white focus:border-[#0050b3] focus:ring-4 focus:ring-blue-100/30 outline-none transition-all font-semibold text-slate-900 shadow-sm"
                  />
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-inner shrink-0 flex items-center justify-center">
                    {smtpConfig.logoUrl && !logoLoadError ? (
                      <img 
                        src={smtpConfig.logoUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setLogoLoadError(true)}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-300 text-white flex items-center justify-center select-none overflow-hidden">
                        <svg className="w-full h-full scale-105 mt-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
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
                        <span className="inline-block shrink-0 animate-spin [animation-duration:2s]">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        </span>
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
    </>
  );
};
