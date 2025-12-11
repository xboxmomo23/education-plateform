import type { UserRole } from "../types";

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
  const establishment = params.establishmentName
    ? ` pour ${params.establishmentName}`
    : "";

  const subject = `${DEFAULT_APP_NAME} – invitation ${label}`;
  const text = `Bonjour,

Vous avez été invité à rejoindre ${DEFAULT_APP_NAME}${establishment} en tant que ${label}.
Email de connexion : ${params.loginEmail}

Cliquez sur le lien suivant pour définir votre mot de passe (valable ${expiresIn} jours) :
${params.inviteUrl}

À très vite sur ${DEFAULT_APP_NAME} !`;

  const html = `<p>Bonjour,</p>
<p>Vous avez été invité à rejoindre <strong>${DEFAULT_APP_NAME}</strong>${establishment} en tant que <strong>${label}</strong>.</p>
<p>Email de connexion : <strong>${params.loginEmail}</strong></p>
<p><a href="${params.inviteUrl}" target="_blank">Cliquez ici pour activer votre compte</a> (lien valable ${expiresIn} jours).</p>
<p>À très vite sur ${DEFAULT_APP_NAME} !</p>`;

  await deliverEmail({
    to: params.to,
    subject,
    text,
    html,
    context: "INVITE",
  });
}

interface ResetEmailParams {
  to: string;
  loginEmail: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail(params: ResetEmailParams): Promise<void> {
  const subject = `${DEFAULT_APP_NAME} – réinitialisation de mot de passe`;
  const text = `Bonjour,

Une demande de réinitialisation de mot de passe a été effectuée pour le compte ${params.loginEmail}.
Vous pouvez définir un nouveau mot de passe en suivant ce lien :
${params.resetUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.`;

  const html = `<p>Bonjour,</p>
<p>Une demande de réinitialisation de mot de passe a été effectuée pour le compte <strong>${params.loginEmail}</strong>.</p>
<p><a href="${params.resetUrl}" target="_blank">Cliquez ici pour définir un nouveau mot de passe</a>.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>`;

  await deliverEmail({
    to: params.to,
    subject,
    text,
    html,
    context: "RESET",
  });
}
