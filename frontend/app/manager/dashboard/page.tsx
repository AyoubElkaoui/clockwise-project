"use client";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { getUserId } from "@/lib/auth-utils";
import { 
  Users, Clock, CheckCircle, XCircle, AlertCircle, 
  TrendingUp, Calendar, ChevronRight 
} from "lucide-react";
import dayjs from "dayjs";

export default function ManagerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    teamSize: 0,
    pendingApprovals: 0,
    pendingVacations: 0,
    thisWeekHours: 0,
    thisMonthHours: 0,
  });
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const managerId = getUserId();
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        router.push("/login");
        return;
      }
      
      // Load team time entries
      const entriesRes = await fetch(`${API_URL}/time-entries/team?managerId=${managerId}`);
      const entries = await entriesRes.json();
      
      // Load vacation requests
      const vacationsRes = await fetch("${API_URL}/vacation-requests");
      const vacations = await vacationsRes.json();
      
      // Load team members
      const usersRes = await fetch("${API_URL}/users");
      const users = await usersRes.json();
      const team = users.filter((u: any) => u.managerId === managerId);

      // Calculate stats
      const pending = entries.filter((e: any) => e.status === "ingeleverd");
      const pendingVac = vacations.filter((v: any) => v.status === "pending");
      
      const weekStart = dayjs().startOf("isoWeek");
      const weekEnd = dayjs().endOf("isoWeek");
      const weekEntries = entries.filter((e: any) => {
        const date = dayjs(e.startTime);
        return date.isAfter(weekStart) && date.isBefore(weekEnd);
      });
      
      const monthStart = dayjs().startOf("month");
      const monthEnd = dayjs().endOf("month");
      const monthEntries = entries.filter((e: any) => {
        const date = dayjs(e.startTime);
        return date.isAfter(monthStart) && date.isBefore(monthEnd);
      });

      const calculateHours = (entries: any[]) => {
        return entries.reduce((sum, e) => {
          if (e.startTime && e.endTime) {
            const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
            return sum + (diff - (e.breakMinutes || 0)) / 60;
          }
          return sum;
        }, 0);
      };

      setStats({
        teamSize: team.length,
        pendingApprovals: pending.length,
        pendingVacations: pendingVac.length,
        thisWeekHours: calculateHours(weekEntries),
        thisMonthHours: calculateHours(monthEntries),
      });

      // Get latest 5 pending entries
      setPendingEntries(pending.slice(0, 5));
      
      // Get team activity (recent entries)
      const recent = entries
        .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 10);
      setTeamActivity(recent);
      
    } catch (error) {
      showToast("Fout bij laden dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleApprove = async (id: number) => {
    try {
      await fetch(`${API_URL}/time-entries/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      loadDashboardData();
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await fetch(`${API_URL}/time-entries/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      });
      loadDashboardData();
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return <Badge className="bg-green-500">Goedgekeurd</Badge>;
      case "ingeleverd":
        return <Badge className="bg-yellow-500">In behandeling</Badge>;
      case "afgekeurd":
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Manager Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Overzicht van je team en goedkeuringen
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Team Grootte</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.teamSize}
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push("/manager/approve")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Uren Goedkeuring</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.pendingApprovals}
                </p>
              </div>
              <Clock className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push("/manager/vacation")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Vakantie Verzoeken</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {stats.pendingVacations}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Deze Week</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.thisWeekHours.toFixed(1)}u
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Deze Maand</p>
                <p className="text-3xl font-bold text-indigo-600 mt-2">
                  {stats.thisMonthHours.toFixed(0)}u
                </p>
              </div>
              <Clock className="w-10 h-10 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {stats.pendingApprovals > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Wachtend op Goedkeuring</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push("/manager/approve")}>
                Bekijk Alles
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {entry.user?.firstName} {entry.user?.lastName}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {dayjs(entry.startTime).format("DD MMM YYYY")} • {entry.project?.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {dayjs(entry.startTime).format("HH:mm")} - {dayjs(entry.endTime).format("HH:mm")} 
                      ({((dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60).toFixed(1)}u)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-600" onClick={() => handleApprove(entry.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Goedkeuren
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-600" onClick={() => handleReject(entry.id)}>
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

      {/* Team Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recente Team Activiteit</CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push("/manager/hours")}>
              Alle Uren
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamActivity.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {entry.user?.firstName?.charAt(0)}{entry.user?.lastName?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {entry.user?.firstName} {entry.user?.lastName}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {entry.project?.name} • {dayjs(entry.startTime).format("DD MMM HH:mm")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {((dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60).toFixed(1)}u
                    </p>
                    {getStatusBadge(entry.status)}
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
