"use client";

import { useState } from "react";
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

interface EditTeacherModalProps {
  teacher: AdminTeacher;
  onClose: () => void;
  onSaved: (updated: AdminTeacher) => void;
}

export function EditTeacherModal({
  teacher,
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
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la mise à jour du professeur");
    } finally {
      setLoading(false);
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
