"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendParentInvitesForNewAccounts = sendParentInvitesForNewAccounts;
const auth_controller_1 = require("../controllers/auth.controller");
const email_service_1 = require("./email.service");
async function sendParentInvitesForNewAccounts(parents, establishmentName, locale, toEmailOverride) {
    const invites = [];
    for (const parent of parents) {
        if (!parent.isNewUser || !parent.email) {
            continue;
        }
        try {
            const invite = await (0, auth_controller_1.createInviteTokenForUser)({
                id: parent.parentUserId,
                email: parent.email,
                full_name: parent.full_name,
            });
            const targetEmail = toEmailOverride || parent.contactEmailOverride || parent.email;
            if (!targetEmail) {
                continue;
            }
            await (0, email_service_1.sendInviteEmail)({
                to: targetEmail,
                loginEmail: parent.email,
                role: "parent",
                establishmentName: establishmentName || undefined,
                inviteUrl: invite.inviteUrl,
                locale,
            });
            invites.push({
                parentUserId: parent.parentUserId,
                inviteUrl: invite.inviteUrl,
                loginEmail: parent.email,
                targetEmail,
            });
        }
        catch (error) {
            console.error("[MAIL] Erreur envoi invitation parent:", error);
        }
    }
    return invites;
}
//# sourceMappingURL=parentInvite.service.js.map