"use client";
import { useState, useEffect } from "react";
import { getTimeEntries, getVacationRequests } from "@/lib/api";
import { getHolidays, Holiday } from "@/lib/api/holidaysApi";
import { TimeEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plane,
  Sun,
  Briefcase,
  Home,
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
    []
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

      // Filter entries for current year
      const yearEntries = entriesData.filter((entry: TimeEntry) => {
        const entryYear = dayjs(entry.startTime).year();
        return entryYear === currentYear;
      });

      setTimeEntries(yearEntries);
      setHolidays(holidaysData);

      // Try to get vacation requests
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

      // Calculate stats
      calculateStats(yearEntries, holidaysData);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (entries: TimeEntry[], holidays: Holiday[]) => {
    const workDays = new Set<string>();
    let totalHours = 0;

    // Process work entries
    entries.forEach((entry) => {
      // Accept various status values for approved entries
      const isApproved = entry.status?.toLowerCase() === "goedgekeurd" || 
                        entry.status?.toLowerCase() === "approved" ||
                        entry.status?.toLowerCase() === "afgekeurd";
      
      if (isApproved && entry.startTime) {
        const dateStr = dayjs(entry.startTime).format("YYYY-MM-DD");
        workDays.add(dateStr);
        totalHours += entry.hoursWorked || 0;
      }
    });

    const holidayDays = holidays.filter(
      (h) => h.holidayDate && dayjs(h.holidayDate).year() === currentYear
    ).length;

    // Count approved vacations for the current year
    const approvedVacations = vacationRequests.filter((v) => {
      const isApproved = v.status?.toLowerCase() === "approved" || 
                        v.status?.toLowerCase() === "goedgekeurd";
      const inCurrentYear = v.startDate && (
        dayjs(v.startDate).year() === currentYear ||
        dayjs(v.endDate).year() === currentYear
      );
      return isApproved && inCurrentYear;
    }).length;

    setStats({
      workDays: workDays.size,
      workHours: totalHours,
      vacationDays: approvedVacations,
      holidayDays,
      remoteDays: 0, // Can be extended with remote work tracking
    });
  };

  const getDayInfo = (dateStr: string): DayInfo => {
    const date = dayjs(dateStr);
    const dayOfWeek = date.day();

    // Weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { date: dateStr, type: "weekend" };
    }

    // Holiday
    const holiday = holidays.find((h) => h.holidayDate === dateStr);
    if (holiday) {
      return { date: dateStr, type: "holiday", label: holiday.name };
    }

    // Vacation
    const vacation = vacationRequests.find((v) => {
      if (v.status !== "approved" && v.status !== "pending") return false;
      const start = dayjs(v.startDate);
      const end = dayjs(v.endDate);
      return date.isSame(start, "day") || date.isSame(end, "day") ||
        (date.isAfter(start) && date.isBefore(end));
    });
    if (vacation) {
      return {
        date: dateStr,
        type: "vacation",
        hours: vacation.hours,
        label: vacation.status === "pending" ? "Aangevraagd" : "Vakantie",
      };
    }

    // Work day
    const dayEntries = timeEntries.filter((e) =>
      dayjs(e.startTime).format("YYYY-MM-DD") === dateStr
    );
    if (dayEntries.length > 0) {
      const totalHours = dayEntries.reduce(
        (sum, e) => sum + (e.hoursWorked || 0),
        0
      );
      return {
        date: dateStr,
        type: "work",
        hours: totalHours,
        label: `${totalHours.toFixed(1)}u`,
      };
    }

    // Future or no entry
    if (date.isAfter(dayjs(), "day")) {
      return { date: dateStr, type: "empty" };
    }

    return { date: dateStr, type: "empty" };
  };

  const getTypeColor = (type: DayInfo["type"]) => {
    switch (type) {
      case "work":
        return "bg-green-100 dark:bg-green-900/30 border-green-300 text-green-800 dark:text-green-200";
      case "vacation":
        return "bg-blue-100 dark:bg-blue-900/30 border-blue-300 text-blue-800 dark:text-blue-200";
      case "holiday":
        return "bg-purple-100 dark:bg-purple-900/30 border-purple-300 text-purple-800 dark:text-purple-200";
      case "weekend":
        return "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-500";
      case "sick":
        return "bg-red-100 dark:bg-red-900/30 border-red-300 text-red-800 dark:text-red-200";
      case "remote":
        return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 text-yellow-800 dark:text-yellow-200";
      default:
        return "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700";
    }
  };

  const renderCalendar = () => {
    const months = [];

    for (let month = 0; month < 12; month++) {
      const firstDay = dayjs().year(currentYear).month(month).startOf("month");
      const daysInMonth = firstDay.daysInMonth();
      const startDay = firstDay.day(); // 0 = Sunday
      const days = [];

      // Add empty cells for days before month starts
      for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
        days.push(<div key={`empty-${i}`} className="p-1"></div>);
      }

      // Add days of month
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
            className={`
              p-1 text-center cursor-pointer rounded text-xs border transition-all
              ${isToday ? "ring-2 ring-blue-500" : ""}
              ${isSelected ? "ring-2 ring-orange-500" : ""}
              ${getTypeColor(dayInfo.type)}
            `}
            title={dayInfo.label || dateStr}
          >
            <div className="font-medium">{day}</div>
            {dayInfo.hours && dayInfo.type === "work" && (
              <div className="text-[10px] opacity-75">
                {dayInfo.hours.toFixed(0)}u
              </div>
            )}
          </div>
        );
      }

      months.push(
        <Card key={month} className="flex-1 min-w-[200px]">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">
              {firstDay.format("MMMM")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
                <div
                  key={d}
                  className="text-[10px] font-semibold text-center text-slate-500"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">{days}</div>
          </CardContent>
        </Card>
      );
    }

    return months;
  };

  const selectedDayInfo = selectedDate ? getDayInfo(selectedDate) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Aanwezigheidskalender
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Overzicht van je werkdagen, vakantie en feestdagen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentYear(currentYear - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xl font-bold min-w-[100px] text-center">
            {currentYear}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentYear(currentYear + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Briefcase className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.workDays}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Werkdagen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.workHours.toFixed(0)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Gewerkte uren
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Plane className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.vacationDays}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Vakantiedagen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Sun className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.holidayDays}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Feestdagen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 border border-green-300 rounded"></div>
              <span className="text-sm">Gewerkt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 rounded"></div>
              <span className="text-sm">Vakantie</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 rounded"></div>
              <span className="text-sm">Feestdag</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 border border-slate-200 rounded"></div>
              <span className="text-sm">Weekend</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDate && selectedDayInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {dayjs(selectedDate).format("dddd D MMMM YYYY")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div
                className={`px-4 py-2 rounded-lg ${getTypeColor(selectedDayInfo.type)}`}
              >
                {selectedDayInfo.type === "work" && "Werkdag"}
                {selectedDayInfo.type === "vacation" && "Vakantie"}
                {selectedDayInfo.type === "holiday" && "Feestdag"}
                {selectedDayInfo.type === "weekend" && "Weekend"}
                {selectedDayInfo.type === "empty" && "Geen registratie"}
              </div>
              {selectedDayInfo.hours && (
                <div className="text-lg font-semibold">
                  {selectedDayInfo.hours.toFixed(1)} uur
                </div>
              )}
              {selectedDayInfo.label && selectedDayInfo.type === "holiday" && (
                <div className="text-slate-600 dark:text-slate-400">
                  {selectedDayInfo.label}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {renderCalendar()}
      </div>
    </div>
  );
}
