"use client";

import { useEffect, useMemo, useState } from "react";
import { teachersApi, type AdminTeacher } from "@/lib/api/teachers";
import { apiFetch } from "@/lib/api/api-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EditTeacherModal } from "@/components/admin/EditTeacherModal";
import { CreateTeacherModal } from "@/components/admin/CreateTeacherModal";

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

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacher | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resendInfo, setResendInfo] = useState<{ message: string; inviteUrl?: string } | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCopyFeedback, setResendCopyFeedback] = useState<string | null>(null);
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const classLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    classes.forEach((cls) => {
      map[cls.id] = `${cls.label}${cls.code ? ` (${cls.code})` : ""}`;
    });
    return map;
  }, [classes]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await teachersApi.list();
      if (res.success) {
        setTeachers(res.data);
      } else {
        setError("Impossible de charger les professeurs");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des professeurs");
    } finally {
      setLoading(false);
    }
  }

  async function loadClasses() {
    try {
      setClassesError(null);
      const res = await apiFetch<ClassesResponse>("/admin/classes");
      if (res.success) {
        setClasses(res.data);
      } else {
        setClasses([]);
        setClassesError("Impossible de charger les classes.");
      }
    } catch (err: any) {
      console.error(err);
      setClasses([]);
      setClassesError(err.message || "Erreur lors du chargement des classes.");
    }
  }

  useEffect(() => {
    load();
    loadClasses();
  }, []);

  const handleToggleActive = async (teacher: AdminTeacher) => {
    if (!teacher.user_id) {
      console.error("Teacher sans user_id, impossible de changer le statut", teacher);
      return;
    }

    try {
      setTogglingId(teacher.user_id);
      setStatusInfo(null);
      setStatusError(null);
      await teachersApi.updateStatus(teacher.user_id, !teacher.active);
      setTeachers((prev) =>
        prev.map((t) =>
          t.user_id === teacher.user_id ? { ...t, active: !t.active } : t
        )
      );
      setStatusInfo(
        `Compte professeur ${teacher.full_name} ${
          teacher.active ? "désactivé" : "réactivé"
        }.`
      );
    } catch (err: any) {
      console.error(err);
      setStatusError(err.message || "Erreur lors de la mise à jour du statut du professeur.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleResendInvite = async (teacher: AdminTeacher) => {
    if (!teacher.user_id) return;
    try {
      setResendLoadingId(teacher.user_id);
      setResendError(null);
      setResendInfo(null);
      setResendCopyFeedback(null);
      const res = await teachersApi.resendInvite(teacher.user_id);
      if (!res.success) {
        setResendError(res.error || "Impossible de renvoyer l'invitation.");
        return;
      }
      setResendInfo({
        message: `Invitation renvoyée à ${teacher.full_name}.`,
        inviteUrl: res.inviteUrl,
      });
    } catch (err: any) {
      console.error(err);
      setResendError(err.message || "Erreur lors de l'envoi de l'invitation.");
    } finally {
      setResendLoadingId(null);
    }
  };

  const handleTeacherUpdated = (updated: AdminTeacher) => {
    setTeachers((prev) =>
      prev.map((t) => (t.user_id === updated.user_id ? updated : t))
    );
    if (selectedTeacher && selectedTeacher.user_id === updated.user_id) {
      setSelectedTeacher(updated);
    }
  };

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Professeurs</h1>
          <p className="text-sm text-muted-foreground">
            Gérer les comptes professeurs de votre établissement.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>+ Créer un professeur</Button>
      </header>

      {statusInfo && (
        <p className="mb-3 text-sm text-emerald-700">{statusInfo}</p>
      )}
      {statusError && (
        <p className="mb-3 text-sm text-red-600">{statusError}</p>
      )}
      {classesError && (
        <p className="mb-3 text-sm text-red-600">{classesError}</p>
      )}

      {resendInfo && (
        <div className="mb-4 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800">
          <p>{resendInfo.message}</p>
          {resendInfo.inviteUrl && (
            <>
              <p className="mt-2 break-all font-mono text-[11px]">
                {resendInfo.inviteUrl}
              </p>
              <button
                type="button"
                className="mt-2 rounded border px-2 py-1 font-medium hover:bg-white"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resendInfo.inviteUrl!);
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
                <p className="text-[11px] text-emerald-700">
                  {resendCopyFeedback}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {resendError && (
        <p className="mb-4 text-sm text-red-600">{resendError}</p>
      )}

      {/* États de chargement / erreur */}
      {loading && (
        <p className="text-sm text-muted-foreground">
          Chargement des professeurs...
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && teachers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun professeur pour le moment. Cliquez sur &quot;Créer un professeur&quot;
          pour ajouter un compte.
        </p>
      )}

      {/* Tableau */}
      {!loading && !error && teachers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-muted/60">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-left">Email de connexion</th>
                <th className="px-4 py-2 text-left">Email de contact</th>
                <th className="px-4 py-2 text-left">Téléphone</th>
                <th className="px-4 py-2 text-left">Spécialité</th>
                <th className="px-4 py-2 text-left">Bureau</th>
                <th className="px-4 py-2 text-left">Classes assignées</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.user_id || t.email} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{t.full_name}</div>
                    {t.employee_no && (
                      <div className="text-xs text-muted-foreground">
                        Matricule : {t.employee_no}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs font-mono">{t.email}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {t.contact_email || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {t.phone || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {t.specialization || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {t.office_room || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {renderAssignedClasses(t.assigned_class_ids)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={t.active}
                        onCheckedChange={() => handleToggleActive(t)}
                        disabled={togglingId === t.user_id}
                      />
                      <Badge
                        variant={t.active ? "default" : "outline"}
                        className={t.active ? "bg-emerald-100 text-emerald-800" : ""}
                      >
                        {t.active ? "Actif" : "Désactivé"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTeacher(t)}
                        disabled={!t.user_id}
                      >
                        Modifier
                      </Button>
                      {t.must_change_password && !t.last_login && t.user_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResendInvite(t)}
                          disabled={resendLoadingId === t.user_id}
                        >
                          {resendLoadingId === t.user_id
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

      {/* Modale édition */}
      {selectedTeacher && selectedTeacher.user_id && (
        <EditTeacherModal
          teacher={selectedTeacher}
          classes={classes}
          onClose={() => setSelectedTeacher(null)}
          onSaved={handleTeacherUpdated}
        />
      )}

      {/* Modale création :
          onCreated => on ferme + on recharge la liste propre depuis l'API */}
      <CreateTeacherModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={load}
      />
    </main>
  );
}
