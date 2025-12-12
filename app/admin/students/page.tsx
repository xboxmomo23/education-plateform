"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { apiFetch } from "@/lib/api/api-client";
import type { StudentClassChange } from "@/lib/api/students";
import {
  applyStudentClassChangesApi,
  deleteStudentClassChangeApi,
  getStudentClassChangesApi,
  resendStudentInviteApi,
  resendParentInviteApi,
  scheduleStudentClassChangeApi,
  updateStudentClassApi,
  updateStudentStatusApi,
} from "@/lib/api/students";

interface ClassOption {
  id: string;
  code: string;
  label: string;
  academic_year: number;
  level?: string | null;
}

interface StudentItem {
  student_id: string;
  user_id: string;
  full_name: string;
  email: string;
  active: boolean;
  must_change_password?: boolean;
  last_login?: string | null;
  student_number: string | null;
  date_of_birth: string | null;
  class_id: string | null;
  class_label?: string | null;
  class_code?: string | null;
  level?: string | null;
  academic_year?: number | null;
  parent_pending_activation?: boolean | null;
}

interface StudentsResponse {
  success: boolean;
  data: StudentItem[];
}

interface ClassesResponse {
  success: boolean;
  data: ClassOption[];
}

interface TermItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYear: number;
}

interface TermsResponse {
  success: boolean;
  data: TermItem[];
}

interface CreateStudentResponse {
  success: boolean;
  message: string;
  data: {
    student: {
      id: string;
      user_id: string;
      class_id: string;
      student_number: string | null;
      date_of_birth: string | null;
      created_at: string;
    };
    user: {
      id: string;
      email: string;
      full_name: string;
      active: boolean;
    };
    contact_email?: string | null;
    inviteUrl: string;
    parents?: any;
    parentInviteUrls?: string[];
    parentLoginEmails?: string[];
    smtpConfigured?: boolean;
  };
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [classChanges, setClassChanges] = useState<StudentClassChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classChangesError, setClassChangesError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [parentInviteUrls, setParentInviteUrls] = useState<string[]>([]);
  const [parentLoginEmails, setParentLoginEmails] = useState<string[]>([]);
  const [parentCopyFeedback, setParentCopyFeedback] = useState<string | null>(null);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(true);

