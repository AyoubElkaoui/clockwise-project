"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Plane,
  DollarSign,
  Award,
} from "lucide-react";
import {
  getVacationRequests,
  getActivities,
} from "@/lib/api";
import { getDrafts, getSubmitted } from "@/lib/api/workflowApi";
import { getCurrentPeriodId } from "@/lib/manager-api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning");
    if (hour < 18) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
            {t("status.approved")}
          </span>
        );
      case "ingeleverd":
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800">
            {t("status.pending")}
          </span>
        );
      case "afgekeurd":
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium border border-red-200 dark:border-red-800">
            {t("status.rejected")}
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700">
            {t("status.draft")}
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

  const weekProgress = (stats.weekHours / stats.weekTarget) * 100;
  const isOnTrack =
    stats.weekHours >= (stats.weekTarget / 7) * dayjs().isoWeekday();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Header */}
      <PageHeader
        title={`${getGreeting()}, ${firstName}!`}
        description={`${t("dashboard.subtitle")}, ${dayjs().format("dddd D MMMM YYYY")}`}
        actions={
          <Button onClick={() => router.push("/tijd-registratie")}>
            <Clock className="w-4 h-4 mr-2" />
            {t("dashboard.registerHours")}
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("dashboard.thisWeek")}
          value={`${stats.weekHours}u`}
          subtitle={`${Math.round(weekProgress)}% van ${stats.weekTarget}u`}
          icon={Clock}
          color="blue"
          trend={{ value: isOnTrack ? t("dashboard.onTrack") : t("dashboard.watchHours"), isPositive: isOnTrack }}
          onClick={() => router.push("/tijd-registratie")}
        />
        <StatCard
          title={t("dashboard.thisMonth")}
          value={`${stats.monthHours}u`}
          subtitle={dayjs().format("MMMM")}
          icon={Calendar}
          color="emerald"
          onClick={() => router.push("/uren-overzicht")}
        />
        <StatCard
          title={t("dashboard.vacationDays")}
          value={stats.vacationDays}
          subtitle={t("dashboard.available")}
          icon={Plane}
          color="violet"
          onClick={() => router.push("/vakantie")}
        />
        <StatCard
          title={t("dashboard.pending")}
          value={stats.pendingApprovals}
          subtitle={t("dashboard.waitingApproval")}
          icon={AlertCircle}
          color="amber"
          onClick={() => router.push("/uren-overzicht")}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {/* Recent Entries */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                {t("dashboard.recentEntries")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/uren-overzicht")}
                className="text-slate-700 dark:text-slate-300"
              >
                {t("dashboard.viewAll")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{t("dashboard.noEntries")}</p>
                <p className="text-sm text-slate-500 mt-1">{t("dashboard.startRegistering")}</p>
                <Button
                  className="mt-4"
                  onClick={() => router.push("/tijd-registratie")}
                >
                  {t("dashboard.startRegistering")}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("dashboard.date") || "Datum"}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("dashboard.project") || "Project"}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("dashboard.status") || "Status"}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">{t("dashboard.hours") || "Uren"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {recentEntries.map((entry: any) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                        onClick={() => router.push("/uren-overzicht")}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                              {dayjs(entry.datum || entry.startTime || entry.date).format("ddd")}
                            </p>
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              {dayjs(entry.datum || entry.startTime || entry.date).format("D MMM")}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                            {entry.werkDescription || entry.projectName || `Project ${entry.werkGcId || entry.projectId || '?'}`}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                            {entry.omschrijving || entry.notes || t("dashboard.noDescription")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(entry.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
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

        {/* Quick Actions & Info */}
        <div className="space-y-4 md:space-y-6">
          {/* Quick Actions */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                {t("dashboard.quickActions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start"
                  onClick={() => router.push("/tijd-registratie")}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {t("dashboard.registerHours")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/vakantie")}
                >
                  <Plane className="w-4 h-4 mr-2" />
                  {t("dashboard.requestVacation")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/uren-overzicht")}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {t("dashboard.hoursOverview")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Week Status */}
          <Card
            className={
              isOnTrack
                ? "border-emerald-200 dark:border-emerald-800"
                : "border-amber-200 dark:border-amber-800"
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {isOnTrack ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
                )}
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {isOnTrack
                      ? t("dashboard.onTrack")
                      : t("dashboard.watchHours")}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {isOnTrack
                      ? t("dashboard.onTrackMessage", {
                          hours: stats.weekHours,
                        })
                      : t("dashboard.behindMessage", {
                          hours: stats.weekHours,
                          target: stats.weekTarget,
                        })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Vacation */}
          {upcomingVacation && (
            <Card className="border-violet-200 dark:border-violet-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Plane className="w-6 h-6 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {t("dashboard.upcomingVacation")}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {dayjs(upcomingVacation.startDate).format("D MMM")} -{" "}
                      {dayjs(upcomingVacation.endDate).format("D MMM YYYY")}
                    </p>
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                      {t("dashboard.inDays", {
                        days: dayjs(upcomingVacation.startDate).diff(
                          dayjs(),
                          "day",
                        ),
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}
