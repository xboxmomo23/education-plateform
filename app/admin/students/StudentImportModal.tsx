"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { previewStudentImportApi, commitStudentImportApi } from "@/lib/api/students-import";
import type {
  StudentImportResponse,
  StudentImportSummary,
  StudentImportRow,
} from "@/lib/api/students-import";
import { notify } from "@/lib/toast";

interface ClassOption {
  id: string;
  code: string;
  label: string;
}

interface StudentImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassOption[];
  onImportCompleted?: (summary: StudentImportSummary) => void;
}

const MAX_ROWS = 500;

function formatStatus(status: StudentImportRow["status"]) {
  switch (status) {
    case "OK":
      return "OK";
    case "WARNING":
      return "Avertissement";
    case "ERROR":
      return "Erreur";
    default:
      return status;
  }
}

function statusColor(status: StudentImportRow["status"]) {
  if (status === "OK") return "text-emerald-600";
  if (status === "WARNING") return "text-amber-600";
  return "text-red-600";
}

export function StudentImportModal({
  open,
  onOpenChange,
  classes,
  onImportCompleted,
}: StudentImportModalProps) {
  const [csvContent, setCsvContent] = useState<string>("");
  const [csvName, setCsvName] = useState<string>("");
  const [defaultClassId, setDefaultClassId] = useState<string>("");
  const [sendInvites, setSendInvites] = useState(false);
  const [previewResult, setPreviewResult] = useState<StudentImportResponse["data"] | null>(null);
  const [commitResult, setCommitResult] = useState<StudentImportResponse["data"] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeResult = commitResult ?? previewResult;

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);

  const hasBlockingErrors = activeResult ? activeResult.summary.errors > 0 : true;

  function resetState() {
    setCsvContent("");
    setCsvName("");
    setPreviewResult(null);
    setCommitResult(null);
    setSendInvites(false);
    setError(null);
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetState();
    }
    onOpenChange(value);
  };

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 1.6 * 1024 * 1024) {
      setError("Le fichier est trop volumineux (max ~1.5MB).");
      return;
    }
    const text = await file.text();
    setCsvContent(text);
    setCsvName(file.name);
    setPreviewResult(null);
    setCommitResult(null);
    setError(null);
  }

  async function handleAnalyze() {
    if (!csvContent) {
      setError("Merci de sélectionner un fichier CSV.");
      return;
    }
    try {
      setAnalyzing(true);
      setError(null);
      const payload = {
        csvData: csvContent,
        defaultClassId: defaultClassId || undefined,
      };
      const response = await previewStudentImportApi(payload);
      if (!response.success) {
        throw new Error(response.error || "Analyse impossible");
      }
      setPreviewResult(response.data);
      setCommitResult(null);
      notify.success("Analyse terminée", `${response.data.summary.ok} lignes OK`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'analyse.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport() {
    if (!previewResult) {
      setError("Merci de lancer une analyse avant d'importer.");
      return;
    }
    if (previewResult.summary.total > MAX_ROWS) {
      setError(`Merci de limiter le fichier à ${MAX_ROWS} lignes.`);
      return;
    }
    if (previewResult.summary.errors > 0) {
      setError("Corrigez les erreurs avant d'importer.");
      return;
    }
    try {
      setImporting(true);
      setError(null);
      const payload = {
        csvData: csvContent,
        defaultClassId: defaultClassId || undefined,
        sendInvites,
      };
      const response = await commitStudentImportApi(payload);
      if (!response.success) {
        throw new Error(response.error || "Import impossible");
      }
      setCommitResult(response.data);
      notify.success(
        "Import terminé",
        `${response.data.summary.createdCount} élève(s) créé(s)`
      );
      onImportCompleted?.(response.data.summary);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'import.");
    } finally {
      setImporting(false);
    }
  }

  function handleDownloadReport() {
    if (!commitResult) {
      return;
    }
    const blob = new Blob([JSON.stringify(commitResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `import-eleves-${new Date().toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importer un CSV d&apos;élèves</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="student-import-file">Fichier CSV</Label>
            <Input
              id="student-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
            {csvName && (
              <p className="text-xs text-muted-foreground">Fichier sélectionné : {csvName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Format attendu : colonnes full_name, contact_email, date_of_birth, student_number,
              login_email, class_code, class_label, existing_parent_email, parent_first_name,
              parent_last_name. Séparateur ; ou , (maximum {MAX_ROWS} lignes).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Classe par défaut</Label>
              <Select
                value={defaultClassId || "none"}
                onValueChange={(value) => {
                  setDefaultClassId(value === "none" ? "" : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une classe (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Définie par le CSV</SelectItem>
                  {sortedClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.label} {cls.code ? `(${cls.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Utilisée si aucune classe n&apos;est définie dans le fichier.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox
                id="import-send-invites"
                checked={sendInvites}
                onCheckedChange={(value) => setSendInvites(Boolean(value))}
              />
              <div>
                <Label htmlFor="import-send-invites">Envoyer les invitations après import</Label>
                <p className="text-xs text-muted-foreground">
                  Désactivé par défaut pour éviter le spam.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleAnalyze} disabled={analyzing} variant="secondary">
              {analyzing ? "Analyse en cours..." : "Analyser"}
            </Button>
            <Button onClick={handleImport} disabled={importing || hasBlockingErrors}>
              {importing ? "Import en cours..." : "Importer"}
            </Button>
            {commitResult && (
              <Button type="button" variant="outline" onClick={handleDownloadReport}>
                Télécharger le rapport
              </Button>
            )}
          </div>

          {activeResult && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-5">
                <Stat label="Total" value={activeResult.summary.total} />
                <Stat label="OK" value={activeResult.summary.ok} />
                <Stat label="Warnings" value={activeResult.summary.warnings} tone="warning" />
                <Stat label="Erreurs" value={activeResult.summary.errors} tone="error" />
                <Stat
                  label="Créations"
                  value={activeResult.summary.createdCount}
                  tone="success"
                />
              </div>

              <ScrollArea className="h-96 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Élève</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Email généré</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeResult.rows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell className="space-y-1 text-sm">
                          <div className="font-medium">{row.input.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            contact: {row.input.contact_email}
                          </div>
                          {row.input.login_email && (
                            <div className="text-xs text-muted-foreground">
                              login: {row.input.login_email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.input.class_code || row.input.class_label || "—"}
                        </TableCell>
                        <TableCell className={`text-sm font-semibold ${statusColor(row.status)}`}>
                          {formatStatus(row.status)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.error && <p className="text-red-600">{row.error}</p>}
                          {row.warnings.map((warning) => (
                            <p key={warning} className="text-amber-600">
                              {warning}
                            </p>
                          ))}
                          {!row.error && row.warnings.length === 0 && row.created && (
                            <p className="text-muted-foreground">Création prévue</p>
                          )}
                          {!row.error && !row.created && row.status !== "WARNING" && (
                            <p className="text-muted-foreground">Ignoré</p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.generatedLoginEmail || row.input.login_email || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StatProps {
  label: string;
  value: number;
  tone?: "success" | "warning" | "error";
}

function Stat({ label, value, tone }: StatProps) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "error"
          ? "text-red-600"
          : "text-foreground";
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
