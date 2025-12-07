"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/api-client";
import { getUserSession, User } from "@/lib/auth-new";

interface AdminDashboardData {
  establishment: {
    id: string;
    name: string;
    code: string;
    city: string | null;
    type: string | null;
    active: boolean;
    subscription_plan: string | null;
    subscription_start: string | null;
    subscription_end: string | null;
    created_at: string;
  };
  stats: {
    total_classes: number;
    total_students: number;
    total_teachers: number;
    total_staff: number;
  };
}

interface AdminDashboardResponse {
  success: boolean;
  data: AdminDashboardData;
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer l'utilisateur depuis la session (localStorage)
    const sessionUser = getUserSession();
    setUser(sessionUser);

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch<AdminDashboardResponse>("/admin/dashboard");

        if (res.success) {
          setData(res.data);
        } else {
          setError("Impossible de charger le tableau de bord");
        }
      } catch (err: any) {
        console.error(err);
        setError(
          err.message || "Erreur lors du chargement du tableau de bord"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord établissement</h1>
          <p className="text-sm text-muted-foreground">
            Vue d&apos;ensemble de votre école dans EduPilot.
          </p>
        </div>

        {user && (
          <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">
              Connecté en tant que
            </div>
            <div>{user.full_name}</div>
            <div className="font-mono text-[11px]">{user.email}</div>
          </div>
        )}
      </header>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Chargement du tableau de bord...
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && data && (
        <>
          {/* Carte établissement */}
          <section className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {data.establishment.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Code :{" "}
                  <span className="font-mono">
                    {data.establishment.code}
                  </span>
                  {data.establishment.city && ` · ${data.establishment.city}`}
                  {data.establishment.type && ` · ${data.establishment.type}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    data.establishment.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {data.establishment.active
                    ? "Établissement actif"
                    : "Établissement désactivé"}
                </span>
                {data.establishment.subscription_plan && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                    Offre : {data.establishment.subscription_plan}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardStat
                label="Classes"
                value={data.stats.total_classes}
                href="/admin/classes"
              />
              <DashboardStat
                label="Élèves"
                value={data.stats.total_students}
                href="/admin/students"
              />
              <DashboardStat
                label="Professeurs"
                value={data.stats.total_teachers}
                href="/admin/teachers"
              />
              <DashboardStat
                label="Staff & personnel"
                value={data.stats.total_staff}
                href="/admin/staff"
              />
            </div>
          </section>

          {/* Liens rapides */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <QuickLink
              title="Gérer les classes"
              description="Créer, modifier et organiser les classes de votre établissement."
              href="/admin/classes"
            />
            <QuickLink
              title="Gérer les élèves"
              description="Inscrire de nouveaux élèves, mettre à jour les informations."
              href="/admin/students"
            />
            <QuickLink
              title="Professeurs"
              description="Gérer les comptes professeurs et leurs affectations."
              href="/admin/teachers"
            />
            <QuickLink
              title="Matières & cours"
              description="Configurer les matières enseignées et les cours associés."
              href="/admin/subjects"
            />
            <QuickLink
              title="signature"
              description="informations chef établissement"
              href="/admin/signature"
            />
            <QuickLink
              title="Staff"
              description="comptes staff a créer"
              href="/admin/staff"
            />
          </section>
        </>
      )}
    </main>
  );
}

interface DashboardStatProps {
  label: string;
  value: number;
  href?: string;
}

function DashboardStat({ label, value, href }: DashboardStatProps) {
  const content = (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border bg-background p-3 text-sm shadow-sm transition hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-3 text-sm shadow-sm">
      {content}
    </div>
  );
}

interface QuickLinkProps {
  title: string;
  description: string;
  href: string;
}

function QuickLink({ title, description, href }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border bg-card p-4 text-sm shadow-sm transition hover:shadow-md"
    >
      <span className="mb-1 text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Link>
  );
}
