"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api/api-client";

interface Establishment {
  id: string;
  name: string;
  code: string;
  type: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  email: string;
  phone: string | null;
  timezone: string | null;
  subscription_plan: string | null;
  active: boolean;
  verified: boolean;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  admins_count?: string | number;
}

interface EstablishmentsResponse {
  success: boolean;
  data: Establishment[];
}

interface CreateEstablishmentResponse {
  success: boolean;
  message: string;
  data: {
    establishment: Establishment;
    admin: {
      id: string;
      email: string;
      full_name: string;
    };
    admin_initial_password: string;
  };
}

interface UpdateStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    code: string;
    active: boolean;
  };
}

interface SoftDeleteResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    code: string;
    deleted_at: string;
  };
}

export default function SuperAdminEstablishmentsPage() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État de la modale de création
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [createdAdminInfo, setCreatedAdminInfo] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // État pour les actions activer/désactiver/supprimer
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Formulaire de création
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "",
    address: "",
    city: "",
    postal_code: "",
    email: "",
    phone: "",
    max_students: 500,
    timezone: "Africa/Algiers",
    subscription_plan: "trial",
    admin_email: "",
    admin_full_name: "",
    admin_password: "admin123",
  });

  // Charger la liste des établissements
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch<EstablishmentsResponse>(
          "/super-admin/establishments"
        );

        if (res.success) {
          setEstablishments(res.data);
        } else {
          setError("Impossible de charger les établissements");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erreur lors du chargement des établissements");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Ouverture / fermeture modale
  function openModal() {
    setSubmitError(null);
    setSubmitSuccess(null);
    setCreatedAdminInfo(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
  }

  // Changement des champs du formulaire
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "max_students"
          ? Number(value) || 0
          : value,
    }));
  }

  // Soumission du formulaire de création
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setCreatedAdminInfo(null);

    if (
      !form.name ||
      !form.code ||
      !form.email ||
      !form.admin_email ||
      !form.admin_full_name
    ) {
      setSubmitError(
        "Merci de remplir au minimum : Nom, Code, Email établissement, Email admin, Nom complet admin."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await apiFetch<CreateEstablishmentResponse>(
        "/super-admin/establishments",
        {
          method: "POST",
          body: JSON.stringify(form),
        }
      );

      if (!res.success) {
        setSubmitError(res.message || "Erreur lors de la création");
        return;
      }

      // Ajouter dans la liste locale
      setEstablishments((prev) => [res.data.establishment, ...prev]);

      setSubmitSuccess("Établissement et admin d'école créés avec succès.");
      setCreatedAdminInfo({
        email: res.data.admin.email,
        password: res.data.admin_initial_password,
      });

      // Reset du formulaire (sauf plan & timezone)
      setForm((prev) => ({
        ...prev,
        name: "",
        code: "",
        type: "",
        address: "",
        city: "",
        postal_code: "",
        email: "",
        phone: "",
        admin_email: "",
        admin_full_name: "",
        admin_password: "admin123",
      }));
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Activer / désactiver un établissement
  async function toggleActive(est: Establishment) {
    setActionError(null);
    setActionLoadingId(est.id);

    try {
      const res = await apiFetch<UpdateStatusResponse>(
        `/super-admin/establishments/${est.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ active: !est.active }),
        }
      );

      if (!res.success) {
        setActionError(res.message || "Erreur lors de la mise à jour du statut");
        return;
      }

      setEstablishments((prev) =>
        prev.map((e) =>
          e.id === est.id ? { ...e, active: res.data.active } : e
        )
      );
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Erreur lors de la mise à jour du statut");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Suppression logique (soft delete) d'un établissement
  async function softDelete(est: Establishment) {
    const confirmed = window.confirm(
      `Confirmer la suppression de l'établissement "${est.name}" ?\n\nLes comptes liés seront désactivés immédiatement. Les données pourront être purgées définitivement plus tard.`
    );

    if (!confirmed) return;

    setActionError(null);
    setActionLoadingId(est.id);

    try {
      const res = await apiFetch<SoftDeleteResponse>(
        `/super-admin/establishments/${est.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.success) {
        setActionError(res.message || "Erreur lors de la suppression");
        return;
      }

      // Retirer l'établissement de la liste
      setEstablishments((prev) => prev.filter((e) => e.id !== est.id));
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Erreur lors de la suppression");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des établissements</h1>
          <p className="text-sm text-muted-foreground">
            Créez, gérez et contrôlez l&apos;accès des établissements.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Créer un établissement
        </button>
      </header>

      {actionError && (
        <p className="mb-3 text-sm text-red-600">{actionError}</p>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">
          Chargement des établissements...
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && establishments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun établissement pour le moment. Créez-en un pour commencer.
        </p>
      )}

      {!loading && !error && establishments.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Nom</th>
                <th className="px-4 py-2 text-left font-medium">Code</th>
                <th className="px-4 py-2 text-left font-medium">Ville</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">État</th>
                <th className="px-4 py-2 text-left font-medium">
                  Admins d&apos;école
                </th>
                <th className="px-4 py-2 text-left font-medium">Créé le</th>
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {establishments.map((est) => (
                <tr key={est.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <div className="font-medium">{est.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {est.type || "Type non défini"}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-muted px-2 py-1 text-xs font-mono">
                      {est.code}
                    </span>
                  </td>
                  <td className="px-4 py-2">{est.city || "-"}</td>
                  <td className="px-4 py-2">
                    <a
                      href={`mailto:${est.email}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {est.email}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        est.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {est.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {est.admins_count ?? 0}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(est.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(est)}
                        disabled={actionLoadingId === est.id}
                        className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {est.active ? "Désactiver" : "Réactiver"}
                      </button>
                      <button
                        type="button"
                        onClick={() => softDelete(est)}
                        disabled={actionLoadingId === est.id}
                        className="rounded-md border border-red-300 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale création établissement */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-xl bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Créer un nouvel établissement
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Infos établissement */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium">
                    Nom de l&apos;établissement *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Ex : Lycée International d'Alger"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                    placeholder="Ex : LYC-ALG-001"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Type
                  </label>
                  <input
                    type="text"
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Ex : Lycée, Collège, Université..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Ville
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Ex : Alger"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Adresse
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Rue, bâtiment..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Code postal
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={form.postal_code}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="16000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Email de l&apos;établissement *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="contact@ecole.dz"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="0555 00 00 00"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Capacité max élèves
                  </label>
                  <input
                    type="number"
                    name="max_students"
                    value={form.max_students}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    min={1}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Fuseau horaire
                  </label>
                  <input
                    type="text"
                    name="timezone"
                    value={form.timezone}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Africa/Algiers"
                  />
                </div>
              </div>

              <hr className="my-2" />

              {/* Admin d'école */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Admin d&apos;école créé automatiquement
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Email admin d&apos;école *
                  </label>
                  <input
                    type="email"
                    name="admin_email"
                    value={form.admin_email}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="admin.ecole@exemple.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Nom complet admin *
                  </label>
                  <input
                    type="text"
                    name="admin_full_name"
                    value={form.admin_full_name}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Nom Prénom"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium">
                    Mot de passe initial
                  </label>
                  <input
                    type="text"
                    name="admin_password"
                    value={form.admin_password}
                    onChange={handleChange}
                    className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Ce mot de passe pourra être communiqué à l&apos;admin
                    d&apos;école. Il pourra être changé plus tard.
                  </p>
                </div>
              </div>

              {submitError && (
                <p className="text-xs text-red-600">{submitError}</p>
              )}

              {submitSuccess && (
                <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">
                  <p>{submitSuccess}</p>
                  {createdAdminInfo && (
                    <p className="mt-1 font-mono">
                      Admin : {createdAdminInfo.email} — Mot de passe :{" "}
                      {createdAdminInfo.password}
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
                  {isSubmitting ? "Création..." : "Créer l'établissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
