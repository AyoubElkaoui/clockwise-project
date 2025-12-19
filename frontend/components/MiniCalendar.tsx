"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTimeEntries } from "@/lib/api";
import authUtils from "@/lib/auth-utils";

interface DayData {
  hours: number;
  status: string;
}

export function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayData, setDayData] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const userId = authUtils.getUserId();

  useEffect(() => {
    loadMonthData();
  }, [currentMonth]);

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const entries = await getTimeEntries();
      const userEntries = entries.filter((e: any) => e.userId === userId);

      // Group entries by date
      const grouped: Record<string, DayData> = {};
      userEntries.forEach((entry: any) => {
        const date = new Date(entry.date);
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        // Only include entries from current viewing month
        if (
          month === currentMonth.getMonth() &&
          year === currentMonth.getFullYear()
        ) {
          const key = day.toString();
          if (!grouped[key]) {
            grouped[key] = { hours: 0, status: entry.status || "opgeslagen" };
          }
          grouped[key].hours += entry.hours || 0;

          // Priority: afgekeurd > ingeleverd > goedgekeurd > opgeslagen
          if (entry.status === "afgekeurd") grouped[key].status = "afgekeurd";
          else if (
            entry.status === "goedgekeurd" &&
            grouped[key].status !== "afgekeurd"
          ) {
            grouped[key].status = "goedgekeurd";
          } else if (
            entry.status === "ingeleverd" &&
            grouped[key].status !== "afgekeurd" &&
            grouped[key].status !== "goedgekeurd"
          ) {
            grouped[key].status = "ingeleverd";
          }
        }
      });

      setDayData(grouped);
    } catch (error) {
      console.error("Failed to load calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

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
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
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

  const days = getDaysInMonth();
  const today = new Date();
  const monthName = currentMonth.toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">
          {monthName}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-slate-500 dark:text-slate-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {loading ? (
          <div className="col-span-7 text-center py-8 text-xs text-slate-500">
            Laden...
          </div>
        ) : (
          days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const isToday =
              day === today.getDate() &&
              currentMonth.getMonth() === today.getMonth() &&
              currentMonth.getFullYear() === today.getFullYear();

            const data = dayData[day.toString()];

            return (
              <div
                key={day}
                className={`aspect-square p-0.5 rounded cursor-pointer hover:ring-1 hover:ring-blue-300 relative ${
                  isToday ? "ring-1 ring-blue-500" : ""
                } ${data ? getStatusColor(data.status) : "bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"}`}
                title={
                  data ? `${data.hours}u - ${data.status}` : "Geen registratie"
                }
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span
                    className={`text-[10px] font-semibold ${
                      data ? "text-white" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {day}
                  </span>
                  {data && data.hours > 0 && (
                    <span className="text-[8px] font-medium text-white opacity-90">
                      {data.hours}u
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded bg-emerald-500" />
          <span className="text-[10px] text-slate-600 dark:text-slate-400">
            Goedgekeurd
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded bg-orange-500" />
          <span className="text-[10px] text-slate-600 dark:text-slate-400">
            Opgeslagen/Ingeleverd
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded bg-red-500" />
          <span className="text-[10px] text-slate-600 dark:text-slate-400">
            Afgekeurd
          </span>
        </div>
      </div>
    </div>
  );
}
