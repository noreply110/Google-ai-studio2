import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import fs from "fs";
import { promises as dnsPromises } from "dns";

const app = express();
app.set("trust proxy", true);
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Initialize Gemini Client lazily to prevent crash if key is missing on start
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

import net from "net";

// Helper: TCP Socket Port Probing to check if host is listening on specific port
function probeTcpPort(host: string, port: number, timeout = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

// Helper: Query Mozilla Thunderbird ISPDB
async function fetchMozillaConfig(domain: string): Promise<{ host: string; port: string; connectionType: "STARTTLS" | "SSL" | "NONE"; providerName: string } | null> {
  try {
    const url = `https://autoconfig.thunderbird.net/v1.1/${domain}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const xmlText = await response.text();

    const smtpBlockRegex = /<outgoingServer\s+type="smtp">([\s\S]*?)<\/outgoingServer>/i;
    const match = xmlText.match(smtpBlockRegex);
    if (match) {
      const block = match[1];
      const hostMatch = block.match(/<hostname>([^<]+)<\/hostname>/i);
      const portMatch = block.match(/<port>([^<]+)<\/port>/i);
      const socketTypeMatch = block.match(/<socketType>([^<]+)<\/socketType>/i);
      
      if (hostMatch && portMatch) {
        const host = hostMatch[1].trim();
        const port = portMatch[1].trim();
        let connectionType: "STARTTLS" | "SSL" | "NONE" = "STARTTLS";
        const socketType = socketTypeMatch ? socketTypeMatch[1].trim().toUpperCase() : "";
        if (socketType === "SSL" || socketType === "TLS") {
          connectionType = "SSL";
        } else if (socketType === "STARTTLS") {
          connectionType = "STARTTLS";
        } else if (socketType === "PLAIN") {
          connectionType = "NONE";
        } else {
          connectionType = port === "465" ? "SSL" : "STARTTLS";
        }

        const providerMatch = xmlText.match(/<displayName>([^<]+)<\/displayName>/i);
        const providerName = providerMatch ? providerMatch[1].trim() : `${domain} (Mozilla ISPDB)`;

        return { host, port, connectionType, providerName };
      }
    }
  } catch (err) {
    console.warn("Mozilla ISPDB query failed:", err);
  }
  return null;
}

// Helper: DNS SRV Lookup
async function lookupDnsSrv(domain: string): Promise<{ host: string; port: string; connectionType: "STARTTLS" | "SSL" | "NONE"; providerName: string } | null> {
  const services = [
    { name: `_smtps._tcp.${domain}`, defaultPort: "465", connectionType: "SSL" as const },
    { name: `_submission._tcp.${domain}`, defaultPort: "587", connectionType: "STARTTLS" as const },
  ];

  for (const service of services) {
    try {
      const records = await dnsPromises.resolveSrv(service.name);
      if (records && records.length > 0) {
        records.sort((a, b) => a.priority - b.priority || b.weight - a.weight);
        const bestRecord = records[0];
        const host = bestRecord.name.replace(/\.$/, "");
        const port = String(bestRecord.port || service.defaultPort);
        return {
          host,
          port,
          connectionType: service.connectionType,
          providerName: `${domain} (DNS SRV)`
        };
      }
    } catch (e) {
      // ignore and try next
    }
  }
  return null;
}

// Helper: Query Microsoft Autodiscover protocol XML endpoints
async function fetchMicrosoftAutodiscover(email: string, domain: string): Promise<{ host: string; port: string; connectionType: "STARTTLS" | "SSL" | "NONE"; providerName: string } | null> {
  try {
    const urls = [
      `https://autodiscover.${domain}/autodiscover/autodiscover.xml`,
      `https://${domain}/autodiscover/autodiscover.xml`
    ];

    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006">
  <Request>
    <EMailAddress>${email}</EMailAddress>
    <AcceptableResponseSchema>http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a</AcceptableResponseSchema>
  </Request>
</Autodiscover>`;

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
          body: xmlPayload,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) continue;
        const text = await response.text();

        if (text.includes("SMTP") || text.includes("smtp")) {
          const protocolBlocks = text.split(/<Protocol>/i);
          for (const block of protocolBlocks) {
            if (block.match(/<Type>SMTP<\/Type>/i) || block.match(/<Type>smtp<\/Type>/i)) {
              const serverMatch = block.match(/<Server>([^<]+)<\/Server>/i);
              const portMatch = block.match(/<Port>([^<]+)<\/Port>/i);
              const sslMatch = block.match(/<SSL>([^<]+)<\/SSL>/i);
              const encryptionMatch = block.match(/<EncryptionScheme>([^<]+)<\/EncryptionScheme>/i);

              if (serverMatch) {
                const host = serverMatch[1].trim();
                const port = portMatch ? portMatch[1].trim() : "587";
                let connectionType: "STARTTLS" | "SSL" | "NONE" = "STARTTLS";
                
                const useSsl = sslMatch ? sslMatch[1].trim().toLowerCase() : "";
                const encScheme = encryptionMatch ? encryptionMatch[1].trim().toLowerCase() : "";

                if (useSsl === "yes" || useSsl === "on" || port === "465" || encScheme === "ssl" || encScheme === "tls") {
                  connectionType = "SSL";
                } else if (useSsl === "no" && encScheme === "none") {
                  connectionType = "NONE";
                }

                return {
                  host,
                  port,
                  connectionType,
                  providerName: `${domain} (Microsoft Autodiscover)`
                };
              }
            }
          }
        }
      } catch (err) {
        // fail silently and try next candidate URL
      }
    }
  } catch (err) {
    console.warn("Microsoft Autodiscover lookup failed:", err);
  }
  return null;
}

// API Endpoint: Detect SMTP configuration based on email/domain
app.post("/api/detect-smtp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email tidak valid atau tidak lengkap." });
    }

    const domain = email.split("@")[1].trim().toLowerCase();

    // ==========================================
    // LAYER 1: DATABASE PUSAT BERBASIS MX RECORD (Paling Cepat & Akurat)
    // ==========================================
    
    // 1.1 Local Central Database of Standard Providers
    const standardProviders: Record<string, { host: string; port: string; connectionType: "STARTTLS" | "SSL" | "NONE"; providerName: string }> = {
      "gmail.com": { host: "smtp.gmail.com", port: "587", connectionType: "STARTTLS", providerName: "Google Mail (Gmail)" },
      "yahoo.com": { host: "smtp.mail.yahoo.com", port: "465", connectionType: "SSL", providerName: "Yahoo Mail" },
      "ymail.com": { host: "smtp.mail.yahoo.com", port: "465", connectionType: "SSL", providerName: "Yahoo Mail" },
      "outlook.com": { host: "smtp.office365.com", port: "587", connectionType: "STARTTLS", providerName: "Microsoft Outlook" },
      "hotmail.com": { host: "smtp.office365.com", port: "587", connectionType: "STARTTLS", providerName: "Microsoft Hotmail" },
      "live.com": { host: "smtp.office365.com", port: "587", connectionType: "STARTTLS", providerName: "Microsoft Live" },
      "icloud.com": { host: "smtp.mail.me.com", port: "587", connectionType: "STARTTLS", providerName: "Apple iCloud" },
      "zoho.com": { host: "smtp.zoho.com", port: "465", connectionType: "SSL", providerName: "Zoho Mail" },
      "zoho.in": { host: "smtp.zoho.in", port: "465", connectionType: "SSL", providerName: "Zoho Mail India" },
      "zoho.eu": { host: "smtp.zoho.eu", port: "465", connectionType: "SSL", providerName: "Zoho Mail Europe" },
      "yandex.com": { host: "smtp.yandex.com", port: "465", connectionType: "SSL", providerName: "Yandex Mail" },
      "mail.ru": { host: "smtp.mail.ru", port: "465", connectionType: "SSL", providerName: "Mail.ru" },
      "protonmail.com": { host: "127.0.0.1", port: "1025", connectionType: "NONE", providerName: "ProtonMail Bridge" },
      "proton.me": { host: "127.0.0.1", port: "1025", connectionType: "NONE", providerName: "ProtonMail Bridge" },
      "gmx.com": { host: "mail.gmx.com", port: "587", connectionType: "STARTTLS", providerName: "GMX Mail" },
      "gmx.net": { host: "mail.gmx.net", port: "587", connectionType: "STARTTLS", providerName: "GMX Mail (DE)" },
      "web.de": { host: "smtp.web.de", port: "587", connectionType: "STARTTLS", providerName: "WEB.DE" },
      "mail.com": { host: "smtp.mail.com", port: "587", connectionType: "STARTTLS", providerName: "Mail.com" },
      "fastmail.com": { host: "smtp.fastmail.com", port: "465", connectionType: "SSL", providerName: "Fastmail" },
      "aol.com": { host: "smtp.aol.com", port: "465", connectionType: "SSL", providerName: "AOL Mail" },
    };

    if (standardProviders[domain]) {
      return res.json({
        success: true,
        source: "database_pusat",
        layer: 1,
        ...standardProviders[domain]
      });
    }

    // 1.2 Enterprise/Hosting Signature Mapping via MX Records
    let mxRecords: any[] = [];
    try {
      mxRecords = await dnsPromises.resolveMx(domain);
    } catch (dnsErr) {
      console.warn(`DNS MX resolution failed for ${domain}:`, dnsErr);
    }

    mxRecords.sort((a, b) => a.priority - b.priority);
    const mxHosts = mxRecords.map(r => r.exchange.toLowerCase());

    console.log(`MX hosts for ${domain}:`, mxHosts);

    for (const host of mxHosts) {
      if (host.includes("google.com") || host.includes("aspmx.l.google.com") || host.includes("googlemail.com")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `Google Workspace Custom Email`,
          host: "smtp.gmail.com",
          port: "587",
          connectionType: "STARTTLS"
        });
      }
      if (host.includes("outlook.com") || host.includes("mail.protection.outlook.com")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `Microsoft 365 Custom Email`,
          host: "smtp.office365.com",
          port: "587",
          connectionType: "STARTTLS"
        });
      }
      if (host.includes("zoho.com") || host.includes("zoho.eu") || host.includes("zoho.in")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `Zoho Mail Custom Email`,
          host: "smtp.zoho.com",
          port: "465",
          connectionType: "SSL"
        });
      }
      if (host.includes("secureserver.net") || host.includes("godaddy")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `GoDaddy Custom Email`,
          host: "smtpout.secureserver.net",
          port: "465",
          connectionType: "SSL"
        });
      }
      if (host.includes("yandex")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `Yandex Connect Custom Email`,
          host: "smtp.yandex.com",
          port: "465",
          connectionType: "SSL"
        });
      }
      if (host.includes("hostinger")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `Hostinger Custom Email`,
          host: "smtp.hostinger.com",
          port: "465",
          connectionType: "SSL"
        });
      }
      if (host.includes("migadu")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `Migadu Custom Email`,
          host: "smtp.migadu.com",
          port: "465",
          connectionType: "SSL"
        });
      }
      if (host.includes("fastmail")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `Fastmail Custom Email`,
          host: "smtp.fastmail.com",
          port: "465",
          connectionType: "SSL"
        });
      }
      if (host.includes("mailgun")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `Mailgun Custom Email`,
          host: "smtp.mailgun.org",
          port: "587",
          connectionType: "STARTTLS"
        });
      }
      if (host.includes("sendgrid")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `SendGrid Custom Email`,
          host: "smtp.sendgrid.net",
          port: "587",
          connectionType: "STARTTLS"
        });
      }
      if (host.includes("ovh")) {
        return res.json({
          success: true,
          source: "mx_signature",
          layer: 1,
          providerName: `OVH Custom Email`,
          host: "ssl0.ovh.net",
          port: "465",
          connectionType: "SSL"
        });
      }
    }

    // ==========================================
    // LAYER 2: PROTOKOL MOZILLA AUTOCONFIG (Thunderbird Standard)
    // ==========================================
    const mozillaConfig = await fetchMozillaConfig(domain);
    if (mozillaConfig) {
      const isReachable = await probeTcpPort(mozillaConfig.host, parseInt(mozillaConfig.port), 1000);
      if (isReachable) {
        return res.json({
          success: true,
          source: "mozilla_autoconfig",
          layer: 2,
          ...mozillaConfig,
          providerName: `${mozillaConfig.providerName} (Terverifikasi)`
        });
      }
    }

    // ==========================================
    // LAYER 3: PROTOKOL MICROSOFT AUTODISCOVER
    // ==========================================
    const autodiscoverConfig = await fetchMicrosoftAutodiscover(email, domain);
    if (autodiscoverConfig) {
      const isReachable = await probeTcpPort(autodiscoverConfig.host, parseInt(autodiscoverConfig.port), 1000);
      if (isReachable) {
        return res.json({
          success: true,
          source: "microsoft_autodiscover",
          layer: 3,
          ...autodiscoverConfig,
          providerName: `${autodiscoverConfig.providerName} (Terverifikasi)`
        });
      }
    }

    // ==========================================
    // LAYER 4: DNS SRV RECORDS (RFC 6186)
    // ==========================================
    const srvConfig = await lookupDnsSrv(domain);
    if (srvConfig) {
      return res.json({
        success: true,
        source: "dns_srv_records",
        layer: 4,
        ...srvConfig
      });
    }

    // ==========================================
    // LAYER 5: TEBAKAN CERDAS & PEMINDAIAN PORT AKTIF (Smart Guessing & Active Probing)
    // ==========================================
    const candidates = [
      { host: `smtp.${domain}`, port: 465, connectionType: "SSL" as const },
      { host: `smtp.${domain}`, port: 587, connectionType: "STARTTLS" as const },
      { host: `mail.${domain}`, port: 465, connectionType: "SSL" as const },
      { host: `mail.${domain}`, port: 587, connectionType: "STARTTLS" as const },
      { host: domain, port: 465, connectionType: "SSL" as const },
      { host: domain, port: 587, connectionType: "STARTTLS" as const },
    ];

    const probePromises = candidates.map(async (c) => {
      const isOpen = await probeTcpPort(c.host, c.port, 1200);
      return { ...c, isOpen };
    });
    
    const probeResults = await Promise.all(probePromises);
    const successfulProbe = probeResults.find(r => r.isOpen);
    
    if (successfulProbe) {
      return res.json({
        success: true,
        source: "active_probing",
        layer: 5,
        providerName: `Custom Mail Server (Verifikasi Port Aktif)`,
        host: successfulProbe.host,
        port: String(successfulProbe.port),
        connectionType: successfulProbe.connectionType
      });
    }

    // ==========================================
    // LAYER 6: AI-POWERED INTUITION (Gemini Smart Fallback)
    // ==========================================
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const prompt = `Analyze the email domain "${domain}" and its MX records: ${JSON.stringify(mxHosts)}.
Based on this information, recommend the most likely SMTP host server, Port, and Connection Type (STARTTLS, SSL, or NONE).
If it looks like a standard cPanel / self-hosted mail server (which is common for custom domains with local MX records like "mail.${domain}" or "smtp.${domain}"), recommend "mail.${domain}" with port "587" and "STARTTLS" as the connection type.

You MUST respond strictly with a valid JSON object matching this schema (do NOT include markdown formatting wrappers, only raw JSON):
{
  "host": "string (the smtp server host, e.g. smtp.example.com or mail.example.com)",
  "port": "string (the port, e.g. '587' or '465')",
  "connectionType": "STARTTLS or SSL or NONE",
  "providerName": "string (a descriptive name of the provider or cPanel custom server)"
}`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        });

        const jsonText = response.text.trim();
        const detected = JSON.parse(jsonText);
        return res.json({
          success: true,
          source: "gemini_ai_fallback",
          layer: 6,
          host: detected.host || `mail.${domain}`,
          port: detected.port || "587",
          connectionType: detected.connectionType || "STARTTLS",
          providerName: detected.providerName || `Custom Server (${domain})`
        });
      } catch (aiErr) {
        console.error("Gemini SMTP detection failed, falling back to standard cPanel guess:", aiErr);
      }
    }

    // ==========================================
    // LAYER 7: DEFAULT HEURISTIC FALLBACK
    // ==========================================
    return res.json({
      success: true,
      source: "heuristic_fallback",
      layer: 7,
      providerName: `Custom Server (${domain})`,
      host: `mail.${domain}`,
      port: "587",
      connectionType: "STARTTLS"
    });

  } catch (error: any) {
    console.error("SMTP detection error:", error);
    res.status(500).json({ error: "Gagal mendeteksi pengaturan SMTP: " + error.message });
  }
});

// SMTP Relay Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    smtp_configured: !!(process.env.SMTP_USER || process.env.SMTP_HOST),
    system: "G-Swift Speed Relay Panel"
  });
});

// SMTP Email Transporter & Forwarder (Clean SMTP Delivery Relay without tracking)
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, text, html, smtpConfig } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: "Recipient and Subject are required fields." });
    }

    // Determine SMTP Config (either custom from client or fallback to server env)
    const host = smtpConfig?.host || process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(smtpConfig?.port || process.env.SMTP_PORT || "587");
    const username = smtpConfig?.username || process.env.SMTP_USER;
    const password = smtpConfig?.password || process.env.SMTP_PASS;
    const fromName = smtpConfig?.fromName || process.env.SMTP_FROM_NAME || "G-Swift Relay";
    const senderEmail = smtpConfig?.senderEmail || smtpConfig?.username || process.env.SMTP_SENDER || username;
    const replyTo = smtpConfig?.replyTo || process.env.SMTP_REPLY_TO;

    if (!username || !password) {
      return res.status(400).json({ 
        error: "SMTP Credentials (Username and Password) are missing. Please configure them in settings." 
      });
    }

    const secure = port === 465;

    // Create Transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: username,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false // Avoid self-signed certificate failures
      }
    });

    const htmlBody = html || text?.replace(/\n/g, "<br>") || "";

    // Send Mail
    const mailOptions = {
      from: `"${fromName}" <${senderEmail}>`,
      to,
      subject,
      text: text || "",
      html: htmlBody,
      replyTo: replyTo || undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email forwarded successfully. MessageID:`, info.messageId);

    res.json({
      success: true,
      messageId: info.messageId,
      response: info.response
    });
  } catch (err: any) {
    console.error("SMTP Forwarding Error:", err);
    res.status(500).json({ 
      error: err.message || "An error occurred while attempting to relay the email." 
    });
  }
});

// Vite and static asset serving
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
