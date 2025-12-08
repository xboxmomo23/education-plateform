"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/api-client";
import { getUserSession, User } from "@/lib/auth-new";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { staffApi, type AdminStaffApi } from "@/lib/api/staff";

type AdminStaff = AdminStaffApi;

interface ClassOption {
  id: string;
  label: string;
  code: string;
  academic_year: number;
}

interface ClassesResponse {
  success: boolean;
  data: ClassOption[];
}

interface StaffListResponse {
  success: boolean;
  data: AdminStaff[];
}

interface StaffMutationResponse {
  success: boolean;
  data?: (AdminStaff & { inviteUrl?: string });
  error?: string;
  message?: string;
}

export default function AdminStaffPage() {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<AdminStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // Modale création
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createLoginEmail, setCreateLoginEmail] = useState("");
  const [createContactEmail, setCreateContactEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createInviteUrl, setCreateInviteUrl] = useState<string | null>(null);
  const [createCopyFeedback, setCreateCopyFeedback] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendInviteUrl, setResendInviteUrl] = useState<string | null>(null);
  const [resendCopyFeedback, setResendCopyFeedback] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Modale édition
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminStaff | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editAssignedClasses, setEditAssignedClasses] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingClassAssignments, setSavingClassAssignments] = useState(false);
  const [classAssignFeedback, setClassAssignFeedback] = useState<string | null>(null);
  const [classAssignError, setClassAssignError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const classLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((cls) => {
      map[cls.id] = `${cls.label}${cls.code ? ` (${cls.code})` : ""}`;
    });
    return map;
  }, [classes]);

  useEffect(() => {
    const sessionUser = getUserSession();
    setUser(sessionUser);

    async function loadStaff() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch<StaffListResponse>("/admin/staff");

        if (res.success) {
          setStaff(res.data);
        } else {
          setError("Erreur lors du chargement des comptes staff");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erreur lors du chargement des comptes staff");
      } finally {
        setLoading(false);
      }
    }

    loadStaff();
    loadClasses();
  }, []);

  const reloadStaff = async () => {
    try {
      const res = await apiFetch<StaffListResponse>("/admin/staff");
      if (res.success) {
        setStaff(res.data);
      }
    } catch (err) {
      console.error("Erreur rechargement staff:", err);
    }
  };

  const loadClasses = async () => {
    try {
      setClassesError(null);
      const res = await apiFetch<ClassesResponse>("/admin/classes");
      if (res.success) {
        setClasses(res.data);
      } else {
        setClasses([]);
        setClassesError("Erreur lors du chargement des classes.");
      }
    } catch (err: any) {
      console.error(err);
      setClasses([]);
      setClassesError(err.message || "Erreur lors du chargement des classes.");
    }
  };

  const filteredStaff = staff.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const renderAssignedClasses = (ids?: string[] | null) => {
    if (!ids || ids.length === 0) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1 text-[11px]">
        {ids.map((id) => (
          <span key={id} className="rounded bg-muted px-2 py-0.5">
            {classLabelMap[id] || "Classe"}
          </span>
        ))}
      </div>
    );
  };

  // ======== Création ========

  const openCreate = () => {
    setCreateFullName("");
    setCreateLoginEmail("");
    setCreateContactEmail("");
    setCreatePhone("");
    setCreateDepartment("");
    setCreateError(null);
    setCreateSuccess(null);
    setCreateInviteUrl(null);
    setCreateCopyFeedback(null);
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!createFullName.trim()) {
      setCreateError("Le nom complet est requis");
      return;
    }

    try {
      setSavingCreate(true);
      setCreateError(null);
      setCreateSuccess(null);
      setCreateInviteUrl(null);
      setCreateCopyFeedback(null);
      const payload: Record<string, unknown> = {
        full_name: createFullName.trim(),
      };
      if (createLoginEmail.trim()) {
        payload.login_email = createLoginEmail.trim();
      }
      if (createContactEmail.trim()) {
        payload.contact_email = createContactEmail.trim();
      }
      if (createPhone.trim()) {
        payload.phone = createPhone.trim();
      }
      if (createDepartment.trim()) {
        payload.department = createDepartment.trim();
      }

      const res = await apiFetch<StaffMutationResponse>("/admin/staff", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success || !res.data) {
        setCreateError(res.error || "Erreur lors de la création du staff");
        setCreateSuccess(null);
        setCreateInviteUrl(null);
        return;
      }

      await reloadStaff();
      setCreateSuccess("Compte staff créé. Copiez le lien ci-dessous et envoyez-le au collaborateur.");
      setCreateInviteUrl(res.data.inviteUrl || null);
      setCreateCopyFeedback(null);
      setCreateFullName("");
      setCreateLoginEmail("");
      setCreateContactEmail("");
      setCreatePhone("");
      setCreateDepartment("");
    } catch (err: any) {
      console.error("Erreur création staff:", err);
      setCreateError(err.message || "Erreur lors de la création du staff");
      setCreateSuccess(null);
      setCreateInviteUrl(null);
    } finally {
      setSavingCreate(false);
    }
  };

  // ======== Édition ========

  const openEdit = (item: AdminStaff) => {
    setEditingStaff(item);
    setEditFullName(item.full_name);
    setEditEmail(item.email);
    setEditContactEmail(item.contact_email || "");
    setEditPhone(item.phone || "");
    setEditDepartment(item.department || "");
    setEditAssignedClasses(item.assigned_class_ids ?? []);
    setClassAssignFeedback(null);
    setClassAssignError(null);
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editingStaff) return;

    if (!editFullName || !editEmail) {
      alert("Nom complet et email sont requis");
      return;
    }

    try {
      setSavingEdit(true);
      const res = await apiFetch<StaffMutationResponse>(
        `/admin/staff/${editingStaff.staff_id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            full_name: editFullName,
            email: editEmail,
            contact_email: editContactEmail || undefined,
            phone: editPhone || undefined,
            department: editDepartment || undefined,
          }),
        }
      );

      if (!res.success) {
        alert(res.error || "Erreur lors de la mise à jour du staff");
        return;
      }

      setShowEditModal(false);
      setEditingStaff(null);
      setEditContactEmail("");
      setEditPhone("");
      setEditDepartment("");
      await reloadStaff();
    } catch (err: any) {
      console.error("Erreur mise à jour staff:", err);
      alert(err.message || "Erreur lors de la mise à jour du staff");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAssignedClassesChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setEditAssignedClasses(values);
    setClassAssignFeedback(null);
    setClassAssignError(null);
  };

  const handleSaveClassAssignments = async () => {
    if (!editingStaff) return;
    try {
      setSavingClassAssignments(true);
      setClassAssignFeedback(null);
      setClassAssignError(null);
      const res = await staffApi.updateClasses(
        editingStaff.staff_id,
        editAssignedClasses
      );
      if (!res.success || !res.data) {
        setClassAssignError(res.error || "Erreur lors de la mise à jour des classes.");
        return;
      }
      setClassAssignFeedback("Classes assignées mises à jour.");
      setStaff((prev) =>
        prev.map((s) =>
          s.staff_id === editingStaff.staff_id
            ? { ...s, assigned_class_ids: res.data.assigned_class_ids ?? [] }
            : s
        )
      );
      setEditingStaff((prev) =>
        prev ? { ...prev, assigned_class_ids: res.data.assigned_class_ids ?? [] } : prev
      );
      setEditAssignedClasses(res.data.assigned_class_ids ?? []);
    } catch (err: any) {
      console.error("Erreur mise à jour classes staff:", err);
      setClassAssignError(err.message || "Erreur lors de la mise à jour des classes.");
    } finally {
      setSavingClassAssignments(false);
    }
  };

  // ======== Activation / désactivation ========

  const toggleActive = async (item: AdminStaff) => {
    try {
      setTogglingId(item.staff_id);
      setStatusInfo(null);
      setStatusError(null);
      const res = await apiFetch<StaffMutationResponse>(
        `/admin/staff/${item.staff_id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ active: !item.active }),
        }
      );

      if (!res.success) {
        setStatusError(res.error || "Erreur lors de la mise à jour du statut");
        return;
      }

      await reloadStaff();
      setStatusInfo(
        `Compte staff ${item.full_name} ${
          item.active ? "désactivé" : "réactivé"
        }.`
      );
    } catch (err: any) {
      console.error("Erreur toggle staff:", err);
      setStatusError(err.message || "Erreur lors de la mise à jour du statut");
    } finally {
      setTogglingId(null);
    }
  };

  const handleResendInvite = async (item: AdminStaff) => {
    try {
      setResendLoadingId(item.staff_id);
      setResendError(null);
      setResendSuccess(null);
      setResendInviteUrl(null);
      setResendCopyFeedback(null);
      const res = await apiFetch<{ success: boolean; inviteUrl?: string; error?: string }>(
        `/admin/staff/${item.staff_id}/resend-invite`,
        { method: "POST" }
      );
      if (!res.success) {
        setResendError(res.error || "Impossible de renvoyer l'invitation.");
        return;
      }
      setResendSuccess(`Invitation renvoyée à ${item.full_name}.`);
      if (res.inviteUrl) {
        setResendInviteUrl(res.inviteUrl);
      }
    } catch (err: any) {
      console.error("Erreur renvoi invitation staff:", err);
      setResendError(err.message || "Erreur lors de l'envoi de l'invitation.");
    } finally {
      setResendLoadingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Gestion des comptes Staff
          </h1>
          <p className="text-sm text-muted-foreground">
            Créez, modifiez et activez/désactivez les comptes staff de votre établissement.
          </p>
        </div>

        {user && (
          <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">
              Connecté en tant que
            </div>
            <div>{user.full_name}</div>
            <div className="font-mono text-[11px]">{user.email}</div>
          </div>
        )}
      </header>

      <div className="rounded-lg border bg-background p-4 text-sm shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" onClick={openCreate}>
            Créer un compte staff
          </Button>
        </div>

        {resendSuccess && (
          <div className="mb-4 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800">
            <p>{resendSuccess}</p>
            {resendInviteUrl && (
              <>
                <p className="mt-2 break-all font-mono text-[11px]">
                  {resendInviteUrl}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
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
                </Button>
                {resendCopyFeedback && (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    {resendCopyFeedback}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {resendError && (
          <p className="mb-4 text-xs text-red-600">{resendError}</p>
        )}

        {statusInfo && (
          <p className="mb-2 text-xs text-emerald-700">{statusInfo}</p>
        )}
        {statusError && (
          <p className="mb-2 text-xs text-red-600">{statusError}</p>
        )}
        {classesError && (
          <p className="mb-2 text-xs text-red-600">{classesError}</p>
        )}

        {loading && (
          <p className="text-sm text-muted-foreground">
            Chargement des comptes staff...
          </p>
        )}

        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && filteredStaff.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun compte staff pour le moment.
          </p>
        )}

        {!loading && !error && filteredStaff.length > 0 && (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/60">
                <tr>
                  <th className="px-4 py-2 text-left">Nom</th>
                  <th className="px-4 py-2 text-left">Email de connexion</th>
                  <th className="px-4 py-2 text-left">Email de contact</th>
                <th className="px-4 py-2 text-left">Téléphone</th>
                <th className="px-4 py-2 text-left">Fonction</th>
                <th className="px-4 py-2 text-left">Classes assignées</th>
                <th className="px-4 py-2 text-left">Statut</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s) => (
                  <tr key={s.staff_id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <div className="font-medium">{s.full_name}</div>
                      {s.employee_no && (
                        <div className="text-xs text-muted-foreground">
                          Matricule : {s.employee_no}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{s.email}</td>
                    <td className="px-4 py-2 text-xs">
                      {s.contact_email || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {s.phone || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {s.department || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {renderAssignedClasses(s.assigned_class_ids)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.active}
                          onCheckedChange={() => toggleActive(s)}
                          disabled={togglingId === s.staff_id}
                        />
                        <span className="text-xs">
                          {s.active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(s)}
                        >
                          Modifier
                        </Button>
                        {s.must_change_password && !s.last_login && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvite(s)}
                            disabled={resendLoadingId === s.staff_id}
                          >
                            {resendLoadingId === s.staff_id
                              ? "Envoi..."
                              : "Renvoyer l'invitation"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale création staff */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(state) => {
          setShowCreateModal(state);
          if (!state) {
            setCreateError(null);
            setCreateSuccess(null);
            setCreateInviteUrl(null);
            setCreateCopyFeedback(null);
            setCreateFullName("");
            setCreateLoginEmail("");
            setCreateContactEmail("");
            setCreatePhone("");
            setCreateDepartment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un compte staff</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Nom complet</p>
              <Input
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                Email de connexion (optionnel)
              </p>
              <Input
                type="email"
                value={createLoginEmail}
                onChange={(e) => setCreateLoginEmail(e.target.value)}
                placeholder="staff@ecole.com"
              />
              <p className="text-[11px] text-muted-foreground">
                Si vous laissez ce champ vide, une adresse sera générée automatiquement.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email de contact (facultatif)</p>
              <Input
                type="email"
                value={createContactEmail}
                onChange={(e) => setCreateContactEmail(e.target.value)}
                placeholder="Laisser vide si identique"
              />
            </div>

            <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Le matricule staff est généré automatiquement (ex&nbsp;: STF-2025-00001).
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Téléphone (facultatif)</p>
              <Input
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="+213..."
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Fonction / rôle interne</p>
              <Input
                value={createDepartment}
                onChange={(e) => setCreateDepartment(e.target.value)}
                placeholder="Secrétariat, Vie scolaire..."
              />
            </div>
          </div>

          {createError && (
            <p className="text-xs text-red-600">{createError}</p>
          )}

          {createSuccess && createInviteUrl && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <p>{createSuccess}</p>
              <p className="mt-2 font-semibold">Lien d&apos;invitation :</p>
              <p className="break-all font-mono text-[11px]">{createInviteUrl}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(createInviteUrl);
                    setCreateCopyFeedback("Lien copié dans le presse-papiers.");
                  } catch (err) {
                    console.error(err);
                    setCreateCopyFeedback("Impossible de copier le lien.");
                  }
                }}
              >
                Copier le lien
              </Button>
              {createCopyFeedback && (
                <p className="mt-1 text-[11px] text-emerald-700">{createCopyFeedback}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={savingCreate}
            >
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={savingCreate}>
              {savingCreate ? "Création..." : "Créer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale édition staff */}
      <Dialog
        open={showEditModal}
        onOpenChange={(state) => {
          setShowEditModal(state);
          if (!state) {
            setEditingStaff(null);
            setEditFullName("");
            setEditEmail("");
            setEditContactEmail("");
            setEditPhone("");
            setEditDepartment("");
            setEditAssignedClasses([]);
            setClassAssignFeedback(null);
            setClassAssignError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le compte staff</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Nom complet</p>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email de contact</p>
              <Input
                type="email"
                value={editContactEmail}
                onChange={(e) => setEditContactEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Téléphone</p>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+213..."
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Fonction</p>
              <Input
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="Secrétariat, Vie scolaire..."
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Classes assignées ({editAssignedClasses.length})
              </p>
              <select
                multiple
                value={editAssignedClasses}
                onChange={handleAssignedClassesChange}
                className="h-40 w-full rounded-md border px-3 py-2 text-sm"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.label} ({cls.code}) – {cls.academic_year}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Le staff ne verra que les classes sélectionnées.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveClassAssignments}
                  disabled={savingClassAssignments}
                >
                  {savingClassAssignments
                    ? "Enregistrement..."
                    : "Enregistrer les classes"}
                </Button>
                {classAssignFeedback && (
                  <span className="text-xs text-emerald-700">{classAssignFeedback}</span>
                )}
                {classAssignError && (
                  <span className="text-xs text-red-600">{classAssignError}</span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingStaff(null);
                setEditContactEmail("");
                setEditPhone("");
                setEditDepartment("");
              }}
              disabled={savingEdit}
            >
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={savingEdit}>
              {savingEdit ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
