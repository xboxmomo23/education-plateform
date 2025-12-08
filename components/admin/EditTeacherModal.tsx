"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { teachersApi, type AdminTeacher } from "@/lib/api/teachers";

interface ClassOption {
  id: string;
  label: string;
  code: string;
  academic_year: number;
}

interface EditTeacherModalProps {
  teacher: AdminTeacher;
  classes: ClassOption[];
  onClose: () => void;
  onSaved: (updated: AdminTeacher) => void;
}

export function EditTeacherModal({
  teacher,
  classes,
  onClose,
  onSaved,
}: EditTeacherModalProps) {
  const [form, setForm] = useState({
    full_name: teacher.full_name || "",
    email: teacher.email || "",
    employee_no: teacher.employee_no || "",
    hire_date: teacher.hire_date || "",
    specialization: teacher.specialization || "",
    phone: teacher.phone || "",
    office_room: teacher.office_room || "",
    contact_email: teacher.contact_email || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<string[]>(
    teacher.assigned_class_ids ?? []
  );
  const [savingClasses, setSavingClasses] = useState(false);
  const [classMessage, setClassMessage] = useState<string | null>(null);
  const [classError, setClassError] = useState<string | null>(null);

  useEffect(() => {
    setAssignedClasses(teacher.assigned_class_ids ?? []);
  }, [teacher]);

  const selectedClassCount = useMemo(() => assignedClasses.length, [assignedClasses]);

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher.user_id) {
      setError("Professeur invalide (user_id manquant)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await teachersApi.update(teacher.user_id, {
        ...form,
      });

      if (!res.success || !res.data) {
        setError("Erreur lors de la mise à jour du professeur");
        return;
      }

      onSaved(res.data);
      setAssignedClasses(res.data.assigned_class_ids ?? []);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la mise à jour du professeur");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignedChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setAssignedClasses(values);
    setClassMessage(null);
    setClassError(null);
  };

  const handleSaveClasses = async () => {
    if (!teacher.user_id) {
      setClassError("Professeur invalide (user_id manquant)");
      return;
    }

    try {
      setSavingClasses(true);
      setClassError(null);
      setClassMessage(null);
      const res = await teachersApi.updateClasses(
        teacher.user_id,
        assignedClasses
      );
      if (!res.success || !res.data) {
        setClassError(res.error || "Impossible de mettre à jour les classes.");
        return;
      }
      setAssignedClasses(res.data.assigned_class_ids ?? []);
      onSaved(res.data);
      setClassMessage("Classes assignées mises à jour.");
    } catch (err: any) {
      console.error(err);
      setClassError(err.message || "Erreur lors de la mise à jour des classes.");
    } finally {
      setSavingClasses(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Modifier le professeur</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input
                value={form.full_name}
                onChange={handleChange("full_name")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email de contact</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={handleChange("contact_email")}
              placeholder="Facultatif"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Matricule</Label>
              <Input
                value={form.employee_no}
                onChange={handleChange("employee_no")}
                placeholder="Ex: P-2025-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;embauche</Label>
              <Input
                type="date"
                value={form.hire_date}
                onChange={handleChange("hire_date")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Spécialité</Label>
            <Input
              value={form.specialization}
              onChange={handleChange("specialization")}
              placeholder="Mathématiques, Physique..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="+213..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bureau</Label>
              <Input
                value={form.office_room}
                onChange={handleChange("office_room")}
                placeholder="Bureau 12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Classes assignées ({selectedClassCount})</Label>
            <select
              multiple
              value={assignedClasses}
              onChange={handleAssignedChange}
              className="h-40 w-full rounded-md border px-3 py-2 text-sm"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.label} ({cls.code}) – {cls.academic_year}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Le professeur ne verra que les classes sélectionnées.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveClasses}
                disabled={savingClasses}
              >
                {savingClasses ? "Enregistrement..." : "Enregistrer les classes"}
              </Button>
              {classMessage && (
                <span className="text-xs text-emerald-700">{classMessage}</span>
              )}
              {classError && (
                <span className="text-xs text-red-600">{classError}</span>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
