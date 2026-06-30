/**
 * Types definition for G-Swift Panel
 */

export interface EmailTemplate {
  id: string;
  name: string;
  category: "General" | "Marketing" | "Support" | "Personal";
  subject: string;
  message: string;
  createdAt: number;
}

export interface SmtpConfig {
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

export interface LogEntry {
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export interface SpamReport {
  score: number;
  level: "Excellent" | "Good" | "Risky" | "Likely Spam";
  color: string;
  tips: string[];
}

export interface BankingNotification {
  id: string;
  type: "sent" | "opened" | "clicked";
  title: string;
  message: string;
  recipient: string;
  subject: string;
  ip?: string;
  timestamp: string;
}
