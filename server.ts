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

// API Endpoint: Analyze binary using Gemini API
app.post("/api/analyze-binary", async (req, res) => {
  try {
    const { fileName, fileSize, fileType, hexSnippet, strings, customPrompt } = req.body;

    if (!hexSnippet) {
      return res.status(400).json({ error: "Missing binary hex snippet for analysis" });
    }

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        analysis: "### [AI Analysis Unavailable]\n\nGEMINI_API_KEY is not set. Please configure your API key in **Settings > Secrets** to enable advanced AI reverse engineering capabilities.\n\nHere is a local analysis of the uploaded file:\n" +
          `- **File Name:** ${fileName || "unknown"}\n` +
          `- **File Size:** ${fileSize || 0} bytes\n` +
          `- **Inferred Signature:** ${fileType || "Unknown binary"}\n` +
          `- **Bytes Snippet:** \`${hexSnippet.substring(0, 100)}...\``
      });
    }

    const systemPrompt = 
      "You are an expert security researcher and reverse engineer. " +
      "Your job is to analyze the provided hex bytes, file metadata, and extracted printable strings " +
      "of a compiled binary file (or challenge) to reconstruct its behavior, decompile key functions " +
      "into pseudo-C, identify security vulnerabilities (like buffer overflows, hardcoded credentials, " +
      "cryptographic flaws), and explain how a reverse engineer would approach analyzing or patching this application.";

    const contents = `
File Name: ${fileName || "unknown"}
File Size: ${fileSize || 0} bytes
File Type: ${fileType || "unknown/binary"}

Hex Snippet (First 256 bytes):
${hexSnippet}

Extracted Strings:
${strings && strings.length > 0 ? strings.join("\n") : "[No printable strings found]"}

${customPrompt ? `User Specific Question:\n${customPrompt}` : "Please perform a complete static reverse engineering analysis of this binary. Break it down into: 1. File Type & Header Analysis, 2. Extracted Strings context, 3. Visualized C-Pseudo-code of key functions based on headers/strings, 4. Potential Vulnerabilities or Secrets, 5. Patching instructions (e.g. bypass validation logic)."}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to analyze binary: " + error.message });
  }
});

// API Endpoint: Ask Gemini specific questions (Chat assistant for the reversing workspace)
app.post("/api/chat-assistant", async (req, res) => {
  try {
    const { history, message, context } = req.body;

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        text: "Interactive AI Chat requires a GEMINI_API_KEY. Please set up your key in AI Studio Secrets."
      });
    }

    // Prepare system instructions with current debugging context
    const systemInstruction = 
      "You are the BinaryForge AI Reverse Engineering Assistant. You are embedded in an interactive " +
      "reverse engineering environment featuring a Hex Editor, Disassembler, Decompiler, and CPU Register/Stack Emulator. " +
      "The user is debugging a binary program. Use your knowledge of x86 assembly, reverse engineering tools (IDA, Ghidra), " +
      "vulnerabilities (Buffer overflows, XOR encodings, logic bypasses), and standard debugging concepts " +
      "to answer questions clearly, write snippets of assembly, or explain how registers change.\n\n" +
      `CURRENT DEBUGGING WORKSPACE CONTEXT:\n${context || "No binary file is selected currently."}`;

    // Prepare chat messages
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    // Send history to establish context if provided
    if (history && history.length > 0) {
      // For simple conversation handling in REST, we can feed previous rounds
      // but to keep it simple, we can send the message directly with a summary of context.
    }

    const response = await chat.sendMessage({ message: message });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    res.status(500).json({ error: "Failed to communicate with AI: " + error.message });
  }
});

// API Endpoint: Detect SMTP configuration based on email/domain
app.post("/api/detect-smtp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email tidak valid atau tidak lengkap." });
    }

    const domain = email.split("@")[1].trim().toLowerCase();

    // 1. Check common standard providers first to be extremely fast
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
      "yandex.com": { host: "smtp.yandex.com", port: "465", connectionType: "SSL", providerName: "Yandex Mail" },
      "mail.ru": { host: "smtp.mail.ru", port: "465", connectionType: "SSL", providerName: "Mail.ru" },
      "protonmail.com": { host: "127.0.0.1", port: "1025", connectionType: "NONE", providerName: "ProtonMail Bridge" },
      "proton.me": { host: "127.0.0.1", port: "1025", connectionType: "NONE", providerName: "ProtonMail Bridge" },
    };

    if (standardProviders[domain]) {
      return res.json({
        success: true,
        source: "standard_directory",
        ...standardProviders[domain]
      });
    }

    // 2. Perform MX lookup for custom domains
    let mxRecords: any[] = [];
    try {
      mxRecords = await dnsPromises.resolveMx(domain);
    } catch (dnsErr) {
      console.warn(`DNS MX resolution failed for ${domain}:`, dnsErr);
    }

    // Sort MX records by priority (lower is higher priority)
    mxRecords.sort((a, b) => a.priority - b.priority);
    const mxHosts = mxRecords.map(r => r.exchange.toLowerCase());

    console.log(`MX hosts for ${domain}:`, mxHosts);

    // Check if MX records match any standard enterprise providers
    for (const host of mxHosts) {
      if (host.includes("google.com") || host.includes("aspmx.l.google.com") || host.includes("googlemail.com")) {
        return res.json({
          success: true,
          source: "mx_lookup",
          providerName: `Google Workspace Custom Email`,
          host: "smtp.gmail.com",
          port: "587",
          connectionType: "STARTTLS"
        });
      }
      if (host.includes("outlook.com") || host.includes("mail.protection.outlook.com")) {
        return res.json({
          success: true,
          source: "mx_lookup",
          providerName: `Microsoft 365 Custom Email`,
          host: "smtp.office365.com",
          port: "587",
          connectionType: "STARTTLS"
        });
      }
      if (host.includes("zoho.com") || host.includes("zoho.eu")) {
        return res.json({
          success: true,
          source: "mx_lookup",
          providerName: `Zoho Mail Custom Email`,
          host: "smtp.zoho.com",
          port: "465",
          connectionType: "SSL"
        });
      }
      if (host.includes("secureserver.net")) {
        return res.json({
          success: true,
          source: "mx_lookup",
          providerName: `GoDaddy Custom Email`,
          host: "smtpout.secureserver.net",
          port: "465",
          connectionType: "SSL"
        });
      }
      if (host.includes("yandex")) {
        return res.json({
          success: true,
          source: "mx_lookup",
          providerName: `Yandex Connect Custom Email`,
          host: "smtp.yandex.com",
          port: "465",
          connectionType: "SSL"
        });
      }
    }

    // 3. Fallback to Gemini AI for smart reasoning on custom/complex domains!
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
          source: "gemini_ai",
          host: detected.host || `mail.${domain}`,
          port: detected.port || "587",
          connectionType: detected.connectionType || "STARTTLS",
          providerName: detected.providerName || `Custom Server (${domain})`
        });
      } catch (aiErr) {
        console.error("Gemini SMTP detection failed, falling back to standard cPanel guess:", aiErr);
      }
    }

    // 4. Default cPanel/standard fallback if Gemini fails or is not available
    return res.json({
      success: true,
      source: "heuristic_fallback",
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
