"use client";
import { useState, useEffect, useMemo } from "react";
import { getAllUsers, getAllWorkflowEntries, getAllVacationRequests, getCurrentPeriodId } from "@/lib/manager-api";
import { getHolidays } from "@/lib/api/holidaysApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import {
  Calendar,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserCheck,
  UserX,
  Briefcase,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Sun,
  Moon,
  Settings,
  Download,
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

      // Get current period
      const currentPeriodId = await getCurrentPeriodId();

      // Load team members, workflow entries, and vacation requests
      const [users, workflowResponse, allVacations] = await Promise.all([
        getAllUsers(),
        getAllWorkflowEntries(currentPeriodId),
        getAllVacationRequests()
      ]);

      // Show all users to manager (manager_assignments not in use)
      const team = users;
      setTeamMembers(team);
      
      // Convert workflow entries
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

      // Filter vacations for team members only
      const teamIds = team.map((u: any) => u.id || u.medewGcId);
      const vacationsData = allVacations.filter((v: any) => teamIds.includes(v.userId));
      setVacations(vacationsData);

      // Load holidays and closed days from API
      const currentYear = currentDate.year();
      try {
        const holidayData = await getHolidays(currentYear);
        const mappedHolidays: Holiday[] = holidayData
          .filter(h => h.type === "national" || h.type === "company")
          .map(h => ({ date: h.holidayDate, name: h.name, type: h.type as "national" | "company" }));
        setHolidays(mappedHolidays);

        const mappedClosed: ClosedDay[] = holidayData
          .filter(h => h.type === "closed" && !h.isWorkAllowed)
          .map(h => ({ id: h.id, date: h.holidayDate, reason: h.name, createdBy: h.createdBy || 0 }));
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
      // Year view - show months
      const months = [];
      for (let i = 0; i < 12; i++) {
        months.push(dayjs().month(i));
      }
      return months;
    }
  }, [currentDate, viewMode]);

  const getDayType = (date: dayjs.Dayjs) => {
    // Check if it's a holiday
    const holiday = holidays.find((h) => dayjs(h.date).isSame(date, "day"));
    if (holiday)
      return {
        type: "holiday",
        name: holiday.name,
        color: "bg-blue-100 text-blue-800",
      };

    // Check if it's a closed day
    const closed = closedDays.find((c) => dayjs(c.date).isSame(date, "day"));
    if (closed)
      return {
        type: "closed",
        name: closed.reason,
        color: "bg-gray-200 text-gray-800",
      };

    // Check if it's weekend
    if (date.day() === 0 || date.day() === 6) {
      return {
        type: "weekend",
        name: "Weekend",
        color: "bg-slate-100 text-slate-600",
      };
    }

    return {
      type: "workday",
      name: "Werkdag",
      color: "bg-white text-slate-900",
    };
  };

  const getMemberAvailability = (member: TeamMember, date: dayjs.Dayjs) => {
    const dayType = getDayType(date);

    // If it's a holiday or closed day, member is not available
    if (dayType.type === "holiday" || dayType.type === "closed") {
      return { status: dayType.type, color: dayType.color, dayType };
    }

    // Check for vacation
    const memberVacations = vacations.filter(
      (v) => v.userId === member.id && v.status?.toUpperCase() === "APPROVED",
    );

    const isOnVacation = memberVacations.some((vacation) =>
      date.isBetween(
        dayjs(vacation.startDate),
        dayjs(vacation.endDate),
        null,
        "[]",
      ),
    );

    if (isOnVacation)
      return {
        status: "vacation",
        color: "bg-pink-100 text-pink-800",
        dayType,
      };

    // Check for time entries
    const dayEntries = timeEntries.filter(
      (entry) =>
        entry.userId === member.id &&
        dayjs(entry.startTime).isSame(date, "day"),
    );

    const totalHours = dayEntries.reduce((sum, entry) => {
      const diff = dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute");
      return sum + (diff - (entry.breakMinutes || 0)) / 60;
    }, 0);

    if (totalHours >= 8)
      return { status: "full", color: "bg-green-100 text-green-800", dayType };
    if (totalHours >= 4)
      return {
        status: "partial",
        color: "bg-yellow-100 text-yellow-800",
        dayType,
      };
    if (totalHours > 0)
      return {
        status: "minimal",
        color: "bg-orange-100 text-orange-800",
        dayType,
      };

    return { status: "free", color: "bg-gray-100 text-gray-800", dayType };
  };

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case "vacation":
        return <Sun className="w-4 h-4" />;
      case "holiday":
        return <Calendar className="w-4 h-4" />;
      case "closed":
        return <XCircle className="w-4 h-4" />;
      case "full":
        return <CheckCircle className="w-4 h-4" />;
      case "partial":
        return <Clock className="w-4 h-4" />;
      case "minimal":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <UserCheck className="w-4 h-4" />;
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
        if (current.day() !== 0 && current.day() !== 6) {
          // Exclude weekends
          days++;
        }
        current = current.add(1, "day");
      }
      return total + days;
    }, 0);

    // Assuming 25 vacation days per year
    const totalDays = 25;
    const remainingDays = totalDays - usedDays;

    return { usedDays, remainingDays, totalDays };
  };

  const getDotClass = (status: string) => {
    switch (status) {
      case "full":
        return "bg-green-500";
      case "partial":
        return "bg-yellow-500";
      case "minimal":
        return "bg-orange-500";
      case "free":
        return "bg-gray-500";
      case "vacation":
        return "bg-pink-500";
      case "holiday":
        return "bg-blue-500";
      case "closed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
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
        return (
          availability.status === "vacation" ||
          availability.status === "holiday" ||
          availability.status === "closed"
        );
      });
    }).length;

    const totalPlannedHours = timeEntries
      .filter((entry) =>
        periodDays.some((day) => dayjs(entry.startTime).isSame(day, "day")),
      )
      .reduce((sum, entry) => {
        const diff = dayjs(entry.endTime).diff(
          dayjs(entry.startTime),
          "minute",
        );
        return sum + (diff - (entry.breakMinutes || 0)) / 60;
      }, 0);

    const avgHoursPerPerson =
      teamMembers.length > 0 ? totalPlannedHours / teamMembers.length : 0;

    const totalVacationDays = vacations
      .filter((v) => v.status?.toUpperCase() === "APPROVED")
      .reduce((total, vacation) => {
        const start = dayjs(vacation.startDate);
        const end = dayjs(vacation.endDate);
        let days = 0;
        let current = start;
        while (current.isSameOrBefore(end)) {
          if (current.day() !== 0 && current.day() !== 6) {
            // Exclude weekends
            days++;
          }
          current = current.add(1, "day");
        }
        return total + days;
      }, 0);

    return {
      availableMembers,
      totalPlannedHours,
      avgHoursPerPerson,
      totalMembers: teamMembers.length,
      totalVacationDays,
      periodDays: periodDays.length,
    };
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
  const calendarContent = (() => {
    if (viewMode === "year") {
      return (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {calendarDays.map((month, index) => {
            const daysInMonth = month.daysInMonth();
            const startOfMonth = month.startOf("month");
            const weekends = Array.from({ length: daysInMonth }, (_, i) =>
              startOfMonth.add(i, "day"),
            ).filter((d) => d.day() === 0 || d.day() === 6).length;
            const holidaysInMonth = holidays.filter(
              (h) =>
                dayjs(h.date).month() === month.month() &&
                dayjs(h.date).year() === month.year(),
            ).length;
            const workDays = daysInMonth - weekends - holidaysInMonth;

            // Calculate average team availability (percentage of workdays with full team available)
            const monthDays = getMonthDays(month).filter((d) =>
              d.isSame(month, "month"),
            );
            let availableDays = 0;
            monthDays.forEach((day) => {
              const dayType = getDayType(day);
              if (dayType.type === "workday") {
                const availableMembers = teamMembers.filter((member) => {
                  const availability = getMemberAvailability(member, day);
                  return (
                    availability.status !== "vacation" &&
                    availability.status !== "holiday" &&
                    availability.status !== "closed"
                  );
                }).length;
                if (availableMembers === teamMembers.length) availableDays++;
              }
            });
            const avgAvailability =
              workDays > 0 ? Math.round((availableDays / workDays) * 100) : 0;

            const totalHours = timeEntries
              .filter((entry) => {
                const entryDate = dayjs(entry.startTime);
                return (
                  entryDate.month() === month.month() &&
                  entryDate.year() === month.year()
                );
              })
              .reduce((sum, entry) => {
                const diff = dayjs(entry.endTime).diff(
                  dayjs(entry.startTime),
                  "minute",
                );
                return sum + (diff - (entry.breakMinutes || 0)) / 60;
              }, 0);

            return (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                      {month.format("MMMM YYYY")}
                    </h3>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Werkdagen:
                        </span>
                        <span className="font-medium">{workDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Feestdagen:
                        </span>
                        <span className="font-medium">{holidaysInMonth}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Team beschikbaarheid:
                        </span>
                        <span className="font-medium">{avgAvailability}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Totaal uren:
                        </span>
                        <span className="font-medium">
                          {totalHours.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium mb-2 text-sm">
                        Goedgekeurde Vakanties
                      </h4>
                      <div className="space-y-1">
                        {vacations
                          .filter(
                            (v) =>
                              v.status?.toUpperCase() === "APPROVED" &&
                              dayjs(v.startDate).isSame(month, "month") &&
                              dayjs(v.startDate).year() === month.year(),
                          )
                          .map((v) => {
                            const member = teamMembers.find(
                              (m) => m.id === v.userId,
                            );
                            return (
                              <div
                                key={v.id}
                                className="text-xs text-slate-600 dark:text-slate-400"
                              >
                                {member?.firstName} {member?.lastName}:{" "}
                                {dayjs(v.startDate).format("D")} -{" "}
                                {dayjs(v.endDate).format("D MMM")}
                              </div>
                            );
                          })}
                        {vacations.filter(
                          (v) =>
                            v.status?.toUpperCase() === "APPROVED" &&
                            dayjs(v.startDate).isSame(month, "month") &&
                            dayjs(v.startDate).year() === month.year(),
                        ).length === 0 && (
                          <div className="text-xs text-slate-500">
                            Geen vakanties
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    } else if (viewMode === "month") {
      return (
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const isCurrentMonth = day.isSame(currentDate, "month");
            const dayType = getDayType(day);
            const totalHours = timeEntries
              .filter((entry) => dayjs(entry.startTime).isSame(day, "day"))
              .reduce((sum, entry) => {
                const diff = dayjs(entry.endTime).diff(
                  dayjs(entry.startTime),
                  "minute",
                );
                return sum + (diff - (entry.breakMinutes || 0)) / 60;
              }, 0);
            const availableMembers = teamMembers.filter((member) => {
              const availability = getMemberAvailability(member, day);
              return (
                availability.status !== "vacation" &&
                availability.status !== "holiday" &&
                availability.status !== "closed"
              );
            }).length;

            return (
              <div
                key={day.format("YYYY-MM-DD")}
                className={`border border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[100px] cursor-pointer ${
                  isCurrentMonth
                    ? dayType.color
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
                onClick={() => setSelectedDay(day)}
              >
                <div className="text-sm font-bold mb-2">{day.format("D")}</div>
                <div className="text-lg font-bold text-center">
                  {availableMembers}/{teamMembers.length}
                </div>
                <div className="text-xs text-center text-slate-600 dark:text-slate-400">
                  beschikbaar
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      return (
        <div className="overflow-x-auto max-w-screen-xl">
          <table className="table-fixed">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 font-medium text-slate-900 dark:text-slate-100 w-48">
                  Team Lid
                </th>
                {calendarDays.slice(0, 7).map((day) => (
                  <th
                    key={day.format("YYYY-MM-DD")}
                    className="text-center p-4 font-medium text-slate-900 dark:text-slate-100 w-28"
                  >
                    <div>
                      <div className="text-sm">{day.format("dd")}</div>
                      <div className="text-lg font-bold">{day.format("D")}</div>
                      {getDayType(day).type !== "workday" && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {getDayType(day).name}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => {
                const vacationStats = getVacationStats(member);
                return (
                  <tr
                    key={member.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {member.firstName?.charAt(0)}
                            {member.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    {calendarDays.slice(0, 7).map((day) => {
                      const availability = getMemberAvailability(member, day);
                      const dayEntries = timeEntries.filter(
                        (entry) =>
                          entry.userId === member.id &&
                          dayjs(entry.startTime).isSame(day, "day"),
                      );

                      return (
                        <td key={day.format("YYYY-MM-DD")} className="p-2">
                          <div
                            className={`min-h-[60px] border border-slate-200 dark:border-slate-700 rounded-lg p-2 ${availability.dayType?.color || "bg-slate-50 dark:bg-slate-800"}`}
                          >
                            <div className="flex items-center justify-center mb-1">
                              <Badge className={availability.color}>
                                {getAvailabilityIcon(availability.status)}
                              </Badge>
                            </div>
                            {dayEntries.length > 0 && (
                              <div className="space-y-1">
                                {dayEntries.slice(0, 1).map((entry) => (
                                  <div
                                    key={entry.id}
                                    className="text-xs bg-white dark:bg-slate-700 rounded p-1"
                                  >
                                    <div className="font-medium truncate">
                                      {entry.project?.name}
                                    </div>
                                  </div>
                                ))}
                                {dayEntries.length > 1 && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    +{dayEntries.length - 1}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!loading && teamMembers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Team Planning
          </h1>
          <p className="text-slate-700 dark:text-slate-300 mt-1">
            Overzicht van team uren en beschikbaarheid
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-16 h-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Geen Teamleden Gevonden
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
                Er zijn nog geen teamleden aan jou toegewezen. Neem contact op met een administrator om teamleden toe te voegen aan de manager_assignments tabel.
              </p>
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> Teamleden worden toegewezen via de manager_assignments tabel in de database.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Team Planning
          </h1>
          <p className="text-slate-700 dark:text-slate-300 mt-1">
            {teamMembers.length} teamleden • Overzicht van uren en beschikbaarheid
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            onClick={() => {
              setViewMode("week");
              setCurrentDate(dayjs().startOf("isoWeek"));
            }}
          >
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            onClick={() => {
              setViewMode("month");
              setCurrentDate(dayjs().startOf("month"));
            }}
          >
            Maand
          </Button>
          <Button
            variant={viewMode === "year" ? "default" : "outline"}
            onClick={() => {
              setViewMode("year");
              setCurrentDate(dayjs().startOf("year"));
            }}
          >
            Jaar
          </Button>
        </div>
      </div>

      {/* Period Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === "week") {
                  setCurrentDate(currentDate.subtract(1, "week"));
                } else if (viewMode === "month") {
                  setCurrentDate(currentDate.subtract(1, "month"));
                } else {
                  setCurrentDate(currentDate.subtract(1, "year"));
                }
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Vorige{" "}
              {viewMode === "week"
                ? "Week"
                : viewMode === "month"
                  ? "Maand"
                  : "Jaar"}
            </Button>

            <div className="text-center min-w-[300px]">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {viewMode === "week" &&
                  `Week ${currentDate.isoWeek()} • ${currentDate.format("D MMM")} - ${currentDate.add(6, "day").format("D MMM YYYY")}`}
                {viewMode === "month" && currentDate.format("MMMM YYYY")}
                {viewMode === "year" && currentDate.format("YYYY")}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === "week") {
                  setCurrentDate(currentDate.add(1, "week"));
                } else if (viewMode === "month") {
                  setCurrentDate(currentDate.add(1, "month"));
                } else {
                  setCurrentDate(currentDate.add(1, "year"));
                }
              }}
            >
              Volgende{" "}
              {viewMode === "week"
                ? "Week"
                : viewMode === "month"
                  ? "Maand"
                  : "Jaar"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Beschikbare Leden
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.availableMembers}/{stats.totalMembers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Geplande Uren
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalPlannedHours.toFixed(1)}u
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-timr-orange-light dark:bg-timr-orange-light/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-timr-orange dark:text-timr-orange" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Gemiddeld per Persoon
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.avgHoursPerPerson.toFixed(1)}u
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Details */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Details voor {selectedDay.format("D MMMM YYYY")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDay(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Beschikbare Teamleden</h4>
                <div className="space-y-1">
                  {teamMembers
                    .filter((member) => {
                      const availability = getMemberAvailability(
                        member,
                        selectedDay,
                      );
                      return (
                        availability.status !== "vacation" &&
                        availability.status !== "holiday" &&
                        availability.status !== "closed"
                      );
                    })
                    .map((member) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">
                          {member.firstName} {member.lastName}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Niet Beschikbare Teamleden</h4>
                <div className="space-y-1">
                  {teamMembers
                    .filter((member) => {
                      const availability = getMemberAvailability(
                        member,
                        selectedDay,
                      );
                      return (
                        availability.status === "vacation" ||
                        availability.status === "holiday" ||
                        availability.status === "closed"
                      );
                    })
                    .map((member) => {
                      const availability = getMemberAvailability(
                        member,
                        selectedDay,
                      );
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              availability.status === "vacation"
                                ? "bg-pink-500"
                                : availability.status === "holiday"
                                  ? "bg-blue-500"
                                  : "bg-gray-500"
                            }`}
                          ></div>
                          <span className="text-sm">
                            {member.firstName} {member.lastName} -{" "}
                            {availability.status}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <Card className="max-w-screen-xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            {viewMode === "week" && "Weekoverzicht"}
            {viewMode === "month" && "Maandoverzicht"}
            {viewMode === "year" && "Jaaroverzicht"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">{calendarContent}</CardContent>
      </Card>
    </div>
  );
}
