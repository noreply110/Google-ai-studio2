/**
 * Types definition for J.A.R.V.I.S Panel
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
  // Microsoft Graph API and OAuth2 configuration
  providerType?: "smtp" | "microsoft_graph";
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  microsoftTenantId?: string;
  microsoftAuthType?: "client_credentials" | "auth_code";
  microsoftAccessToken?: string;
  microsoftRefreshToken?: string;
  microsoftTokenExpiry?: number;
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
