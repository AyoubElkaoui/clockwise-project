"use client";
import { useState, useEffect, useMemo } from "react";
import { getAllUsers, getAllWorkflowEntries, getAllVacationRequests, getCurrentPeriodId } from "@/lib/manager-api";
import { getHolidays } from "@/lib/api/holidaysApi";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import {
  Calendar,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Sun,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import "dayjs/locale/nl";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale("nl");

interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  rank: string;
}

interface TimeEntry {
  id: number;
  userId: number;
  user: TeamMember;
  projectId: number;
  project: any;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: string;
}

interface VacationRequest {
  id: number;
  userId: number;
  user: TeamMember;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
}

interface Holiday {
  date: string;
  name: string;
  type: "national" | "company";
}

interface ClosedDay {
  id: number;
  date: string;
  reason: string;
  createdBy: number;
}

export default function ManagerPlanningPage() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(dayjs().startOf("month"));
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [viewMode, setViewMode] = useState<"week" | "month" | "year">("month");
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    loadPlanningData();
  }, [currentDate, viewMode]);

  const loadPlanningData = async () => {
    try {
      setLoading(true);
      const managerId = authUtils.getUserId();
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const currentPeriodId = await getCurrentPeriodId();

      const [users, workflowResponse, allVacations] = await Promise.all([
        getAllUsers(),
        getAllWorkflowEntries(currentPeriodId),
        getAllVacationRequests(),
      ]);

      const team = users;
      setTeamMembers(team);

      const entries = (workflowResponse.entries || []).map((e: any) => ({
        id: e.id,
        userId: e.medewGcId,
        user: users.find((u: any) => u.id === e.medewGcId || u.medewGcId === e.medewGcId),
        projectId: e.werkGcId,
        project: { name: e.werkDescription },
        startTime: e.datum,
        endTime: e.datum,
        breakMinutes: 0,
        status: e.status,
      }));
      setTimeEntries(entries);

      const teamIds = team.map((u: any) => u.id || u.medewGcId);
      const vacationsData = allVacations.filter((v: any) => teamIds.includes(v.userId)) as any[];
      setVacations(vacationsData);

      const currentYear = currentDate.year();
      try {
        const holidayData = await getHolidays(currentYear);
        const mappedHolidays: Holiday[] = holidayData
          .filter((h) => h.type === "national" || h.type === "company")
          .map((h) => ({ date: h.holidayDate, name: h.name, type: h.type as "national" | "company" }));
        setHolidays(mappedHolidays);

        const mappedClosed: ClosedDay[] = holidayData
          .filter((h) => h.type === "closed" && !h.isWorkAllowed)
          .map((h) => ({ id: h.id, date: h.holidayDate, reason: h.name, createdBy: h.createdBy || 0 }));
        setClosedDays(mappedClosed);
      } catch {
        setHolidays([]);
        setClosedDays([]);
      }

      if (team.length === 0) {
        showToast("Geen teamleden gevonden.", "error");
      }
    } catch (error) {
      showToast("Fout bij laden planning: " + (error instanceof Error ? error.message : "Onbekende fout"), "error");
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = useMemo(() => {
    if (viewMode === "week") {
      const days = [];
      const weekStart = currentDate.startOf("isoWeek");
      for (let i = 0; i < 7; i++) {
        days.push(weekStart.add(i, "day"));
      }
      return days;
    } else if (viewMode === "month") {
      const days = [];
      const monthStart = currentDate.startOf("month").startOf("isoWeek");
      const monthEnd = currentDate.endOf("month").endOf("isoWeek");
      let current = monthStart;
      while (current.isSameOrBefore(monthEnd)) {
        days.push(current);
        current = current.add(1, "day");
      }
      return days;
    } else {
      const months = [];
      for (let i = 0; i < 12; i++) {
        months.push(dayjs().month(i));
      }
      return months;
    }
  }, [currentDate, viewMode]);

  const getDayType = (date: dayjs.Dayjs) => {
    const holiday = holidays.find((h) => dayjs(h.date).isSame(date, "day"));
    if (holiday) return { type: "holiday", name: holiday.name, color: "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300" };

    const closed = closedDays.find((c) => dayjs(c.date).isSame(date, "day"));
    if (closed) return { type: "closed", name: closed.reason, color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400" };

    if (date.day() === 0 || date.day() === 6) {
      return { type: "weekend", name: "Weekend", color: "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500" };
    }

    return { type: "workday", name: "Werkdag", color: "bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" };
  };

  const getMemberAvailability = (member: TeamMember, date: dayjs.Dayjs) => {
    const dayType = getDayType(date);

    if (dayType.type === "holiday" || dayType.type === "closed") {
      return { status: dayType.type, color: dayType.color, dayType };
    }

    const memberVacations = vacations.filter(
      (v) => v.userId === member.id && v.status?.toUpperCase() === "APPROVED",
    );

    const isOnVacation = memberVacations.some((vacation) =>
      date.isBetween(dayjs(vacation.startDate), dayjs(vacation.endDate), null, "[]"),
    );

    if (isOnVacation) return { status: "vacation", color: "bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300", dayType };

    const dayEntries = timeEntries.filter(
      (entry) => entry.userId === member.id && dayjs(entry.startTime).isSame(date, "day"),
    );

    const totalHours = dayEntries.reduce((sum, entry) => {
      const diff = dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute");
      return sum + (diff - (entry.breakMinutes || 0)) / 60;
    }, 0);

    if (totalHours >= 8) return { status: "full", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300", dayType };
    if (totalHours >= 4) return { status: "partial", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300", dayType };
    if (totalHours > 0) return { status: "minimal", color: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300", dayType };

    return { status: "free", color: "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500", dayType };
  };

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case "vacation": return <Sun className="w-3.5 h-3.5" />;
      case "holiday": return <Calendar className="w-3.5 h-3.5" />;
      case "closed": return <XCircle className="w-3.5 h-3.5" />;
      case "full": return <CheckCircle className="w-3.5 h-3.5" />;
      case "partial": return <Clock className="w-3.5 h-3.5" />;
      case "minimal": return <AlertCircle className="w-3.5 h-3.5" />;
      default: return <UserCheck className="w-3.5 h-3.5" />;
    }
  };

  const getVacationStats = (member: TeamMember) => {
    const approvedVacations = vacations.filter(
      (v) => v.userId === member.id && v.status?.toUpperCase() === "APPROVED",
    );
    const usedDays = approvedVacations.reduce((total, vacation) => {
      const start = dayjs(vacation.startDate);
      const end = dayjs(vacation.endDate);
      let days = 0;
      let current = start;
      while (current.isSameOrBefore(end)) {
        if (current.day() !== 0 && current.day() !== 6) days++;
        current = current.add(1, "day");
      }
      return total + days;
    }, 0);
    const totalDays = 25;
    return { usedDays, remainingDays: totalDays - usedDays, totalDays };
  };

  const getDotClass = (status: string) => {
    switch (status) {
      case "full": return "bg-emerald-500";
      case "partial": return "bg-amber-500";
      case "minimal": return "bg-orange-500";
      case "free": return "bg-slate-400";
      case "vacation": return "bg-pink-500";
      case "holiday": return "bg-blue-500";
      case "closed": return "bg-slate-400";
      default: return "bg-slate-400";
    }
  };

  const getPeriodStats = () => {
    const periodDays =
      viewMode === "week"
        ? calendarDays
        : calendarDays.filter((day) => day.isSame(currentDate, "month"));

    const availableMembers = teamMembers.filter((member) => {
      return !periodDays.some((day) => {
        const availability = getMemberAvailability(member, day);
        return availability.status === "vacation" || availability.status === "holiday" || availability.status === "closed";
      });
    }).length;

    const totalPlannedHours = timeEntries
      .filter((entry) => periodDays.some((day) => dayjs(entry.startTime).isSame(day, "day")))
      .reduce((sum, entry) => {
        const diff = dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute");
        return sum + (diff - (entry.breakMinutes || 0)) / 60;
      }, 0);

    const avgHoursPerPerson = teamMembers.length > 0 ? totalPlannedHours / teamMembers.length : 0;

    const totalVacationDays = vacations
      .filter((v) => v.status?.toUpperCase() === "APPROVED")
      .reduce((total, vacation) => {
        let days = 0;
        let current = dayjs(vacation.startDate);
        while (current.isSameOrBefore(dayjs(vacation.endDate))) {
          if (current.day() !== 0 && current.day() !== 6) days++;
          current = current.add(1, "day");
        }
        return total + days;
      }, 0);

    return { availableMembers, totalPlannedHours, avgHoursPerPerson, totalMembers: teamMembers.length, totalVacationDays, periodDays: periodDays.length };
  };

  const stats = getPeriodStats();

  const getMonthDays = (date: dayjs.Dayjs) => {
    const days = [];
    const monthStart = date.startOf("month").startOf("isoWeek");
    const monthEnd = date.endOf("month").endOf("isoWeek");
    let current = monthStart;
    while (current.isSameOrBefore(monthEnd)) {
      days.push(current);
      current = current.add(1, "day");
    }
    return days;
  };

  const navigatePrev = () => {
    if (viewMode === "week") setCurrentDate(currentDate.subtract(1, "week"));
    else if (viewMode === "month") setCurrentDate(currentDate.subtract(1, "month"));
    else setCurrentDate(currentDate.subtract(1, "year"));
  };

  const navigateNext = () => {
    if (viewMode === "week") setCurrentDate(currentDate.add(1, "week"));
    else if (viewMode === "month") setCurrentDate(currentDate.add(1, "month"));
    else setCurrentDate(currentDate.add(1, "year"));
  };

  const periodLabel = viewMode === "week"
    ? `Week ${currentDate.isoWeek()} · ${currentDate.format("D MMM")} – ${currentDate.add(6, "day").format("D MMM YYYY")}`
    : viewMode === "month"
      ? currentDate.format("MMMM YYYY")
      : currentDate.format("YYYY");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!loading && teamMembers.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team Planning</h1>
          <p className="text-xs text-slate-500 mt-0.5">Overzicht van team uren en beschikbaarheid</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen teamleden gevonden</p>
          <p className="text-xs text-slate-500 mt-1">Er zijn nog geen teamleden aan jou toegewezen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team Planning</h1>
          <p className="text-xs text-slate-500 mt-0.5">{teamMembers.length} teamleden &bull; Overzicht van uren en beschikbaarheid</p>
        </div>
        {/* View mode toggle */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          {(["week", "month", "year"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                if (mode === "week") setCurrentDate(dayjs().startOf("isoWeek"));
                else if (mode === "month") setCurrentDate(dayjs().startOf("month"));
                else setCurrentDate(dayjs().startOf("year"));
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                viewMode === mode
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {mode === "week" ? "Week" : mode === "month" ? "Maand" : "Jaar"}
            </button>
          ))}
        </div>
      </div>

      {/* Week/period navigation */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5">
        <div className="flex items-center justify-between">
          <button
            onClick={navigatePrev}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Vorige
          </button>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{periodLabel}</span>
          <button
            onClick={navigateNext}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Volgende
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Beschikbare leden</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.availableMembers}/{stats.totalMembers}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Geplande uren</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.totalPlannedHours.toFixed(1)}u</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Gemiddeld per persoon</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.avgHoursPerPerson.toFixed(1)}u</p>
        </div>
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Details voor {selectedDay.format("D MMMM YYYY")}
            </h2>
            <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Beschikbaar</p>
              <div className="space-y-1">
                {teamMembers
                  .filter((m) => {
                    const a = getMemberAvailability(m, selectedDay);
                    return a.status !== "vacation" && a.status !== "holiday" && a.status !== "closed";
                  })
                  .map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {m.firstName} {m.lastName}
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Niet beschikbaar</p>
              <div className="space-y-1">
                {teamMembers
                  .filter((m) => {
                    const a = getMemberAvailability(m, selectedDay);
                    return a.status === "vacation" || a.status === "holiday" || a.status === "closed";
                  })
                  .map((m) => {
                    const a = getMemberAvailability(m, selectedDay);
                    return (
                      <div key={m.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <div className={`w-2 h-2 rounded-full ${getDotClass(a.status)}`} />
                        {m.firstName} {m.lastName}
                        <span className="text-xs text-slate-400">({a.status})</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar view */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            {viewMode === "week" ? "Weekoverzicht" : viewMode === "month" ? "Maandoverzicht" : "Jaaroverzicht"}
          </h2>
        </div>
        <div className="p-4 overflow-x-auto">
          {viewMode === "year" ? (
            /* Year view: grid of month summaries */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {calendarDays.map((month, index) => {
                const daysInMonth = month.daysInMonth();
                const startOfMonth = month.startOf("month");
                const weekends = Array.from({ length: daysInMonth }, (_, i) => startOfMonth.add(i, "day")).filter((d) => d.day() === 0 || d.day() === 6).length;
                const holidaysInMonth = holidays.filter((h) => dayjs(h.date).month() === month.month() && dayjs(h.date).year() === month.year()).length;
                const workDays = daysInMonth - weekends - holidaysInMonth;

                const monthDays = getMonthDays(month).filter((d) => d.isSame(month, "month"));
                let availableDays = 0;
                monthDays.forEach((day) => {
                  const dayType = getDayType(day);
                  if (dayType.type === "workday") {
                    const cnt = teamMembers.filter((member) => {
                      const a = getMemberAvailability(member, day);
                      return a.status !== "vacation" && a.status !== "holiday" && a.status !== "closed";
                    }).length;
                    if (cnt === teamMembers.length) availableDays++;
                  }
                });
                const avgAvailability = workDays > 0 ? Math.round((availableDays / workDays) * 100) : 0;

                const totalHours = timeEntries
                  .filter((e) => dayjs(e.startTime).month() === month.month() && dayjs(e.startTime).year() === month.year())
                  .reduce((sum, e) => {
                    const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
                    return sum + (diff - (e.breakMinutes || 0)) / 60;
                  }, 0);

                return (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">
                      {month.format("MMMM YYYY")}
                    </h3>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Werkdagen</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{workDays}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Feestdagen</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{holidaysInMonth}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Beschikbaarheid</span>
                        <span className={`font-medium ${avgAvailability >= 80 ? "text-emerald-600 dark:text-emerald-400" : avgAvailability >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                          {avgAvailability}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Totaal uren</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{totalHours.toFixed(1)}u</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-500 mb-1">Vakanties</p>
                      {vacations.filter((v) => v.status?.toUpperCase() === "APPROVED" && dayjs(v.startDate).isSame(month, "month") && dayjs(v.startDate).year() === month.year()).length === 0 ? (
                        <p className="text-xs text-slate-400">Geen</p>
                      ) : (
                        vacations
                          .filter((v) => v.status?.toUpperCase() === "APPROVED" && dayjs(v.startDate).isSame(month, "month") && dayjs(v.startDate).year() === month.year())
                          .map((v) => {
                            const member = teamMembers.find((m) => m.id === v.userId);
                            return (
                              <p key={v.id} className="text-xs text-slate-600 dark:text-slate-400">
                                {member?.firstName} {member?.lastName}: {dayjs(v.startDate).format("D")}–{dayjs(v.endDate).format("D MMM")}
                              </p>
                            );
                          })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === "month" ? (
            /* Month view: 7-col calendar grid */
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isCurrentMonth = day.isSame(currentDate, "month");
                  const dayType = getDayType(day);
                  const totalHours = timeEntries
                    .filter((entry) => dayjs(entry.startTime).isSame(day, "day"))
                    .reduce((sum, entry) => {
                      const diff = dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute");
                      return sum + (diff - (entry.breakMinutes || 0)) / 60;
                    }, 0);
                  const availableCount = teamMembers.filter((m) => {
                    const a = getMemberAvailability(m, day);
                    return a.status !== "vacation" && a.status !== "holiday" && a.status !== "closed";
                  }).length;

                  return (
                    <div
                      key={day.format("YYYY-MM-DD")}
                      className={`border rounded-lg p-2 min-h-[80px] cursor-pointer transition-colors ${
                        isCurrentMonth
                          ? `${dayType.color} border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700`
                          : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-100 dark:border-slate-800"
                      }`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <div className="text-xs font-semibold mb-1">{day.format("D")}</div>
                      {isCurrentMonth && (
                        <div className="text-center">
                          <p className="text-sm font-bold">{availableCount}/{teamMembers.length}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">beschikbaar</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Week view: employees as rows, days as columns */
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Teamlid</th>
                  {calendarDays.slice(0, 7).map((day) => {
                    const dt = getDayType(day);
                    return (
                      <th key={day.format("YYYY-MM-DD")} className={`text-center px-3 py-3 text-xs font-semibold ${dt.type !== "workday" ? "text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>
                        <div className="text-xs text-slate-400 uppercase">{day.format("dd")}</div>
                        <div className={`text-base font-bold mt-0.5 ${day.isSame(dayjs(), "day") ? "text-blue-600 dark:text-blue-400" : ""}`}>{day.format("D")}</div>
                        {dt.type !== "workday" && <div className="text-xs text-slate-400 mt-0.5">{dt.name}</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-slate-500 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    {calendarDays.slice(0, 7).map((day) => {
                      const availability = getMemberAvailability(member, day);
                      const dayEntries = timeEntries.filter(
                        (entry) => entry.userId === member.id && dayjs(entry.startTime).isSame(day, "day"),
                      );

                      return (
                        <td key={day.format("YYYY-MM-DD")} className="px-2 py-2 text-center">
                          <div className={`rounded-lg p-2 min-h-[56px] flex flex-col items-center justify-center gap-1 ${availability.color}`}>
                            <span className="flex items-center justify-center">{getAvailabilityIcon(availability.status)}</span>
                            {dayEntries.length > 0 && (
                              <span className="text-xs font-medium truncate max-w-[80px]">
                                {dayEntries[0]?.project?.name}
                              </span>
                            )}
                            {dayEntries.length > 1 && (
                              <span className="text-xs opacity-70">+{dayEntries.length - 1}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legenda</p>
        <div className="flex flex-wrap gap-4">
          {[
            { color: "bg-emerald-100 dark:bg-emerald-900/30", label: "Volledig (≥ 8u)" },
            { color: "bg-amber-100 dark:bg-amber-900/30", label: "Gedeeltelijk (4–8u)" },
            { color: "bg-orange-100 dark:bg-orange-900/30", label: "Minimaal (< 4u)" },
            { color: "bg-pink-100 dark:bg-pink-900/30", label: "Vakantie" },
            { color: "bg-blue-100 dark:bg-blue-900/30", label: "Feestdag" },
            { color: "bg-slate-100 dark:bg-slate-700", label: "Vrij / Weekend" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${color} border border-slate-200 dark:border-slate-600`} />
              <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
