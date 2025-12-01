"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { coursesApi, type AdminCourse } from "@/lib/api/courses";
import { subjectsApi, type Subject } from "@/lib/api/subjects";
import { teachersApi, type AdminTeacher } from "@/lib/api/teachers";

interface ClassOption {
  id: string;
  label: string;
}

interface CourseModalProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  classLabel: string;
  course?: AdminCourse | null;
  onSaved: (course: AdminCourse) => void;
  classes: ClassOption[]; // pour pouvoir changer de classe plus tard si tu veux
}

export function CourseModal({
  open,
  onClose,
  classId,
  classLabel,
  course,
  onSaved,
}: CourseModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);

  const [form, setForm] = useState({
    subject_id: "",
    teacher_id: "",
    default_room: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingLists(true);
        setError(null);

        const [subjectsRes, teachersRes] = await Promise.all([
          subjectsApi.list(),
          teachersApi.list(),
        ]);

        if (subjectsRes.success) setSubjects(subjectsRes.data);
        if (teachersRes.success) setTeachers(teachersRes.data);
      } catch (err: any) {
        console.error(err);
        setError(
          err.message || "Erreur lors du chargement des matières / professeurs"
        );
      } finally {
        setLoadingLists(false);
      }
    }

    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (course) {
      setForm({
        subject_id: course.subject_id,
        teacher_id: course.teacher_id,
        default_room: course.default_room || "",
      });
    } else {
      setForm({
        subject_id: "",
        teacher_id: "",
        default_room: "",
      });
    }
  }, [course, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (course) {
        const res = await coursesApi.update(course.id, {
          subject_id: form.subject_id || undefined,
          teacher_id: form.teacher_id || undefined,
          default_room: form.default_room || undefined,
        });

        if (!res.success || !res.data) {
          setError(res.error || "Erreur lors de la modification du cours");
          return;
        }

        onSaved(res.data);
      } else {
        const res = await coursesApi.create({
          class_id: classId,
          subject_id: form.subject_id,
          teacher_id: form.teacher_id,
          default_room: form.default_room || undefined,
        });

        if (!res.success || !res.data) {
          setError(res.error || "Erreur lors de la création du cours");
          return;
        }

        onSaved(res.data);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'enregistrement du cours");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {course ? "Modifier le cours" : "Créer un cours"} – {classLabel}
          </DialogTitle>
        </DialogHeader>

        {loadingLists ? (
          <div className="py-6 text-sm text-muted-foreground">
            Chargement des matières et professeurs...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Matière</Label>
              <Select
                value={form.subject_id}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, subject_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.short_code ? `${s.short_code} – ${s.name}` : s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Professeur</Label>
              <Select
                value={form.teacher_id}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, teacher_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un professeur" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {t.full_name} – {t.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Salle par défaut</Label>
              <Input
                value={form.default_room}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    default_room: e.target.value,
                  }))
                }
                placeholder="Ex: 203, Lab 1..."
              />
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
              <Button
                type="submit"
                disabled={
                  loading || !form.subject_id || !form.teacher_id
                }
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
