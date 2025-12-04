"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/nl";

dayjs.extend(isoWeek);
dayjs.locale("nl");

interface TimeEntry {
  id: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: string;
}

export default function KalenderPage() {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, [currentMonth]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const userId = Number(localStorage.getItem("userId"));
      if (!userId) return;

      const res = await fetch(`${API_URL}/time-entries/user/${userId}`);
      const data = await res.json();
      
      // Filter entries for current month
      const monthStart = currentMonth.startOf("month");
      const monthEnd = currentMonth.endOf("month");
      const filtered = data.filter((e: TimeEntry) => {
        const entryDate = dayjs(e.startTime);
        return entryDate.isAfter(monthStart) && entryDate.isBefore(monthEnd);
      });
      
      setEntries(filtered);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const monthName = currentMonth.format("MMMM YYYY");

  const getDaysInMonth = () => {
    const firstDay = currentMonth.startOf("month");
    const lastDay = currentMonth.endOf("month");
    const daysInMonth = lastDay.date();
    const startDay = (firstDay.day() + 6) % 7; // Maandag = 0

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, "month"));
  };

  const nextMonth = () => {
    setCurrentMonth(currentMonth.add(1, "month"));
  };

  const getDayData = (day: number) => {
    const dayDate = currentMonth.date(day).format("YYYY-MM-DD");
    const dayEntries = entries.filter(e => dayjs(e.startTime).format("YYYY-MM-DD") === dayDate);
    
    if (dayEntries.length === 0) return null;
    
    const totalHours = dayEntries.reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0);
    
    // Use first entry status (or most restrictive)
    const statuses = dayEntries.map(e => e.status);
    let status = "goedgekeurd";
    if (statuses.includes("afgekeurd")) status = "afgekeurd";
    else if (statuses.includes("ingeleverd")) status = "ingeleverd";
    else if (statuses.includes("opgeslagen")) status = "opgeslagen";
    
    return { hours: totalHours, status };
  };

  const days = getDaysInMonth();
  const today = dayjs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return "bg-emerald-500";
      case "opgeslagen":
      case "ingeleverd":
        return "bg-orange-500";
      case "afgekeurd":
        return "bg-red-500";
      default:
        return "bg-slate-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return "Goedgekeurd";
      case "ingeleverd":
        return "In behandeling";
      case "opgeslagen":
        return "Opgeslagen";
      case "afgekeurd":
        return "Afgekeurd";
      default:
        return "Onbekend";
    }
  };

  // Calculate stats
  const stats = {
    total: entries.reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0),
    goedgekeurd: entries.filter(e => e.status === "goedgekeurd").length,
    ingeleverd: entries.filter(e => e.status === "ingeleverd").length,
    afgekeurd: entries.filter(e => e.status === "afgekeurd").length,
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="flex gap-6">
          {/* Sidebar met Mini Kalender */}
          <div className="w-80 flex-shrink-0">
            <Card className="sticky top-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 capitalize">
                    {monthName}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Weekdag headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Dagen grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="aspect-square" />;
                    }

                    const isToday =
                      today.year() === currentMonth.year() &&
                      today.month() === currentMonth.month() &&
                      today.date() === day;

                    const dayData = getDayData(day);

                    return (
                      <div
                        key={day}
                        className={`
                          aspect-square rounded-lg flex items-center justify-center text-sm
                          relative cursor-pointer transition-all hover:scale-105
                          ${
                            isToday
                              ? "bg-blue-500 text-white font-semibold shadow-md"
                              : dayData
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }
                        `}
                      >
                        {day}
                        {dayData && (
                          <div
                            className={`absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${getStatusColor(
                              dayData.status
                            )}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase mb-3">
                    Legenda
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Goedgekeurd</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">In behandeling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Afgekeurd</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase mb-3">
                    Maandstatistieken
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Totaal uren</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {stats.total.toFixed(1)}u
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Goedgekeurd</span>
                      <Badge className="bg-emerald-500">{stats.goedgekeurd}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">In behandeling</span>
                      <Badge className="bg-orange-500">{stats.ingeleverd}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Afgekeurd</span>
                      <Badge className="bg-red-500">{stats.afgekeurd}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Kalender Area */}
          <div className="flex-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 capitalize">
                      {monthName}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {stats.total.toFixed(1)} uur geregistreerd
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={prevMonth}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Weekdag headers */}
                    <div className="grid grid-cols-7 gap-4 mb-4">
                      {["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"].map(
                        (day) => (
                          <div
                            key={day}
                            className="text-center text-sm font-semibold text-slate-700 dark:text-slate-300 py-2"
                          >
                            {day}
                          </div>
                        )
                      )}
                    </div>

                    {/* Dagen grid */}
                    <div className="grid grid-cols-7 gap-4">
                      {days.map((day, idx) => {
                        if (day === null) {
                          return <div key={`empty-${idx}`} className="aspect-square" />;
                        }

                        const isToday =
                          today.year() === currentMonth.year() &&
                          today.month() === currentMonth.month() &&
                          today.date() === day;

                        const dayData = getDayData(day);

                        return (
                          <div
                            key={day}
                            className={`
                              aspect-square rounded-xl p-3 border transition-all cursor-pointer
                              ${
                                isToday
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : dayData
                                  ? "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md"
                                  : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                              }
                            `}
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={`text-sm font-semibold ${
                                    isToday
                                      ? "text-blue-600 dark:text-blue-400"
                                      : dayData
                                      ? "text-slate-900 dark:text-slate-100"
                                      : "text-slate-400 dark:text-slate-600"
                                  }`}
                                >
                                  {day}
                                </span>
                                {dayData && (
                                  <div
                                    className={`w-2 h-2 rounded-full ${getStatusColor(dayData.status)}`}
                                  />
                                )}
                              </div>

                              {dayData && (
                                <div className="mt-auto">
                                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-sm font-medium">
                                      {dayData.hours.toFixed(1)}u
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {getStatusLabel(dayData.status)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
