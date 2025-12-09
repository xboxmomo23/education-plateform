"use client";

import { useEffect, useState, FormEvent } from "react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { apiFetch } from "@/lib/api/api-client";
import { updateClassApi } from "@/lib/api/classes";

type ClassLevel =
  | "6eme"
  | "5eme"
  | "4eme"
  | "3eme"
  | "seconde"
  | "premiere"
  | "terminale"
  | "";

interface ClassItem {
  id: string;
  code: string;
  label: string;
  academic_year: number;
  level: ClassLevel | null;
  capacity: number | null;
  current_size: number | null;
  room: string | null;
  archived: boolean;
  created_at: string;
}

interface ClassesResponse {
  success: boolean;
  data: ClassItem[];
}

interface CreateClassResponse {
  success: boolean;
  message: string;
  data: ClassItem;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modale création
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState<{
    code: string;
    label: string;
    academic_year: number;
    level: ClassLevel;
    capacity: number | "";
    room: string;
  }>({
    code: "",
    label: "",
    academic_year: currentYear,
    level: "" as ClassLevel,
    capacity: "",
    room: "",
  });

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      setLoading(true);
      setError(null);

      const res = await apiFetch<ClassesResponse>("/admin/classes");

      if (res.success) {
        setClasses(res.data);
      } else {
        setError("Impossible de charger les classes");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des classes");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setSubmitError(null);
    setSubmitSuccess(null);
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

    setForm((prev) => {
      if (name === "capacity") {
        return {
          ...prev,
          capacity: value === "" ? "" : Number(value),
        };
      }
      if (name === "academic_year") {
        return {
          ...prev,
          academic_year: Number(value) || currentYear,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!form.code || !form.label || !form.academic_year) {
      setSubmitError(
        "Merci de remplir au minimum : code, libellé et année scolaire."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        code: form.code,
        label: form.label,
        academic_year: form.academic_year,
        level: form.level || null,
        capacity: form.capacity === "" ? null : form.capacity,
        room: form.room || null,
      };

      const res = await apiFetch<CreateClassResponse>("/admin/classes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        setSubmitError(res.message || "Erreur lors de la création");
        return;
      }

      setClasses((prev) => [res.data, ...prev]);

      setSubmitSuccess("Classe créée avec succès.");

      setForm({
        code: "",
        label: "",
        academic_year: currentYear,
        level: "" as ClassLevel,
        capacity: "",
        room: "",
      });
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleClassStatus(cls: ClassItem) {
    try {
      await updateClassApi(cls.id, { archived: !cls.archived });
      setClasses((prev) =>
        prev.map((c) =>
          c.id === cls.id ? { ...c, archived: !cls.archived } : c
        )
      );
    } catch (err) {
      console.error(err);
      alert("Erreur lors du changement de statut de la classe");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminBackButton className="mb-4" />
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des classes</h1>
          <p className="text-sm text-muted-foreground">
            Créez et gérez les classes de votre établissement.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Créer une classe
        </button>
      </header>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Chargement des classes...
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && classes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune classe pour le moment. Créez-en une pour commencer.
        </p>
      )}

      {!loading && !error && classes.length > 0 && (
        <section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Code</th>
                <th className="px-4 py-2 text-left font-medium">Libellé</th>
                <th className="px-4 py-2 text-left font-medium">Niveau</th>
                <th className="px-4 py-2 text-left font-medium">Année</th>
                <th className="px-4 py-2 text-left font-medium">Capacité</th>
                <th className="px-4 py-2 text-left font-medium">Effectif</th>
                <th className="px-4 py-2 text-left font-medium">Salle</th>
                <th className="px-4 py-2 text-left font-medium">Statut</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <span className="rounded bg-muted px-2 py-1 text-xs font-mono">
                      {cls.code}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{cls.label}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {cls.level || "-"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {cls.academic_year}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {cls.capacity ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {cls.current_size ?? 0}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {cls.room || "-"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        cls.archived
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {cls.archived ? "Archivée" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleClassStatus(cls)}
                      className={`text-xs font-medium ${
                        cls.archived
                          ? "text-emerald-700 hover:underline"
                          : "text-red-600 hover:underline"
                      }`}
                    >
                      {cls.archived ? "Réactiver" : "Désactiver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Modale création */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Créer une classe</h2>
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
                  Code de la classe *
                </label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                  placeholder="Ex : 3A, 2INFO1..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Libellé *
                </label>
                <input
                  type="text"
                  name="label"
                  value={form.label}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Ex : 3ème A, Seconde Informatique 1"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Année scolaire *
                  </label>
                  <input
                    type="number"
                    name="academic_year"
                    value={form.academic_year}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Niveau
                  </label>
                  <select
                    name="level"
                    value={form.level}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Non défini</option>
                    <option value="6eme">6ème</option>
                    <option value="5eme">5ème</option>
                    <option value="4eme">4ème</option>
                    <option value="3eme">3ème</option>
                    <option value="seconde">Seconde</option>
                    <option value="premiere">Première</option>
                    <option value="terminale">Terminale</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Capacité (optionnel)
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    min={1}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Salle (optionnel)
                  </label>
                  <input
                    type="text"
                    name="room"
                    value={form.room}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Ex : B12"
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-xs text-red-600">{submitError}</p>
              )}

              {submitSuccess && (
                <p className="text-xs text-emerald-600">{submitSuccess}</p>
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
                  {isSubmitting ? "Création..." : "Créer la classe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
