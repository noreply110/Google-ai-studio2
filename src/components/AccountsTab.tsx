import React, { useState, useEffect } from "react";
import { 
  Settings, Info, AlertCircle, Loader2, Sparkles, AlertTriangle, CheckCircle, Mail, ShieldCheck, Check, X,
  Compass, Lock, Cloud, LogOut, Key, Settings2
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
  const [showMicrosoftSettingsModal, setShowMicrosoftSettingsModal] = useState(false);

  // Auto-detection when email updates (only for SMTP)
  useEffect(() => {
    const isGraph = smtpConfig.providerType === "microsoft_graph";
    if (isGraph) {
      setSmtpRecommendation(null);
      return;
    }

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
  }, [smtpConfig.username, smtpConfig.host, smtpConfig.port, smtpConfig.connectionType, smtpConfig.providerType, smtpRecommendation, setSmtpConfig, addLog]);

  // Listen for Microsoft OAuth2 redirect success in popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }

      if (event.data?.type === "MICROSOFT_AUTH_SUCCESS") {
        setSmtpConfig(prev => ({
          ...prev,
          microsoftAccessToken: event.data.accessToken,
          microsoftRefreshToken: event.data.refreshToken,
          microsoftTokenExpiry: event.data.expiry,
        }));
        addLog("success", "Sistem J.A.R.V.I.S: Akun Microsoft Outlook berhasil terhubung melalui OAuth2!");
        triggerConfetti();
      } else if (event.data?.type === "MICROSOFT_AUTH_ERROR") {
        addLog("error", `Otentikasi Microsoft Gagal: ${event.data.error}`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setSmtpConfig, addLog, triggerConfetti]);

  const handleConnectMicrosoft = () => {
    const clientId = smtpConfig.microsoftClientId || "";
    const clientSecret = smtpConfig.microsoftClientSecret || "";
    const tenantId = smtpConfig.microsoftTenantId || "common";
    const username = smtpConfig.username || "";

    if (!clientId) {
      addLog("warning", "Harap isi Client ID Microsoft Azure terlebih dahulu.");
      return;
    }

    const tenant = tenantId || "common";
    const redirectUri = `${window.location.origin}/api/microsoft/callback`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: "offline_access https://graph.microsoft.com/Mail.Send",
      state: JSON.stringify({ clientId, clientSecret, tenantId: tenant, username }),
      login_hint: username
    });
    
    const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
    
    const width = 600;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      "microsoft_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      addLog("error", "Pop-up diblokir oleh browser. Harap izinkan pop-up untuk aplikasi ini.");
    } else {
      addLog("info", "Membuka halaman otorisasi aman Microsoft...");
    }
  };

  const handleDisconnectMicrosoft = () => {
    setSmtpConfig(prev => ({
      ...prev,
      microsoftAccessToken: "",
      microsoftRefreshToken: "",
      microsoftTokenExpiry: 0,
    }));
    addLog("info", "Akun Microsoft Outlook berhasil diputuskan.");
  };

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
    const isGraph = smtpConfig.providerType === "microsoft_graph";
    
    if (isGraph) {
      if (!smtpConfig.username) {
        addLog("warning", "Harap isi Email Akun Microsoft sebelum melakukan pengetesan.");
        return;
      }
      if (smtpConfig.microsoftAuthType === "client_credentials") {
        if (!smtpConfig.microsoftClientId || !smtpConfig.microsoftClientSecret) {
          addLog("warning", "Harap isi Client ID dan Client Secret Microsoft Azure.");
          return;
        }
      } else {
        if (!smtpConfig.microsoftRefreshToken) {
          addLog("warning", "Harap hubungkan akun Microsoft Anda terlebih dahulu via OAuth2.");
          return;
        }
      }
    } else {
      if (!smtpConfig.username || !smtpConfig.password || !smtpConfig.host) {
        addLog("warning", "Harap isi kredensial SMTP sebelum melakukan pengetesan.");
        return;
      }
    }

    setIsSending(true);
    setTestFailed(false);
    setTestProgress(5);
    setTestStage(isGraph ? "Menghubungkan ke Microsoft Graph API..." : "Menghubungkan ke server SMTP...");
    setShowRocketScreen(true);
    setSmtpTestError(null);
    setSmtpTestSuccess(false);
    addLog("info", isGraph ? "Sedang menguji koneksi Microsoft Graph API..." : "Sedang menguji koneksi SMTP...");

    let currentProgress = 5;
    const progressInterval = setInterval(() => {
      let increment = 4;
      if (currentProgress > 40) increment = 2;
      if (currentProgress > 75) increment = 1;
      
      currentProgress = Math.min(95, currentProgress + increment);
      setTestProgress(Math.floor(currentProgress));

      if (currentProgress < 25) {
        setTestStage(isGraph ? "Inisialisasi otorisasi aman Microsoft..." : "Inisialisasi jabat tangan aman...");
      } else if (currentProgress < 50) {
        setTestStage(isGraph ? "Memverifikasi token akses Microsoft..." : "Autentikasi kredensial SMTP...");
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
          to: smtpConfig.username,
          subject: "Test Connection - J.A.R.V.I.S Graph Relay",
          text: `Jika Anda menerima email ini, konfigurasi ${isGraph ? "Microsoft Graph API" : "SMTP"} Anda sudah berjalan dengan baik.`,
          html: `
            <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #eef4ff; border-radius: 20px; border: 1px solid #dce9fe;">
              <h1 style="color: #003A8F; margin-bottom: 12px;">Koneksi Berhasil!</h1>
              <p style="color: #64748b; font-size: 14px;">Relay console Anda telah berhasil terhubung dengan server pengiriman via ${isGraph ? "Microsoft Graph API (OAuth2)" : "SMTP Relay"}.</p>
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
        throw new Error(data.error || `Gagal melakukan pengetesan ${isGraph ? "Microsoft Graph API" : "SMTP"}`);
      }

      setTestFailed(false);
      setTestProgress(100);
      setTestStage("Uji Koneksi Berhasil!");
      setSmtpTestSuccess(true);
      triggerConfetti();
      addLog("success", isGraph ? "Uji coba Microsoft Graph API berhasil. Silakan cek inbox email pengirim." : "Uji coba SMTP berhasil. Silakan cek inbox email pengirim.");
      
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
      addLog("error", `Uji koneksi gagal: ${err.message}`);
      
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
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl"
            >
              {/* Spinner & Progress */}
              <div className="relative w-20 h-20 flex items-center justify-center mb-5">
                {/* Outer pulsing thin track */}
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                {/* Active progress border */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    className={hn(
                      "stroke-current fill-none transition-all duration-300",
                      testFailed ? "text-rose-500" : "text-amber-500"
                    )}
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - testProgress / 100)}`}
                  />
                </svg>
                {/* Center loading icon or check mark */}
                <div className="z-10">
                  {testProgress < 100 ? (
                    <Loader2 className={hn("w-8 h-8 animate-spin", testFailed ? "text-rose-500" : "text-amber-500")} />
                  ) : testFailed ? (
                    <X className="w-8 h-8 text-rose-500" />
                  ) : (
                    <Check className="w-8 h-8 text-emerald-500" />
                  )}
                </div>
              </div>

              {/* Status stage description */}
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight text-center uppercase mb-1">
                {testStage}
              </h3>
              
              <div className="flex items-center gap-2 mb-4">
                <span className={hn(
                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                  testFailed 
                    ? "bg-rose-50 border-rose-100 text-rose-600" 
                    : testProgress < 100 
                    ? "bg-amber-50 border-amber-100 text-amber-600 animate-pulse" 
                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                )}>
                  {testFailed ? "Gagal" : testProgress < 100 ? "Memproses..." : "Selesai"}
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {testProgress}%
                </span>
              </div>

              {/* Simple stage progression bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-6">
                <div 
                  className={hn(
                    "h-full transition-all duration-300",
                    testFailed ? "bg-rose-500" : "bg-amber-500"
                  )}
                  style={{ width: `${testProgress}%` }}
                />
              </div>

              {/* Action Button for finished status (Success / Fail) */}
              {testProgress === 100 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex justify-center"
                >
                  {testFailed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTestFailed(false);
                        setShowRocketScreen(false);
                        setTestProgress(0);
                        setTestStage("");
                      }}
                      className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      TUTUP DIAGNOSTIK
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSmtpTestSuccess(false);
                        setShowRocketScreen(false);
                        setTestProgress(0);
                        setTestStage("");
                      }}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
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

        <div className="space-y-4">
          
          {/* --- INTEGRATED FORM & STATUS CARD --- */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.04)] space-y-5">
            
            {/* COMPACT CONNECTION METHOD SELECTOR (TOP CONTROL LINE) */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/80">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                {smtpConfig.providerType === "microsoft_graph" ? (
                  <>
                    <Compass className="w-4 h-4 text-blue-500 animate-spin [animation-duration:8s]" />
                    <span>Microsoft Graph API</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 text-slate-600" />
                    <span>SMTP Standard</span>
                  </>
                )}
              </span>
              
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/40">
                <button
                  type="button"
                  onClick={() => setSmtpConfig(prev => ({ ...prev, providerType: "smtp" }))}
                  className={`text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded-md transition-all cursor-pointer ${
                    smtpConfig.providerType !== "microsoft_graph"
                      ? "bg-white text-slate-800 shadow-sm font-black"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  SMTP
                </button>
                <button
                  type="button"
                  onClick={() => setSmtpConfig(prev => ({ ...prev, providerType: "microsoft_graph" }))}
                  className={`text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded-md transition-all cursor-pointer ${
                    smtpConfig.providerType === "microsoft_graph"
                      ? "bg-white text-blue-600 shadow-sm font-black"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  MS Graph
                </button>
              </div>
            </div>

            {/* --- SEAMLESS LIVE ANIMATED CONNECTION STATUS INDICATOR --- */}
            {smtpConfig.providerType === "microsoft_graph" ? (
              smtpConfig.microsoftAccessToken || (smtpConfig.microsoftAuthType === "client_credentials" && smtpConfig.microsoftClientId) ? (
                <div className="relative overflow-hidden bg-blue-50/40 rounded-2xl p-4 border border-blue-200/80">
                  <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-10 h-10 flex items-center justify-center shrink-0 bg-blue-100/60 rounded-full border-2 border-blue-200 shadow-sm overflow-hidden text-blue-700">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-pulse pointer-events-none" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-blue-600 tracking-wider uppercase bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shadow-sm">
                            MS GRAPH API ACTIVE
                          </span>
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-800 font-mono truncate max-w-[180px] sm:max-w-xs">
                          {smtpConfig.username || "Microsoft Account"}
                        </h4>
                        <p className="text-[10px] text-blue-500 font-bold">
                          Otorisasi: <span className="text-slate-600 font-mono">{smtpConfig.microsoftAuthType === "client_credentials" ? "Client Credentials" : "Interactive OAuth2"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center sm:text-right sm:border-l sm:border-blue-100 sm:pl-3 min-w-[120px] border-t border-slate-100 pt-2 sm:pt-0 sm:border-t-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowMicrosoftSettingsModal(true)}
                        className="py-1 px-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Detail AD</span>
                      </button>
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shadow-sm">
                        CONNECTED
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                      <AlertCircle className="w-4 h-4 text-slate-400 animate-bounce" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                        Menunggu Otorisasi Microsoft
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold leading-normal">
                        Atur kredensial Azure AD dan hubungkan akun Anda agar JARVIS dapat aktif.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMicrosoftSettingsModal(true)}
                    className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Konfigurasi</span>
                  </button>
                </div>
              )
            ) : (
              smtpConfig.username && smtpConfig.password ? (
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
              )
            )}

            <hr className="border-slate-100" />
            
            {/* Common field: Nama Pengirim */}
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-600 px-1 uppercase tracking-wider flex items-center gap-1">
                  Nama Pengirim (From Name)
                </label>
                <input 
                  type="text" 
                  enterKeyHint="next"
                  value={smtpConfig.fromName}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                  placeholder="Contoh: Info Layanan JARVIS"
                  className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-base lg:text-sm focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none transition-all font-semibold text-slate-800 shadow-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* PROTOCOL-SPECIFIC FIELDS */}
            {smtpConfig.providerType === "microsoft_graph" ? (
              <div className="p-4 bg-blue-50/50 border border-blue-200/60 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider bg-blue-100/50 px-2 py-0.5 rounded border border-blue-200">
                      Microsoft Graph API Mode
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-800">
                    Detail & Otorisasi Azure AD
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold leading-normal">
                    Kredensial client, rahasia tenant, dan otorisasi terintegrasi dikelola dalam panel terpisah agar tampilan tetap bersih.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMicrosoftSettingsModal(true)}
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Settings2 className="w-4 h-4 animate-pulse" />
                  <span>Azure Config</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email SMTP */}
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

                  {/* App Password */}
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

                {/* Collapsible Manual Override */}
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
                              placeholder="200"
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base lg:text-xs font-mono font-bold text-slate-800 focus:border-jago focus:ring-1 focus:ring-jago/20 focus:outline-none outline-none shadow-sm"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

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

                {(smtpTestError.toLowerCase().includes("smtpclientauthentication is disabled") || 
                  smtpTestError.toLowerCase().includes("smtp_auth_disabled") || 
                  smtpTestError.toLowerCase().includes("5.7.139")) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col gap-2 shadow-sm">
                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-pulse" /> Solusi Cerdas J.A.R.V.I.S:
                    </span>
                    <p className="text-[10px] text-blue-800 font-semibold leading-relaxed">
                      Anda tidak perlu repot mengubah kebijakan keamanan Microsoft 365. Anda bisa langsung beralih ke <strong>Microsoft Graph API (OAuth2)</strong> yang jauh lebih aman dan didukung penuh oleh JARVIS.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSmtpConfig(prev => ({ ...prev, providerType: "microsoft_graph" }));
                        setSmtpTestError(null);
                        addLog("info", "Tipe penyedia dialihkan ke Microsoft Graph (OAuth2). Silakan konfigurasikan Azure AD di bawah.");
                      }}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      Aktifkan Microsoft Graph (OAuth2) Sekarang
                    </button>
                  </div>
                )}

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

      <AnimatePresence>
        {showMicrosoftSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <Compass className="w-5 h-5 animate-spin [animation-duration:8s]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      Pengaturan Azure AD & MS Graph
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Kelola kredensial integrasi email Microsoft dengan aman
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMicrosoftSettingsModal(false)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto space-y-4 text-left">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email Microsoft */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1">
                      Email Akun Microsoft (Outlook/Hotmail)
                    </label>
                    <input 
                      type="email" 
                      inputMode="email"
                      value={smtpConfig.username}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                      placeholder="contoh@outlook.co.id"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none outline-none transition-all font-semibold text-slate-800 shadow-sm placeholder:text-slate-400"
                    />
                  </div>

                  {/* Microsoft Authentication Flow */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1">
                      Tipe Alur Autentikasi (Auth Flow)
                    </label>
                    <select 
                      value={smtpConfig.microsoftAuthType || "auth_code"}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, microsoftAuthType: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none outline-none transition-all font-semibold text-slate-800 shadow-sm"
                    >
                      <option value="auth_code">Interactive OAuth2 (Sign-In Popup)</option>
                      <option value="client_credentials">Client Credentials (Daemon / Secret)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1">
                      <Key className="w-3 h-3 text-blue-500" /> Client ID (Application ID)
                    </label>
                    <input 
                      type="text" 
                      value={smtpConfig.microsoftClientId || ""}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, microsoftClientId: e.target.value })}
                      placeholder="00000000-0000-0000-0000-000000000000"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none outline-none transition-all font-semibold font-mono text-slate-800 shadow-sm placeholder:text-slate-400"
                    />
                  </div>

                  {/* Tenant ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-blue-500" /> Tenant ID (Direktori ID)
                    </label>
                    <input 
                      type="text" 
                      value={smtpConfig.microsoftTenantId || "common"}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, microsoftTenantId: e.target.value })}
                      placeholder="common (atau ID Penyewa Anda)"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none outline-none transition-all font-semibold font-mono text-slate-800 shadow-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Client Secret */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-blue-500" /> Client Secret (Kunci Rahasia Aplikasi)
                  </label>
                  <input 
                    type="password" 
                    value={smtpConfig.microsoftClientSecret || ""}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, microsoftClientSecret: e.target.value })}
                    placeholder="Masukkan kunci rahasia client secret Azure AD"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none outline-none transition-all font-semibold font-mono text-slate-800 shadow-sm placeholder:text-slate-400"
                  />
                </div>

                {/* OAuth2 Authorization Action Box */}
                {smtpConfig.microsoftAuthType !== "client_credentials" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-1">
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        Koneksi Otorisasi
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold leading-normal">
                        {smtpConfig.microsoftRefreshToken ? "Akun Anda sudah terhubung secara aman." : "Otorisasi pengiriman email via akun Microsoft Anda."}
                      </p>
                    </div>
                    {smtpConfig.microsoftRefreshToken ? (
                      <button
                        type="button"
                        onClick={handleDisconnectMicrosoft}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[10px] font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Putuskan Akun
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectMicrosoft}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Compass className="w-3.5 h-3.5 animate-bounce" />
                        Hubungkan Microsoft
                      </button>
                    )}
                  </div>
                )}

                {/* Azure Setup Help Card */}
                <div className="p-4 bg-blue-50/40 border border-blue-200/50 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-800 font-extrabold uppercase tracking-wider text-[10px]">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    Panduan Registrasi Azure AD:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 font-semibold leading-relaxed pl-1 text-[11px]">
                    <li>Masuk ke <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center font-black">Azure Portal</a> &gt; <strong>App Registrations</strong>.</li>
                    <li>Registrasikan aplikasi baru (Pilih "Any organizational directory - Multitenant &amp; Personal Accounts").</li>
                    <li>Atur <strong>Redirect URI</strong> (Web) ke: <code className="bg-white px-2 py-0.5 rounded border border-blue-200/60 font-mono text-[9px] select-all">{window.location.origin}/api/microsoft/callback</code></li>
                    <li>Pada <strong>API Permissions</strong>, tambahkan permission Microsoft Graph: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200/60 font-mono text-[9px]">Mail.Send</code> (Tipe Delegated atau Application).</li>
                    <li>Buat Client Secret di menu <strong>Certificates &amp; secrets</strong>.</li>
                  </ol>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMicrosoftSettingsModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Selesai Konfigurasi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
