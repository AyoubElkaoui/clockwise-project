"use client";
import { useState, useEffect } from "react";
import { getTeamTimeEntries } from "@/lib/api";
import { Clock, TrendingUp, BarChart, Calendar } from "lucide-react";
import dayjs from "dayjs";

export default function ManagerHoursPage() {
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    thisWeek: 0,
    thisMonth: 0,
    avgPerWeek: 0,
  });

  useEffect(() => {
    loadTeamHours();
  }, []);

  const loadTeamHours = async () => {
    try {
      // Get managerId from localStorage
      const managerId = Number(localStorage.getItem("userId"));
      if (!managerId) {
        console.error("No manager ID found");
        setLoading(false);
        return;
      }

      // Use secure backend endpoint - only returns team time entries
      const entries = await getTeamTimeEntries(managerId);
      setTimeEntries(entries);

      // Calculate statistics
      const now = dayjs();
      const startOfWeek = now.startOf('week');
      const startOfMonth = now.startOf('month');

      const thisWeekHours = entries
        .filter((e: any) => dayjs(e.date).isAfter(startOfWeek))
        .reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

      const thisMonthHours = entries
        .filter((e: any) => dayjs(e.date).isAfter(startOfMonth))
        .reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

      const avgPerWeek = thisMonthHours / 4; // Rough estimate

      setStats({
        thisWeek: thisWeekHours,
        thisMonth: thisMonthHours,
        avgPerWeek: avgPerWeek,
      });
    } catch (error) {
      console.error("Failed to load team hours:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Team Uren
          </h1>
          <p className="text-gray-600 dark:text-slate-400">Overzicht van geregistreerde uren</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-gray-600 dark:text-slate-400">Deze Week</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.thisWeek.toFixed(1)} uur
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600 dark:text-slate-400">Deze Maand</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.thisMonth.toFixed(0)} uur
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-600 dark:text-slate-400">Gemiddeld/Week</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.avgPerWeek.toFixed(1)} uur
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recente Registraties ({timeEntries.length})
          </h3>
          
          {timeEntries.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 text-center py-8">
              Geen uren registraties gevonden
            </p>
          ) : (
            <div className="space-y-3">
              {timeEntries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {dayjs(entry.date).format("DD MMM YYYY")}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        {entry.projectName || "Geen project"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {entry.hours} uur
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      entry.status === 'goedgekeurd' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : entry.status === 'ingeleverd'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
