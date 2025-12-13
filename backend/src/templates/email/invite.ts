import { renderEmailLayout } from "./layout"

type InviteTemplateParams = {
  userName?: string | null
  establishmentName?: string | null
  roleLabel: string
  loginEmail: string
  actionUrl: string
  expiresInDays: number
}

export function buildInviteEmail(params: InviteTemplateParams) {
  const establishment = params.establishmentName || "votre établissement scolaire"
  const title = `Invitation ${params.roleLabel}`
  const greeting = params.userName ? `Bonjour ${params.userName},` : "Bonjour,"
  const messageLines = [
    `Vous avez été invité(e) à rejoindre <strong>${establishment}</strong> sur la plateforme numérique en tant que <strong>${params.roleLabel}</strong>.`,
    `Identifiant de connexion : <strong>${params.loginEmail}</strong>`,
    `Ce lien restera actif pendant ${params.expiresInDays} jour${params.expiresInDays > 1 ? "s" : ""}.`,
  ]

  const html = renderEmailLayout({
    title,
    greeting,
    messageLines,
    actionLabel: "Activer mon compte",
    actionUrl: params.actionUrl,
    footerLines: [
      "Besoin d'aide ? Contactez le secrétariat de l'établissement.",
    ],
  })

  const text = `${greeting}

Vous avez été invité(e) à rejoindre ${establishment} en tant que ${params.roleLabel}.
Identifiant de connexion : ${params.loginEmail}
Lien d'activation (valable ${params.expiresInDays} jour${params.expiresInDays > 1 ? "s" : ""}) :
${params.actionUrl}

Besoin d'aide ? Contactez le secrétariat de l'établissement.`

  return {
    subject: `${establishment} – invitation ${params.roleLabel}`,
    html,
    text,
  }
}
