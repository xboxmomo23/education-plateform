"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { teachersApi } from "@/lib/api/teachers";

interface CreateTeacherModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void; // ✅ on ne passe plus l'objet prof
}

export function CreateTeacherModal({
  open,
  onClose,
  onCreated,
}: CreateTeacherModalProps) {
  const [form, setForm] = useState({
    full_name: "",
    login_email: "",
    contact_email: "",
    hire_date: "",
    specialization: "",
    phone: "",
    office_room: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm({
        full_name: "",
        login_email: "",
        contact_email: "",
        hire_date: "",
        specialization: "",
        phone: "",
        office_room: "",
      });
      setError(null);
      setInviteUrl(null);
      setCopyFeedback(null);
      setSuccessMessage(null);
    }
  }, [open]);

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Le nom complet est obligatoire.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setInviteUrl(null);
    setCopyFeedback(null);

    try {
      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
      };
      if (form.login_email.trim()) {
        payload.login_email = form.login_email.trim();
      }
      if (form.contact_email.trim()) {
        payload.contact_email = form.contact_email.trim();
      }
      if (form.hire_date) {
        payload.hire_date = form.hire_date;
      }
      if (form.specialization.trim()) {
        payload.specialization = form.specialization.trim();
      }
      if (form.phone.trim()) {
        payload.phone = form.phone.trim();
      }
      if (form.office_room.trim()) {
        payload.office_room = form.office_room.trim();
      }

      const res = await teachersApi.create(payload as {
        full_name: string;
        login_email?: string;
        contact_email?: string;
        hire_date?: string;
        specialization?: string;
        phone?: string;
        office_room?: string;
      });

      if (!res.success) {
        setError(res.message || res.error || "Erreur lors de la création du professeur");
        return;
      }

      onCreated();
      setInviteUrl(res.inviteUrl || null);
      setSuccessMessage("Le professeur a été créé. Copiez le lien ci-dessous et envoyez-le.");
      setForm((prev) => ({
        ...prev,
        full_name: "",
        login_email: "",
        contact_email: "",
        hire_date: "",
        specialization: "",
        phone: "",
        office_room: "",
      }));
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
              <Label>Email de connexion (optionnel)</Label>
              <Input
                type="email"
                value={form.login_email}
                onChange={handleChange("login_email")}
                placeholder="professeur@ecole.com"
              />
              <p className="text-xs text-muted-foreground">
                Si vous laissez ce champ vide, une adresse sera générée automatiquement.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email de contact (facultatif)</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={handleChange("contact_email")}
              placeholder="Laisser vide si identique"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date d&apos;embauche</Label>
              <Input
                type="date"
                value={form.hire_date}
                onChange={handleChange("hire_date")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Matricule</Label>
              <Input value="Généré automatiquement" disabled readOnly />
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

          {successMessage && inviteUrl && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <p>{successMessage}</p>
              <p className="mt-2 font-semibold">Lien d&apos;invitation :</p>
              <p className="break-all font-mono text-[11px]">{inviteUrl}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                    setCopyFeedback("Lien copié dans le presse-papiers.");
                  } catch (copyError) {
                    console.error(copyError);
                    setCopyFeedback("Impossible de copier le lien.");
                  }
                }}
              >
                Copier le lien
              </Button>
              {copyFeedback && (
                <p className="mt-1 text-[11px] text-emerald-700">{copyFeedback}</p>
              )}
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
