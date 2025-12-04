"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clock, Calendar, TrendingUp, AlertCircle, CheckCircle, 
  ChevronRight, Plane, DollarSign, Award
} from "lucide-react";
import { getTimeEntries, getVacationRequests, getActivities } from "@/lib/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import { useRouter } from "next/navigation";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);

export default function Dashboard() {
  const router = useRouter();
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
      const userId = Number(localStorage.getItem("userId") || "1");
      const name = localStorage.getItem("firstName") || "Gebruiker";
      setFirstName(name);

      // Load time entries
      const entries = await getTimeEntries();
      const userEntries = entries.filter((e: any) => e.userId === userId);

      // Calculate week hours
      const weekStart = dayjs().startOf("isoWeek");
      const weekEnd = dayjs().endOf("isoWeek");
      const weekEntries = userEntries.filter((e: any) => {
        const date = dayjs(e.startTime || e.date);
        return date.isBetween(weekStart, weekEnd, null, "[]");
      });
      const weekHours = weekEntries.reduce((sum: number, e: any) => {
        if (e.startTime && e.endTime) {
          const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute") - (e.breakMinutes || 0);
          return sum + (diff / 60);
        }
        return sum + (e.hours || 0);
      }, 0);

      // Calculate month hours
      const monthStart = dayjs().startOf("month");
      const monthEnd = dayjs().endOf("month");
      const monthEntries = userEntries.filter((e: any) => {
        const date = dayjs(e.startTime || e.date);
        return date.isBetween(monthStart, monthEnd, null, "[]");
      });
      const monthHours = monthEntries.reduce((sum: number, e: any) => {
        if (e.startTime && e.endTime) {
          const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute") - (e.breakMinutes || 0);
          return sum + (diff / 60);
        }
        return sum + (e.hours || 0);
      }, 0);

      // Pending approvals
      const pending = userEntries.filter((e: any) => e.status === "ingeleverd").length;

      // Recent entries (last 5)
      const recent = userEntries
        .sort((a: any, b: any) => {
          const dateA = dayjs(a.startTime || a.date);
          const dateB = dayjs(b.startTime || b.date);
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
          .filter((v: any) => v.status === "goedgekeurd" && dayjs(v.startDate).isAfter(dayjs()))
          .sort((a: any, b: any) => dayjs(a.startDate).diff(dayjs(b.startDate)))[0];
        
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
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Goedgekeurd</span>;
      case "ingeleverd":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">In Behandeling</span>;
      case "afgekeurd":
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Afgekeurd</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Concept</span>;
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
  const isOnTrack = stats.weekHours >= (stats.weekTarget / 7) * dayjs().isoWeekday();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {getGreeting()}, {firstName}! 👋
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Hier is je overzicht voor vandaag, {dayjs().format("dddd D MMMM YYYY")}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="elevated" padding="md" className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push("/uren-registreren")}>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Deze Week</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.weekHours}u
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${isOnTrack ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${Math.min(weekProgress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{Math.round(weekProgress)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="md" className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push("/uren-overzicht")}>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Deze Maand</p>
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

        <Card variant="elevated" padding="md" className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push("/vakantie")}>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Plane className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Vakantiedagen</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.vacationDays}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Nog beschikbaar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="md" className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push("/uren-overzicht")}>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">In Behandeling</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.pendingApprovals}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Wacht op goedkeuring
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Entries */}
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recente Registraties</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/uren-overzicht")}>
                Bekijk alles
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nog geen uren geregistreerd</p>
                <Button className="mt-4" onClick={() => router.push("/uren-registreren")}>
                  Start met registreren
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry: any) => (
                  <div 
                    key={entry.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    onClick={() => router.push("/uren-overzicht")}
                  >
                    <div className="w-16 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                        {dayjs(entry.startTime || entry.date).format("ddd")}
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {dayjs(entry.startTime || entry.date).format("D")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {entry.project?.name || `Project ${entry.projectId}`}
                        </p>
                        {getStatusBadge(entry.status)}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {entry.notes || "Geen omschrijving"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {entry.startTime && entry.endTime 
                          ? Math.round((dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60 * 10) / 10
                          : entry.hours || 0}u
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          
          {/* Quick Actions */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Snelle Acties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start" onClick={() => router.push("/uren-registreren")}>
                  <Clock className="w-4 h-4 mr-2" />
                  Uren Registreren
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/vakantie")}>
                  <Plane className="w-4 h-4 mr-2" />
                  Vakantie Aanvragen
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/uren-overzicht")}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Uren Overzicht
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Week Status */}
          <Card variant="elevated" padding="lg" className={isOnTrack ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"}>
            <CardContent>
              <div className="flex items-start gap-3">
                {isOnTrack ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
                )}
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {isOnTrack ? "Op Schema!" : "Let op je uren!"}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {isOnTrack 
                      ? `Je zit goed op schema met ${stats.weekHours}u deze week.`
                      : `Je hebt ${stats.weekHours}u geregistreerd. Probeer ${stats.weekTarget}u te halen deze week.`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Vacation */}
          {upcomingVacation && (
            <Card variant="elevated" padding="lg" className="border-purple-200 dark:border-purple-800">
              <CardContent>
                <div className="flex items-start gap-3">
                  <Plane className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      Aankomende Vakantie
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {dayjs(upcomingVacation.startDate).format("D MMM")} - {dayjs(upcomingVacation.endDate).format("D MMM YYYY")}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      Over {dayjs(upcomingVacation.startDate).diff(dayjs(), "day")} dagen
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
