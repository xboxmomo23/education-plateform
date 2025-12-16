"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchParentsDirectory, ParentDirectoryItem } from "@/lib/api/parents";
import { notify } from "@/lib/toast";

export default function AdminParentsPage() {
  const [parents, setParents] = useState<ParentDirectoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchParentsDirectory({
          q: debouncedSearch || undefined,
          limit: 200,
        });
        if (!cancelled) {
          if (response.success) {
            setParents(response.data);
          } else {
            setError(response.error || "Impossible de charger les parents.");
            setParents([]);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Erreur lors du chargement des parents.");
          setParents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const filteredCount = parents.length;

  async function handleCopy(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      notify.success("Email copié", email);
    } catch {
      notify.error("Impossible de copier l'email");
    }
  }

  const tableContent = useMemo(() => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
            Chargement des parents...
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="py-10 text-center text-sm text-red-600">
            {error}
          </TableCell>
        </TableRow>
      );
    }

    if (parents.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
            Aucun parent trouvé.
          </TableCell>
        </TableRow>
      );
    }

    return parents.map((parent) => (
      <TableRow key={parent.parent_id}>
        <TableCell className="text-sm">
          <div className="font-medium">
            {[parent.first_name, parent.last_name].filter(Boolean).join(" ") || "Parent"}
          </div>
          <div className="text-xs text-muted-foreground">ID: {parent.parent_id}</div>
        </TableCell>
        <TableCell className="text-sm">
          <div className="font-mono text-xs">{parent.login_email}</div>
        </TableCell>
        <TableCell className="text-sm">
          {parent.contact_email && parent.contact_email !== parent.login_email ? (
            <div className="font-mono text-xs">{parent.contact_email}</div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-sm">
          {parent.students.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {parent.students.map((student) => (
                <li key={student.student_id}>
                  <span className="font-medium text-foreground">{student.full_name}</span>{" "}
                  {student.class_label ? `(${student.class_label})` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted-foreground">Aucun enfant lié</span>
          )}
        </TableCell>
        <TableCell className="space-y-2 text-sm">
          <Badge
            className={
              parent.active
                ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                : "border border-muted bg-muted text-muted-foreground"
            }
            variant="outline"
          >
            {parent.active ? "Actif" : "Inactif"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleCopy(parent.login_email)}
          >
            Copier l'email
          </Button>
        </TableCell>
      </TableRow>
    ));
  }, [parents, loading, error]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminBackButton className="mb-4" />
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parents</h1>
          <p className="text-sm text-muted-foreground">
            Consultez les comptes parents existants et les élèves associés.
          </p>
        </div>
        <Badge variant="outline">{filteredCount} parent{filteredCount > 1 ? "s" : ""}</Badge>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher (nom parent, email, élève, classe...)"
          className="w-full sm:max-w-md"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parent</TableHead>
              <TableHead>Email de connexion</TableHead>
              <TableHead>Email de contact</TableHead>
              <TableHead>Enfants liés</TableHead>
              <TableHead className="w-48">Statut / Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{tableContent}</TableBody>
        </Table>
      </div>
    </main>
  );
}
