import type { UserRole } from "../types";
import { buildInviteEmail } from "../templates/email/invite";
import { buildResetEmail } from "../templates/email/password-reset";
import type { SupportedLocale } from "../models/establishmentSettings.model";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
  context?: string;
};

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  EMAIL_FROM,
  EMAIL_FROM_NAME,
  APP_NAME,
} = process.env;

const DEFAULT_APP_NAME = APP_NAME || "EduPilot";
const DEFAULT_FROM_EMAIL = EMAIL_FROM || "no-reply@edupilot.test";
const DEFAULT_FROM_NAME = EMAIL_FROM_NAME || DEFAULT_APP_NAME;
const DEFAULT_LOCALE: SupportedLocale = "fr";
const DEFAULT_FROM = EMAIL_FROM
  ? EMAIL_FROM_NAME
    ? `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`
    : EMAIL_FROM
  : DEFAULT_FROM_EMAIL;

let transport: any | null = null;
let transportInitialized = false;

function hasSmtpConfig(): boolean {
  return Boolean(
    SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && EMAIL_FROM
  );
}

function getSmtpTransportOrNull(): any | null {
  if (transportInitialized) {
    return transport;
  }

  transportInitialized = true;

  if (!hasSmtpConfig()) {
    console.info("[MAIL] SMTP non configuré, bascule en mode console.");
    transport = null;
    return transport;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer");
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.info(`[MAIL] Transport SMTP initialisé (${SMTP_HOST}:${SMTP_PORT})`);
  } catch (error) {
    console.error("[MAIL] Impossible d'initialiser le transport SMTP, fallback console:", error);
    transport = null;
  }

  return transport;
}

async function deliverEmail(payload: MailPayload): Promise<void> {
  const activeTransport = getSmtpTransportOrNull();

  if (activeTransport) {
    try {
      await activeTransport.sendMail({
        from: DEFAULT_FROM,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      console.log(
        `[MAIL:SMTP${payload.context ? `:${payload.context}` : ""}] Email envoyé à ${payload.to} (${payload.subject})`
      );
      return;
    } catch (error) {
      console.error("[MAIL:SMTP] Erreur lors de l'envoi, fallback console:", error);
    }
  }

  console.log(`[MAIL:FALLBACK${payload.context ? `:${payload.context}` : ""}]`, {
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
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