  const [form, setForm] = useState<{
    full_name: string;
    login_email: string;
    contact_email: string;
    class_id: string;
    date_of_birth: string;
    parent_first_name: string;
    parent_last_name: string;
    parent_phone: string;
    parent_address: string;
  }>({
    full_name: "",
    login_email: "",
    contact_email: "",
    class_id: "",
    date_of_birth: "",
    parent_first_name: "",
    parent_last_name: "",
    parent_phone: "",
    parent_address: "",
  });
  const [showOnlyNoClass, setShowOnlyNoClass] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [editClassId, setEditClassId] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendInviteUrl, setResendInviteUrl] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCopyFeedback, setResendCopyFeedback] = useState<string | null>(null);
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null);
  const [parentResendSuccess, setParentResendSuccess] = useState<string | null>(null);
  const [parentResendInviteUrl, setParentResendInviteUrl] = useState<string | null>(null);
  const [parentResendError, setParentResendError] = useState<string | null>(null);
  const [parentResendCopyFeedback, setParentResendCopyFeedback] = useState<string | null>(null);
  const [parentResendLoadingId, setParentResendLoadingId] = useState<string | null>(null);
  const [parentResendSmtpConfigured, setParentResendSmtpConfigured] = useState<boolean>(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<StudentItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    new_class_id: "",
    term_id: "",
    reason: "",
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [applyTermId, setApplyTermId] = useState<string>("");
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const isProduction = process.env.NODE_ENV === "production";
  const shouldShowParentInviteLinks =
    (!isProduction || !smtpConfigured) && parentInviteUrls.length > 0;
  const shouldShowParentResendLink =
    (!isProduction || !parentResendSmtpConfigured) && Boolean(parentResendInviteUrl);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);

  const displayedStudents = showOnlyNoClass
    ? students.filter((st) => !st.class_id)
    : students;

  const pendingClassChanges = classChanges.filter((change) => !change.applied_at);
  const appliedClassChanges = classChanges.filter((change) => change.applied_at);
  const pendingTermOptions = Array.from(
    new Map(
      pendingClassChanges.map((change) => [change.term.id, change.term])
    ).values()
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (pendingTermOptions.length === 0) {
      if (applyTermId) {
        setApplyTermId("");
      }
      return;
    }
    if (!applyTermId || !pendingTermOptions.some((term) => term.id === applyTermId)) {
      setApplyTermId(pendingTermOptions[0].id);
    }
  }, [pendingTermOptions, applyTermId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
       setClassChangesError(null);

      const [studentsRes, classesRes, termsRes] = await Promise.all([
        apiFetch<StudentsResponse>("/admin/students"),
        apiFetch<ClassesResponse>("/admin/classes"),
        apiFetch<TermsResponse>("/terms"),
      ]);

      if (studentsRes.success) {
        setStudents(studentsRes.data);
      } else {
        setError("Impossible de charger les élèves");
      }

      if (classesRes.success) {
        setClasses(classesRes.data);
      }

      if (termsRes.success) {
        setTerms(
          termsRes.data.map((term) => ({
            ...term,
            startDate: term.startDate,
            endDate: term.endDate,
          }))
        );
      }

      try {
        const classChangesRes = await getStudentClassChangesApi();
        if (classChangesRes.success) {
          setClassChanges(classChangesRes.data);
        } else {
          setClassChanges([]);
          setClassChangesError("Impossible de charger les changements programmés");
        }
      } catch (changeError: any) {
        console.error(changeError);
        setClassChanges([]);
        setClassChangesError(changeError.message || "Erreur chargement changements");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des élèves");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setSubmitError(null);
    setSubmitSuccess(null);
    setInviteUrl(null);
    setCopyFeedback(null);
    setParentInviteUrls([]);
    setParentLoginEmails([]);
    setParentCopyFeedback(null);
    setSmtpConfigured(true);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setInviteUrl(null);
    setCopyFeedback(null);

    if (!form.full_name.trim()) {
      setSubmitError("Merci de renseigner le nom complet.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
      };
      if (form.class_id) {
        payload.class_id = form.class_id;
      }
      if (form.login_email.trim()) {
        payload.login_email = form.login_email.trim();
      }
      if (form.contact_email.trim()) {
        payload.contact_email = form.contact_email.trim();
      }
      if (form.date_of_birth) {
        payload.date_of_birth = form.date_of_birth;
      }
      const parentFirstName = form.parent_first_name.trim();
      const parentLastName = form.parent_last_name.trim();
      if (parentFirstName && parentLastName) {
        const parentPayload: Record<string, unknown> = {
          firstName: parentFirstName,
          lastName: parentLastName,
          relation_type: "guardian",
          is_primary: true,
          receive_notifications: true,
        };
        if (form.contact_email.trim()) {
          parentPayload.contact_email = form.contact_email.trim();
        }
        if (form.parent_phone.trim()) {
          parentPayload.phone = form.parent_phone.trim();
        } else {
          parentPayload.phone = "+0000000000";
        }
        if (form.parent_address.trim()) {
          parentPayload.address = form.parent_address.trim();
        }
        payload.parents = [parentPayload];
      }

      const res = await apiFetch<CreateStudentResponse>("/admin/students", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        setSubmitError(res.message || "Erreur lors de la création");
        return;
      }

      const created = res.data;
      const cls = created.student.class_id
        ? classes.find((c) => c.id === created.student.class_id)
        : null;

      const newItem: StudentItem = {
        student_id: created.student.id,
        user_id: created.user.id,
        full_name: created.user.full_name,
        email: created.user.email,
        active: created.user.active,
        must_change_password: true,
        last_login: null,
        student_number: created.student.student_number,
        date_of_birth: created.student.date_of_birth,
        class_id: created.student.class_id || null,
        class_label: cls?.label || null,
        class_code: cls?.code || null,
        level: cls?.level || null,
        academic_year: cls?.academic_year ?? null,
        parent_pending_activation: Array.isArray(created.parents)
          ? created.parents.some((parent: any) => parent?.isNewUser)
          : false,
      };

      setStudents((prev) => [newItem, ...prev]);

      setSubmitSuccess("Élève créé avec succès. Copiez le lien ci-dessous et envoyez-le à l'élève.");
      setInviteUrl(created.inviteUrl);
      setParentInviteUrls(created.parentInviteUrls || []);
      setParentLoginEmails(created.parentLoginEmails || []);
      setSmtpConfigured(created.smtpConfigured ?? true);
      setParentCopyFeedback(null);

      setForm({
        full_name: "",
        login_email: "",
        contact_email: "",
        class_id: "",
        date_of_birth: "",
        parent_first_name: "",
        parent_last_name: "",
        parent_phone: "",
        parent_address: "",
      });
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStudentStatus(student: StudentItem) {
    try {
      const newActive = !student.active;
      await updateStudentStatusApi(student.user_id, newActive);
      setStudents((prev) =>
        prev.map((s) =>
          s.student_id === student.student_id ? { ...s, active: newActive } : s
        )
      );
    } catch (err) {
      console.error(err);
      alert("Erreur lors du changement de statut de l'élève");
    }
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setEditLoading(true);
      setEditError(null);
      const classIdPayload = editClassId ? editClassId : null;
      const res = await updateStudentClassApi(editingStudent.user_id, classIdPayload);
      if (res && (res as any).success === false) {
        setEditError((res as any).error || "Erreur lors de la mise à jour de la classe.");
        return;
      }
      const cls = classIdPayload
        ? classes.find((c) => c.id === classIdPayload)
        : null;
      setStudents((prev) =>
        prev.map((s) =>
          s.user_id === editingStudent.user_id
            ? {
                ...s,
                class_id: classIdPayload,
                class_label: cls?.label || null,
                class_code: cls?.code || null,
                level: cls?.level || null,
                academic_year: cls?.academic_year ?? null,
              }
            : s
        )
      );
      setEditingStudent(null);
      setEditClassId("");
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Erreur lors de la mise à jour de la classe.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleResendStudentInvite(student: StudentItem) {
    try {
      setResendError(null);
      setResendSuccess(null);
      setResendInviteUrl(null);
      setResendCopyFeedback(null);
      setResendLoadingId(student.user_id);
      const res = await resendStudentInviteApi(student.user_id);
      if (!res.success) {
        setResendError(res.error || "Impossible de renvoyer l'invitation.");
        return;
      }
      setResendSuccess(`Invitation élève renvoyée à ${student.full_name}.`);
      if (res.inviteUrl) {
        setResendInviteUrl(res.inviteUrl);
      }
    } catch (err: any) {
      console.error(err);
      setResendError(err.message || "Erreur lors de l'envoi de l'invitation.");
    } finally {
      setResendLoadingId(null);
    }
  }

  async function handleResendParentInvite(student: StudentItem) {
    try {
      setParentResendError(null);
      setParentResendSuccess(null);
      setParentResendInviteUrl(null);
      setParentResendCopyFeedback(null);
      setParentResendSmtpConfigured(true);
      setParentResendLoadingId(student.user_id);
      const res = await resendParentInviteApi(student.user_id);
      if (!res.success) {
        setParentResendError(res.error || "Impossible de renvoyer l'invitation parent.");
        return;
      }
      const targetEmail = res.targetEmail || res.loginEmail || student.full_name;
      setParentResendSuccess(
        res.message || `Invitation parent renvoyée (destinataire : ${targetEmail}).`
      );
      if (res.inviteUrl) {
        setParentResendInviteUrl(res.inviteUrl);
      }
      setParentResendSmtpConfigured(res.smtpConfigured ?? true);
    } catch (err: any) {
      console.error(err);
      setParentResendError(err.message || "Erreur lors de l'envoi de l'invitation parent.");
    } finally {
      setParentResendLoadingId(null);
    }
  }

  async function refreshClassChangesOnly() {
    try {
      const res = await getStudentClassChangesApi();
      if (res.success) {
        setClassChanges(res.data);
        setClassChangesError(null);
      } else {
        setClassChangesError("Impossible de charger les changements programmés");
      }
    } catch (err: any) {
      console.error(err);
      setClassChangesError(err.message || "Erreur lors du chargement des changements programmés.");
    }
  }

  function openScheduleModal(student: StudentItem) {
    setScheduleTarget(student);
    setScheduleForm({
      new_class_id: student.class_id || "",
      term_id: "",
      reason: "",
    });
    setScheduleError(null);
    setScheduleSuccess(null);
    setIsScheduleModalOpen(true);
  }

  function closeScheduleModal() {
    if (scheduleLoading) return;
    setIsScheduleModalOpen(false);
    setScheduleTarget(null);
    setScheduleForm({
      new_class_id: "",
      term_id: "",
      reason: "",
    });
    setScheduleError(null);
    setScheduleSuccess(null);
  }

  function handleScheduleFormChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setScheduleForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleScheduleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!scheduleTarget) return;
    if (!scheduleForm.new_class_id || !scheduleForm.term_id) {
      setScheduleError("Merci de choisir la nouvelle classe et la période.");
      return;
    }

    try {
      setScheduleLoading(true);
      setScheduleError(null);
      setScheduleSuccess(null);

      const payload = {
        new_class_id: scheduleForm.new_class_id,
        effective_term_id: scheduleForm.term_id,
        reason: scheduleForm.reason.trim()
          ? scheduleForm.reason.trim()
          : undefined,
      };

      const res = await scheduleStudentClassChangeApi(scheduleTarget.user_id, payload);
      if (!res.success) {
        setScheduleError("Impossible de programmer ce changement.");
        return;
      }

      setScheduleSuccess("Changement programmé avec succès.");
      await refreshClassChangesOnly();
    } catch (err: any) {
      console.error(err);
      setScheduleError(err.message || "Erreur lors de la programmation.");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function handleCancelClassChange(changeId: string) {
    try {
      setCancelLoadingId(changeId);
      await deleteStudentClassChangeApi(changeId);
      await refreshClassChangesOnly();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Impossible d'annuler ce changement.");
    } finally {
      setCancelLoadingId(null);
    }
  }

  async function handleApplyClassChanges() {
    if (!applyTermId) {
      setApplyError("Merci de choisir une période.");
      return;
    }
    try {
      setApplyLoading(true);
      setApplyError(null);
      setApplyStatus(null);
      const res = await applyStudentClassChangesApi(applyTermId);
      setApplyStatus(
        res.message ||
          `${res.appliedCount} changement${res.appliedCount > 1 ? "s" : ""} appliqué${res.appliedCount > 1 ? "s" : ""}.`
      );
      await loadData();
    } catch (err: any) {
      console.error(err);
      setApplyError(err.message || "Erreur lors de l'application des changements.");
    } finally {
      setApplyLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminBackButton className="mb-4" />
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des élèves</h1>
          <p className="text-sm text-muted-foreground">
            Liste des élèves de votre établissement et création de nouveaux
            comptes.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Ajouter un élève
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setShowOnlyNoClass((prev) => !prev)}
          className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted"
        >
          {showOnlyNoClass ? "Afficher tous les élèves" : "Voir les élèves sans classe"}
        </button>
        {resendSuccess && (
          <div className="flex flex-col gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <p>{resendSuccess}</p>
            {resendInviteUrl && (
              <>
                <p className="break-all font-mono text-[11px]">
                  {resendInviteUrl}
                </p>
                <button
                  type="button"
                  className="w-fit rounded border px-2 py-1 font-medium hover:bg-white"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resendInviteUrl);
                      setResendCopyFeedback("Lien copié dans le presse-papiers.");
                    } catch (err) {
                      console.error(err);
                      setResendCopyFeedback("Impossible de copier le lien.");
                    }
                  }}
                >
                  Copier le lien
                </button>
                {resendCopyFeedback && (
                  <p className="text-[11px] text-emerald-700">{resendCopyFeedback}</p>
                )}
              </>
            )}
          </div>
        )}
        {resendError && (
          <p className="text-xs text-red-600">{resendError}</p>
        )}
        {parentResendSuccess && (
          <div className="flex flex-col gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900">
            <p>{parentResendSuccess}</p>
            {shouldShowParentResendLink && parentResendInviteUrl && (
              <>
                <p className="break-all font-mono text-[11px]">
                  {parentResendInviteUrl}
                </p>
                <button
                  type="button"
                  className="w-fit rounded border px-2 py-1 font-medium hover:bg-white"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(parentResendInviteUrl);
                      setParentResendCopyFeedback("Lien parent copié dans le presse-papiers.");
                    } catch (err) {
                      console.error(err);
                      setParentResendCopyFeedback("Impossible de copier le lien parent.");
                    }
                  }}
                >
                  Copier le lien parent
                </button>
                {parentResendCopyFeedback && (
                  <p className="text-[11px] text-blue-700">{parentResendCopyFeedback}</p>
                )}
              </>
            )}
          </div>
        )}
        {parentResendError && (
          <p className="text-xs text-red-600">{parentResendError}</p>
        )}
      </div>

      <section className="mb-6 rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Changements de classe programmés</h2>
            <p className="text-sm text-muted-foreground">
              Planifiez les passages dans les nouvelles classes et appliquez-les au début d&apos;un trimestre/semestre.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
            {pendingTermOptions.length > 0 ? (
              <>
                <label className="flex flex-col gap-1 font-medium text-muted-foreground sm:flex-row sm:items-center">
                  <span className="text-[11px] uppercase tracking-wide">Période à appliquer</span>
                  <select
                    value={applyTermId}
                    onChange={(e) => setApplyTermId(e.target.value)}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    {pendingTermOptions.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name} • {new Date(term.start_date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })} →{" "}
                        {new Date(term.end_date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleApplyClassChanges}
                  disabled={applyLoading}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {applyLoading ? "Application..." : "Appliquer les changements"}
                </button>
              </>
            ) : (
              <p className="text-muted-foreground">Aucun changement en attente.</p>
            )}
          </div>
        </div>
        <div className="space-y-3 px-4 py-4 text-xs">
          {applyStatus && <p className="text-emerald-700">{applyStatus}</p>}
          {applyError && <p className="text-red-600">{applyError}</p>}
          {classChangesError && <p className="text-red-600">{classChangesError}</p>}

          {pendingClassChanges.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Élève</th>
                    <th className="px-3 py-2 text-left font-medium">Passage</th>
                    <th className="px-3 py-2 text-left font-medium">Période</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingClassChanges.map((change) => (
                    <tr key={change.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{change.student_name}</div>
                        <div className="text-[11px] text-muted-foreground">{change.student_email}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">De</div>
                        <div className="font-medium">
                          {change.old_class
                            ? `${change.old_class.label || "Classe"}${change.old_class.code ? ` (${change.old_class.code})` : ""}`
                            : "Aucune classe"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">Vers</div>
                        <div className="font-medium text-indigo-600">
                          {`${change.new_class.label || "Classe"}${change.new_class.code ? ` (${change.new_class.code})` : ""}`}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{change.term.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(change.term.start_date).toLocaleDateString()} →{" "}
                          {new Date(change.term.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleCancelClassChange(change.id)}
                          disabled={cancelLoadingId === change.id}
                          className="text-red-600 hover:underline disabled:opacity-60"
                        >
                          {cancelLoadingId === change.id ? "Annulation..." : "Annuler"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Aucun changement programmé. Utilisez le bouton “Programmer un changement” dans la liste des élèves pour anticiper la prochaine période.
            </p>
          )}

          {appliedClassChanges.length > 0 && (
            <details className="rounded-lg border px-3 py-2">
              <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Historique des changements ({appliedClassChanges.length})
              </summary>
              <ul className="mt-3 space-y-2">
                {appliedClassChanges.map((change) => (
                  <li key={change.id} className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{change.student_name}</span> →{" "}
                    <span className="text-indigo-600">
                      {`${change.new_class.label || "Classe"}${change.new_class.code ? ` (${change.new_class.code})` : ""}`}
                    </span>{" "}
                    ({change.term.name}) – appliqué le{" "}
                    {change.applied_at
                      ? new Date(change.applied_at).toLocaleDateString()
                      : "date inconnue"}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Chargement des élèves...
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && students.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun élève pour le moment. Ajoutez un élève pour commencer.
        </p>
      )}

      {!loading && !error && students.length > 0 && (
        <section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Nom</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Classe</th>
                <th className="px-4 py-2 text-left font-medium">
                  Numéro élève
                </th>
                <th className="px-4 py-2 text-left font-medium">Naissance</th>
                <th className="px-4 py-2 text-left font-medium">Statut</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayedStudents.map((st) => (
                <tr key={st.student_id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <div className="font-medium">{st.full_name}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <a
                      href={`mailto:${st.email}`}
                      className="text-primary hover:underline"
                    >
                      {st.email}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {st.class_label ? (
                      <>
                        <div>{st.class_label}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {st.class_code}
                        </div>
                        {st.academic_year && (
                          <div className="text-[11px] text-muted-foreground">
                            {st.academic_year}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Aucune classe</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {st.student_number || "-"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {st.date_of_birth
                      ? new Date(st.date_of_birth).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        st.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {st.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleStudentStatus(st)}
                        className={`font-medium ${
                          st.active
                            ? "text-red-600 hover:underline"
                            : "text-emerald-700 hover:underline"
                        }`}
                      >
                        {st.active ? "Désactiver" : "Réactiver"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudent(st);
                          setEditClassId(st.class_id || "");
                          setEditError(null);
                        }}
                        className="text-primary hover:underline"
                      >
                        Modifier la classe
                      </button>
                      <button
                        type="button"
                        onClick={() => openScheduleModal(st)}
                        className="text-indigo-600 hover:underline disabled:opacity-60"
                        disabled={terms.length === 0}
                        title={
                          terms.length === 0
                            ? "Ajoutez au moins une période dans l'établissement pour programmer un changement"
                            : undefined
                        }
                      >
                        Programmer un changement
                      </button>
                      {st.must_change_password && !st.last_login && (
                        <button
                          type="button"
                          onClick={() => handleResendStudentInvite(st)}
                          className="text-blue-600 hover:underline"
                          disabled={resendLoadingId === st.user_id}
                        >
                          {resendLoadingId === st.user_id
                            ? "Envoi..."
                            : "Renvoyer invitation élève"}
                        </button>
                      )}
                      {st.parent_pending_activation ? (
                        <button
                          type="button"
                          onClick={() => handleResendParentInvite(st)}
                          className="text-indigo-600 hover:underline"
                          disabled={parentResendLoadingId === st.user_id}
                        >
                          {parentResendLoadingId === st.user_id
                            ? "Envoi..."
                            : "Renvoyer invitation parent"}
                        </button>
                      ) : null}
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Modale ajout élève */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ajouter un élève</h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Nom complet *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Nom Prénom"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Email de connexion (optionnel)
                </label>
                <input
                  type="email"
                  name="login_email"
                  value={form.login_email}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="eleve@exemple.com"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Si vous laissez ce champ vide, l&apos;email sera généré automatiquement.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Email de contact (facultatif)
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={form.contact_email}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Laisser vide si identique"
                />
              </div>

              <div className="rounded-md border border-dashed px-3 py-2">
                <p className="text-xs font-semibold">Parent principal (optionnel)</p>
                <p className="text-[11px] text-muted-foreground">
                  Renseignez ces champs pour créer automatiquement un compte parent.
                  Laissez-les vides pour utiliser le fallback actuel.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Prénom du parent
                    </label>
                    <input
                      type="text"
                      name="parent_first_name"
                      value={form.parent_first_name}
                      onChange={handleChange}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Nom du parent
                    </label>
                    <input
                      type="text"
                      name="parent_last_name"
                      value={form.parent_last_name}
                      onChange={handleChange}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Nom"
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Téléphone parent (optionnel)
                    </label>
                    <input
                      type="tel"
                      name="parent_phone"
                      value={form.parent_phone}
                      onChange={handleChange}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="+213..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Adresse parent (optionnel)
                    </label>
                    <input
                      type="text"
                      name="parent_address"
                      value={form.parent_address}
                      onChange={handleChange}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Adresse"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Classe (optionnel)
                </label>
                <select
                  name="class_id"
                  value={form.class_id}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">— Aucune classe pour l'instant —</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label} ({cls.code}) – {cls.academic_year}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Vous pourrez affecter une classe plus tard depuis la fiche élève.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-dashed px-3 py-2 text-xs">
                  <p className="font-semibold">Numéro élève</p>
                  <p className="text-muted-foreground">
                    Généré automatiquement (ex&nbsp;: STU-2025-00001). Vous pourrez le
                    consulter dans la liste après création.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Date de naissance (optionnel)
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-xs text-red-600">{submitError}</p>
              )}

              {submitSuccess && (
                <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">
                  <p>{submitSuccess}</p>
                  {inviteUrl && (
                    <div className="mt-2 space-y-2">
                      <p className="font-semibold">Lien d&apos;invitation :</p>
                      <p className="break-all font-mono text-[11px]">
                        {inviteUrl}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteUrl)
                            setCopyFeedback("Lien copié dans le presse-papiers.")
                          } catch (err) {
                            console.error(err)
                            setSubmitError("Impossible de copier le lien.")
                          }
                        }}
                        className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-white/60"
                      >
                        Copier le lien
                      </button>
                      {copyFeedback && (
                        <p className="text-[11px] text-emerald-700">{copyFeedback}</p>
                      )}
                    </div>
                  )}
                  {shouldShowParentInviteLinks && (
                    <div className="mt-3 space-y-2 rounded-md border border-emerald-200 bg-white/70 p-2 text-[11px] text-emerald-900">
                      <p className="font-semibold text-xs text-emerald-900">
                        Liens parent (mode dev ou SMTP absent)
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        À utiliser uniquement pour tester l&apos;activation parent en l&apos;absence d&apos;emails.
                      </p>
                      <div className="space-y-2">
                        {parentInviteUrls.map((url, index) => (
                          <div key={`${url}-${index}`} className="rounded border border-emerald-100 p-2">
                            {parentLoginEmails[index] && (
                              <p className="mb-1 font-medium text-emerald-900">
                                Identifiant parent : {parentLoginEmails[index]}
                              </p>
                            )}
                            <p className="break-all font-mono text-[11px] text-emerald-900">{url}</p>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(url)
                                  setParentCopyFeedback("Lien parent copié.")
                                } catch (err) {
                                  console.error(err)
                                  setParentCopyFeedback("Impossible de copier ce lien.")
                                }
                              }}
                              className="mt-2 rounded-md border px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-white"
                            >
                              Copier le lien parent
                            </button>
                          </div>
                        ))}
                      </div>
                      {parentCopyFeedback && (
                        <p className="text-[11px] text-emerald-600">{parentCopyFeedback}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Création..." : "Créer l'élève"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Modifier la classe de {editingStudent.full_name}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!editLoading) {
                    setEditingStudent(null);
                    setEditClassId("");
                  }
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Classe
                </label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">— Aucune classe —</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label} ({cls.code}) – {cls.academic_year}
                    </option>
                  ))}
                </select>
              </div>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!editLoading) {
                      setEditingStudent(null);
                      setEditClassId("");
                    }
                  }}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  disabled={editLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  disabled={editLoading}
                >
                  {editLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScheduleModalOpen && scheduleTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Programmer un changement</h2>
                <p className="text-xs text-muted-foreground">
                  {scheduleTarget.full_name} passera dans la nouvelle classe au début de la période choisie.
                </p>
              </div>
              <button
                type="button"
                onClick={closeScheduleModal}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleScheduleSubmit}>
              <div>
                <label className="mb-1 block text-xs font-medium">Nouvelle classe *</label>
                <select
                  name="new_class_id"
                  value={scheduleForm.new_class_id}
                  onChange={handleScheduleFormChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  required
                >
                  <option value="">— Choisir une classe —</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label} ({cls.code}) – {cls.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Période d&apos;effet *</label>
                <select
                  name="term_id"
                  value={scheduleForm.term_id}
                  onChange={handleScheduleFormChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  required
                >
                  <option value="">— Sélectionner une période —</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({new Date(term.startDate).toLocaleDateString()} →{" "}
                      {new Date(term.endDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Commentaire (optionnel)
                </label>
                <textarea
                  name="reason"
                  value={scheduleForm.reason}
                  onChange={handleScheduleFormChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Ex: passage en groupe bilingue au semestre 2"
                />
              </div>

              {scheduleError && <p className="text-xs text-red-600">{scheduleError}</p>}
              {scheduleSuccess && (
                <p className="text-xs text-emerald-700">{scheduleSuccess}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
                  disabled={scheduleLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  disabled={scheduleLoading}
                >
                  {scheduleLoading ? "Programmation..." : "Programmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
