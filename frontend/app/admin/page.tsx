"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Users,
  Building2,
  FolderKanban,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Zap,
  Server,
  Database,
  Shield,
  RefreshCw,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import {
  getAdminStats,
  getSystemStatus,
  getAdminTimeEntries,
  getDashboardAlerts,
} from "@/lib/api";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface DashboardStats {
  totalUsers: number;
  totalCompanies: number;
  totalProjects: number;
  totalHoursThisMonth: number;
  pendingApprovals: number;
  pendingVacations: number;
  activeUsers: number;
  systemHealth: number;
  lastWeekUsers: number;
  lastWeekHours: number;
  lastWeekProjects: number;
  avgHoursPerUser: number;
  completionRate: number;
}

interface RecentActivity {
  id: number;
  type: string;
  user: { firstName: string; lastName: string };
  project: { name: string };
  hours: number;
  status: string;
  timestamp: string;
}

interface SystemStatus {
  id: number;
  component: string;
  status: "operational" | "degraded" | "down";
  uptime: string;
  responseTime: string;
}

interface Alert {
  id: string;
  type: string;
  severity: "warning" | "error";
  message: string;
  target?: number;
  timestamp: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCompanies: 0,
    totalProjects: 0,
    totalHoursThisMonth: 0,
    pendingApprovals: 0,
    pendingVacations: 0,
    activeUsers: 0,
    systemHealth: 0,
    lastWeekUsers: 0,
    lastWeekHours: 0,
    lastWeekProjects: 0,
    avgHoursPerUser: 0,
    completionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, systemStatusData, alertsData, timeEntries] =
        await Promise.all([
          getAdminStats(),
          getSystemStatus(),
          getDashboardAlerts(),
          getAdminTimeEntries(),
        ]);

      setStats({
        totalUsers: statsData.totalUsers || 0,
        totalCompanies: statsData.totalCompanies || 0,
        totalProjects: statsData.totalProjects || 0,
        totalHoursThisMonth: statsData.hoursThisMonth || 0,
        pendingApprovals: statsData.pendingApprovals || 0,
        pendingVacations: statsData.pendingVacations || 0,
        activeUsers: statsData.activeUsersThisMonth || 0,
        systemHealth: statsData.systemHealth || 0,
        lastWeekUsers: statsData.usersLastWeek || 0,
        lastWeekHours: statsData.hoursLastWeek || 0,
        lastWeekProjects: statsData.projectsLastWeek || 0,
        avgHoursPerUser: statsData.avgHoursPerUser || 0,
        completionRate: statsData.completionRate || 0,
      });

      setSystemStatus(
        systemStatusData.map((component: any) => ({
          id: component.id,
          component: component.component,
          status: component.status,
          uptime: component.uptime,
          responseTime: component.responseTime,
        })),
      );

      setAlerts(
        alertsData.map((alert: any) => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          target: alert.target,
          timestamp: alert.timestamp,
        })),
      );

      const sorted = timeEntries
        .sort((a: any, b: any) => dayjs(b.startTime).diff(dayjs(a.startTime)))
        .slice(0, 5)
        .map((entry: any) => ({
          id: entry.id,
          type: "time_entry",
          user: entry.user,
          project: entry.project,
          hours:
            dayjs(entry.endTime).diff(dayjs(entry.startTime), "hour") -
            (entry.breakMinutes || 0) / 60,
          status: entry.status,
          timestamp: entry.startTime,
        }));

      setRecentActivity(sorted);
    } catch (error) {
      showToast(t("admin.dashboard.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
      case "approved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Goedgekeurd
          </span>
        );
      case "ingeleverd":
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="w-3 h-3 mr-1" />
            In behandeling
          </span>
        );
      case "afgekeurd":
      case "rejected":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Afgekeurd
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

  const getSystemStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Operationeel
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Vertraagd
          </span>
        );
      case "down":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Uitval
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            Onbekend
          </span>
        );
    }
  };

  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0)
      return { icon: TrendingUp, color: "text-emerald-500", change: "+∞" };
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return {
        icon: TrendingUp,
        color: "text-emerald-500",
        change: `+${change.toFixed(1)}%`,
      };
    } else if (change < 0) {
      return {
        icon: TrendingDown,
        color: "text-red-500",
        change: `${change.toFixed(1)}%`,
      };
    }
    return { icon: Activity, color: "text-slate-500", change: "0%" };
  };

  const usersTrend = getTrendIndicator(stats.totalUsers, stats.lastWeekUsers);
  const projectsTrend = getTrendIndicator(
    stats.totalProjects,
    stats.lastWeekProjects,
  );

  const getComponentIcon = (component: string) => {
    if (component === "API Server") return <Globe className="w-4 h-4 text-slate-400" />;
    if (component === "Database") return <Database className="w-4 h-4 text-slate-400" />;
    if (component === "E-mail Service") return <Shield className="w-4 h-4 text-slate-400" />;
    return <Server className="w-4 h-4 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Dashboard laden...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <PageHeader
        title="Admin Dashboard"
        description={`Systeem overzicht — ${dayjs().format("dddd D MMMM YYYY")}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={loadDashboardData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Vernieuwen
            </Button>
            <Button size="sm" onClick={() => setActiveView("system")}>
              <Server className="w-4 h-4 mr-2" />
              Systeem
            </Button>
          </div>
        }
      />

      {/* Stats rij */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gebruikers"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
          trend={
            stats.lastWeekUsers > 0
              ? {
                  value: usersTrend.change,
                  isPositive: stats.totalUsers >= stats.lastWeekUsers,
                }
              : undefined
          }
          subtitle="totaal geregistreerd"
          onClick={() => router.push("/admin/users")}
        />
        <StatCard
          title="Bedrijven"
          value={stats.totalCompanies}
          icon={Building2}
          color="emerald"
          subtitle="actieve organisaties"
          onClick={() => router.push("/admin/companies")}
        />
        <StatCard
          title="Projecten"
          value={stats.totalProjects}
          icon={FolderKanban}
          color="violet"
          trend={
            stats.lastWeekProjects > 0
              ? {
                  value: projectsTrend.change,
                  isPositive: stats.totalProjects >= stats.lastWeekProjects,
                }
              : undefined
          }
          subtitle="lopende projecten"
          onClick={() => router.push("/admin/projects")}
        />
        <StatCard
          title="Wachtende goedkeuringen"
          value={stats.pendingApprovals}
          icon={Clock}
          color="amber"
          subtitle={`${stats.pendingVacations} verlofaanvragen`}
          onClick={() => router.push("/admin/time-entries")}
        />
      </div>

      {/* Drie kolommen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recente activiteit */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Recente activiteit
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/admin/time-entries")}
              >
                Alles
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Geen activiteit
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Er zijn nog geen items beschikbaar.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-[9px] flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--accent-weak)", color: "var(--accent)" }}>
                      {activity.user?.firstName?.charAt(0)}
                      {activity.user?.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {activity.user?.firstName} {activity.user?.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {activity.project?.name} · {activity.hours.toFixed(1)}u
                      </p>
                      <div className="mt-1">{getStatusBadge(activity.status)}</div>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap pt-0.5">
                      {dayjs(activity.timestamp).fromNow()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Snelle navigatie */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-slate-400" />
                Snelle navigatie
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 text-xs font-medium hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                onClick={() => router.push("/admin/users")}
              >
                <Users className="w-5 h-5 text-blue-600" />
                Gebruikers
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 text-xs font-medium hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-900/20"
                onClick={() => router.push("/admin/companies")}
              >
                <Building2 className="w-5 h-5 text-emerald-600" />
                Bedrijven
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 text-xs font-medium hover:bg-violet-50 hover:border-violet-200 dark:hover:bg-violet-900/20"
                onClick={() => router.push("/admin/projects")}
              >
                <FolderKanban className="w-5 h-5 text-violet-600" />
                Projecten
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 text-xs font-medium hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-900/20"
                onClick={() => router.push("/admin/time-entries")}
              >
                <Clock className="w-5 h-5 text-amber-600" />
                Uren
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 text-xs font-medium hover:bg-teal-50 hover:border-teal-200 dark:hover:bg-teal-900/20"
                onClick={() => router.push("/admin/time-entries")}
              >
                <CheckCircle className="w-5 h-5 text-teal-600" />
                Validaties
              </Button>
              <Button
                variant="outline"
                className="h-16 flex-col gap-1.5 text-xs font-medium hover:bg-indigo-50 hover:border-indigo-200 dark:hover:bg-indigo-900/20"
                onClick={() => router.push("/admin/reports")}
              >
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Rapporten
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Systeem status */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-400" />
                Systeem status
              </CardTitle>
              <span className="text-xs text-slate-500">
                {stats.systemHealth}% gezond
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {systemStatus.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <Server className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Geen data
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Systeemstatus niet beschikbaar.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {systemStatus.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          component.status === "operational"
                            ? "bg-emerald-500"
                            : component.status === "degraded"
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                          {component.component}
                        </p>
                        <p className="text-xs text-slate-400">
                          {component.responseTime} · {component.uptime} uptime
                        </p>
                      </div>
                    </div>
                    {getSystemStatusBadge(component.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Signaleringen (indien aanwezig) */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Actieve signaleringen
              </CardTitle>
              <Badge variant="destructive" className="text-xs">
                {alerts.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Melding
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ernst
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tijdstip
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {alerts.slice(0, 5).map((alert) => (
                    <tr
                      key={alert.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                        {alert.message}
                      </td>
                      <td className="px-4 py-3">
                        {alert.severity === "error" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Kritiek
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Waarschuwing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {dayjs(alert.timestamp).fromNow()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
