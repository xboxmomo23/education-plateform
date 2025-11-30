"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api/api-client";
import { updateStudentStatusApi } from "@/lib/api/students";

interface ClassOption {
  id: string;
  code: string;
  label: string;
  academic_year: number;
}

interface StudentItem {
  student_id: string;
  user_id: string;
  full_name: string;
  email: string;
  active: boolean;
  student_number: string | null;
  date_of_birth: string | null;
  class_id: string;
  class_label: string;
  class_code: string;
  level: string | null;
  academic_year: number;
}

interface StudentsResponse {
  success: boolean;
  data: StudentItem[];
}

interface ClassesResponse {
  success: boolean;
  data: ClassOption[];
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
    initial_password: string;
  };
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [createdStudentInfo, setCreatedStudentInfo] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const [form, setForm] = useState<{
    full_name: string;
    email: string;
    class_id: string;
    student_number: string;
    date_of_birth: string;
    password: string;
  }>({
    full_name: "",
    email: "",
    class_id: "",
    student_number: "",
    date_of_birth: "",
    password: "eleve123",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [studentsRes, classesRes] = await Promise.all([
        apiFetch<StudentsResponse>("/admin/students"),
        apiFetch<ClassesResponse>("/admin/classes"),
      ]);

      if (studentsRes.success) {
        setStudents(studentsRes.data);
      } else {
        setError("Impossible de charger les élèves");
      }

      if (classesRes.success) {
        setClasses(classesRes.data);
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
    setCreatedStudentInfo(null);
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
    setCreatedStudentInfo(null);

    if (!form.full_name || !form.email || !form.class_id) {
      setSubmitError(
        "Merci de renseigner au minimum : nom complet, email, classe."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        full_name: form.full_name,
        email: form.email,
        class_id: form.class_id,
        student_number: form.student_number || null,
        date_of_birth: form.date_of_birth || null,
        password: form.password || "eleve123",
      };

      const res = await apiFetch<CreateStudentResponse>("/admin/students", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        setSubmitError(res.message || "Erreur lors de la création");
        return;
      }

      const created = res.data;
      const cls = classes.find((c) => c.id === created.student.class_id);

      const newItem: StudentItem = {
        student_id: created.student.id,
        user_id: created.user.id,
        full_name: created.user.full_name,
        email: created.user.email,
        active: created.user.active,
        student_number: created.student.student_number,
        date_of_birth: created.student.date_of_birth,
        class_id: created.student.class_id,
        class_label: cls?.label || "Classe",
        class_code: cls?.code || "",
        level: null,
        academic_year: cls?.academic_year || new Date().getFullYear(),
      };

      setStudents((prev) => [newItem, ...prev]);

      setSubmitSuccess("Élève créé avec succès.");
      setCreatedStudentInfo({
        email: created.user.email,
        password: created.initial_password,
      });

      setForm({
        full_name: "",
        email: "",
        class_id: "",
        student_number: "",
        date_of_birth: "",
        password: "eleve123",
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
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
              {students.map((st) => (
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
                    <div>{st.class_label}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {st.class_code}
                    </div>
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
                    <button
                      type="button"
                      onClick={() => toggleStudentStatus(st)}
                      className={`text-xs font-medium ${
                        st.active
                          ? "text-red-600 hover:underline"
                          : "text-emerald-700 hover:underline"
                      }`}
                    >
                      {st.active ? "Désactiver" : "Réactiver"}
                    </button>
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
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="eleve@exemple.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Classe *
                </label>
                <select
                  name="class_id"
                  value={form.class_id}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Sélectionnez une classe</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label} ({cls.code}) – {cls.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Numéro élève (optionnel)
                  </label>
                  <input
                    type="text"
                    name="student_number"
                    value={form.student_number}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
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

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Mot de passe initial
                </label>
                <input
                  type="text"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ce mot de passe sera communiqué à l&apos;élève. Il pourra être
                  changé plus tard.
                </p>
              </div>

              {submitError && (
                <p className="text-xs text-red-600">{submitError}</p>
              )}

              {submitSuccess && (
                <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">
                  <p>{submitSuccess}</p>
                  {createdStudentInfo && (
                    <p className="mt-1 font-mono">
                      Élève : {createdStudentInfo.email} — Mot de passe :{" "}
                      {createdStudentInfo.password}
                    </p>
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
    </main>
  );
}
