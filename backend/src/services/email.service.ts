import type { UserRole } from "../types";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  EMAIL_FROM,
  APP_NAME,
} = process.env;

const DEFAULT_APP_NAME = APP_NAME || "EduPilot";
const DEFAULT_FROM = EMAIL_FROM || "no-reply@edupilot.test";

let transporter: any = null;
const smtpConfigured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

if (smtpConfigured) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } catch (error) {
    console.warn("[MAIL] Nodemailer indisponible :", error);
    transporter = null;
  }
} else {
  console.info("[MAIL] SMTP non configuré, bascule en mode console.");
}

async function deliverEmail(payload: MailPayload): Promise<void> {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: DEFAULT_FROM,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      return;
    } catch (error) {
      console.error("[MAIL] Erreur lors de l'envoi SMTP:", error);
    }
  }

  console.log("[MAIL:FALLBACK]", {
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
  role: Exclude<UserRole, "admin" | "parent" | "super_admin">;
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
  });
}
