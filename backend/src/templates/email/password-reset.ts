import { renderEmailLayout } from "./layout"

type ResetTemplateParams = {
  userName?: string | null
  establishmentName?: string | null
  loginEmail: string
  actionUrl: string
}

export function buildResetEmail(params: ResetTemplateParams) {
  const establishment = params.establishmentName || "la plateforme"
  const title = "Réinitialisation de mot de passe"
  const greeting = params.userName ? `Bonjour ${params.userName},` : "Bonjour,"
  const messageLines = [
    `Une demande de réinitialisation de mot de passe a été effectuée pour le compte <strong>${params.loginEmail}</strong> sur ${establishment}.`,
    "Si vous êtes à l'origine de cette action, cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.",
  ]

  const html = renderEmailLayout({
    title,
    greeting,
    messageLines,
    actionLabel: "Définir mon nouveau mot de passe",
    actionUrl: params.actionUrl,
  })

  const text = `${greeting}

Une demande de réinitialisation de mot de passe a été effectuée pour le compte ${params.loginEmail} sur ${establishment}.
Si vous êtes à l'origine de cette action, utilisez le lien suivant :
${params.actionUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`

  return {
    subject: `${establishment} – réinitialisation de mot de passe`,
    html,
    text,
  }
}
