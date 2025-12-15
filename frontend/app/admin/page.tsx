"use client";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Users,
  Building2,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Calendar,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Database,
  Server,
  AlertTriangle,
  ChevronRight,
  Settings,
  UserPlus,
  FileText,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.locale("nl");

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalProjects: 0,
    totalHoursThisMonth: 0,
    pendingApprovals: 0,
    pendingVacations: 0,
    activeUsers: 0,
    systemHealth: 98,
    lastWeekUsers: 0,
    lastWeekHours: 0,
    lastWeekProjects: 0,
    avgHoursPerUser: 0,
    completionRate: 0,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [recentVacations, setRecentVacations] = useState<any[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch users
      const usersRes = await fetch(`${API_URL}/users`);
      const users = await usersRes.json();

      // Fetch companies
      const companiesRes = await fetch(`${API_URL}/companies`);
      const companies = await companiesRes.json();

      // Fetch projects
      const projectsRes = await fetch(`${API_URL}/projects`);
      const projects = await projectsRes.json();

      // Fetch time entries
      const entriesRes = await fetch(`${API_URL}/time-entries`);
      const entries = await entriesRes.json();

      // Fetch vacation requests
      const vacationsRes = await fetch(`${API_URL}/vacation-requests`);
      const vacations = await vacationsRes.json();

      // Calculate comprehensive stats
      const pendingEntries = entries.filter(
        (e: any) => e.status === "ingeleverd",
      );
      const pendingVacs = vacations.filter((v: any) => v.status === "pending");
      const approvedEntries = entries.filter(
        (e: any) => e.status === "goedgekeurd",
      );

      // Current month
      const monthStart = dayjs().startOf("month");
      const monthEnd = dayjs().endOf("month");
      const monthEntries = entries.filter((e: any) => {
        const entryDate = dayjs(e.startTime);
        return entryDate.isAfter(monthStart) && entryDate.isBefore(monthEnd);
      });

      // Last month
      const lastMonthStart = dayjs().subtract(1, "month").startOf("month");
      const lastMonthEnd = dayjs().subtract(1, "month").endOf("month");
      const lastMonthEntries = entries.filter((e: any) => {
        const entryDate = dayjs(e.startTime);
        return (
          entryDate.isAfter(lastMonthStart) && entryDate.isBefore(lastMonthEnd)
        );
      });

      const totalHours = monthEntries.reduce((sum: number, e: any) => {
        const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
        return sum + (diff - (e.breakMinutes || 0)) / 60;
      }, 0);

      const lastMonthHours = lastMonthEntries.reduce((sum: number, e: any) => {
        const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
        return sum + (diff - (e.breakMinutes || 0)) / 60;
      }, 0);

      // Calculate completion rate
      const totalEntries = entries.length;
      const completedEntries = approvedEntries.length;
      const completionRate =
        totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;

      // Calculate average hours per user
      const activeUsers = users.filter((u: any) => {
        const userEntries = entries.filter((e: any) => e.userId === u.id);
        return userEntries.length > 0;
      }).length;
      const avgHoursPerUser = activeUsers > 0 ? totalHours / activeUsers : 0;

      setStats({
        totalUsers: users.length,
        totalCompanies: companies.length,
        totalProjects: projects.length,
        totalHoursThisMonth: totalHours,
        pendingApprovals: pendingEntries.length,
        pendingVacations: pendingVacs.length,
        activeUsers,
        systemHealth: 98, // Mock system health
        lastWeekUsers: users.length - 2, // Mock last week data
        lastWeekHours: lastMonthHours,
        lastWeekProjects: projects.length - 1,
        avgHoursPerUser,
        completionRate,
      });

      // Recent entries (last 8)
      const sorted = entries
        .sort(
          (a: any, b: any) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        )
        .slice(0, 8);
      setRecentEntries(sorted);

      // Recent vacation requests (last 5)
      const sortedVacs = vacations
        .sort(
          (a: any, b: any) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
        )
        .slice(0, 5);
      setRecentVacations(sortedVacs);

      // Mock system alerts
      setSystemAlerts([
        {
          id: 1,
          type: "info",
          message: "Database backup completed successfully",
          time: dayjs().subtract(2, "hours"),
        },
        {
          id: 2,
          type: "warning",
          message: "High memory usage detected on server",
          time: dayjs().subtract(4, "hours"),
        },
      ]);
    } catch (error) {
      showToast("Fout bij laden dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
      case "approved":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            Goedgekeurd
          </Badge>
        );
      case "ingeleverd":
      case "pending":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            In Behandeling
          </Badge>
        );
      case "afgekeurd":
      case "rejected":
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
    if (previous === 0)
      return { icon: null, color: "text-slate-500", change: "Nieuw" };
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

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "error":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      case "info":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Activity className="w-3 h-3 mr-1" />
            Info
          </Badge>
        );
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const usersTrend = getTrendIndicator(stats.totalUsers, stats.lastWeekUsers);
  const hoursTrend = getTrendIndicator(
    stats.totalHoursThisMonth,
    stats.lastWeekHours,
  );
  const projectsTrend = getTrendIndicator(
    stats.totalProjects,
    stats.lastWeekProjects,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Systeem Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Overzicht van systeem prestaties en gebruikersactiviteit
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/settings")}
            className="text-slate-700 dark:text-slate-300"
          >
            <Settings className="w-4 h-4 mr-2" />
            Systeem Instellingen
          </Button>
          <Button
            onClick={() => router.push("/admin/users")}
            className="text-slate-900 dark:text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Gebruiker Beheren
          </Button>
        </div>
      </div>

      {/* System Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* System Health */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-slate-600" />
              Systeem Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Algemene Health
                </span>
                <span className="text-lg font-bold text-emerald-600">
                  {stats.systemHealth}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.systemHealth}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">
                    99.9%
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Uptime
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">24ms</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Response
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600">
                    2.1GB
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Memory
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Snelle Acties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300"
                onClick={() => router.push("/admin/users")}
              >
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm">Gebruikers</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20 text-slate-700 dark:text-slate-300"
                onClick={() => router.push("/admin/companies")}
              >
                <Building2 className="w-5 h-5 text-purple-600" />
                <span className="text-sm">Bedrijven</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-indigo-50 hover:border-indigo-200 dark:hover:bg-indigo-900/20 text-slate-700 dark:text-slate-300"
                onClick={() => router.push("/admin/projects")}
              >
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <span className="text-sm">Projecten</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-900/20 text-slate-700 dark:text-slate-300"
                onClick={() => router.push("/admin/approvals")}
              >
                <CheckCircle className="w-5 h-5 text-amber-600" />
                <span className="text-sm">Goedkeuringen</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Totaal Gebruikers
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.totalUsers}
                  </p>
                  {usersTrend.icon && (
                    <usersTrend.icon
                      className={`w-4 h-4 ${usersTrend.color}`}
                    />
                  )}
                </div>
                <p className={`text-xs mt-1 ${usersTrend.color}`}>
                  {usersTrend.change} vs vorige maand
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Hours */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Uren Deze Maand
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.totalHoursThisMonth.toFixed(0)}
                  </p>
                  {hoursTrend.icon && (
                    <hoursTrend.icon
                      className={`w-4 h-4 ${hoursTrend.color}`}
                    />
                  )}
                </div>
                <p className={`text-xs mt-1 ${hoursTrend.color}`}>
                  {hoursTrend.change} vs vorige maand
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Voltooiingsgraad
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.completionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Goedgekeurde entries
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
                  Te Behandelen
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.pendingApprovals + stats.pendingVacations}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Goedkeuringen & vakanties
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
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
                  Actieve Gebruikers
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.activeUsers}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Met registraties deze maand
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
                  Gemiddeld per Gebruiker
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.avgHoursPerUser.toFixed(1)}u
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Deze maand
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Totaal Projecten
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.totalProjects}
                  </p>
                  {projectsTrend.icon && (
                    <projectsTrend.icon
                      className={`w-4 h-4 ${projectsTrend.color}`}
                    />
                  )}
                </div>
                <p className={`text-xs mt-1 ${projectsTrend.color}`}>
                  {projectsTrend.change} vs vorige maand
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-600" />
                Recente Activiteit
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/time-entries")}
                className="text-slate-700 dark:text-slate-300"
              >
                Alles bekijken
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEntries.length === 0 ? (
                <p className="text-center text-slate-600 dark:text-slate-400 py-8">
                  Geen recente activiteit
                </p>
              ) : (
                recentEntries.map((entry, index) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {entry.user?.firstName?.charAt(0)}
                          {entry.user?.lastName?.charAt(0)}
                        </span>
                      </div>
                      {index < recentEntries.length - 1 && (
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {entry.user?.firstName} {entry.user?.lastName}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {entry.project?.name} •{" "}
                            {dayjs(entry.startTime).fromNow()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {(
                              (dayjs(entry.endTime).diff(
                                dayjs(entry.startTime),
                                "minute",
                              ) -
                                (entry.breakMinutes || 0)) /
                              60
                            ).toFixed(1)}
                            u
                          </p>
                          {getStatusBadge(entry.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Alerts & Vacation Requests */}
        <div className="space-y-6">
          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-slate-600" />
                Systeem Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemAlerts.length === 0 ? (
                  <p className="text-center text-slate-600 dark:text-slate-400 py-4 text-sm">
                    Geen alerts
                  </p>
                ) : (
                  systemAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                    >
                      {getAlertBadge(alert.type)}
                      <div className="flex-1">
                        <p className="text-sm text-slate-900 dark:text-slate-100">
                          {alert.message}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {alert.time.fromNow()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Vacation Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  Vakantie Aanvragen
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/admin/vacation")}
                  className="text-slate-700 dark:text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentVacations.length === 0 ? (
                  <p className="text-center text-slate-600 dark:text-slate-400 py-4 text-sm">
                    Geen vakantie aanvragen
                  </p>
                ) : (
                  recentVacations.map((vacation) => (
                    <div
                      key={vacation.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {vacation.user?.firstName} {vacation.user?.lastName}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {dayjs(vacation.startDate).format("DD MMM")} -{" "}
                            {dayjs(vacation.endDate).format("DD MMM")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(vacation.status)}
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {dayjs(vacation.endDate).diff(
                            dayjs(vacation.startDate),
                            "day",
                          )}{" "}
                          dagen
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
