import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import fs from "fs";

const app = express();
app.set("trust proxy", true);
const PORT = 3000;

// --- Email Tracking Database Setup ---
interface TrackingEvent {
  timestamp: string;
  ip: string;
  userAgent: string;
  isBot?: boolean;
  botName?: string;
  device?: string;
  os?: string;
  browser?: string;
}

interface ClickEvent {
  url: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  isBot?: boolean;
  botName?: string;
  device?: string;
  os?: string;
  browser?: string;
}

interface TrackedEmail {
  id: string;
  recipient: string;
  subject: string;
  sentAt: string;
  status: "sent" | "opened" | "clicked";
  opensCount: number;
  openEvents: TrackingEvent[];
  clickEvents: ClickEvent[];
  smtpUser: string;
}

const DB_FILE = path.join(process.cwd(), "tracking-db.json");

function loadTrackingDb(): TrackedEmail[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load tracking DB:", err);
  }
  return [];
}

function saveTrackingDb(data: TrackedEmail[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save tracking DB:", err);
  }
}

let trackedEmails: TrackedEmail[] = loadTrackingDb();

// Helper to analyze if user agent is an automated bot/proxy with high-precision bank-grade heuristics
function detectBotProxy(userAgent: string, sentAtIso?: string, type: "open" | "click" = "open"): { isBot: boolean; botName: string } {
  const ua = (userAgent || "").toLowerCase();
  
  // 1. Specific Security Gateway & Sandbox Signatures (Check these first!)
  if (ua.includes("safelinks") || ua.includes("outlook-express") || ua.includes("microsoftoffice") || ua.includes("ms-office")) {
    return { isBot: true, botName: "Microsoft Outlook SafeLinks Scan" };
  }
  
  if (
    ua.includes("googleimageproxy") ||
    ua.includes("google-image-proxy") ||
    ua.includes("googlelmageproxy") ||
    ua.includes("yahooimageproxy")
  ) {
    return { isBot: true, botName: "Bot Pre-fetch" };
  }

  // Common Corporate Email Protection Suites
  if (ua.includes("barracuda") || ua.includes("sentinel")) {
    return { isBot: true, botName: "Barracuda Sentinel Sandbox" };
  }
  if (ua.includes("proofpoint") || ua.includes("pphover") || ua.includes("ppshv")) {
    return { isBot: true, botName: "Proofpoint Targeted Attack Protection" };
  }
  if (ua.includes("mimecast") || ua.includes("msc-email")) {
    return { isBot: true, botName: "Mimecast Target Link Scan" };
  }
  if (ua.includes("sophos") || ua.includes("sophos-scanner")) {
    return { isBot: true, botName: "Sophos Web Intelligence" };
  }
  if (ua.includes("trendmicro") || ua.includes("housecall") || ua.includes("tm-email")) {
    return { isBot: true, botName: "Trend Micro Email Security" };
  }
  if (ua.includes("zscaler") || ua.includes("zscalersb")) {
    return { isBot: true, botName: "Zscaler Nanolog Sandbox" };
  }
  if (ua.includes("fireeye") || ua.includes("fe-email") || ua.includes("hx-agent")) {
    return { isBot: true, botName: "FireEye Dynamic Threat Analysis" };
  }
  if (ua.includes("fortigate") || ua.includes("fortimail") || ua.includes("fortinet")) {
    return { isBot: true, botName: "Fortinet FortiGate Sandbox" };
  }
  if (ua.includes("symantec") || ua.includes("bluecoat") || ua.includes("messagelabs")) {
    return { isBot: true, botName: "Symantec Brightmail Gateway" };
  }
  if (ua.includes("cisco") || ua.includes("ironport") || ua.includes("amp-email")) {
    return { isBot: true, botName: "Cisco IronPort Link Analyzer" };
  }
  if (ua.includes("paloalto") || ua.includes("panw-scanner") || ua.includes("wildfire")) {
    return { isBot: true, botName: "Palo Alto Networks WildFire" };
  }
  if (ua.includes("forcepoint") || ua.includes("websense")) {
    return { isBot: true, botName: "Forcepoint TRITON Scan" };
  }
  if (ua.includes("f-secure") || ua.includes("fs-scanner")) {
    return { isBot: true, botName: "F-Secure Radar Crawler" };
  }
  if (ua.includes("avast") || ua.includes("avg-scanner")) {
    return { isBot: true, botName: "Avast/AVG Web Shield Scan" };
  }

  // 2. Automated libraries, scripting clients & scrapers
  if (
    ua.includes("curl") ||
    ua.includes("wget") ||
    ua.includes("python") ||
    ua.includes("http-client") ||
    ua.includes("go-http") ||
    ua.includes("axios") ||
    ua.includes("node-fetch") ||
    ua.includes("java/") ||
    ua.includes("perl") ||
    ua.includes("libwww") ||
    ua.includes("postman") ||
    ua.includes("scrapy") ||
    ua.includes("headless") ||
    ua.includes("puppeteer") ||
    ua.includes("selenium")
  ) {
    return { isBot: true, botName: "Automated Programmatic Crawler" };
  }

  // 3. Timing-based analysis (Heuristic check)
  // Real humans require time to receive the email notification, open their client, read, and click.
  // We check if it is NOT a standard human browser (e.g. headless or script) before applying aggressive timing filters,
  // and keep a very small threshold for human browsers to prevent false positives during active user testing.
  if (sentAtIso) {
    const sentTime = new Date(sentAtIso).getTime();
    const nowTime = Date.now();
    const elapsedMs = nowTime - sentTime;

    const isHumanBrowser = (ua.includes("mozilla") || ua.includes("chrome") || ua.includes("safari") || ua.includes("firefox") || ua.includes("apple") || ua.includes("android") || ua.includes("iphone")) && !ua.includes("bot") && !ua.includes("crawler") && !ua.includes("spider");

    if (isHumanBrowser) {
      if (type === "open" && elapsedMs < 1000) {
        return { isBot: true, botName: "Instant Human Simulation Open (<1s)" };
      }
      if (type === "click" && elapsedMs < 1500) {
        return { isBot: true, botName: "Instant Human Simulation Click (<1.5s)" };
      }
    } else {
      if (type === "open" && elapsedMs < 4000) {
        return { isBot: true, botName: "Bot Pre-fetch" };
      }
      if (type === "click" && elapsedMs < 6000) {
        return { isBot: true, botName: "Firewall URL Safety Pre-Scan (<6s)" };
      }
    }
  }

  // 4. Standard Web/Social crawlers
  if (
    ua.includes("bot") || 
    ua.includes("crawler") || 
    ua.includes("spider") || 
    ua.includes("slackbot") || 
    ua.includes("facebookexternalhit") || 
    ua.includes("whatsapp") || 
    ua.includes("telegrambot") ||
    ua.includes("yahoo! slurp") ||
    ua.includes("baidu") ||
    ua.includes("yandex") ||
    ua.includes("bingbot") ||
    ua.includes("duckduckgo")
  ) {
    return { isBot: true, botName: "Search Engine / Social Media Bot" };
  }
  
  return { isBot: false, botName: "" };
}

