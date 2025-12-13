import type { UserRole } from "../types";
import { buildInviteEmail } from "../templates/email/invite";
import { buildResetEmail } from "../templates/email/password-reset";

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

const roleLabels: Record<UserRole, string> = {
  student: "élève",
  teacher: "professeur",
  staff: "staff",
  admin: "administrateur",
  parent: "parent",
  super_admin: "super administrateur",
};

interface InviteEmailParams {
  to: string;
  loginEmail: string;
  role: Exclude<UserRole, "admin" | "super_admin">;
  establishmentName?: string;
  inviteUrl: string;
  expiresInDays?: number;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
  const label = roleLabels[params.role] || "utilisateur";
  const expiresIn = params.expiresInDays ?? 7;
  const inviteContent = buildInviteEmail({
    userName: undefined,
    establishmentName: params.establishmentName ?? DEFAULT_APP_NAME,
    roleLabel: label,
    loginEmail: params.loginEmail,
    actionUrl: params.inviteUrl,
    expiresInDays: expiresIn,
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
}

export async function sendPasswordResetEmail(params: ResetEmailParams): Promise<void> {
  const resetContent = buildResetEmail({
    userName: params.userName ?? undefined,
    establishmentName: params.establishmentName ?? DEFAULT_APP_NAME,
    loginEmail: params.loginEmail,
    actionUrl: params.resetUrl,
  });

  await deliverEmail({
    to: params.to,
    subject: resetContent.subject,
    text: resetContent.text,
    html: resetContent.html,
    context: "RESET",
  });
}
