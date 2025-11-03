"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Target,
  Award,
  ArrowRight,
  Sun,
  Moon,
  Coffee,
  Briefcase
} from "lucide-react";
import { getTimeEntries, getVacationRequests } from "@/lib/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale("nl");

interface TimeEntry {
  id: number;
  userId: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: string;
  project?: {
    name: string;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [vacationDays, setVacationDays] = useState(0);

  useEffect(() => {
    const name = localStorage.getItem("firstName") || "Gebruiker";
    setFirstName(name);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userId = Number(localStorage.getItem("userId"));
      
      const [timeData, vacationData] = await Promise.all([
        getTimeEntries(),
        getVacationRequests()
      ]);

      const userEntries = timeData.filter((e: any) => e.userId === userId);
      setEntries(userEntries);

      const userVacations = vacationData.filter((v: any) => 
        v.userId === userId && v.status === "approved"
      );
      const totalVacationDays = userVacations.reduce((sum: number, v: any) => 
        sum + (v.hours / 8), 0
      );
      setVacationDays(25 - totalVacationDays);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Goedemorgen", icon: Sun };
    if (hour < 18) return { text: "Goedemiddag", icon: Coffee };
    return { text: "Goedenavond", icon: Moon };
  };

  const calculateHours = (entry: TimeEntry): number => {
    try {
      const start = dayjs(entry.startTime);
      const end = dayjs(entry.endTime);
      const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
      return diffMin > 0 ? diffMin / 60 : 0;
    } catch {
      return 0;
    }
  };

  const getWeekStats = () => {
    const weekStart = dayjs().startOf("isoWeek");
    const weekEnd = dayjs().endOf("isoWeek");

    const weekEntries = entries.filter(e => {
      const entryDate = dayjs(e.startTime);
      return entryDate.isBetween(weekStart, weekEnd, "day", "[]");
    });

    const totalHours = weekEntries.reduce((sum, e) => sum + calculateHours(e), 0);
    const submittedCount = weekEntries.filter(e => e.status === "ingeleverd" || e.status === "goedgekeurd").length;
    const approvedCount = weekEntries.filter(e => e.status === "goedgekeurd").length;

    return { totalHours, submittedCount, approvedCount, totalEntries: weekEntries.length };
  };

  const getMonthStats = () => {
    const monthStart = dayjs().startOf("month");
    const monthEnd = dayjs().endOf("month");

    const monthEntries = entries.filter(e => {
      const entryDate = dayjs(e.startTime);
      return entryDate.isBetween(monthStart, monthEnd, "day", "[]");
    });

    const totalHours = monthEntries.reduce((sum, e) => sum + calculateHours(e), 0);
    return { totalHours, totalDays: monthEntries.length };
  };

  const getTodayEntry = () => {
    const today = dayjs().format("YYYY-MM-DD");
    return entries.find(e => e.startTime.startsWith(today));
  };

  const getStreak = () => {
    const sortedEntries = [...entries].sort((a, b) => 
      dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
    );

    let streak = 0;
    let currentDate = dayjs();

    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.format("YYYY-MM-DD");
      const hasEntry = sortedEntries.some(e => e.startTime.startsWith(dateStr));
      
      if (hasEntry) {
        streak++;
        currentDate = currentDate.subtract(1, "day");
        if (currentDate.day() === 0 || currentDate.day() === 6) {
          currentDate = currentDate.subtract(currentDate.day() === 0 ? 2 : 1, "day");
        }
      } else {
        break;
      }
    }

    return streak;
  };

  const greeting = getGreeting();
  const weekStats = getWeekStats();
  const monthStats = getMonthStats();
  const todayEntry = getTodayEntry();
  const streak = getStreak();

  const GreetingIcon = greeting.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header met Greeting */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <GreetingIcon className="w-8 h-8" />
              <h1 className="text-4xl font-bold">
                {greeting.text}, {firstName}!
              </h1>
            </div>
            <p className="text-blue-100 text-lg">
              {dayjs().format("dddd D MMMM YYYY")}
            </p>
          </div>
          {streak > 0 && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">🔥 {streak}</div>
              <div className="text-sm text-blue-100">Dag{streak > 1 ? "en" : ""} streak</div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Deze Week */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
             onClick={() => router.push("/tijd-registratie")}>
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8" />
            <ArrowRight className="w-5 h-5 opacity-70" />
          </div>
          <div className="text-3xl font-bold mb-1">
            {loading ? "..." : `${Math.round(weekStats.totalHours)}u`}
          </div>
          <div className="text-emerald-100 text-sm">
            Deze week • {weekStats.totalHours >= 40 ? "Compleet!" : `${40 - Math.round(weekStats.totalHours)}u te gaan`}
          </div>
          <div className="mt-3 bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${Math.min((weekStats.totalHours / 40) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Deze Maand */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
             onClick={() => router.push("/uren-overzicht")}>
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8" />
            <ArrowRight className="w-5 h-5 opacity-70" />
          </div>
          <div className="text-3xl font-bold mb-1">
            {loading ? "..." : `${Math.round(monthStats.totalHours)}u`}
          </div>
          <div className="text-blue-100 text-sm">
            Deze maand • {monthStats.totalDays} dag{monthStats.totalDays !== 1 ? "en" : ""}
          </div>
        </div>

        {/* Vakantiedagen */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
             onClick={() => router.push("/vakantie")}>
          <div className="flex items-center justify-between mb-4">
            <Sun className="w-8 h-8" />
            <ArrowRight className="w-5 h-5 opacity-70" />
          </div>
          <div className="text-3xl font-bold mb-1">
            {loading ? "..." : vacationDays}
          </div>
          <div className="text-purple-100 text-sm">
            Vakantiedagen beschikbaar
          </div>
        </div>

        {/* Status */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8" />
            {weekStats.approvedCount > 0 ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>
          <div className="text-3xl font-bold mb-1">
            {weekStats.submittedCount}/{weekStats.totalEntries}
          </div>
          <div className="text-orange-100 text-sm">
            Ingeleverd deze week
          </div>
        </div>
      </div>

      {/* Quick Actions & Today */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vandaag */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" />
              Vandaag
            </h2>
            {!todayEntry && (
              <button 
                onClick={() => router.push("/tijd-registratie")}
                className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 border-0"
              >
                + Uren Toevoegen
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : todayEntry ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Uren geregistreerd!
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    {todayEntry.project?.name || "Project"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {calculateHours(todayEntry).toFixed(1)}u
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {dayjs(todayEntry.startTime).format("HH:mm")} - {dayjs(todayEntry.endTime).format("HH:mm")}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  todayEntry.status === "goedgekeurd" ? "bg-green-200 text-green-800" :
                  todayEntry.status === "ingeleverd" ? "bg-yellow-200 text-yellow-800" :
                  "bg-blue-200 text-blue-800"
                }`}>
                  {todayEntry.status === "goedgekeurd" ? "✅ Goedgekeurd" :
                   todayEntry.status === "ingeleverd" ? "⏳ Ingeleverd" :
                   "📝 Concept"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Nog geen uren vandaag
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Begin met het registreren van je uren voor vandaag
              </p>
              <button 
                onClick={() => router.push("/tijd-registratie")}
                className="btn bg-blue-600 text-white hover:bg-blue-700 border-0"
              >
                <Clock className="w-4 h-4 mr-2" />
                Uren Registreren
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Snelle Acties
          </h2>
          <div className="space-y-3">
            <button 
              onClick={() => router.push("/tijd-registratie")}
              className="w-full btn btn-outline border-2 justify-start hover:scale-105 transition-transform"
            >
              <Clock className="w-5 h-5 mr-3" />
              Tijd Registreren
            </button>
            <button 
              onClick={() => router.push("/vakantie")}
              className="w-full btn btn-outline border-2 justify-start hover:scale-105 transition-transform"
            >
              <Calendar className="w-5 h-5 mr-3" />
              Vakantie Aanvragen
            </button>
            <button 
              onClick={() => router.push("/uren-overzicht")}
              className="w-full btn btn-outline border-2 justify-start hover:scale-105 transition-transform"
            >
              <TrendingUp className="w-5 h-5 mr-3" />
              Uren Overzicht
            </button>
          </div>

          {/* Achievement */}
          {streak >= 5 && (
            <div className="mt-6 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl p-4 border-2 border-yellow-300 dark:border-yellow-700">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-yellow-600" />
                <div>
                  <div className="font-bold text-yellow-800 dark:text-yellow-200">
                    Geweldig! 🎉
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    {streak} dagen op rij uren ingevuld!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Week Progress */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Week Voortgang
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">
                {Math.round(weekStats.totalHours)} van 40 uur
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.round((weekStats.totalHours / 40) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${
                  weekStats.totalHours >= 40 ? "bg-gradient-to-r from-green-500 to-emerald-600" :
                  weekStats.totalHours >= 32 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                  "bg-gradient-to-r from-blue-500 to-indigo-600"
                }`}
                style={{ width: `${Math.min((weekStats.totalHours / 40) * 100, 100)}%` }}
              />
            </div>
          </div>

          {weekStats.totalHours < 40 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  Je moet nog <strong>{40 - Math.round(weekStats.totalHours)} uur</strong> registreren om de week vol te maken
                </span>
              </div>
            </div>
          )}

          {weekStats.totalHours >= 40 && (
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  Gefeliciteerd! Je hebt een volledige werkweek geregistreerd! 🎉
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}