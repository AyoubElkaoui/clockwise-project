"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSubmittedWorkflowEntries, getAllUsers } from "@/lib/manager-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronRight,
  Activity,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Timer,
  RefreshCw,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.extend(isoWeek);
dayjs.locale("nl");

export default function ManagerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    teamSize: 0,
    pendingApprovals: 0,
    pendingVacations: 0,
    thisWeekHours: 0,
    thisMonthHours: 0,
    lastWeekHours: 0,
    lastMonthHours: 0,
    activeProjects: 0,
    avgHoursPerDay: 0,
    utilizationRate: 0,
  });
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (!authUtils.getUserId()) {
        showToast("Gebruiker niet ingelogd", "error");
        router.push("/login");
        return;
      }

      // Load workflow entries and users
      const [workflowResponse, users] = await Promise.all([
        getSubmittedWorkflowEntries(100426), // Current period
        getAllUsers()
      ]);

      const entries = workflowResponse.entries.map((e: any) => ({
        id: e.id,
        userId: e.medewGcId,
        date: e.datum,
        hours: e.aantal,
        projectId: e.werkGcId,
        notes: e.omschrijving,
        status: e.status, // SUBMITTED, APPROVED, REJECTED
        userFirstName: e.employeeName?.split(' ')[0] || '',
        userLastName: e.employeeName?.split(' ').slice(1).join(' ') || '',
        projectCode: e.werkCode,
        projectName: e.werkDescription,
      }));

      console.log("Workflow entries loaded:", entries.length);
      console.log("Users loaded:", users.length);

      // Manager can see all users (no filtering)
      const team = users;
      const vacations: any[] = []; // TODO: Add vacation endpoint later

      // Calculate comprehensive stats
      const pending = entries.filter((e: any) => e.status === "SUBMITTED");
      const pendingVac = vacations.filter((v: any) => v.status === "pending");

      // Current week
      const weekStart = dayjs().startOf("isoWeek");
      const weekEnd = dayjs().endOf("isoWeek");
      const weekEntries = entries.filter((e: any) => {
        const date = dayjs(e.date);
        return date.isAfter(weekStart) && date.isBefore(weekEnd);
      });

      // Last week
      const lastWeekStart = dayjs().subtract(1, "week").startOf("isoWeek");
      const lastWeekEnd = dayjs().subtract(1, "week").endOf("isoWeek");
      const lastWeekEntries = entries.filter((e: any) => {
        const date = dayjs(e.date);
        return date.isAfter(lastWeekStart) && date.isBefore(lastWeekEnd);
      });

      // Current month
      const monthStart = dayjs().startOf("month");
      const monthEnd = dayjs().endOf("month");
      const monthEntries = entries.filter((e: any) => {
        const date = dayjs(e.date);
        return date.isAfter(monthStart) && date.isBefore(monthEnd);
      });

      // Last month
      const lastMonthStart = dayjs().subtract(1, "month").startOf("month");
      const lastMonthEnd = dayjs().subtract(1, "month").endOf("month");
      const lastMonthEntries = entries.filter((e: any) => {
        const date = dayjs(e.date);
        return date.isAfter(lastMonthStart) && date.isBefore(lastMonthEnd);
      });

      try {
        const calculateHours = (entries: any[]) => {
          return entries.reduce((sum, e) => {
            return sum + (e.hours || 0);
          }, 0);
        };

        const thisWeekHours = calculateHours(weekEntries);
        const lastWeekHours = calculateHours(lastWeekEntries);
        const thisMonthHours = calculateHours(monthEntries);
        const lastMonthHours = calculateHours(lastMonthEntries);

        // Calculate utilization rate (assuming 8 hours per day, 5 days per week)
        const workingDaysThisWeek = Math.min(dayjs().isoWeekday(), 5);
        const expectedHoursThisWeek = team.length * workingDaysThisWeek * 8;
        const utilizationRate =
          expectedHoursThisWeek > 0
            ? (thisWeekHours / expectedHoursThisWeek) * 100
            : 0;

        // Get unique active projects
        const activeProjects = new Set(
          entries
            .filter((e) => e.status === "APPROVED")
            .map((e) => e.projectId),
        ).size;

        // Calculate average hours per day
        const avgHoursPerDay =
          workingDaysThisWeek > 0
            ? thisWeekHours / (team.length * workingDaysThisWeek)
            : 0;

        setStats({
          teamSize: team.length,
          pendingApprovals: pending.length,
          pendingVacations: pendingVac.length,
          thisWeekHours,
          thisMonthHours,
          lastWeekHours,
          lastMonthHours,
          activeProjects,
          avgHoursPerDay,
          utilizationRate,
        });

        // Get latest 5 pending entries
        setPendingEntries(pending.slice(0, 5));

        // Get team activity (recent entries)
        const recent = entries
          .sort(
            (a: any, b: any) =>
              new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .slice(0, 8);
        setTeamActivity(recent);

        // Calculate team performance metrics
        const teamPerf = team
          .map((member: any) => {
            const memberEntries = entries.filter(
              (e: any) => e.userId === member.medewGcId && e.status === "APPROVED",
            );
            const memberWeekHours = calculateHours(
              memberEntries.filter((e: any) => {
                const date = dayjs(e.date);
                return date.isAfter(weekStart) && date.isBefore(weekEnd);
              }),
            );
            return {
              ...member,
              weekHours: memberWeekHours,
              monthHours: calculateHours(
                memberEntries.filter((e: any) => {
                  const date = dayjs(e.date);
                  return date.isAfter(monthStart) && date.isBefore(monthEnd);
                }),
              ),
              lastWeekHours: calculateHours(
                memberEntries.filter((e: any) => {
                  const date = dayjs(e.date);
                  return (
                    date.isAfter(lastWeekStart) && date.isBefore(lastWeekEnd)
                  );
                }),
              ),
            };
          })
          .sort((a: any, b: any) => b.weekHours - a.weekHours);

        setTeamPerformance(teamPerf);
      } catch (calcError) {
        console.error("Error in dashboard calculations:", calcError);
        throw calcError;
      }
    } catch (error) {
      console.error("Dashboard loading error:", error);
      showToast("Fout bij laden dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approveTimeEntry(id, true);
      loadDashboardData();
      showToast("Uren goedgekeurd", "success");
    } catch (error) {
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await approveTimeEntry(id, false);
      loadDashboardData();
      showToast("Uren afgekeurd", "success");
    } catch (error) {
      showToast("Fout bij afkeuren", "error");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            Goedgekeurd
          </Badge>
        );
      case "ingeleverd":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            In Behandeling
          </Badge>
        );
      case "afgekeurd":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            Afgekeurd
          </Badge>
        );
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  const getTrendIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return {
        icon: ArrowUpRight,
        color: "text-emerald-600",
        change: `+${change.toFixed(1)}%`,
      };
    } else if (change < 0) {
      return {
        icon: ArrowDownRight,
        color: "text-red-600",
        change: `${change.toFixed(1)}%`,
      };
    }
    return { icon: null, color: "text-slate-500", change: "0%" };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const weekTrend = getTrendIndicator(stats.thisWeekHours, stats.lastWeekHours);
  const monthTrend = getTrendIndicator(
    stats.thisMonthHours,
    stats.lastMonthHours,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Team Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Overzicht van team prestaties en goedkeuringen
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => loadDashboardData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/manager/hours")}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Gedetailleerd Rapport
          </Button>
          <Button onClick={() => router.push("/manager/approve")}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Goedkeuringen
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Team Size */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Teamleden
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.teamSize}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Actieve medewerkers
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Utilization Rate */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Benutting
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.utilizationRate.toFixed(0)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Deze week
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hours This Week */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Uren Deze Week
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.thisWeekHours.toFixed(1)}
                  </p>
                  {weekTrend.icon && (
                    <weekTrend.icon className={`w-4 h-4 ${weekTrend.color}`} />
                  )}
                </div>
                <p className={`text-xs mt-1 ${weekTrend.color}`}>
                  {weekTrend.change} vs vorige week
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Te Goedkeuren
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.pendingApprovals}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Wachtende registraties
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Gemiddeld per Dag
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.avgHoursPerDay.toFixed(1)}u
                </p>
              </div>
              <Timer className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Actieve Projecten
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.activeProjects}
                </p>
              </div>
              <Activity className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Vakantie Aanvragen
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.pendingVacations}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Approvals */}
        {stats.pendingApprovals > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Wachtend op Goedkeuring
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/manager/approve")}
                >
                  Alles bekijken
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {entry.userFirstName?.charAt(0)}
                            {entry.userLastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {entry.userFirstName} {entry.userLastName}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {entry.projectName || entry.projectCode}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>
                          {dayjs(entry.date).format("DD MMM YYYY")}
                        </span>
                        <span className="font-medium">
                          {entry.hours?.toFixed(1)}u
                        </span>
                        {entry.notes && (
                          <span className="text-xs italic">
                            {entry.notes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                        onClick={() => handleApprove(entry.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Goedkeuren
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={() => handleReject(entry.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Afkeuren
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Team Prestaties
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/manager/hours")}
              >
                Details
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamPerformance.slice(0, 5).map((member) => {
                const memberTrend = getTrendIndicator(
                  member.weekHours,
                  member.lastWeekHours,
                );
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {member.firstName?.charAt(0)}
                          {member.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {member.weekHours.toFixed(1)}u deze week
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {memberTrend.icon && (
                        <memberTrend.icon
                          className={`w-4 h-4 ${memberTrend.color}`}
                        />
                      )}
                      <span className={`text-xs ${memberTrend.color}`}>
                        {memberTrend.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-600" />
            Recente Activiteit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamActivity.map((entry, index) => (
              <div key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {entry.userFirstName?.charAt(0)}
                      {entry.userLastName?.charAt(0)}
                    </span>
                  </div>
                  {index < teamActivity.length - 1 && (
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {entry.userFirstName} {entry.userLastName}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {entry.projectName || entry.projectCode} •{" "}
                        {dayjs(entry.date).fromNow()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {entry.hours?.toFixed(1)}u
                      </p>
                      {getStatusBadge(entry.status)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
