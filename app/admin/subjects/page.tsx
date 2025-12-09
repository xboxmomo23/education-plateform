"use client";

import { useEffect, useState } from "react";
import { subjectsApi, type Subject } from "@/lib/api/subjects";
import { coursesApi, type AdminCourse } from "@/lib/api/courses";
import { teachersApi, type AdminTeacher } from "@/lib/api/teachers";
import { classesApi, type AdminClass } from "@/lib/api/classes"; // ✅ utilisation de l'API existante
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SubjectModal } from "@/components/admin/SubjectModal";
import { CourseModal } from "@/components/admin/CourseModal";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(
    null
  );

  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Chargement matières
  useEffect(() => {
    async function loadSubjects() {
      try {
        setLoadingSubjects(true);
        setSubjectsError(null);
        const res = await subjectsApi.list();
        if (res.success) setSubjects(res.data);
        else setSubjectsError("Impossible de charger les matières");
      } catch (err: any) {
        console.error(err);
        setSubjectsError(
          err.message || "Erreur lors du chargement des matières"
        );
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadSubjects();
  }, []);

  // Chargement classes et profs (pour onglet cours)
  useEffect(() => {
    async function loadClassesAndTeachers() {
      try {
        setLoadingClasses(true);

        // ✅ On utilise les API existantes (pas de fetch direct)
        const [classesRes, teachersRes] = await Promise.all([
          classesApi.list(),
          teachersApi.list(),
        ]);

        if (classesRes.success) {
          setClasses(classesRes.data);
          if (!selectedClassId && classesRes.data.length > 0) {
            setSelectedClassId(classesRes.data[0].id);
          }
        }

        if (teachersRes.success) {
          setTeachers(teachersRes.data);
        }
      } catch (err) {
        console.error("Erreur chargement classes / professeurs:", err);
      } finally {
        setLoadingClasses(false);
      }
    }

    loadClassesAndTeachers();
  }, [selectedClassId]);

  // Chargement des cours pour la classe sélectionnée
  useEffect(() => {
    async function loadCourses() {
      if (!selectedClassId) return;
      try {
        setLoadingCourses(true);
        setCoursesError(null);
        const res = await coursesApi.listForClass(selectedClassId);
        if (res.success) {
          setCourses(res.data);
        } else {
          setCoursesError("Impossible de charger les cours pour cette classe");
        }
      } catch (err: any) {
        console.error(err);
        setCoursesError(err.message || "Erreur lors du chargement des cours");
      } finally {
        setLoadingCourses(false);
      }
    }

    loadCourses();
  }, [selectedClassId]);

  const selectedClassLabel =
    classes.find((c) => c.id === selectedClassId)?.label ||
    classes.find((c) => c.id === selectedClassId)?.code ||
    "Classe";

  const handleSubjectSaved = (subject: Subject) => {
    setSubjects((prev) => {
      const exists = prev.find((s) => s.id === subject.id);
      if (exists) {
        return prev.map((s) => (s.id === subject.id ? subject : s));
      }
      return [...prev, subject];
    });
  };

  const handleCourseSaved = (course: AdminCourse) => {
    setCourses((prev) => {
      const exists = prev.find((c) => c.id === course.id);
      if (exists) {
        return prev.map((c) => (c.id === course.id ? course : c));
      }
      return [...prev, course];
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminBackButton className="mb-4" />
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Matières & Cours</h1>
        <p className="text-sm text-muted-foreground">
          Gérer les matières de l&apos;établissement et les affectations
          matière / professeur / classe.
        </p>
      </header>

      <Tabs defaultValue="subjects">
        <TabsList className="mb-4">
          <TabsTrigger value="subjects">Matières</TabsTrigger>
          <TabsTrigger value="courses">Cours par classe</TabsTrigger>
        </TabsList>

        {/* Onglet MATIÈRES */}
        <TabsContent value="subjects">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="font-semibold">Liste des matières</h2>
            <Button
              onClick={() => {
                setSelectedSubject(null);
                setSubjectModalOpen(true);
              }}
            >
              + Créer une matière
            </Button>
          </div>

          {loadingSubjects && (
            <p className="text-sm text-muted-foreground">
              Chargement des matières...
            </p>
          )}

          {subjectsError && (
            <p className="text-sm text-red-600">{subjectsError}</p>
          )}

          {!loadingSubjects && !subjectsError && subjects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune matière pour le moment. Cliquez sur &quot;Créer une
              matière&quot; pour commencer.
            </p>
          )}

          {!loadingSubjects && !subjectsError && subjects.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/60">
                  <tr>
                    <th className="px-4 py-2 text-left">Matière</th>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Niveau</th>
                    <th className="px-4 py-2 text-left">Couleur</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{s.name}</td>
                      <td className="px-4 py-2">
                        {s.short_code || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {s.level || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full border"
                            style={{ backgroundColor: s.color || "#6366f1" }}
                          />
                          <Badge variant="outline" className="text-xs">
                            {s.color || "#6366f1"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSubject(s);
                            setSubjectModalOpen(true);
                          }}
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
        </TabsContent>

        {/* Onglet COURS */}
        <TabsContent value="courses">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Classe :</span>
              <Select
                value={selectedClassId}
                onValueChange={(val) => setSelectedClassId(val)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Choisir une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code ?? c.label ?? "Classe"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                if (!selectedClassId) return;
                setSelectedCourse(null);
                setCourseModalOpen(true);
              }}
              disabled={!selectedClassId}
            >
              + Ajouter un cours
            </Button>
          </div>

          {loadingClasses && (
            <p className="text-sm text-muted-foreground">
              Chargement des classes...
            </p>
          )}

          {!loadingClasses && !selectedClassId && (
            <p className="text-sm text-muted-foreground">
              Aucune classe disponible pour l&apos;instant.
            </p>
          )}

          {loadingCourses && selectedClassId && (
            <p className="text-sm text-muted-foreground">
              Chargement des cours pour cette classe...
            </p>
          )}

          {coursesError && (
            <p className="text-sm text-red-600">{coursesError}</p>
          )}

          {!loadingCourses &&
            !coursesError &&
            selectedClassId &&
            courses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun cours défini pour cette classe. Utilisez le bouton
                &quot;Ajouter un cours&quot;.
              </p>
            )}

          {!loadingCourses && !coursesError && courses.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/60">
                  <tr>
                    <th className="px-4 py-2 text-left">Matière</th>
                    <th className="px-4 py-2 text-left">Professeur</th>
                    <th className="px-4 py-2 text-left">Salle par défaut</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        {c.subject_name || "Matière"}
                      </td>
                      <td className="px-4 py-2">
                        {c.teacher_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {c.default_room || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCourse(c);
                            setCourseModalOpen(true);
                          }}
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
        </TabsContent>
      </Tabs>

      {/* Modale matière */}
      <SubjectModal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        subject={selectedSubject}
        onSaved={handleSubjectSaved}
      />

      {/* Modale cours */}
      {selectedClassId && (
        <CourseModal
          open={courseModalOpen}
          onClose={() => setCourseModalOpen(false)}
          classId={selectedClassId}
          classLabel={selectedClassLabel}
          course={selectedCourse}
          onSaved={handleCourseSaved}
          classes={classes}
        />
      )}
    </main>
  );
}
