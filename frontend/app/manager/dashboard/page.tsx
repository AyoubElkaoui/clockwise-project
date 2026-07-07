"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getAllWorkflowEntries,
  getAllUsers,
  approveTimeEntry,
  reviewWorkflowEntries,
  getCurrentPeriodId,
  getAllVacationRequests
} from "@/lib/manager-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import {
  Users,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  ChevronRight,
  Activity,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
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
      const managerId = authUtils.getUserId();
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        router.push("/login");
        return;
      }

      // Get current period ID dynamically
      const currentPeriodId = await getCurrentPeriodId();

      // Load workflow entries, users, and vacations
      const [workflowResponse, allUsers, allVacations] = await Promise.all([
        getAllWorkflowEntries(currentPeriodId), // Current period - all statuses
        getAllUsers(),
        getAllVacationRequests()
      ]);

      // Filter for only this manager's team
      // If no team members assigned to this manager, show all active users as fallback
      let managersTeam = allUsers.filter((u: any) => u.managerId === managerId);

      // Fallback: if no team members found, show all active users
      if (managersTeam.length === 0) {
        console.log("No team members assigned to manager, showing all active users");
        managersTeam = allUsers.filter((u: any) => u.isActive !== false && u.rank !== 'inactive');
      }

      const teamMemberIds = managersTeam.map((u: any) => u.medewGcId || u.id);

      // Filter entries for this manager's team only
      const teamEntries = workflowResponse.entries.filter((e: any) =>
        teamMemberIds.includes(e.medewGcId)
      );

      const entries = teamEntries.map((e: any) => ({
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

      // Filter vacations for this manager's team
      const teamVacations = allVacations.filter((v: any) =>
        teamMemberIds.includes(v.userId)
      );

      // Calculate comprehensive stats
      const pending = entries.filter((e: any) => e.status === "SUBMITTED");
      const pendingVac = teamVacations.filter((v: any) => v.status === "pending" || v.status === "submitted");

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
        const expectedHoursThisWeek = managersTeam.length * workingDaysThisWeek * 8;
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
            ? thisWeekHours / (managersTeam.length * workingDaysThisWeek)
            : 0;

        setStats({
          teamSize: managersTeam.length,
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

        // Get team activity (recent entries) - only SUBMITTED and APPROVED, not DRAFT
        const recentRelevant = entries.filter((e: any) =>
          e.status === 'SUBMITTED' || e.status === 'APPROVED'
        );
        const recent = recentRelevant
          .sort(
            (a: any, b: any) =>
              new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .slice(0, 8);
        setTeamActivity(recent);

        // Calculate team performance metrics
        const teamPerf = managersTeam
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
              pendingCount: entries.filter(
                (e: any) => e.userId === member.medewGcId && e.status === "SUBMITTED"
              ).length,
            };
          })
          .sort((a: any, b: any) => b.weekHours - a.weekHours);

        setTeamPerformance(teamPerf);
      } catch (calcError) {
        throw calcError;
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
      showToast("Fout bij laden dashboard data", "error");
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
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            Goedgekeurd
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            In Behandeling
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            Afgekeurd
          </Badge>
        );
      case "DRAFT":
        return <Badge variant="secondary">Concept</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
  const monthTrend = getTrendIndicator(stats.thisMonthHours, stats.lastMonthHours);

  const totalDecided = teamActivity.filter(
    (e) => e.status === "APPROVED" || e.status === "REJECTED"
  ).length;
  const totalApproved = teamActivity.filter((e) => e.status === "APPROVED").length;
  const approvalRate =
    totalDecided > 0 ? Math.round((totalApproved / totalDecided) * 100) : 100;

  const userName = authUtils.getUserName();

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <PageHeader
        title="Manager Dashboard"
        description={`Welkom terug, ${userName.firstName} — overzicht van teamactiviteiten en goedkeuringen`}
        actions={
          <select className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Deze week</option>
            <option>Deze maand</option>
            <option>Vorige week</option>
            <option>Vorige maand</option>
          </select>
        }
      />

      {/* Stats rij */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Teamleden"
          value={stats.teamSize}
          icon={Users}
          color="blue"
          onClick={() => router.push("/manager/team")}
        />
        <StatCard
          title="Wachtend op goedkeuring"
          value={stats.pendingApprovals}
          icon={Clock}
          color={stats.pendingApprovals > 0 ? "amber" : "emerald"}
          onClick={() => router.push("/manager/approve")}
        />
        <StatCard
          title="Team uren deze week"
          value={`${stats.thisWeekHours.toFixed(1)}u`}
          icon={BarChart3}
          color="emerald"
          trend={
            stats.lastWeekHours > 0
              ? {
                  value: `${Math.abs(
                    ((stats.thisWeekHours - stats.lastWeekHours) /
                      stats.lastWeekHours) *
                      100
                  ).toFixed(0)}%`,
                  isPositive: stats.thisWeekHours >= stats.lastWeekHours,
                }
              : undefined
          }
          subtitle="vs vorige week"
        />
        <StatCard
          title="Goedkeuringspercentage"
          value={`${approvalRate}%`}
          icon={CheckCircle2}
          color="blue"
        />
      </div>

      {/* Twee-kolom layout */}
      <div className="grid grid-cols-5 gap-6">
        {/* Links 3/5: Wachtende Goedkeuringen */}
        <div className="col-span-5 lg:col-span-3">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Wachtende Goedkeuringen
                  {stats.pendingApprovals > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {stats.pendingApprovals}
                    </span>
                  )}
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/manager/approve")}
                >
                  Alles bekijken
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Alles goedgekeurd
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Er zijn geen wachtende urenregistraties.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Medewerker
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Datum
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Uren
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Project
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Actie
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {pendingEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                                {entry.userFirstName?.charAt(0)}
                                {entry.userLastName?.charAt(0)}
                              </div>
                              <span className="text-slate-900 dark:text-slate-100 font-medium truncate max-w-[100px]">
                                {entry.userFirstName} {entry.userLastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {dayjs(entry.date).format("D MMM YYYY")}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {entry.hours?.toFixed(1)}u
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {entry.projectName || entry.projectCode || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              In behandeling
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleApprove(entry.id)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                title="Goedkeuren"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(entry.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                title="Afwijzen"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rechts 2/5: Teamoverzicht */}
        <div className="col-span-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  Teamoverzicht
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/manager/team")}
                >
                  Details
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {teamPerformance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Geen teamleden
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Er zijn nog geen teamleden beschikbaar.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {teamPerformance.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                          {member.firstName?.charAt(0)}
                          {member.lastName?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {member.weekHours.toFixed(1)}u goedgekeurd deze week
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {member.pendingCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {member.pendingCount} ingediend
                          </span>
                        ) : member.weekHours > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Goedgekeurd
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            Geen uren
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
