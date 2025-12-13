type EmailLayoutParams = {
  title: string
  greeting: string
  messageLines: string[]
  actionLabel: string
  actionUrl: string
  footerLines?: string[]
}

export function renderEmailLayout({
  title,
  greeting,
  messageLines,
  actionLabel,
  actionUrl,
  footerLines = [],
}: EmailLayoutParams): string {
  const bodyLines = messageLines.map((line) => `<p style="${paragraphStyle}">${line}</p>`).join("")
  const footer = footerLines
    .map((line) => `<p style="${footerStyle}">${line}</p>`)
    .join("")

  return `<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f6fa;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f6fa;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 28px rgba(15,23,42,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#2b62ff,#6c47ff);padding:24px 32px;color:#fff;">
                  <h1 style="margin:0;font-size:20px;font-weight:600;">${escapeHtml(title)}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="${paragraphStyle}margin-top:0;">${escapeHtml(greeting)}</p>
                  ${bodyLines}
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0;">
                    <tr>
                      <td>
                        <a href="${actionUrl}" target="_blank" rel="noopener" style="${buttonStyle}">
                          ${escapeHtml(actionLabel)}
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="${mutedStyle}">Si le bouton ne fonctionne pas, copiez le lien suivant dans votre navigateur :</p>
                  <p style="${linkStyle}">${escapeHtml(actionUrl)}</p>
                </td>
              </tr>
              ${
                footer
                  ? `<tr>
                <td style="padding:20px 32px;border-top:1px solid #eef0f4;background-color:#fafbff;">
                  ${footer}
                </td>
              </tr>`
                  : ""
              }
            </table>
            <p style="${footerStyle}margin-top:16px;">Cet email est généré automatiquement – merci de ne pas y répondre.</p>
          </td>
        </tr>
      </table>
    </body>
  </html>`
}

const paragraphStyle =
  "font-size:15px;line-height:24px;color:#1f2937;margin:8px 0;"
const mutedStyle = "font-size:13px;line-height:20px;color:#6b7280;margin:8px 0;"
const footerStyle = "font-size:12px;line-height:18px;color:#94a3b8;margin:0;"
const linkStyle =
  "display:block;padding:12px;background-color:#f8fafc;border-radius:6px;font-size:12px;color:#334155;word-break:break-all;text-decoration:none;margin:8px 0;"
const buttonStyle =
  "display:inline-block;padding:14px 32px;background:#2b62ff;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px;"

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
