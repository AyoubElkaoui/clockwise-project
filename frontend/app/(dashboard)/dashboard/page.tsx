"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Plane,
  FileText,
  CheckCircle2,
  List,
} from "lucide-react";
import { getVacationRequests } from "@/lib/api";
import { getDrafts, getSubmitted } from "@/lib/api/workflowApi";
import { getCurrentPeriodId } from "@/lib/manager-api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [stats, setStats] = useState({
    weekHours: 0,
    monthHours: 0,
    vacationDays: 0,
    pendingApprovals: 0,
    weekTarget: 40,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [upcomingVacation, setUpcomingVacation] = useState<any>(null);
  const [weekDays, setWeekDays] = useState<{ label: string; date: string; hours: number }[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) {
        router.push("/login");
        return;
      }
      const userName = authUtils.getUserName();
      setFirstName(userName?.firstName || t("dashboard.defaultUserName"));

      // Load time entries from workflow API
      const urenperGcId = await getCurrentPeriodId();
      const [drafts, submitted] = await Promise.all([
        getDrafts(urenperGcId),
        getSubmitted(urenperGcId),
      ]);
      const allEntries = [...drafts, ...submitted];

      // Calculate week hours
      const weekStart = dayjs().startOf("isoWeek");
      const weekEnd = dayjs().endOf("isoWeek");
      const weekEntries = allEntries.filter((e: any) => {
        const date = dayjs(e.datum);
        return date.isBetween(weekStart, weekEnd, null, "[]");
      });
      const weekHours = weekEntries.reduce((sum: number, e: any) => sum + (e.aantal || 0), 0);

      // Per-day breakdown of the current ISO week (Mon–Sun) for the Weekoverzicht
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = weekStart.add(i, "day");
        const hours = weekEntries
          .filter((e: any) => dayjs(e.datum).isSame(d, "day"))
          .reduce((sum: number, e: any) => sum + (e.aantal || 0), 0);
        return { label: d.format("dd"), date: d.format("D MMM"), hours: Math.round(hours * 10) / 10 };
      });
      setWeekDays(days);

      // Calculate month hours
      const monthStart = dayjs().startOf("month");
      const monthEnd = dayjs().endOf("month");
      const monthEntries = allEntries.filter((e: any) => {
        const date = dayjs(e.datum);
        return date.isBetween(monthStart, monthEnd, null, "[]");
      });
      const monthHours = monthEntries.reduce((sum: number, e: any) => sum + (e.aantal || 0), 0);

      // Pending approvals - check SUBMITTED status
      const pending = allEntries.filter(
        (e: any) => e.status === "SUBMITTED",
      ).length;

      // Recent entries (last 5)
      const recent = allEntries
        .sort((a: any, b: any) => {
          const dateA = dayjs(a.datum);
          const dateB = dayjs(b.datum);
          return dateB.diff(dateA);
        })
        .slice(0, 5);

      setRecentEntries(recent);

      // Load vacation data
      try {
        const vacations = await getVacationRequests();
        const userVacations = vacations.filter((v: any) => v.userId === userId);

        // Find upcoming approved vacation
        const upcoming = userVacations
          .filter(
            (v: any) =>
              v.status === "goedgekeurd" && dayjs(v.startDate).isAfter(dayjs()),
          )
          .sort((a: any, b: any) =>
            dayjs(a.startDate).diff(dayjs(b.startDate)),
          )[0];

        setUpcomingVacation(upcoming);

        // Count remaining vacation days (mock - should come from user profile)
        const usedDays = userVacations
          .filter((v: any) => v.status === "goedgekeurd")
          .reduce((sum: number, v: any) => {
            const start = dayjs(v.startDate);
            const end = dayjs(v.endDate);
            return sum + end.diff(start, "day") + 1;
          }, 0);

        setStats({
          weekHours: Math.round(weekHours * 10) / 10,
          monthHours: Math.round(monthHours * 10) / 10,
          vacationDays: 25 - usedDays,
          pendingApprovals: pending,
          weekTarget: 40,
        });
      } catch {
        setStats({
          weekHours: Math.round(weekHours * 10) / 10,
          monthHours: Math.round(monthHours * 10) / 10,
          vacationDays: 25,
          pendingApprovals: pending,
          weekTarget: 40,
        });
      }
    } catch (error) {
      showToast(t("dashboard.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Goedgekeurd
          </span>
        );
      case "ingeleverd":
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Ingediend
          </span>
        );
      case "afgekeurd":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Afgewezen
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            Concept
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  const hour = dayjs().hour();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const weekStart = dayjs().startOf("isoWeek");
  const weekEnd = dayjs().endOf("isoWeek");
  const weekPct = Math.min(100, Math.round((stats.weekHours / (stats.weekTarget || 40)) * 100));
  const remaining = Math.max(0, Math.round((stats.weekTarget - stats.weekHours) * 10) / 10);

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Begroeting */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-[var(--text-2)] mt-0.5">
          Hier is je overzicht voor deze week.
        </p>
      </div>

      {/* Statkaarten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Uren deze week"
          value={`${stats.weekHours}u`}
          subtitle={`doel ${stats.weekTarget}u`}
          icon={Clock}
          onClick={() => router.push("/tijd-registratie")}
        />
        <StatCard
          title="Deze maand"
          value={`${stats.monthHours}u`}
          subtitle="deze maand"
          icon={FileText}
          onClick={() => router.push("/uren-overzicht")}
        />
        <StatCard
          title="Vakantiedagen"
          value={stats.vacationDays}
          subtitle="van 25 dagen"
          icon={Plane}
          onClick={() => router.push("/vakantie")}
        />
        <StatCard
          title="Ter goedkeuring"
          value={stats.pendingApprovals}
          subtitle="wacht op manager"
          icon={CheckCircle2}
          onClick={() => router.push("/uren-overzicht")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekoverzicht — 2/3 breedte */}
        <Card className="lg:col-span-2" padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text)]">Weekoverzicht</h2>
            <span className="text-xs text-[var(--muted)]">
              Week {dayjs().isoWeek()} · {weekStart.format("D")}–{weekEnd.format("D MMM")}
            </span>
          </div>
          <div className="p-5 space-y-3">
            {weekDays.map((d) => {
              const dayPct = Math.min(100, (d.hours / 8) * 100);
              return (
                <div key={d.date} className="flex items-center gap-3">
                  <div className="w-16 flex-shrink-0">
                    <span className="text-xs font-semibold text-[var(--text)] capitalize">{d.label}</span>
                    <span className="block text-[10px] text-[var(--muted)]">{d.date}</span>
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-[var(--panel-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${dayPct}%`, background: "var(--accent)" }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-medium text-[var(--text-2)] tabular-nums">
                    {d.hours}u
                  </span>
                </div>
              );
            })}
            <button
              onClick={() => router.push("/tijd-registratie")}
              className="mt-2 text-sm font-medium text-[var(--accent)] hover:brightness-110 transition"
            >
              Uren aanpassen →
            </button>
          </div>
        </Card>

        {/* Zijkolom — 1/3 breedte */}
        <div className="space-y-6">
          {/* Voortgang naar weekdoel — accent-gevulde kaart (design) */}
          <div style={{ background: "var(--accent)", borderRadius: 12, boxShadow: "var(--shadow)", padding: 18, color: "#fff" }}>
            <div style={{ font: "500 12.5px 'Geist'", opacity: 0.85 }}>Voortgang naar weekdoel</div>
            <div style={{ font: "700 24px 'Geist'", marginTop: 6 }}>
              {stats.weekHours}u <span style={{ fontSize: 14, opacity: 0.8 }}>/ {stats.weekTarget}u</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,.28)", borderRadius: 99, marginTop: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${weekPct}%`, background: "#fff", borderRadius: 99 }} />
            </div>
            <div style={{ font: "500 12px 'Geist'", opacity: 0.85, marginTop: 9 }}>
              {remaining > 0 ? `Nog ${remaining} uur te gaan deze week.` : "Weekdoel gehaald 🎉"}
            </div>
          </div>

          {/* Recente registraties */}
          <Card padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--text)]">Recente registraties</h2>
              <Button size="sm" variant="ghost" onClick={() => router.push("/uren-overzicht")}>
                Alles
              </Button>
            </div>
            <div className="px-5 py-2">
              {recentEntries.length === 0 ? (
                <p className="text-sm text-[var(--muted)] py-6 text-center">Nog geen registraties.</p>
              ) : (
                recentEntries.slice(0, 4).map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0 cursor-pointer"
                    onClick={() => router.push("/uren-overzicht")}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">
                        {entry.werkDescription || entry.projectName || `Project ${entry.werkGcId || entry.projectId || "?"}`}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {dayjs(entry.datum || entry.startTime || entry.date).format("ddd D MMM")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)] tabular-nums flex-shrink-0 ml-2">
                      {entry.aantal || entry.hours || 0}u
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
