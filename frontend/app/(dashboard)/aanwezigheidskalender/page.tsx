"use client";
import { useState, useEffect } from "react";
import { getTimeEntries, getVacationRequests } from "@/lib/api";
import { getHolidays, Holiday } from "@/lib/api/holidaysApi";
import { TimeEntry } from "@/lib/types";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plane,
  Sun,
  Briefcase,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/nl";

dayjs.locale("nl");

interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  status: string;
  hours: number;
}

interface DayInfo {
  date: string;
  type:
    | "work"
    | "vacation"
    | "holiday"
    | "weekend"
    | "sick"
    | "remote"
    | "empty";
  hours?: number;
  label?: string;
}

export default function AanwezigheidskalenderPage() {
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>(
    [],
  );
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [stats, setStats] = useState({
    workDays: 0,
    workHours: 0,
    vacationDays: 0,
    holidayDays: 0,
    remoteDays: 0,
  });

  useEffect(() => {
    loadData();
  }, [currentYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userId = Number(localStorage.getItem("userId")) || 0;

      const [entriesData, holidaysData] = await Promise.all([
        getTimeEntries(),
        getHolidays(currentYear),
      ]);

      const yearEntries = entriesData.filter((entry: TimeEntry) => {
        const entryYear = dayjs(entry.startTime).year();
        return entryYear === currentYear;
      });

      setTimeEntries(yearEntries);
      setHolidays(holidaysData);

      try {
        const vacationData = await getVacationRequests();
        const yearVacations = vacationData.filter((v: VacationRequest) => {
          const startYear = dayjs(v.startDate).year();
          const endYear = dayjs(v.endDate).year();
          return startYear === currentYear || endYear === currentYear;
        });
        setVacationRequests(yearVacations);
      } catch {
        setVacationRequests([]);
      }

      calculateStats(yearEntries, holidaysData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (entries: TimeEntry[], holidays: Holiday[]) => {
    const workDays = new Set<string>();
    let totalHours = 0;

    entries.forEach((entry) => {
      const isApproved =
        entry.status?.toLowerCase() === "goedgekeurd" ||
        entry.status?.toLowerCase() === "approved" ||
        entry.status?.toLowerCase() === "afgekeurd";

      if (isApproved && entry.startTime) {
        const dateStr = dayjs(entry.startTime).format("YYYY-MM-DD");
        workDays.add(dateStr);
        totalHours += entry.hoursWorked || 0;
      }
    });

    const holidayDays = holidays.filter(
      (h) => h.holidayDate && dayjs(h.holidayDate).year() === currentYear,
    ).length;

    const approvedVacations = vacationRequests.filter((v) => {
      const isApproved =
        v.status?.toLowerCase() === "approved" ||
        v.status?.toLowerCase() === "goedgekeurd";
      const inCurrentYear =
        v.startDate &&
        (dayjs(v.startDate).year() === currentYear ||
          dayjs(v.endDate).year() === currentYear);
      return isApproved && inCurrentYear;
    }).length;

    setStats({
      workDays: workDays.size,
      workHours: totalHours,
      vacationDays: approvedVacations,
      holidayDays,
      remoteDays: 0,
    });
  };

  const getDayInfo = (dateStr: string): DayInfo => {
    const date = dayjs(dateStr);
    const dayOfWeek = date.day();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { date: dateStr, type: "weekend" };
    }

    const holiday = holidays.find((h) => h.holidayDate === dateStr);
    if (holiday) {
      return { date: dateStr, type: "holiday", label: holiday.name };
    }

    const vacation = vacationRequests.find((v) => {
      if (v.status !== "approved" && v.status !== "pending") return false;
      const start = dayjs(v.startDate);
      const end = dayjs(v.endDate);
      return (
        date.isSame(start, "day") ||
        date.isSame(end, "day") ||
        (date.isAfter(start) && date.isBefore(end))
      );
    });
    if (vacation) {
      return {
        date: dateStr,
        type: "vacation",
        hours: vacation.hours,
        label:
          vacation.status === "pending" ? "Aangevraagd" : "Vakantie",
      };
    }

    const dayEntries = timeEntries.filter(
      (e) => dayjs(e.startTime).format("YYYY-MM-DD") === dateStr,
    );
    if (dayEntries.length > 0) {
      const totalHours = dayEntries.reduce(
        (sum, e) => sum + (e.hoursWorked || 0),
        0,
      );
      return {
        date: dateStr,
        type: "work",
        hours: totalHours,
        label: `${totalHours.toFixed(1)}u`,
      };
    }

    if (date.isAfter(dayjs(), "day")) {
      return { date: dateStr, type: "empty" };
    }

    return { date: dateStr, type: "empty" };
  };

  const getTypeColor = (type: DayInfo["type"]) => {
    switch (type) {
      case "work":
        return "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200";
      case "vacation":
        return "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200";
      case "holiday":
        return "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200";
      case "weekend":
        return "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500";
      case "sick":
        return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200";
      case "remote":
        return "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200";
      default:
        return "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400";
    }
  };

  const renderCalendar = () => {
    const months = [];

    for (let month = 0; month < 12; month++) {
      const firstDay = dayjs()
        .year(currentYear)
        .month(month)
        .startOf("month");
      const daysInMonth = firstDay.daysInMonth();
      const startDay = firstDay.day();
      const days: React.ReactNode[] = [];

      for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
        days.push(<div key={`empty-${i}`} />);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = firstDay.date(day);
        const dateStr = date.format("YYYY-MM-DD");
        const dayInfo = getDayInfo(dateStr);
        const isToday = date.isSame(dayjs(), "day");
        const isSelected = selectedDate === dateStr;

        days.push(
          <div
            key={day}
            onClick={() => setSelectedDate(dateStr)}
            className={[
              "p-1 text-center cursor-pointer rounded border text-xs transition-all select-none",
              isToday ? "ring-2 ring-blue-500 ring-offset-1" : "",
              isSelected && !isToday ? "ring-2 ring-indigo-400 ring-offset-1" : "",
              getTypeColor(dayInfo.type),
            ]
              .filter(Boolean)
              .join(" ")}
            title={dayInfo.label || dateStr}
          >
            <div className="font-medium">{day}</div>
            {dayInfo.hours != null &&
              dayInfo.hours > 0 &&
              dayInfo.type === "work" && (
                <div className="text-[9px] opacity-70 leading-tight">
                  {dayInfo.hours.toFixed(0)}u
                </div>
              )}
          </div>,
        );
      }

      months.push(
        <div
          key={month}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 capitalize">
              {firstDay.format("MMMM")}
            </h3>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
                <div
                  key={d}
                  className="text-[9px] font-semibold text-center text-slate-400 dark:text-slate-500 py-0.5"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">{days}</div>
          </div>
        </div>,
      );
    }

    return months;
  };

  const selectedDayInfo = selectedDate ? getDayInfo(selectedDate) : null;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Aanwezigheidskalender
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overzicht van werkdagen, vakantie en feestdagen — {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentYear(currentYear - 1)}
            className="flex items-center justify-center w-8 h-8 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 min-w-[3rem] text-center tabular-nums">
            {currentYear}
          </span>
          <button
            onClick={() => setCurrentYear(currentYear + 1)}
            className="flex items-center justify-center w-8 h-8 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            WERKDAGEN
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.workDays}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            GEWERKTE UREN
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.workHours.toFixed(0)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            VAKANTIEDAGEN
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.vacationDays}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            FEESTDAGEN
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.holidayDays}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Gewerkt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Vakantie
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Feestdag
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Weekend
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Ziek
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500 ring-offset-1 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Vandaag
            </span>
          </div>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDate && selectedDayInfo && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              {dayjs(selectedDate).format("dddd D MMMM YYYY")}
            </h2>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Sluiten
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedDayInfo.type === "work" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Werkdag
              </span>
            )}
            {selectedDayInfo.type === "vacation" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {selectedDayInfo.label || "Vakantie"}
              </span>
            )}
            {selectedDayInfo.type === "holiday" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                Feestdag
              </span>
            )}
            {selectedDayInfo.type === "weekend" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Weekend
              </span>
            )}
            {selectedDayInfo.type === "sick" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Ziek
              </span>
            )}
            {selectedDayInfo.type === "empty" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Geen registratie
              </span>
            )}
            {selectedDayInfo.hours != null && selectedDayInfo.hours > 0 && (
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {selectedDayInfo.hours.toFixed(1)} uur
              </span>
            )}
            {selectedDayInfo.type === "holiday" && selectedDayInfo.label && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedDayInfo.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Calendar Grid — 12 months */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {renderCalendar()}
      </div>

    </div>
  );
}