// Increase request size limit for uploading binary files as base64 or hex
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

// SMTP Relay Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    smtp_configured: !!(process.env.SMTP_USER || process.env.SMTP_HOST),
    system: "G-Swift Speed Relay Panel"
  });
});

// Helper to parse Device (Mobile/Desktop), OS, and Browser from User-Agent
function parseUserAgent(userAgent: string): { device: "Mobile" | "Desktop"; os: string; browser: string } {
  const ua = (userAgent || "").toLowerCase();
  
  // 1. Device Type
  let device: "Mobile" | "Desktop" = "Desktop";
  if (
    ua.includes("mobile") ||
    ua.includes("android") ||
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod") ||
    ua.includes("phone")
  ) {
    device = "Mobile";
  }

  // 2. OS
  let os = "Unknown OS";
  if (ua.includes("windows nt 10.0")) os = "Windows 10/11";
  else if (ua.includes("windows nt 6.3")) os = "Windows 8.1";
  else if (ua.includes("windows nt 6.2")) os = "Windows 8";
  else if (ua.includes("windows nt 6.1")) os = "Windows 7";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    const match = userAgent.match(/OS (\d+([_\.]\d+)*)/);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
  } else if (ua.includes("android")) {
    const match = userAgent.match(/Android (\d+(\.\d+)*)/);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (ua.includes("macintosh") || ua.includes("mac os x")) {
    const match = userAgent.match(/Mac OS X (\d+([_\.]\d+)*)/);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
  } else if (ua.includes("linux")) {
    os = "Linux";
  } else if (ua.includes("cros")) {
    os = "ChromeOS";
  }

  // 3. Browser
  let browser = "Unknown Browser";
  if (ua.includes("edg/")) {
    const match = userAgent.match(/Edg\/(\d+(\.\d+)*)/);
    browser = match ? `Edge ${match[1].split(".")[0]}` : "Edge";
  } else if (ua.includes("opr/") || ua.includes("opera")) {
    browser = "Opera";
  } else if (ua.includes("chrome") || ua.includes("crios")) {
    const match = userAgent.match(/(?:Chrome|CrMo|CriOS)\/(\d+(\.\d+)*)/);
    browser = match ? `Chrome ${match[1].split(".")[0]}` : "Chrome";
  } else if (ua.includes("firefox") || ua.includes("fxios")) {
    const match = userAgent.match(/(?:Firefox|FxiOS)\/(\d+(\.\d+)*)/);
    browser = match ? `Firefox ${match[1].split(".")[0]}` : "Firefox";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    const match = userAgent.match(/Version\/(\d+(\.\d+)*)/);
    browser = match ? `Safari ${match[1].split(".")[0]}` : "Safari";
  } else if (ua.includes("msie") || ua.includes("trident/")) {
    browser = "Internet Explorer";
  }

  return { device, os, browser };
}

