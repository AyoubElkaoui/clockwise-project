"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Users,
  Building2,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  PieChart,
  Zap,
  Server,
  Database,
  Shield,
  Settings,
  UserPlus,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Download,
  RefreshCw,
  Globe,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import {
  getAdminStats,
  getSystemStatus,
  getAdminTimeEntries,
  getDashboardHealth,
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
      
      // Load stats, system status, alerts, and recent time entries in parallel
      const [statsData, systemStatusData, alertsData, timeEntries] =
        await Promise.all([
          getAdminStats(),
          getSystemStatus(),
          getDashboardAlerts(),
          getAdminTimeEntries(),
        ]);

      // Set stats from backend
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

      // Set system status from backend
      setSystemStatus(
        systemStatusData.map((component: any) => ({
          id: component.id,
          component: component.component,
          status: component.status,
          uptime: component.uptime,
          responseTime: component.responseTime,
        })),
      );

      // Set alerts from backend
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

      // Recent activity from time entries
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
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Goedgekeurd
          </Badge>
        );
      case "ingeleverd":
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            In Behandeling
          </Badge>
        );
      case "afgekeurd":
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Afgekeurd
          </Badge>
        );
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  const getSystemStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Operationeel
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Vertraagd
          </Badge>
        );
      case "down":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Uitval
          </Badge>
        );
      default:
        return <Badge variant="secondary">Onbekend</Badge>;
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
  const hoursTrend = getTrendIndicator(
    stats.totalHoursThisMonth,
    stats.lastWeekHours,
  );
  const projectsTrend = getTrendIndicator(
    stats.totalProjects,
    stats.lastWeekProjects,
  );

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Beheerdersdashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Overzicht van systeem prestaties en activiteiten
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardData}
                className="bg-white/50 dark:bg-slate-800/50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Vernieuwen
              </Button>
              <Button
                onClick={() => router.push("/admin/users")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Nieuwe Gebruiker
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation */}
        <div className="flex items-center gap-2 mb-8 p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <Button
            variant={activeView === "overview" ? "default" : "ghost"}
            onClick={() => setActiveView("overview")}
            className={`flex items-center gap-2 ${
              activeView === "overview"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : "hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Overzicht
          </Button>
          <Button
            variant={activeView === "analytics" ? "default" : "ghost"}
            onClick={() => setActiveView("analytics")}
            className={`flex items-center gap-2 ${
              activeView === "analytics"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : "hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </Button>
          <Button
            variant={activeView === "system" ? "default" : "ghost"}
            onClick={() => setActiveView("system")}
            className={`flex items-center gap-2 ${
              activeView === "system"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : "hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <Server className="w-4 h-4" />
            Systeem
          </Button>
          <Button
            variant={activeView === "activity" ? "default" : "ghost"}
            onClick={() => setActiveView("activity")}
            className={`flex items-center gap-2 ${
              activeView === "activity"
                ? "bg-white dark:bg-slate-700 shadow-sm"
                : "hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <Activity className="w-4 h-4" />
            Activiteit
          </Button>
        </div>

        {/* Overview View */}
        {activeView === "overview" && (
          <div className="space-y-8">
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                        <usersTrend.icon
                          className={`w-5 h-5 ${usersTrend.color}`}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${usersTrend.color}`}>
                        {usersTrend.change} vs vorige week
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                        <hoursTrend.icon
                          className={`w-5 h-5 ${hoursTrend.color}`}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${hoursTrend.color}`}>
                        {hoursTrend.change} vs vorige week
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Totaal Projecten
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {stats.totalProjects}
                        </p>
                        <projectsTrend.icon
                          className={`w-5 h-5 ${projectsTrend.color}`}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${projectsTrend.color}`}>
                        {projectsTrend.change} vs vorige week
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Signaleringen
                      </p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                        {alerts.length}
                      </p>
                      <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                        {alerts.filter((a) => a.severity === "error").length}{" "}
                        kritiek
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
              <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Actieve Signaleringen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <AlertTriangle
                          className={`w-5 h-5 mt-0.5 ${alert.severity === "error" ? "text-red-500" : "text-amber-500"}`}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {alert.message}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {dayjs(alert.timestamp).fromNow()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            alert.severity === "error"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    ))}
                    {alerts.length > 5 && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                        +{alerts.length - 5} meer signaleringen
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions Grid */}
            <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-slate-600" />
                  Snelle Acties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-3 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                    onClick={() => router.push("/admin/users")}
                  >
                    <Users className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-medium">Gebruikers</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-3 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20"
                    onClick={() => router.push("/admin/companies")}
                  >
                    <Building2 className="w-6 h-6 text-purple-600" />
                    <span className="text-sm font-medium">Bedrijven</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-3 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-900/20"
                    onClick={() => router.push("/admin/projects")}
                  >
                    <Briefcase className="w-6 h-6 text-emerald-600" />
                    <span className="text-sm font-medium">Projecten</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-3 hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-900/20"
                    onClick={() => router.push("/admin/time-entries")}
                  >
                    <CheckCircle className="w-6 h-6 text-amber-600" />
                    <span className="text-sm font-medium">Goedkeuringen</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Performance Chart */}
              <Card className="lg:col-span-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-slate-600" />
                    Prestaties Overzicht
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Voltooiingsgraad
                        </span>
                        <span className="text-sm font-bold">
                          {stats.completionRate.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={stats.completionRate} className="h-2" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Actieve Gebruikers
                        </span>
                        <span className="text-sm font-bold">
                          {stats.activeUsers}
                        </span>
                      </div>
                      <Progress
                        value={(stats.activeUsers / stats.totalUsers) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Gemiddeld per Gebruiker
                        </span>
                        <span className="text-sm font-bold">
                          {stats.avgHoursPerUser.toFixed(1)}u
                        </span>
                      </div>
                      <Progress
                        value={(stats.avgHoursPerUser / 40) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-600" />
                    Recente Activiteit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.length === 0 ? (
                      <p className="text-center text-slate-600 dark:text-slate-400 py-8">
                        Geen recente activiteit
                      </p>
                    ) : (
                      recentActivity.map((activity, index) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {activity.user?.firstName?.charAt(0)}
                            {activity.user?.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {activity.user?.firstName}{" "}
                              {activity.user?.lastName}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {activity.project?.name} •{" "}
                              {activity.hours.toFixed(1)}u
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(activity.status)}
                              <span className="text-xs text-slate-500">
                                {dayjs(activity.timestamp).fromNow()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Analytics View */}
        {activeView === "analytics" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-indigo-500">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Gebruikersdistributie
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {stats.activeUsers} van {stats.totalUsers} actief deze
                      maand
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-cyan-500">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Groei Trends
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      +{usersTrend.change} gebruikersgroei
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-pink-500">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-pink-600 dark:text-pink-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Productiviteit
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {stats.avgHoursPerUser.toFixed(1)}u gemiddeld per
                      gebruiker
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* System View */}
        {activeView === "system" && (
          <div className="space-y-8">
            {/* System Health Overview */}
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Systeem Health
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Alle systemen draaien optimaal
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.systemHealth}%
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 text-sm">
                      Uptime Score
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={stats.systemHealth} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* System Components */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {systemStatus.map((component) => (
                <Card
                  key={component.id}
                  className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          {component.component === "API Server" && (
                            <Globe className="w-5 h-5" />
                          )}
                          {component.component === "Database" && (
                            <Database className="w-5 h-5" />
                          )}
                          {component.component === "Bestandsopslag" && (
                            <Server className="w-5 h-5" />
                          )}
                          {component.component === "E-mail Service" && (
                            <Shield className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                            {component.component}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {component.uptime} uptime
                          </p>
                        </div>
                      </div>
                      {getSystemStatusBadge(component.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        Response tijd
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {component.responseTime}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Activity View */}
        {activeView === "activity" && (
          <div className="space-y-8">
            <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slate-600" />
                  Live Activiteit Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {activity.user?.firstName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {activity.user?.firstName} {activity.user?.lastName}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Registreerde {activity.hours.toFixed(1)} uur voor{" "}
                          {activity.project?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(activity.status)}
                        <p className="text-xs text-slate-500 mt-1">
                          {dayjs(activity.timestamp).fromNow()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
