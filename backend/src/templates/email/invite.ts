import { renderEmailLayout } from "./layout"

type SupportedLocale = "fr" | "en"

type InviteTemplateParams = {
  userName?: string | null
  establishmentName?: string | null
  roleLabel: string
  loginEmail: string
  actionUrl: string
  expiresInDays: number
  locale?: SupportedLocale
}

const inviteTexts = {
  fr: {
    establishmentFallback: "votre établissement scolaire",
    greeting: (name?: string | null) => (name ? `Bonjour ${name},` : "Bonjour,"),
    title: (roleLabel: string) => `Invitation ${roleLabel}`,
    description: (establishment: string, roleLabel: string) =>
      `Vous avez été invité(e) à rejoindre <strong>${establishment}</strong> sur la plateforme numérique en tant que <strong>${roleLabel}</strong>.`,
    descriptionText: (establishment: string, roleLabel: string) =>
      `Vous avez été invité(e) à rejoindre ${establishment} en tant que ${roleLabel}.`,
    loginLine: (loginEmail: string) => `Identifiant de connexion : <strong>${loginEmail}</strong>`,
    loginLineText: (loginEmail: string) => `Identifiant de connexion : ${loginEmail}`,
    expirationLine: (days: number) => `Ce lien restera actif pendant ${days} jour${days > 1 ? "s" : ""}.`,
    expirationLineText: (days: number) =>
      `Lien d'activation (valable ${days} jour${days > 1 ? "s" : ""}) :`,
    actionLabel: "Activer mon compte",
    footerLine: "Besoin d'aide ? Contactez le secrétariat de l'établissement.",
    subject: (establishment: string, roleLabel: string) => `${establishment} – invitation ${roleLabel}`,
  },
  en: {
    establishmentFallback: "your school",
    greeting: (name?: string | null) => (name ? `Hello ${name},` : "Hello,"),
    title: (roleLabel: string) => `Invitation for ${roleLabel}`,
    description: (establishment: string, roleLabel: string) =>
      `You have been invited to join <strong>${establishment}</strong> on the platform as a <strong>${roleLabel}</strong>.`,
    descriptionText: (establishment: string, roleLabel: string) =>
      `You have been invited to join ${establishment} as a ${roleLabel}.`,
    loginLine: (loginEmail: string) => `Login email: <strong>${loginEmail}</strong>`,
    loginLineText: (loginEmail: string) => `Login email: ${loginEmail}`,
    expirationLine: (days: number) => `This link will remain active for ${days} day${days > 1 ? "s" : ""}.`,
    expirationLineText: (days: number) =>
      `Activation link (valid for ${days} day${days > 1 ? "s" : ""}):`,
    actionLabel: "Activate my account",
    footerLine: "Need help? Contact your school office.",
    subject: (establishment: string, roleLabel: string) => `${establishment} – ${roleLabel} invitation`,
  },
} satisfies Record<SupportedLocale, any>

export function buildInviteEmail(params: InviteTemplateParams) {
  const locale: SupportedLocale = params.locale === "en" ? "en" : "fr"
  const texts = inviteTexts[locale]
  const establishment = params.establishmentName || texts.establishmentFallback
  const greeting = texts.greeting(params.userName)
  const messageLines = [
    texts.description(establishment, params.roleLabel),
    texts.loginLine(params.loginEmail),
    texts.expirationLine(params.expiresInDays),
  ]

  const html = renderEmailLayout({
    title: texts.title(params.roleLabel),
    greeting,
    messageLines,
    actionLabel: texts.actionLabel,
    actionUrl: params.actionUrl,
    footerLines: [texts.footerLine],
  })

  const text = `${greeting}

${texts.descriptionText(establishment, params.roleLabel)}
${texts.loginLineText(params.loginEmail)}
${texts.expirationLineText(params.expiresInDays)}
${params.actionUrl}

${texts.footerLine}`

  return {
    subject: texts.subject(establishment, params.roleLabel),
    html,
    text,
  }
}
