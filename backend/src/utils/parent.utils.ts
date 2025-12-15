import { ParentForStudentInput } from "../types";

export function normalizeParentsPayload(rawParents: any): ParentForStudentInput[] {
  if (!Array.isArray(rawParents)) {
    return [];
  }

  const normalized: ParentForStudentInput[] = [];

  rawParents.forEach((parent) => {
    if (!parent || typeof parent !== "object") {
      return;
    }

    const firstName =
      typeof parent.firstName === "string" ? parent.firstName.trim() : "";
    const lastName =
      typeof parent.lastName === "string" ? parent.lastName.trim() : "";

    if (!firstName && !lastName) {
      return;
    }

    const rawContactEmail =
      typeof parent.contact_email === "string"
        ? parent.contact_email
        : typeof parent.contactEmail === "string"
          ? parent.contactEmail
          : "";
    const contactEmail =
      rawContactEmail && rawContactEmail.trim().length > 0
        ? rawContactEmail.trim().toLowerCase()
        : undefined;

    normalized.push({
      firstName,
      lastName,
      email:
        typeof parent.email === "string" && parent.email.trim().length > 0
          ? parent.email.trim().toLowerCase()
          : undefined,
      phone:
        typeof parent.phone === "string" && parent.phone.trim().length > 0
          ? parent.phone.trim()
          : undefined,
      address:
        typeof parent.address === "string" && parent.address.trim().length > 0
          ? parent.address.trim()
          : undefined,
      relation_type:
        typeof parent.relation_type === "string" &&
        parent.relation_type.trim().length > 0
          ? parent.relation_type.trim()
          : undefined,
      is_primary:
        typeof parent.is_primary === "boolean" ? parent.is_primary : undefined,
      can_view_grades:
        typeof parent.can_view_grades === "boolean"
          ? parent.can_view_grades
          : undefined,
      can_view_attendance:
        typeof parent.can_view_attendance === "boolean"
          ? parent.can_view_attendance
          : undefined,
      receive_notifications:
        typeof parent.receive_notifications === "boolean"
          ? parent.receive_notifications
          : undefined,
      contact_email: contactEmail,
    });
  });

  return normalized;
}
