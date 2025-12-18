"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudentAccount = createStudentAccount;
const database_1 = __importDefault(require("../config/database"));
const auth_utils_1 = require("../utils/auth.utils");
const identifier_utils_1 = require("../utils/identifier.utils");
const auth_controller_1 = require("../controllers/auth.controller");
const email_service_1 = require("../services/email.service");
const audit_service_1 = require("./audit.service");
const parent_model_1 = require("../models/parent.model");
const parentInvite_service_1 = require("./parentInvite.service");
const establishmentSettings_model_1 = require("../models/establishmentSettings.model");
const email_utils_1 = require("../utils/email.utils");
function buildSavepointName(scope) {
    return `sc_${scope}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}
function mapParentSyncErrorToWarning(error) {
    if (!(error instanceof Error)) {
        return null;
    }
    const err = error;
    const email = typeof err.email === "string" ? err.email : undefined;
    switch (error.message) {
        case "EMAIL_ALREADY_IN_USE":
            return email
                ? `Impossible d'ajouter le parent ${email}: email déjà utilisé par un compte non parent`
                : "Impossible d'ajouter un parent: email déjà utilisé par un compte non parent";
        case "PARENT_BELONGS_TO_ANOTHER_ESTABLISHMENT":
            return email
                ? `Impossible d'ajouter le parent ${email}: appartient à un autre établissement`
                : "Impossible d'ajouter ce parent: appartient à un autre établissement";
        default:
            return null;
    }
}
async function commitTransaction(client, managesTransaction, savepointName) {
    if (managesTransaction) {
        await client.query("COMMIT");
    }
    else if (savepointName) {
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
    }
}
async function rollbackTransaction(client, managesTransaction, savepointName) {
    if (managesTransaction) {
        await client.query("ROLLBACK");
    }
    else if (savepointName) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        await client.query(`RELEASE SAVEPOINT ${savepointName}`).catch(() => { });
    }
}
async function createStudentAccount(input) {
    const { establishmentId, establishmentName, fullName, classId = null, dateOfBirth = null, studentNumber, contactEmail, loginEmail, parents = [], existingParentId, allowAutoParentFromContact = true, sendInvites = true, dryRun = false, strict = true, client, allowExternalClient = false, createdByUserId, req, actorRole, actorName, } = input;
    const establishmentSettings = await (0, establishmentSettings_model_1.getEstablishmentSettings)(establishmentId);
    const resolvedEstablishmentName = establishmentName ?? establishmentSettings.displayName ?? null;
    const establishmentLocale = establishmentSettings.defaultLocale;
    if (client && !allowExternalClient) {
        throw new Error("External client usage requires allowExternalClient=true");
    }
    const managedClient = client ?? (await database_1.default.connect());
    const managesTransaction = !client;
    const transactionSavepoint = client ? buildSavepointName("student_tx") : null;
    const auditEventsToLog = [];
    const inviteDispatchers = [];
    const warnings = [];
    let parentInvites = [];
    let inviteUrl;
    let student;
    let user;
    let linkedExistingParent = null;
    let parentsForResponse = [];
    let studentLoginEmail = typeof loginEmail === "string" && loginEmail.trim().length > 0
        ? loginEmail.trim().toLowerCase()
        : "";
    let transactionSettled = false;
    try {
        if (managesTransaction) {
            await managedClient.query("BEGIN");
        }
        else if (transactionSavepoint) {
            await managedClient.query(`SAVEPOINT ${transactionSavepoint}`);
        }
        if (!studentLoginEmail) {
            studentLoginEmail = await (0, identifier_utils_1.generateLoginEmailFromName)({
                fullName,
                establishmentId,
            });
        }
        else {
            const duplicateCheck = await managedClient.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [studentLoginEmail]);
            if (duplicateCheck.rowCount && duplicateCheck.rowCount > 0) {
                const error = new Error("EMAIL_ALREADY_EXISTS");
                error.email = studentLoginEmail;
                throw error;
            }
        }
        let finalStudentNumber = studentNumber?.trim() || null;
        if (!finalStudentNumber) {
            finalStudentNumber = await (0, identifier_utils_1.generateHumanCode)({
                establishmentId,
                role: "student",
            });
        }
        const temporaryPassword = (0, auth_utils_1.generateTemporaryPassword)();
        const passwordHash = await (0, auth_utils_1.hashPassword)(temporaryPassword);
        const userInsert = await managedClient.query(`
        INSERT INTO users (
          email,
          password_hash,
          role,
          full_name,
          email_verified,
          must_change_password,
          establishment_id
        ) VALUES ($1, $2, 'student', $3, false, true, $4)
        RETURNING id, email, full_name, active
      `, [studentLoginEmail, passwordHash, fullName, establishmentId]);
        user = userInsert.rows[0];
        await managedClient.query(`
        INSERT INTO student_profiles (
          user_id, student_no, contact_email
        ) VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          contact_email = EXCLUDED.contact_email,
          student_no = COALESCE(EXCLUDED.student_no, student_profiles.student_no)
      `, [user.id, finalStudentNumber, contactEmail || null]);
        const studentInsert = await managedClient.query(`
        INSERT INTO students (
          user_id,
          class_id,
          student_number,
          date_of_birth
        ) VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, class_id, student_number, date_of_birth, created_at
      `, [user.id, classId, finalStudentNumber, dateOfBirth]);
        student = studentInsert.rows[0];
        let parentsPayload = Array.isArray(parents) ? [...parents] : [];
        if (existingParentId) {
            const parentResult = await managedClient.query(`
          SELECT id, full_name, email, establishment_id
          FROM users
          WHERE id = $1
            AND role = 'parent'
          LIMIT 1
        `, [existingParentId]);
            if (parentResult.rowCount === 0) {
                throw new Error("PARENT_NOT_FOUND");
            }
            const parentRow = parentResult.rows[0];
            if (parentRow.establishment_id !== establishmentId) {
                const error = new Error("PARENT_OTHER_ESTABLISHMENT");
                error.email = parentRow.email;
                throw error;
            }
            linkedExistingParent = {
                id: parentRow.id,
                full_name: parentRow.full_name,
                email: parentRow.email,
            };
        }
        if (!linkedExistingParent &&
            parentsPayload.length === 0 &&
            contactEmail &&
            allowAutoParentFromContact) {
            parentsPayload = [
                {
                    firstName: "Parent",
                    lastName: `de ${fullName}`,
                    relation_type: "guardian",
                    is_primary: true,
                    can_view_grades: true,
                    can_view_attendance: true,
                    receive_notifications: true,
                    contact_email: contactEmail,
                },
            ];
        }
        let parentResults = [];
        if (parentsPayload.length > 0) {
            const parentSavepoint = buildSavepointName("parent_sync");
            await managedClient.query(`SAVEPOINT ${parentSavepoint}`);
            let savepointReleased = false;
            try {
                parentResults = await (0, parent_model_1.syncParentsForStudent)({
                    studentId: user.id,
                    establishmentId,
                    parents: parentsPayload,
                    client: managedClient,
                });
                for (const parent of parentResults) {
                    if (parent.isNewUser) {
                        auditEventsToLog.push({
                            req,
                            establishmentId,
                            actorUserId: createdByUserId,
                            actorRole,
                            actorName,
                            action: "PARENT_CREATED",
                            entityType: "user",
                            entityId: parent.parentUserId,
                            metadata: { studentId: user.id },
                        });
                    }
                }
                await managedClient.query(`RELEASE SAVEPOINT ${parentSavepoint}`);
                savepointReleased = true;
            }
            catch (error) {
                const warning = mapParentSyncErrorToWarning(error);
                if (!strict && warning) {
                    warnings.push(warning);
                    parentResults = [];
                    await managedClient.query(`ROLLBACK TO SAVEPOINT ${parentSavepoint}`);
                    await managedClient.query(`RELEASE SAVEPOINT ${parentSavepoint}`);
                    savepointReleased = true;
                }
                else {
                    await managedClient.query(`ROLLBACK TO SAVEPOINT ${parentSavepoint}`);
                    await managedClient.query(`RELEASE SAVEPOINT ${parentSavepoint}`);
                    savepointReleased = true;
                    throw error;
                }
            }
            finally {
                if (!savepointReleased) {
                    await managedClient.query(`RELEASE SAVEPOINT ${parentSavepoint}`).catch(() => { });
                }
            }
        }
        if (linkedExistingParent) {
            await (0, parent_model_1.linkExistingParentToStudent)({
                studentId: user.id,
                parentId: linkedExistingParent.id,
                relationType: "guardian",
                isPrimary: true,
                receiveNotifications: true,
                canViewGrades: true,
                canViewAttendance: true,
                client: managedClient,
            });
            auditEventsToLog.push({
                req,
                establishmentId,
                actorUserId: createdByUserId,
                actorRole,
                actorName,
                action: "PARENT_LINKED_TO_STUDENT",
                entityType: "user",
                entityId: linkedExistingParent.id,
                metadata: { studentId: user.id },
            });
        }
        parentsForResponse = [...parentResults];
        if (linkedExistingParent) {
            parentsForResponse.push({
                parentUserId: linkedExistingParent.id,
                full_name: linkedExistingParent.full_name,
                email: linkedExistingParent.email,
                isNewUser: false,
            });
        }
        auditEventsToLog.push({
            req,
            establishmentId,
            actorUserId: createdByUserId,
            actorRole,
            actorName,
            action: "STUDENT_CREATED",
            entityType: "user",
            entityId: user.id,
            metadata: { classId, studentNumber: student.student_number || finalStudentNumber },
        });
        if (sendInvites && !dryRun) {
            inviteDispatchers.push(async () => {
                const invite = await (0, auth_controller_1.createInviteTokenForUser)({
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                });
                inviteUrl = invite.inviteUrl;
                const targetEmail = contactEmail || user.email;
                if (targetEmail) {
                    await (0, email_service_1.sendInviteEmail)({
                        to: targetEmail,
                        loginEmail: user.email,
                        role: "student",
                        establishmentName: resolvedEstablishmentName || undefined,
                        inviteUrl,
                        locale: establishmentLocale,
                    }).catch((err) => {
                        console.error("[MAIL] Erreur envoi email d'invitation élève:", err);
                    });
                    auditEventsToLog.push({
                        req,
                        establishmentId,
                        actorUserId: createdByUserId,
                        actorRole,
                        actorName,
                        action: "AUTH_INVITE_SENT",
                        entityType: "user",
                        entityId: user.id,
                        metadata: { roleTarget: "student", loginEmail: user.email, toEmail: targetEmail },
                    });
                }
            });
        }
        if (sendInvites && !dryRun) {
            const parentsNeedingInvite = parentResults.filter((parent) => parent.isNewUser);
            if (parentsNeedingInvite.length > 0) {
                inviteDispatchers.push(async () => {
                    for (const parentResult of parentsNeedingInvite) {
                        const invites = await (0, parentInvite_service_1.sendParentInvitesForNewAccounts)([parentResult], resolvedEstablishmentName || null, establishmentLocale, parentResult.contactEmailOverride || undefined);
                        if (invites.length > 0) {
                            parentInvites = parentInvites.concat(invites);
                            for (const inviteInfo of invites) {
                                auditEventsToLog.push({
                                    req,
                                    establishmentId,
                                    actorUserId: createdByUserId,
                                    actorRole,
                                    actorName,
                                    action: "AUTH_INVITE_SENT",
                                    entityType: "user",
                                    entityId: inviteInfo.parentUserId,
                                    metadata: {
                                        roleTarget: "parent",
                                        loginEmail: inviteInfo.loginEmail,
                                        toEmail: inviteInfo.targetEmail,
                                    },
                                });
                            }
                        }
                    }
                });
            }
        }
        if (dryRun) {
            await rollbackTransaction(managedClient, managesTransaction, transactionSavepoint);
        }
        else {
            await commitTransaction(managedClient, managesTransaction, transactionSavepoint);
        }
        transactionSettled = true;
    }
    catch (error) {
        if (!transactionSettled) {
            await rollbackTransaction(managedClient, managesTransaction, transactionSavepoint);
        }
        throw error;
    }
    finally {
        if (!client) {
            managedClient.release();
        }
    }
    const created = !dryRun;
    if (created) {
        if (sendInvites) {
            for (const dispatcher of inviteDispatchers) {
                await dispatcher();
            }
        }
        for (const auditEvent of auditEventsToLog) {
            await (0, audit_service_1.logAuditEvent)(auditEvent);
        }
    }
    const parentInviteUrls = parentInvites.map((invite) => invite.inviteUrl);
    const parentLoginEmails = parentInvites.map((invite) => invite.loginEmail);
    const smtpConfigured = (0, email_utils_1.isSmtpConfigured)();
    return {
        created,
        warnings,
        student,
        user,
        contact_email: contactEmail || null,
        inviteUrl,
        parentInviteUrls,
        parentLoginEmails,
        parents: parentsForResponse,
        linkedExistingParent,
        parentInvites,
        smtpConfigured,
    };
}
//# sourceMappingURL=studentCreation.service.js.map