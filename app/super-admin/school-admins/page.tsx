"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/api-client";

interface SchoolAdmin {
  id: string;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  created_at: string;
  establishment_id: string | null;
  establishment_name: string | null;
  establishment_code: string | null;
}

interface SchoolAdminsResponse {
  success: boolean;
  data: SchoolAdmin[];
}

interface EstablishmentOption {
  id: string;
  name: string;
  code: string;
}

interface EstablishmentsResponse {
  success: boolean;
  data: EstablishmentOption[];
}

interface CreateSchoolAdminResponse {
  success: boolean;
  message: string;
  data: {
    admin: SchoolAdmin;
    admin_initial_password: string;
  };
}

interface UpdateAdminStatusResponse {
  success: boolean;
  message: string;
  data: SchoolAdmin;
}

export default function SuperAdminSchoolAdminsPage() {
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentOption[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // état modale création admin
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [createdAdminInfo, setCreatedAdminInfo] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // état pour activer/désactiver un admin
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [form, setForm] = useState({
    establishment_id: "",
    admin_email: "",
    admin_full_name: "",
    admin_password: "admin123",
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [adminsRes, estRes] = await Promise.all([
          apiFetch<SchoolAdminsResponse>("/super-admin/school-admins"),
          apiFetch<EstablishmentsResponse>("/super-admin/establishments"),
        ]);

        if (adminsRes.success) {
          setAdmins(adminsRes.data);
        } else {
          setError("Impossible de charger les admins d'école");
        }

        if (estRes.success) {
          setEstablishments(
            estRes.data.map((e) => ({
              id: e.id,
              name: e.name,
              code: e.code,
            }))
          );
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

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
    setCreatedAdminInfo(null);

    if (!form.establishment_id || !form.admin_email || !form.admin_full_name) {
      setSubmitError(
        "Merci de choisir un établissement et de remplir email + nom complet."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await apiFetch<CreateSchoolAdminResponse>(
        "/super-admin/school-admins",
        {
          method: "POST",
          body: JSON.stringify(form),
        }
      );

      if (!res.success) {
        setSubmitError(res.message || "Erreur lors de la création");
        return;
      }

      setAdmins((prev) => [res.data.admin, ...prev]);

      setSubmitSuccess("Admin d'école créé avec succès.");
      setCreatedAdminInfo({
        email: res.data.admin.email,
        password: res.data.admin_initial_password,
      });

      setForm({
        establishment_id: "",
        admin_email: "",
        admin_full_name: "",
        admin_password: "admin123",
      });
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleAdminActive(admin: SchoolAdmin) {
    setActionError(null);
    setActionLoadingId(admin.id);

    try {
      const res = await apiFetch<UpdateAdminStatusResponse>(
        `/super-admin/school-admins/${admin.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ active: !admin.active }),
        }
      );

      if (!res.success) {
        setActionError(res.message || "Erreur lors de la mise à jour");
        return;
      }

      setAdmins((prev) =>
        prev.map((a) =>
          a.id === admin.id ? { ...a, active: res.data.active } : a
        )
      );
    } catch (err: any) {
      console.error(err);
      setActionError(
        err.message || "Erreur lors de la mise à jour du statut de l'admin"
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admins d&apos;école</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des comptes administrateurs pour chaque établissement.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Créer un admin d&apos;école
        </button>
      </header>

      {actionError && (
        <p className="mb-3 text-sm text-red-600">{actionError}</p>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">
          Chargement des admins d&apos;école...
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && admins.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun admin d&apos;école pour le moment. La création d&apos;un
          établissement génère automatiquement un admin, et vous pouvez en
          ajouter d&apos;autres ici.
        </p>
      )}

      {!loading && !error && admins.length > 0 && (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">
            Liste des admins d&apos;école
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Nom</th>
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Établissement
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Statut</th>
                  <th className="px-4 py-2 text-left font-medium">Créé le</th>
                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <div className="font-medium">{admin.full_name}</div>
                      <div className="text-[11px] uppercase text-muted-foreground">
                        {admin.role}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <a
                        href={`mailto:${admin.email}`}
                        className="text-primary hover:underline"
                      >
                        {admin.email}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {admin.establishment_name ? (
                        <>
                          <div>{admin.establishment_name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {admin.establishment_code}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Non rattaché
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          admin.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {admin.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleAdminActive(admin)}
                        disabled={actionLoadingId === admin.id}
                        className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {admin.active ? "Désactiver" : "Réactiver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-6">
        <Link
          href="/super-admin"
          className="text-sm text-primary hover:underline"
        >
          &larr; Retour au tableau de bord
        </Link>
      </div>

      {/* Modale création admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Créer un admin d&apos;école
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
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Établissement *
                </label>
                <select
                  name="establishment_id"
                  value={form.establishment_id}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Sélectionnez un établissement</option>
                  {establishments.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.name} ({est.code})
                    </option>
                  ))}
                </select>
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

              <div>
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
                  Ce mot de passe sera communiqué à l&apos;admin. Il pourra
                  être modifié plus tard.
                </p>
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
                  {isSubmitting ? "Création..." : "Créer l'admin d'école"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