// Tracking API - Email Opened
app.get("/api/track/open/:id", (req, res) => {
  const { id } = req.params;
  const ip = ((req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "Unknown").split(",")[0].trim();
  const userAgent = req.headers["user-agent"] || "Unknown";

  const emailIndex = trackedEmails.findIndex(e => e.id === id);
  if (emailIndex !== -1) {
    const email = trackedEmails[emailIndex];
    const { isBot, botName } = detectBotProxy(userAgent, email.sentAt, "open");

    // Only increment open statistics if it is NOT a known security/pre-fetch bot
    if (!isBot) {
      email.opensCount += 1;
      if (email.status === "sent") {
        email.status = "opened";
      }
    }

    let device: string | undefined = undefined;
    let os: string | undefined = undefined;
    let browser: string | undefined = undefined;

    if (!isBot) {
      const parsed = parseUserAgent(userAgent);
      device = parsed.device;
      os = parsed.os;
      browser = parsed.browser;
    }

    email.openEvents.push({
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      isBot,
      botName: botName || undefined,
      device,
      os,
      browser
    });
    saveTrackingDb(trackedEmails);
    console.log(`[TRACK] Email to ${email.recipient} open attempt. Bot/Proxy? ${isBot} (${botName || "None"}). IP: ${ip}`);
  }

  // Respond with a transparent 1x1 GIF
  const gifBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const img = Buffer.from(gifBase64, "base64");
  res.writeHead(200, {
    "Content-Type": "image/gif",
    "Content-Length": img.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  res.end(img);
});

// Tracking API - Link Clicked
app.get("/api/track/click/:id", (req, res) => {
  const { id } = req.params;
  const targetUrl = req.query.url as string;
  const ip = ((req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "Unknown").split(",")[0].trim();
  const userAgent = req.headers["user-agent"] || "Unknown";

  if (!targetUrl) {
    return res.status(400).send("Target URL is missing.");
  }

  const emailIndex = trackedEmails.findIndex(e => e.id === id);
  if (emailIndex !== -1) {
    const email = trackedEmails[emailIndex];
    const { isBot, botName } = detectBotProxy(userAgent, email.sentAt, "click");

    let device: string | undefined = undefined;
    let os: string | undefined = undefined;
    let browser: string | undefined = undefined;

    const parsed = parseUserAgent(userAgent);
    if (!isBot) {
      device = parsed.device;
      os = parsed.os;
      browser = parsed.browser;
    }

    // Only set status to clicked if it is a real human user, not an anti-virus URL pre-scanner
    if (!isBot) {
      email.status = "clicked";

      // --- CRITICAL AUTO-HEALING: If email was never recorded as opened (e.g. image blocking is active)
      // but a real human clicked a link inside, then they definitely opened the email.
      if (email.opensCount === 0) {
        email.opensCount = 1;
        // Inject a synthetic open event to heal stats
        email.openEvents.push({
          timestamp: new Date().toISOString(),
          ip,
          userAgent,
          isBot: false,
          botName: "Auto-Detected via Click",
          device,
          os,
          browser
        });
      }
    }

    email.clickEvents.push({
      url: targetUrl,
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      isBot,
      botName: botName || undefined,
      device,
      os,
      browser
    });
    saveTrackingDb(trackedEmails);
    console.log(`[TRACK] Link clicked. Bot/Proxy? ${isBot} (${botName || "None"}). URL: ${targetUrl} from ${ip}`);
  }

  // Redirect to the actual target URL
  res.redirect(targetUrl);
});

// Tracking API - Stats List
app.get("/api/tracking-stats", (req, res) => {
  res.json({
    success: true,
    data: trackedEmails
  });
});

// Tracking API - Delete Specific Log or Clear All
app.post("/api/tracking-delete", (req, res) => {
  const { id, clearAll } = req.body;
  if (clearAll) {
    trackedEmails = [];
    saveTrackingDb(trackedEmails);
    return res.json({ success: true, message: "Semua log pelacakan berhasil dihapus." });
  }

  if (id) {
    trackedEmails = trackedEmails.filter(e => e.id !== id);
    saveTrackingDb(trackedEmails);
    return res.json({ success: true, message: "Log pelacakan berhasil dihapus." });
  }

  res.status(400).json({ error: "Parameter tidak valid." });
});

// SMTP Email Transporter & Forwarder (with integrated Real-Time Open & Click Tracking)
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

    // 1. Generate a Unique Tracking ID for this message transaction
    const trackingId = "trk_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

    // 2. Identify Host for constructing tracking URL dynamically
    const forwardedHost = req.headers["x-forwarded-host"];
    const hostHeader = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.get("host") || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] === "https" || req.protocol === "https" ? "https" : "http";
    const origin = `${protocol}://${hostHeader}`;

    const openTrackingUrl = `${origin}/api/track/open/${trackingId}`;
    const clickTrackingPrefix = `${origin}/api/track/click/${trackingId}?url=`;

    // 3. Format or prepare HTML body so we can insert the tracking pixel and track clicks
    let htmlBody = html || text?.replace(/\n/g, "<br>") || "";

    // 4. Instrument links inside HTML to redirect through click-tracker
    const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    htmlBody = htmlBody.replace(hrefRegex, (match, url) => {
      if (url.includes("/api/track/")) return match;
      const encodedUrl = encodeURIComponent(url);
      return `href="${clickTrackingPrefix}${encodedUrl}"`;
    });

    // 5. Append 1x1 tracking pixel at the end of HTML
    const pixelHtml = `<img src="${openTrackingUrl}" width="1" height="1" style="display:none !important; width:1px !important; height:1px !important; border:0 !important; outline:none !important; padding:0 !important; margin:0 !important;" alt="" referrerPolicy="no-referrer" />`;
    if (htmlBody.toLowerCase().includes("</body>")) {
      htmlBody = htmlBody.replace(/<\/body>/i, `${pixelHtml}</body>`);
    } else {
      htmlBody = `${htmlBody}${pixelHtml}`;
    }

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
    console.log(`Email forwarded successfully with Tracking ID: ${trackingId}. MessageID:`, info.messageId);

    // Save Tracking Record
    const newTrackedEmail: TrackedEmail = {
      id: trackingId,
      recipient: to,
      subject: subject,
      sentAt: new Date().toISOString(),
      status: "sent",
      opensCount: 0,
      openEvents: [],
      clickEvents: [],
      smtpUser: username
    };

    trackedEmails.unshift(newTrackedEmail);
    saveTrackingDb(trackedEmails);

    res.json({
      success: true,
      messageId: info.messageId,
      trackingId: trackingId,
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
