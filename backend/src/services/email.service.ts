import nodemailer, { type Transporter } from "nodemailer";
import type { UserRole } from "../types";
import { buildInviteEmail } from "../templates/email/invite";
import { buildResetEmail } from "../templates/email/password-reset";
import type { SupportedLocale } from "../models/establishmentSettings.model";
import { logError, logInfo, logWarn } from "../utils/logger";

interface DeliverEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  context: string;
  requestId?: string;
}

const DEFAULT_APP_NAME = process.env.APP_NAME || "EduPilot";
const DEFAULT_LOCALE: SupportedLocale = "fr";
const FALLBACK_FROM_EMAIL =
  process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@edupilot.test";
const FALLBACK_FROM_NAME = process.env.EMAIL_FROM_NAME || DEFAULT_APP_NAME;
const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_GREETING_TIMEOUT_MS = 10_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 20_000;
const TRANSPORT_VERIFY_TTL_MS = 5 * 60 * 1000;

let transport: Transporter | null = null;
let transportInitialized = false;
let lastTransportVerify = 0;

function hasSmtpConfig(): boolean {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

function getNumericEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveFromAddress(): string {
  const fromEmail = (process.env.EMAIL_FROM || process.env.SMTP_USER || FALLBACK_FROM_EMAIL).trim();
  const rawName = process.env.EMAIL_FROM_NAME;
  const fromName =
    rawName && rawName.trim().length > 0
      ? rawName.trim()
      : (process.env.APP_NAME || FALLBACK_FROM_NAME).trim();

  if (rawName && rawName.trim().length > 0) {
    return `${fromName} <${fromEmail}>`;
  }

  return fromEmail;
}

function getSmtpPort(): number {
  const port = getNumericEnv(process.env.SMTP_PORT, 587);
  return port;
}

function isSecure(): boolean {
  return process.env.SMTP_SECURE === "true";
}

function getSmtpTransportOrNull(): Transporter | null {
  if (transportInitialized) {
    return transport;
  }

  transportInitialized = true;

  if (!hasSmtpConfig()) {
    logWarn({
      context: "EMAIL",
      event: "email.transport.skip",
      reason: "smtp_not_configured",
    });
    transport = null;
    return transport;
  }

  try {
    const connectionTimeout = getNumericEnv(
      process.env.SMTP_CONNECTION_TIMEOUT_MS,
      DEFAULT_CONNECTION_TIMEOUT_MS
    );
    const greetingTimeout = getNumericEnv(
      process.env.SMTP_GREETING_TIMEOUT_MS,
      DEFAULT_GREETING_TIMEOUT_MS
    );
    const socketTimeout = getNumericEnv(
      process.env.SMTP_SOCKET_TIMEOUT_MS,
      DEFAULT_SOCKET_TIMEOUT_MS
    );

    // Brevo SMTP: ports 587/2525 (STARTTLS) et 465 (SSL). On démarre avec 587.
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: getSmtpPort(),
      secure: isSecure(),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
    });
    logInfo({
      context: "EMAIL",
      event: "email.transport.initialized",
      host: process.env.SMTP_HOST,
      port: getSmtpPort(),
      secure: isSecure(),
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
    });
  } catch (error) {
    logError({
      context: "EMAIL",
      event: "email.transport.init_error",
      msg: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined,
    });
    transport = null;
  }

  return transport;
}

type NodemailerError = Error & {
  code?: string;
  responseCode?: number;
  command?: string;
};

function classifyEmailError(error: NodemailerError | null): string {
  const code = error?.code;
  const responseCode = error?.responseCode;

  if (code === "EAUTH" || responseCode === 535) {
    return "email.error.auth";
  }

  if (code === "ETIMEDOUT") {
    return "email.error.timeout";
  }

  const networkCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "ECONNRESET",
    "EAI_AGAIN",
  ]);
  if (code && networkCodes.has(code)) {
    return "email.error.network";
  }

  return "email.error.unknown";
}

