"use client";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { Users, Building2, Briefcase, Clock, TrendingUp, CheckCircle, XCircle, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

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
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [recentVacations, setRecentVacations] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch users
      const usersRes = await fetch("${API_URL}/users");
      const users = await usersRes.json();

      // Fetch companies
      const companiesRes = await fetch("${API_URL}/companies");
      const companies = await companiesRes.json();

      // Fetch projects
      const projectsRes = await fetch("${API_URL}/projects");
      const projects = await projectsRes.json();

      // Fetch time entries
      const entriesRes = await fetch("${API_URL}/time-entries");
      const entries = await entriesRes.json();

      // Fetch vacation requests
      const vacationsRes = await fetch("${API_URL}/vacation-requests");
      const vacations = await vacationsRes.json();

      // Calculate stats
      const pendingEntries = entries.filter((e: any) => e.status === "ingeleverd");
      const pendingVacs = vacations.filter((v: any) => v.status === "pending");

      const monthStart = dayjs().startOf("month");
      const monthEnd = dayjs().endOf("month");
      const monthEntries = entries.filter((e: any) => {
        const entryDate = dayjs(e.startTime);
        return entryDate.isAfter(monthStart) && entryDate.isBefore(monthEnd);
      });

      const totalHours = monthEntries.reduce((sum: number, e: any) => {
        const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
        return sum + (diff - (e.breakMinutes || 0)) / 60;
      }, 0);

      setStats({
        totalUsers: users.length,
        totalCompanies: companies.length,
        totalProjects: projects.length,
        totalHoursThisMonth: totalHours,
        pendingApprovals: pendingEntries.length,
        pendingVacations: pendingVacs.length,
      });

      // Recent entries (last 10)
      const sorted = entries
        .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 10);
      setRecentEntries(sorted);

      // Recent vacation requests (last 5)
      const sortedVacs = vacations
        .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .slice(0, 5);
      setRecentVacations(sortedVacs);
    } catch (error) {
      showToast("Fout bij laden dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
      case "approved":
        return <Badge className="bg-green-500">Goedgekeurd</Badge>;
      case "ingeleverd":
      case "pending":
        return <Badge className="bg-yellow-500">In behandeling</Badge>;
      case "afgekeurd":
      case "rejected":
        return <Badge className="bg-red-500">Afgekeurd</Badge>;
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Systeem overzicht en statistieken</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => router.push("/admin/users")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Totaal Gebruikers</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => router.push("/admin/companies")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Totaal Bedrijven</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalCompanies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => router.push("/admin/projects")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Totaal Projecten</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => router.push("/admin/approvals")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Goedkeuringen</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pendingApprovals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Deze Maand</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalHoursThisMonth.toFixed(0)}u</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => router.push("/admin/vacation")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Vakantie Aanvragen</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pendingVacations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Time Entries */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recente Registraties</h2>
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/approvals")}>
                Alles Bekijken
              </Button>
            </div>
            <div className="space-y-3">
              {recentEntries.length === 0 ? (
                <p className="text-center text-slate-600 dark:text-slate-400 py-4">Geen registraties</p>
              ) : (
                recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {entry.user?.firstName?.charAt(0)}{entry.user?.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {entry.user?.firstName} {entry.user?.lastName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {dayjs(entry.startTime).format("DD MMM HH:mm")} • {entry.project?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(entry.status)}
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {((dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60).toFixed(1)}u
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
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Vakantie Aanvragen</h2>
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/vacation")}>
                Alles Bekijken
              </Button>
            </div>
            <div className="space-y-3">
              {recentVacations.length === 0 ? (
                <p className="text-center text-slate-600 dark:text-slate-400 py-4">Geen vakantie aanvragen</p>
              ) : (
                recentVacations.map((vacation) => (
                  <div key={vacation.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {vacation.user?.firstName} {vacation.user?.lastName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {dayjs(vacation.startDate).format("DD MMM")} - {dayjs(vacation.endDate).format("DD MMM")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(vacation.status)}
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {dayjs(vacation.endDate).diff(dayjs(vacation.startDate), "day")} dagen
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Snelle Acties</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/admin/users")}>
              <Users className="w-5 h-5" />
              <span className="text-sm">Gebruikers</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/admin/companies")}>
              <Building2 className="w-5 h-5" />
              <span className="text-sm">Bedrijven</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/admin/projects")}>
              <Briefcase className="w-5 h-5" />
              <span className="text-sm">Projecten</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/admin/approvals")}>
              <Clock className="w-5 h-5" />
              <span className="text-sm">Goedkeuringen</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
