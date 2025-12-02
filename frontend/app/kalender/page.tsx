"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function KalenderPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthName = currentMonth.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = (firstDay.getDay() + 6) % 7; // Maandag = 0

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
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days = getDaysInMonth();
  const today = new Date();

  // Mock data voor demonstratie - statuses: opgeslagen, ingeleverd, goedgekeurd, afgekeurd
  const dayData: Record<number, { hours: number; status: string }> = {
    1: { hours: 8, status: "goedgekeurd" },
    2: { hours: 7.5, status: "goedgekeurd" },
    3: { hours: 8, status: "goedgekeurd" },
    4: { hours: 6, status: "opgeslagen" },
    5: { hours: 8, status: "ingeleverd" },
    7: { hours: 8, status: "goedgekeurd" },
    8: { hours: 8, status: "goedgekeurd" },
    9: { hours: 7, status: "ingeleverd" },
    10: { hours: 8, status: "afgekeurd" },
  };

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

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="flex gap-6">
          {/* Sidebar met Mini Kalender */}
          <div className="w-80 flex-shrink-0">
            <Card variant="elevated" padding="lg" className="sticky top-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <h3 className="text-lg font-semibold text-slate-900 capitalize">
                    {monthName}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Weekdag headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-slate-500 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Kalender dagen */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const isToday =
                      day === today.getDate() &&
                      currentMonth.getMonth() === today.getMonth() &&
                      currentMonth.getFullYear() === today.getFullYear();

                    const data = dayData[day];

                    return (
                      <div
                        key={day}
                        className={`aspect-square p-1 rounded-lg cursor-pointer hover:ring-2 hover:ring-blue-300 relative ${
                          isToday
                            ? "ring-2 ring-blue-500"
                            : ""
                        } ${
                          data
                            ? getStatusColor(data.status)
                            : "bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span
                            className={`text-xs font-semibold ${
                              data ? "text-white" : "text-slate-700"
                            }`}
                          >
                            {day}
                          </span>
                          {data && (
                            <span className="text-[10px] font-medium text-white opacity-90 mt-0.5">
                              {data.hours}u
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-xs text-slate-600">Goedgekeurd</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    <span className="text-xs text-slate-600">Opgeslagen/Ingeleverd</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-xs text-slate-600">Afgekeurd</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Kalender Overzicht
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Bekijk je tijdregistraties per maand
              </p>
            </div>

            {/* Month Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card variant="elevated" padding="md">
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Totaal Deze Maand</p>
                  <p className="text-3xl font-bold bg-blue-100">
                    69.5u
                  </p>
                  <Badge variant="success" size="sm" className="mt-2">10 werkdagen</Badge>
                </div>
              </Card>
              <Card variant="elevated" padding="md">
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Goedgekeurd</p>
                  <p className="text-3xl font-bold bg-blue-100">
                    54u
                  </p>
                  <Badge variant="success" size="sm" className="mt-2">7 dagen</Badge>
                </div>
              </Card>
              <Card variant="elevated" padding="md">
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">In Behandeling</p>
                  <p className="text-3xl font-bold bg-blue-100">
                    15.5u
                  </p>
                  <Badge className="mt-2 bg-orange-500 text-white" size="sm">2 dagen</Badge>
                </div>
              </Card>
            </div>

            {/* Recent Entries */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Recente Registraties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { date: "10 Nov 2025", hours: 8, status: "afgekeurd", project: "Project Alpha" },
                    { date: "9 Nov 2025", hours: 7, status: "ingeleverd", project: "Project Beta" },
                    { date: "8 Nov 2025", hours: 8, status: "goedgekeurd", project: "Project Gamma" },
                    { date: "7 Nov 2025", hours: 8, status: "goedgekeurd", project: "Project Delta" },
                    { date: "5 Nov 2025", hours: 8, status: "ingeleverd", project: "Project Epsilon" },
                  ].map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(entry.status)}`} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{entry.date}</p>
                          <p className="text-xs text-slate-500">{entry.project}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{entry.hours}u</p>
                        <p className="text-xs text-slate-500 capitalize">{entry.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
