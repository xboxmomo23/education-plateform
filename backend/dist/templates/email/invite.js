"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInviteEmail = buildInviteEmail;
const layout_1 = require("./layout");
const inviteTexts = {
    fr: {
        establishmentFallback: "votre établissement scolaire",
        greeting: (name) => (name ? `Bonjour ${name},` : "Bonjour,"),
        title: (roleLabel) => `Invitation ${roleLabel}`,
        description: (establishment, roleLabel) => `Vous avez été invité(e) à rejoindre <strong>${establishment}</strong> sur la plateforme numérique en tant que <strong>${roleLabel}</strong>.`,
        descriptionText: (establishment, roleLabel) => `Vous avez été invité(e) à rejoindre ${establishment} en tant que ${roleLabel}.`,
        loginLine: (loginEmail) => `Identifiant de connexion : <strong>${loginEmail}</strong>`,
        loginLineText: (loginEmail) => `Identifiant de connexion : ${loginEmail}`,
        expirationLine: (days) => `Ce lien restera actif pendant ${days} jour${days > 1 ? "s" : ""}.`,
        expirationLineText: (days) => `Lien d'activation (valable ${days} jour${days > 1 ? "s" : ""}) :`,
        actionLabel: "Activer mon compte",
        footerLine: "Besoin d'aide ? Contactez le secrétariat de l'établissement.",
        subject: (establishment, roleLabel) => `${establishment} – invitation ${roleLabel}`,
    },
    en: {
        establishmentFallback: "your school",
        greeting: (name) => (name ? `Hello ${name},` : "Hello,"),
        title: (roleLabel) => `Invitation for ${roleLabel}`,
        description: (establishment, roleLabel) => `You have been invited to join <strong>${establishment}</strong> on the platform as a <strong>${roleLabel}</strong>.`,
        descriptionText: (establishment, roleLabel) => `You have been invited to join ${establishment} as a ${roleLabel}.`,
        loginLine: (loginEmail) => `Login email: <strong>${loginEmail}</strong>`,
        loginLineText: (loginEmail) => `Login email: ${loginEmail}`,
        expirationLine: (days) => `This link will remain active for ${days} day${days > 1 ? "s" : ""}.`,
        expirationLineText: (days) => `Activation link (valid for ${days} day${days > 1 ? "s" : ""}):`,
        actionLabel: "Activate my account",
        footerLine: "Need help? Contact your school office.",
        subject: (establishment, roleLabel) => `${establishment} – ${roleLabel} invitation`,
    },
};
function buildInviteEmail(params) {
    const locale = params.locale === "en" ? "en" : "fr";
    const texts = inviteTexts[locale];
    const establishment = params.establishmentName || texts.establishmentFallback;
    const greeting = texts.greeting(params.userName);
    const messageLines = [
        texts.description(establishment, params.roleLabel),
        texts.loginLine(params.loginEmail),
        texts.expirationLine(params.expiresInDays),
    ];
    const html = (0, layout_1.renderEmailLayout)({
        title: texts.title(params.roleLabel),
        greeting,
        messageLines,
        actionLabel: texts.actionLabel,
        actionUrl: params.actionUrl,
        footerLines: [texts.footerLine],
    });
    const text = `${greeting}

${texts.descriptionText(establishment, params.roleLabel)}
${texts.loginLineText(params.loginEmail)}
${texts.expirationLineText(params.expiresInDays)}
${params.actionUrl}

${texts.footerLine}`;
    return {
        subject: texts.subject(establishment, params.roleLabel),
        html,
        text,
    };
}
//# sourceMappingURL=invite.js.map