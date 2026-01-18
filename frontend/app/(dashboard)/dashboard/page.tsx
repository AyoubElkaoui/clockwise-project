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
    <div className="space-y-6 pb-20">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
          {getGreeting()}, {firstName}! 👋
        </h1>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
          {t("dashboard.subtitle")}, {dayjs().format("dddd D MMMM YYYY")}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          variant="elevated"
          padding="md"
          className="cursor-pointer hover:shadow-lg transition"
          onClick={() => router.push("/uren-registreren")}
        >
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("dashboard.thisWeek")}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.weekHours}u
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${isOnTrack ? "bg-green-500" : "bg-yellow-500"}`}
                      style={{ width: `${Math.min(weekProgress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {Math.round(weekProgress)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          className="cursor-pointer hover:shadow-lg transition"
          onClick={() => router.push("/uren-overzicht")}
        >
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("dashboard.thisMonth")}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.monthHours}u
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {dayjs().format("MMMM")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          className="cursor-pointer hover:shadow-lg transition"
          onClick={() => router.push("/vakantie")}
        >
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Plane className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("dashboard.vacationDays")}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.vacationDays}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("dashboard.available")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          className="cursor-pointer hover:shadow-lg transition"
          onClick={() => router.push("/uren-overzicht")}
        >
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("dashboard.pending")}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.pendingApprovals}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("dashboard.waitingApproval")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {/* Recent Entries */}
        <Card variant="elevated" padding="lg" className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("dashboard.recentEntries")}</CardTitle>
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
          <CardContent>
            {recentEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t("dashboard.noEntries")}</p>
                <Button
                  className="mt-4 text-slate-900 dark:text-white"
                  onClick={() => router.push("/uren-registreren")}
                >
                  {t("dashboard.startRegistering")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 md:gap-4 p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    onClick={() => router.push("/uren-overzicht")}
                  >
                    <div className="w-12 md:w-16 text-center flex-shrink-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                        {dayjs(entry.datum || entry.startTime || entry.date).format("ddd")}
                      </p>
                      <p className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100">
                        {dayjs(entry.datum || entry.startTime || entry.date).format("D")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 truncate">
                          {entry.werkDescription || entry.projectName || `Project ${entry.werkGcId || entry.projectId || '?'}`}
                        </p>
                        {getStatusBadge(entry.status)}
                      </div>
                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">
                        {entry.omschrijving || entry.notes || t("dashboard.noDescription")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
                        {entry.aantal || entry.hours || 0}u
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Info */}
        <div className="space-y-4 md:space-y-6">
          {/* Quick Actions */}
          <Card variant="elevated" padding="lg" className="overflow-hidden">
            <CardHeader>
              <CardTitle>{t("dashboard.quickActions")}</CardTitle>
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
            variant="elevated"
            padding="lg"
            className={
              isOnTrack
                ? "border-green-200 dark:border-green-800"
                : "border-yellow-200 dark:border-yellow-800"
            }
          >
            <CardContent>
              <div className="flex items-start gap-3">
                {isOnTrack ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
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
            <Card
              variant="elevated"
              padding="lg"
              className="border-purple-200 dark:border-purple-800"
            >
              <CardContent>
                <div className="flex items-start gap-3">
                  <Plane className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {t("dashboard.upcomingVacation")}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {dayjs(upcomingVacation.startDate).format("D MMM")} -{" "}
                      {dayjs(upcomingVacation.endDate).format("D MMM YYYY")}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
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
