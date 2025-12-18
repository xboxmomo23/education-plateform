"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResetEmail = buildResetEmail;
const layout_1 = require("./layout");
const resetTexts = {
    fr: {
        establishmentFallback: "la plateforme",
        greeting: (name) => (name ? `Bonjour ${name},` : "Bonjour,"),
        title: "Réinitialisation de mot de passe",
        description: (loginEmail, establishment) => `Une demande de réinitialisation de mot de passe a été effectuée pour le compte <strong>${loginEmail}</strong> sur ${establishment}.`,
        descriptionText: (loginEmail, establishment) => `Une demande de réinitialisation de mot de passe a été effectuée pour le compte ${loginEmail} sur ${establishment}.`,
        instruction: "Si vous êtes à l'origine de cette action, cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.",
        instructionText: "Si vous êtes à l'origine de cette action, utilisez le lien suivant :",
        ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.",
        actionLabel: "Définir mon nouveau mot de passe",
        subject: (establishment) => `${establishment} – réinitialisation de mot de passe`,
    },
    en: {
        establishmentFallback: "the platform",
        greeting: (name) => (name ? `Hello ${name},` : "Hello,"),
        title: "Password reset",
        description: (loginEmail, establishment) => `A password reset request was made for <strong>${loginEmail}</strong> on ${establishment}.`,
        descriptionText: (loginEmail, establishment) => `A password reset request was made for ${loginEmail} on ${establishment}.`,
        instruction: "If you initiated this action, click the button below to set a new password.",
        instructionText: "If you initiated this action, use the link below:",
        ignore: "If you did not make this request, simply ignore this email.",
        actionLabel: "Set my new password",
        subject: (establishment) => `${establishment} – password reset`,
    },
};
function buildResetEmail(params) {
    const locale = params.locale === "en" ? "en" : "fr";
    const texts = resetTexts[locale];
    const establishment = params.establishmentName || texts.establishmentFallback;
    const greeting = texts.greeting(params.userName);
    const messageLines = [
        texts.description(params.loginEmail, establishment),
        texts.instruction,
        texts.ignore,
    ];
    const html = (0, layout_1.renderEmailLayout)({
        title: texts.title,
        greeting,
        messageLines,
        actionLabel: texts.actionLabel,
        actionUrl: params.actionUrl,
    });
    const text = `${greeting}

${texts.descriptionText(params.loginEmail, establishment)}
${texts.instructionText}
${params.actionUrl}

${texts.ignore}`;
    return {
        subject: texts.subject(establishment),
        html,
        text,
    };
}
//# sourceMappingURL=password-reset.js.map