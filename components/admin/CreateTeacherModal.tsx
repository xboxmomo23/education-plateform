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

interface CreateTeacherModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (teacher: AdminTeacher) => void;
}

export function CreateTeacherModal({
  open,
  onClose,
  onCreated,
}: CreateTeacherModalProps) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    employee_no: "",
    hire_date: "",
    specialization: "",
    phone: "",
    office_room: "",
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
    setLoading(true);
    setError(null);

    try {
      const res = await teachersApi.create({
        full_name: form.full_name,
        email: form.email,
        password: form.password || undefined, // backend mettra "prof123" si vide
        employee_no: form.employee_no || undefined,
        hire_date: form.hire_date || undefined,
        specialization: form.specialization || undefined,
        phone: form.phone || undefined,
        office_room: form.office_room || undefined,
      });

      if (!res.success || !res.data) {
        setError("Erreur lors de la création du professeur");
        return;
      }

      onCreated(res.data); // on met à jour la liste dans la page
      onClose();
      setForm({
        full_name: "",
        email: "",
        password: "",
        employee_no: "",
        hire_date: "",
        specialization: "",
        phone: "",
        office_room: "",
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la création du professeur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Créer un professeur</DialogTitle>
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
            <Label>Mot de passe initial</Label>
            <Input
              type="text"
              value={form.password}
              onChange={handleChange("password")}
              placeholder='Laisser vide pour "prof123"'
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
              {loading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
