import { SyncParentsResult } from "../models/parent.model";
import { createInviteTokenForUser } from "../controllers/auth.controller";
import { sendInviteEmail } from "./email.service";

export interface ParentInviteInfo {
  parentUserId: string;
  inviteUrl: string;
  loginEmail: string;
  targetEmail: string;
}

export async function sendParentInvitesForNewAccounts(
  parents: SyncParentsResult[],
  establishmentName: string | null,
  locale: "fr" | "en",
  toEmailOverride?: string | null
): Promise<ParentInviteInfo[]> {
  const invites: ParentInviteInfo[] = [];

  for (const parent of parents) {
    if (!parent.isNewUser || !parent.email) {
      continue;
    }

    try {
      const invite = await createInviteTokenForUser({
        id: parent.parentUserId,
        email: parent.email,
        full_name: parent.full_name,
      });

      const targetEmail = toEmailOverride || parent.contactEmailOverride || parent.email;
      if (!targetEmail) {
        continue;
      }

      await sendInviteEmail({
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
    } catch (error) {
      console.error("[MAIL] Erreur envoi invitation parent:", error);
    }
  }

  return invites;
}
