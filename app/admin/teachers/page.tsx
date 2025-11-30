"use client";

import { useEffect, useState } from "react";
import { teachersApi, type AdminTeacher } from "@/lib/api/teachers";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EditTeacherModal } from "@/components/admin/EditTeacherModal";
import { CreateTeacherModal } from "@/components/admin/CreateTeacherModal";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacher | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  const handleToggleActive = async (teacher: AdminTeacher) => {
    try {
      await teachersApi.updateStatus(teacher.user_id, !teacher.active);
      setTeachers((prev) =>
        prev.map((t) =>
          t.user_id === teacher.user_id ? { ...t, active: !t.active } : t
        )
      );
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la mise à jour du statut du professeur");
    }
  };

  const handleTeacherUpdated = (updated: AdminTeacher) => {
    setTeachers((prev) =>
      prev.map((t) => (t.user_id === updated.user_id ? updated : t))
    );
  };

  const handleTeacherCreated = (created: AdminTeacher) => {
    setTeachers((prev) => [...prev, created]);
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
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Téléphone</th>
                <th className="px-4 py-2 text-left">Spécialité</th>
                <th className="px-4 py-2 text-left">Bureau</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.user_id} className="border-b last:border-0">
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
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={t.active}
                        onCheckedChange={() => handleToggleActive(t)}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTeacher(t)}
                    >
                      Modifier
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale édition */}
      {selectedTeacher && (
        <EditTeacherModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
          onSaved={handleTeacherUpdated}
        />
      )}

      {/* Modale création */}
      <CreateTeacherModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleTeacherCreated}
      />
    </main>
  );
}
