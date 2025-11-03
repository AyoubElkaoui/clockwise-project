"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
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
    const startDay = firstDay.getDay();

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

  // Mock data voor demonstratie
  const dayData: Record<number, { hours: number; status: string }> = {
    1: { hours: 8, status: "goedgekeurd" },
    2: { hours: 7.5, status: "goedgekeurd" },
    3: { hours: 8, status: "goedgekeurd" },
    4: { hours: 6, status: "in-behandeling" },
    7: { hours: 8, status: "goedgekeurd" },
    8: { hours: 8, status: "goedgekeurd" },
    9: { hours: 7, status: "in-behandeling" },
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Kalender
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Maand overzicht van je tijdregistraties
              </p>
            </div>
            <Button>
              <CalendarIcon className="w-4 h-4 mr-2" />
              Naar Vandaag
            </Button>
          </div>

          <Card variant="elevated" padding="lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{monthName}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
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
                      className={`aspect-square p-2 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                        isToday
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="text-center mb-1">
                          <span
                            className={`text-sm font-semibold ${
                              isToday
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {day}
                          </span>
                        </div>
                        {data && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {data.hours}u
                            </span>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                data.status === "goedgekeurd"
                                  ? "bg-green-500"
                                  : "bg-orange-500"
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Goedgekeurd</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">In Behandeling</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Vandaag</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="elevated" padding="md">
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Totaal Deze Maand</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">65u</p>
                <Badge variant="success" size="sm" className="mt-2">18 werkdagen</Badge>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Gemiddeld per Dag</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">7.8u</p>
                <Badge variant="info" size="sm" className="mt-2">Onder norm</Badge>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Nog te Registreren</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">12u</p>
                <Badge variant="warning" size="sm" className="mt-2">3 dagen</Badge>
              </div>
            </Card>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
