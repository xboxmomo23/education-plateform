"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subjectsApi, type Subject } from "@/lib/api/subjects";

interface SubjectModalProps {
  open: boolean;
  onClose: () => void;
  subject?: Subject | null;
  onSaved: (subject: Subject) => void;
}

export function SubjectModal({
  open,
  onClose,
  subject,
  onSaved,
}: SubjectModalProps) {
  const [form, setForm] = useState({
    name: "",
    short_code: "",
    color: "#6366f1",
    level: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subject) {
      setForm({
        name: subject.name || "",
        short_code: subject.short_code || "",
        color: subject.color || "#6366f1",
        level: subject.level || "",
      });
    } else {
      setForm({
        name: "",
        short_code: "",
        color: "#6366f1",
        level: "",
      });
    }
  }, [subject, open]);

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
      if (subject) {
        const res = await subjectsApi.update(subject.id, {
          name: form.name,
          short_code: form.short_code || undefined,
          color: form.color || undefined,
          level: form.level || undefined,
        });

        if (!res.success || !res.data) {
          setError(res.error || "Erreur lors de la modification de la matière");
          return;
        }
        onSaved(res.data);
      } else {
        const res = await subjectsApi.create({
          name: form.name,
          short_code: form.short_code || undefined,
          color: form.color || undefined,
          level: form.level || undefined,
        });

        if (!res.success || !res.data) {
          setError(res.error || "Erreur lors de la création de la matière");
          return;
        }
        onSaved(res.data);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {subject ? "Modifier la matière" : "Créer une matière"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input
              value={form.name}
              onChange={handleChange("name")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Code court</Label>
            <Input
              value={form.short_code}
              onChange={handleChange("short_code")}
              placeholder="Ex: MATH, PHY, HIST"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <Input
                type="color"
                value={form.color}
                onChange={handleChange("color")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Niveau / cycle</Label>
              <Input
                value={form.level}
                onChange={handleChange("level")}
                placeholder="Collège, Lycée..."
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
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
