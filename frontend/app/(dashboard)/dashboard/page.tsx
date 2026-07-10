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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const approvedCount = recentEntries.filter((e: any) => e.status === "goedgekeurd").length;

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <PageHeader
        title="Dashboard"
        description={dayjs().format("dddd D MMMM YYYY")}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Uren deze week"
          value={`${stats.weekHours}u`}
          icon={Clock}
          color="blue"
          onClick={() => router.push("/tijd-registratie")}
        />
        <StatCard
          title="Vakantiedagen"
          value={stats.vacationDays}
          icon={Plane}
          color="emerald"
          onClick={() => router.push("/vakantie")}
        />
        <StatCard
          title="Ingediend"
          value={stats.pendingApprovals}
          icon={FileText}
          color="amber"
          onClick={() => router.push("/uren-overzicht")}
        />
        <StatCard
          title="Goedgekeurd"
          value={approvedCount}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => router.push("/uren-overzicht")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recente Tijdregistraties — 2/3 breedte */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Recente Tijdregistraties
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/uren-overzicht")}
              >
                Alles bekijken
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen registraties</p>
                <p className="text-xs text-slate-500 mt-1">Er zijn nog geen tijdregistraties beschikbaar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Datum</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Uren</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {recentEntries.map((entry: any) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                        onClick={() => router.push("/uren-overzicht")}
                      >
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                            {dayjs(entry.datum || entry.startTime || entry.date).format("ddd")}
                          </p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {dayjs(entry.datum || entry.startTime || entry.date).format("D MMM")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                          <p className="font-medium truncate max-w-[160px]">
                            {entry.werkDescription || entry.projectName || `Project ${entry.werkGcId || entry.projectId || "?"}`}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                            {entry.omschrijving || entry.notes || "Geen omschrijving"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(entry.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {entry.aantal || entry.hours || 0}u
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Snelle Acties — 1/3 breedte */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <List className="w-4 h-4 text-slate-400" />
              Snelle Acties
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                onClick={() => router.push("/tijd-registratie")}
              >
                <Clock className="w-4 h-4 mr-2" />
                Uren Registreren
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/vakantie")}
              >
                <Plane className="w-4 h-4 mr-2" />
                Verlof Aanvragen
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/uren-overzicht")}
              >
                <List className="w-4 h-4 mr-2" />
                Mijn Overzicht
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
