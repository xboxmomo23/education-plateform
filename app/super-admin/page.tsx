"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/api-client";

interface Establishment {
  id: string;
  name: string;
  code: string;
  type: string | null;
  city: string | null;
  email: string;
  active: boolean;
  admins_count?: string | number;
}

interface EstablishmentsResponse {
  success: boolean;
  data: Establishment[];
}

export default function SuperAdminDashboardPage() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch<EstablishmentsResponse>(
          "/super-admin/establishments"
        );

        if (res.success) {
          setEstablishments(res.data);
        } else {
          setError("Impossible de charger les établissements");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const totalEstablishments = establishments.length;
  const activeEstablishments = establishments.filter((e) => e.active).length;
  const totalAdmins = establishments.reduce((sum, e) => {
    const n = Number(e.admins_count ?? 0);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin</h1>
          <p className="text-muted-foreground">
            Interface de gestion globale de la plateforme.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/super-admin/establishments"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Gérer les établissements
          </Link>
          <Link
            href="/super-admin/school-admins"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Gérer les admins d&apos;école
          </Link>
        </div>
      </header>

      {/* États de chargement / erreur */}
      {loading && (
        <p className="text-sm text-muted-foreground">
          Chargement des statistiques...
        </p>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Cartes de stats */}
      {!loading && !error && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Établissements total
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalEstablishments}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Établissements actifs
            </p>
            <p className="mt-2 text-3xl font-bold">
              {activeEstablishments}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Admins d&apos;école
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalAdmins}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
