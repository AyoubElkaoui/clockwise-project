"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  CalendarDays,
  Palmtree,
  Settings,
  RefreshCw,
  Zap,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import dayjs from "dayjs";
import "dayjs/locale/nl";
import {
  getAdminUsers,
  getPendingReviewCount,
  getPendingVacationCount,
  getHolidaysForYear,
  getApiErrorMessage,
} from "@/lib/api/adminUsersApi";

dayjs.locale("nl");

interface DashboardStats {
  activeUsers: number | null;
  totalUsers: number | null;
  pendingReview: number | null;
  pendingVacations: number | null;
  holidaysThisYear: number | null;
}

const EMPTY: DashboardStats = {
  activeUsers: null,
  totalUsers: null,
  pendingReview: null,
  pendingVacations: null,
  holidaysThisYear: null,
};

const fmt = (v: number | null) => (v === null ? "—" : v);

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(EMPTY);
  const year = new Date().getFullYear();

  const loadDashboardData = useCallback(async () => {
    setRefreshing(true);
    const [users, review, vacations, holidays] = await Promise.allSettled([
      getAdminUsers(),
      getPendingReviewCount(),
      getPendingVacationCount(),
      getHolidaysForYear(year),
    ]);

    const next: DashboardStats = { ...EMPTY };
    const errors: string[] = [];

    if (users.status === "fulfilled") {
      next.totalUsers = users.value.length;
      next.activeUsers = users.value.filter((u) => u.isActive).length;
    } else errors.push(getApiErrorMessage(users.reason, "Gebruikers konden niet worden geladen"));

    if (review.status === "fulfilled") next.pendingReview = review.value;
    else errors.push(getApiErrorMessage(review.reason, "Openstaande uren konden niet worden geladen"));

    if (vacations.status === "fulfilled") next.pendingVacations = vacations.value;
    else errors.push(getApiErrorMessage(vacations.reason, "Verlofaanvragen konden niet worden geladen"));

    if (holidays.status === "fulfilled") next.holidaysThisYear = holidays.value.length;
    else errors.push(getApiErrorMessage(holidays.reason, "Feestdagen konden niet worden geladen"));

    setStats(next);
    errors.forEach((e) => showToast(e, "error"));
    setLoading(false);
    setRefreshing(false);
  }, [year]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  const shortcuts = [
    {
      label: "Gebruikers",
      description: "Accounts aanmaken, bewerken en (de)activeren",
      href: "/admin/users",
      icon: Users,
      color: "text-blue-600",
      hover: "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20",
    },
    {
      label: "Feestdagen",
      description: "Nationale feestdagen en sluitingsdagen",
      href: "/admin/holidays",
      icon: CalendarDays,
      color: "text-emerald-600",
      hover: "hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-900/20",
    },
    {
      label: "Instellingen",
      description: "Beveiliging en e-mailherinneringen",
      href: "/admin/settings",
      icon: Settings,
      color: "text-violet-600",
      hover: "hover:bg-violet-50 hover:border-violet-200 dark:hover:bg-violet-900/20",
    },
    {
      label: "Uren beoordelen",
      description: "Ingediende uren goed- of afkeuren",
      href: "/manager/review-time",
      icon: ClipboardCheck,
      color: "text-amber-600",
      hover: "hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-900/20",
    },
    {
      label: "Verlof beoordelen",
      description: "Verlofaanvragen afhandelen",
      href: "/manager/vacation-review",
      icon: Palmtree,
      color: "text-teal-600",
      hover: "hover:bg-teal-50 hover:border-teal-200 dark:hover:bg-teal-900/20",
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Beheer dashboard"
        description={`Overzicht — ${dayjs().format("dddd D MMMM YYYY")}`}
        actions={
          <Button size="sm" variant="outline" onClick={loadDashboardData} isLoading={refreshing}>
            {!refreshing && <RefreshCw className="w-4 h-4" />}
            Vernieuwen
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Actieve gebruikers"
          value={fmt(stats.activeUsers)}
          icon={Users}
          color="blue"
          subtitle={stats.totalUsers === null ? undefined : `van ${stats.totalUsers} accounts`}
          onClick={() => router.push("/admin/users")}
        />
        <StatCard
          title="Uren ter beoordeling"
          value={fmt(stats.pendingReview)}
          icon={Clock}
          color="amber"
          subtitle="ingediende regels, huidige periode"
          onClick={() => router.push("/manager/review-time")}
        />
        <StatCard
          title="Openstaande verlofaanvragen"
          value={fmt(stats.pendingVacations)}
          icon={Palmtree}
          color="emerald"
          subtitle="wachten op beoordeling"
          onClick={() => router.push("/manager/vacation-review")}
        />
        <StatCard
          title={`Feestdagen ${year}`}
          value={fmt(stats.holidaysThisYear)}
          icon={CalendarDays}
          color="violet"
          subtitle="feest- en sluitingsdagen"
          onClick={() => router.push("/admin/holidays")}
        />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-400" />
            Snelkoppelingen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shortcuts.map((s) => (
              <button
                key={s.href}
                type="button"
                onClick={() => router.push(s.href)}
                className={`flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] text-left transition-colors ${s.hover}`}
              >
                <s.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${s.color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{s.label}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{s.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