async function ensureTransportVerified(
  transporter: Transporter,
  requestId?: string
): Promise<boolean> {
  if (lastTransportVerify && Date.now() - lastTransportVerify < TRANSPORT_VERIFY_TTL_MS) {
    return true;
  }

  try {
    await transporter.verify();
    lastTransportVerify = Date.now();
    logInfo({
      context: "EMAIL",
      event: "email.transport.verified",
      requestId,
      host: process.env.SMTP_HOST,
      port: getSmtpPort(),
    });
    return true;
  } catch (error) {
    lastTransportVerify = 0;
    logError({
      context: "EMAIL",
      event: "email.transport.verify_failed",
      requestId,
      msg: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

export async function deliverEmail(params: DeliverEmailParams): Promise<void> {
  const { context, requestId } = params;
  if (!hasSmtpConfig()) {
    logWarn({
      context,
      event: "email.skip",
      reason: "smtp_not_configured",
      requestId,
      to: params.to,
      subject: params.subject,
    });
    logInfo({
      context,
      event: "email.fallback.preview",
      requestId,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return;
  }

  const activeTransport = getSmtpTransportOrNull();

  if (!activeTransport) {
    logError({
      context,
      event: "email.transport.unavailable",
      requestId,
      reason: "transport_not_initialized",
    });
    throw new Error("SMTP transport unavailable");
  }

  const verified = await ensureTransportVerified(activeTransport, requestId);
  if (!verified) {
    throw new Error("SMTP verification failed");
  }

  try {
    const info = await activeTransport.sendMail({
      from: resolveFromAddress(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
    });
    logInfo({
      context,
      event: "email.sent",
      requestId,
      to: params.to,
      subject: params.subject,
      messageId: info?.messageId,
    });
  } catch (err) {
    const error = err as NodemailerError;
    const event = classifyEmailError(error);
    logError({
      context,
      event,
      requestId,
      code: error?.code,
      responseCode: error?.responseCode,
      command: error?.command,
      msg: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error instanceof Error ? error : new Error("Email delivery failed");
  }
}

const roleLabels: Record<SupportedLocale, Record<UserRole, string>> = {
  fr: {
    student: "élève",
    teacher: "professeur",
    staff: "staff",
    admin: "administrateur",
    parent: "parent",
    super_admin: "super administrateur",
  },
  en: {
    student: "student",
    teacher: "teacher",
    staff: "staff",
    admin: "administrator",
    parent: "parent",
    super_admin: "super admin",
  },
};

interface InviteEmailParams {
  to: string;
  loginEmail: string;
  role: Exclude<UserRole, "admin" | "super_admin">;
  establishmentName?: string;
  inviteUrl: string;
  expiresInDays?: number;
  locale?: SupportedLocale;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
  const locale: SupportedLocale = params.locale === "en" ? "en" : DEFAULT_LOCALE;
  const label =
    roleLabels[locale][params.role] ||
    roleLabels[DEFAULT_LOCALE][params.role] ||
    (locale === "en" ? "user" : "utilisateur");
  const expiresIn = params.expiresInDays ?? 7;
  const inviteContent = buildInviteEmail({
    userName: undefined,
    establishmentName: params.establishmentName ?? DEFAULT_APP_NAME,
    roleLabel: label,
    loginEmail: params.loginEmail,
    actionUrl: params.inviteUrl,
    expiresInDays: expiresIn,
    locale,
  });

  await deliverEmail({
    to: params.to,
    subject: inviteContent.subject,
    text: inviteContent.text,
    html: inviteContent.html,
    context: "INVITE",
  });
}

interface ResetEmailParams {
  to: string;
  loginEmail: string;
  resetUrl: string;
  establishmentName?: string | null;
  userName?: string | null;
  locale?: SupportedLocale;
}

export async function sendPasswordResetEmail(params: ResetEmailParams): Promise<void> {
  const locale: SupportedLocale = params.locale === "en" ? "en" : DEFAULT_LOCALE;
  const resetContent = buildResetEmail({
    userName: params.userName ?? undefined,
    establishmentName: params.establishmentName ?? DEFAULT_APP_NAME,
    loginEmail: params.loginEmail,
    actionUrl: params.resetUrl,
    locale,
  });

  await deliverEmail({
    to: params.to,
    subject: resetContent.subject,
    text: resetContent.text,
    html: resetContent.html,
    context: "RESET",
  });
}

export async function sendTestEmail(
  to: string,
  requestId?: string
): Promise<void> {
  await deliverEmail({
    to,
    subject: "Test SMTP Brevo",
    html: "<p>Test SMTP Brevo OK</p>",
    text: "Test SMTP Brevo OK",
    context: "TEST",
    requestId,
  });
}
