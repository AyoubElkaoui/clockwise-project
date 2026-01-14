"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getAllUsers, getAllWorkflowEntries, getCurrentPeriodId } from "@/lib/manager-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import {
  Clock,
  Search,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Building,
  FileSpreadsheet,
  Table,
  List,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Briefcase,
} from "lucide-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import ExcelJS from "exceljs";
import "dayjs/locale/nl";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale("nl");

export default function ManagerTeamHoursPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [currentPeriod, setCurrentPeriod] = useState(
    dayjs().startOf("isoWeek"),
  );
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [entriesViewMode, setEntriesViewMode] = useState<"cards" | "table">(
    "cards",
  );

  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId) {
      setSelectedUser(userId);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const managerId = authUtils.getUserId();
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const currentPeriodId = await getCurrentPeriodId();
      const [users, workflowResponse] = await Promise.all([
        getAllUsers(),
        getAllWorkflowEntries(currentPeriodId) // Get all entries (SUBMITTED + APPROVED)
      ]);

      const team = users.filter((u: any) => u.managerId === managerId);
      setTeamMembers(team);
      
      // Convert workflow entries to format expected by UI
      // Note: workflow uses 'aantal' (hours) directly, but UI expects startTime/endTime
      // We create synthetic start/end times based on the date and hours
      const allEntries = workflowResponse.entries.map((e: any) => {
        const date = dayjs(e.datum);
        const startTime = date.hour(8).minute(0).second(0); // Start at 8:00
        const endTime = startTime.add(e.aantal, 'hour'); // Add aantal hours
        
        return {
          userId: e.medewGcId,
          date: e.datum,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          hours: e.aantal,
          breakMinutes: 0,
          projectId: e.werkGcId,
          projectCode: e.werkCode,
          projectName: e.werkDescription,
          status: e.status,
          notes: e.omschrijving,
          userFirstName: e.employeeName?.split(' ')[0] || '',
          userLastName: e.employeeName?.split(' ').slice(1).join(' ') || '',
          project: {
            name: e.werkDescription || e.werkCode,
            code: e.werkCode
          },
          user: {
            firstName: e.employeeName?.split(' ')[0] || '',
            lastName: e.employeeName?.split(' ').slice(1).join(' ') || ''
          }
        };
      });
      
      setEntries(allEntries);
    } catch (error) {
      showToast("Fout bij laden uren", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Period filter
    if (viewMode === "week") {
      const weekStart = currentPeriod.startOf("isoWeek");
      const weekEnd = currentPeriod.endOf("isoWeek");
      filtered = filtered.filter((entry) => {
        const entryDate = dayjs(entry.date);
        return entryDate.isBetween(weekStart, weekEnd, null, "[]");
      });
    } else {
      const monthStart = currentPeriod.startOf("month");
      const monthEnd = currentPeriod.endOf("month");
      filtered = filtered.filter((entry) => {
        const entryDate = dayjs(entry.date);
        return entryDate.isBetween(monthStart, monthEnd, null, "[]");
      });
    }

    // User filter
    if (selectedUser !== "all") {
      filtered = filtered.filter(
        (entry) => entry.userId === Number(selectedUser),
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.user?.firstName?.toLowerCase().includes(query) ||
          entry.user?.lastName?.toLowerCase().includes(query) ||
          entry.project?.name?.toLowerCase().includes(query),
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
  }, [entries, currentPeriod, viewMode, selectedUser, searchQuery]);

  const analytics = useMemo(() => {
    // Current period stats
    const total = filteredEntries.reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0);

    const approved = filteredEntries
      .filter((e) => e.status === "APPROVED")
      .reduce((sum, e) => {
        const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
        return sum + (diff - (e.breakMinutes || 0)) / 60;
      }, 0);

    const pending = filteredEntries
      .filter((e) => e.status === "SUBMITTED")
      .reduce((sum, e) => {
        const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
        return sum + (diff - (e.breakMinutes || 0)) / 60;
      }, 0);

    // Previous period comparison
    const prevPeriod = currentPeriod.subtract(
      1,
      viewMode === "week" ? "week" : "month",
    );
    const prevEntries = entries.filter((entry) => {
      const entryDate = dayjs(entry.startTime);
      if (viewMode === "week") {
        const weekStart = prevPeriod.startOf("isoWeek");
        const weekEnd = prevPeriod.endOf("isoWeek");
        return entryDate.isBetween(weekStart, weekEnd, null, "[]");
      } else {
        const monthStart = prevPeriod.startOf("month");
        const monthEnd = prevPeriod.endOf("month");
        return entryDate.isBetween(monthStart, monthEnd, null, "[]");
      }
    });

    const prevTotal = prevEntries.reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0);

    // Utilization (assuming 8 hours per day, 5 days per week for week view, or 20 days for month)
    const workingDays = viewMode === "week" ? 5 : 20;
    const expectedHours = teamMembers.length * workingDays * 8;
    const utilizationRate =
      expectedHours > 0 ? (total / expectedHours) * 100 : 0;

    // Project distribution
    const projectStats = filteredEntries.reduce(
      (acc, entry) => {
        const projectName = entry.project?.name || "Onbekend";
        if (!acc[projectName]) {
          acc[projectName] = { hours: 0, entries: 0 };
        }
        const hours =
          (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
            (entry.breakMinutes || 0)) /
          60;
        acc[projectName].hours += hours;
        acc[projectName].entries += 1;
        return acc;
      },
      {} as Record<string, { hours: number; entries: number }>,
    );

    // Daily distribution (for week view)
    const dailyStats = viewMode === "week" ? [0, 0, 0, 0, 0, 0, 0] : [];
    if (viewMode === "week") {
      filteredEntries.forEach((entry) => {
        const dayOfWeek = dayjs(entry.startTime).isoWeekday() - 1; // 0 = Monday
        const hours =
          (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
            (entry.breakMinutes || 0)) /
          60;
        dailyStats[dayOfWeek] += hours;
      });
    }

    // Average hours per day
    const periodDays =
      viewMode === "week" ? 7 : dayjs(currentPeriod).daysInMonth();
    const avgHoursPerDay = periodDays > 0 ? total / periodDays : 0;

    return {
      total,
      approved,
      pending,
      prevTotal,
      utilizationRate,
      projectStats,
      dailyStats,
      avgHoursPerDay,
      periodDays,
      expectedHours,
    };
  }, [filteredEntries, currentPeriod, viewMode, teamMembers, entries]);

  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0)
      return { icon: null, color: "text-slate-500", change: "0%" };
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return {
        icon: ArrowUpRight,
        color: "text-emerald-600",
        change: `+${change.toFixed(1)}%`,
      };
    } else if (change < 0) {
      return {
        icon: ArrowDownRight,
        color: "text-red-600",
        change: `${change.toFixed(1)}%`,
      };
    }
    return { icon: null, color: "text-slate-500", change: "0%" };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const handlePrev = () => {
    setCurrentPeriod((p) =>
      p.subtract(1, viewMode === "week" ? "week" : "month"),
    );
  };

  const handleNext = () => {
    setCurrentPeriod((p) => p.add(1, viewMode === "week" ? "week" : "month"));
  };

  const handleToday = () => {
    setCurrentPeriod(
      dayjs().startOf(viewMode === "week" ? "isoWeek" : "month"),
    );
  };

  const toggleView = () => {
    const newMode = viewMode === "week" ? "month" : "week";
    setViewMode(newMode);
    setCurrentPeriod(dayjs().startOf(newMode === "week" ? "isoWeek" : "month"));
  };

  const exportToCSV = () => {
    const csvContent = [
      [
        "Datum",
        "Medewerker",
        "Bedrijf",
        "Project",
        "Start",
        "Eind",
        "Pauze",
        "Totaal",
        "Status",
      ].join(","),
      ...filteredEntries.map((entry) => {
        const hours =
          (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
            (entry.breakMinutes || 0)) /
          60;
        return [
          dayjs(entry.startTime).format("YYYY-MM-DD"),
          `${entry.user?.firstName} ${entry.user?.lastName}`,
          entry.project?.projectGroup?.company?.name || "",
          entry.project?.name || "",
          dayjs(entry.startTime).format("HH:mm"),
          dayjs(entry.endTime).format("HH:mm"),
          entry.breakMinutes || 0,
          hours.toFixed(2),
          entry.status,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-uren-${viewMode}-${currentPeriod.format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Team Uren");

    // Add headers
    worksheet.columns = [
      { header: "Datum", key: "date", width: 12 },
      { header: "Medewerker", key: "employee", width: 20 },
      { header: "Bedrijf", key: "company", width: 20 },
      { header: "Project", key: "project", width: 25 },
      { header: "Start", key: "start", width: 10 },
      { header: "Eind", key: "end", width: 10 },
      { header: "Pauze (min)", key: "break", width: 12 },
      { header: "Totaal (uren)", key: "total", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6FA" },
    };

    // Add data rows
    filteredEntries.forEach((entry) => {
      const hours =
        (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
          (entry.breakMinutes || 0)) /
        60;

      worksheet.addRow({
        date: dayjs(entry.startTime).format("YYYY-MM-DD"),
        employee: `${entry.user?.firstName} ${entry.user?.lastName}`,
        company: entry.project?.projectGroup?.company?.name || "",
        project: entry.project?.name || "",
        start: dayjs(entry.startTime).format("HH:mm"),
        end: dayjs(entry.endTime).format("HH:mm"),
        break: entry.breakMinutes || 0,
        total: parseFloat(hours.toFixed(2)),
        status: entry.status,
      });
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-uren-${viewMode}-${currentPeriod.format("YYYY-MM-DD")}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-500">Goedgekeurd</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-yellow-500">In behandeling</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-500">Afgekeurd</Badge>;
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  const periodLabel =
    viewMode === "week"
      ? `Week ${currentPeriod.isoWeek()} • ${currentPeriod.format("D MMM")} - ${currentPeriod.add(6, "day").format("D MMM YYYY")}`
      : currentPeriod.format("MMMM YYYY");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Team Uren Analytics
          </h1>
          <p className="text-slate-700 dark:text-slate-300 mt-1">
            Uitgebreide analyse van team prestaties, urenverdeling en efficiency
            - geen goedkeuringen
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() =>
              setEntriesViewMode(
                entriesViewMode === "cards" ? "table" : "cards",
              )
            }
            variant="outline"
          >
            {entriesViewMode === "cards" ? (
              <>
                <Table className="w-4 h-4 mr-2" />
                Tabel
              </>
            ) : (
              <>
                <List className="w-4 h-4 mr-2" />
                Kaarten
              </>
            )}
          </Button>
          <Button
            onClick={exportToCSV}
            disabled={filteredEntries.length === 0}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            onClick={exportToExcel}
            disabled={filteredEntries.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Period Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="sm" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Vorige
            </Button>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleToday}>
                <Calendar className="w-4 h-4 mr-2" />
                Vandaag
              </Button>
              <div className="text-center min-w-[280px]">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {periodLabel}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleView}>
                {viewMode === "week" ? "Maand" : "Week"}
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={handleNext}>
              Volgende
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Totaal Uren
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {analytics.total.toFixed(1)}
                  </p>
                  {analytics.prevTotal > 0 &&
                    (() => {
                      const trend = getTrendIndicator(
                        analytics.total,
                        analytics.prevTotal,
                      );
                      return trend.icon ? (
                        <trend.icon className={`w-5 h-5 ${trend.color}`} />
                      ) : null;
                    })()}
                </div>
                <p
                  className={`text-xs mt-1 ${getTrendIndicator(analytics.total, analytics.prevTotal).color}`}
                >
                  {
                    getTrendIndicator(analytics.total, analytics.prevTotal)
                      .change
                  }{" "}
                  vs vorige periode
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Benutting
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {analytics.utilizationRate.toFixed(0)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Verwacht: {analytics.expectedHours.toFixed(0)}u
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Gemiddeld per Dag
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {analytics.avgHoursPerDay.toFixed(1)}u
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Over {analytics.periodDays} dagen
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-timr-blue-light dark:bg-timr-blue-light/20 flex items-center justify-center">
                <Timer className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Goedgekeurd
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {analytics.approved.toFixed(1)}u
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {analytics.total > 0
                    ? ((analytics.approved / analytics.total) * 100).toFixed(0)
                    : 0}
                  % van totaal
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-slate-600" />
              Project Verdeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.projectStats)
                .sort(([, a], [, b]) => (b as any).hours - (a as any).hours)
                .slice(0, 5)
                .map(([project, stats]: [string, any]) => (
                  <div
                    key={project}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {project}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {stats.entries} registraties
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {stats.hours.toFixed(1)}u
                      </p>
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${analytics.total > 0 ? (stats.hours / analytics.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Distribution (Week View) */}
        {viewMode === "week" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-600" />
                Dagelijkse Verdeling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 overflow-x-auto">
                {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map(
                  (day, index) => (
                    <div
                      key={day}
                      className="flex items-center justify-between min-w-[300px]"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-8">
                        {day}
                      </span>
                      <div className="flex-1 mx-4">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                          <div
                            className="bg-indigo-600 h-3 rounded-full"
                            style={{
                              width: `${Math.min(Math.max((analytics.dailyStats[index] / 16) * 100, 5), 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 w-12 text-right">
                        {analytics.dailyStats[index].toFixed(1)}u
                      </span>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-slate-600" />
              Status Verdeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Goedgekeurd
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {analytics.approved.toFixed(1)}u
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {analytics.total > 0
                      ? ((analytics.approved / analytics.total) * 100).toFixed(
                          0,
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-orange-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    In Behandeling
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {analytics.pending.toFixed(1)}u
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {analytics.total > 0
                      ? ((analytics.pending / analytics.total) * 100).toFixed(0)
                      : 0}
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Afgekeurd
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {(
                      analytics.total -
                      analytics.approved -
                      analytics.pending
                    ).toFixed(1)}
                    u
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {analytics.total > 0
                      ? (
                          ((analytics.total -
                            analytics.approved -
                            analytics.pending) /
                            analytics.total) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-600" />
              Prestatie Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Team Capaciteit
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {teamMembers.length} medewerkers ×{" "}
                  {viewMode === "week" ? "5" : "20"} werkdagen × 8u ={" "}
                  {analytics.expectedHours.toFixed(0)}u verwacht
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Efficiency Score
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {analytics.utilizationRate >= 90
                    ? "Uitstekend"
                    : analytics.utilizationRate >= 75
                      ? "Goed"
                      : analytics.utilizationRate >= 60
                        ? "Acceptabel"
                        : "Verbetering nodig"}
                  ({analytics.utilizationRate.toFixed(0)}% benut)
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Goedkeuringsratio
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {analytics.total > 0
                    ? ((analytics.approved / analytics.total) * 100).toFixed(0)
                    : 0}
                  % van alle uren is goedgekeurd
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op naam, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white dark:bg-slate-800"
            >
              <option value="all">Alle medewerkers</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <Card>
        <CardContent className="pt-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              Geen uren gevonden voor deze periode
            </div>
          ) : entriesViewMode === "cards" ? (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {entry.user?.firstName?.charAt(0)}
                        {entry.user?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {entry.user?.firstName} {entry.user?.lastName}
                        </p>
                        {getStatusBadge(entry.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Building className="w-3 h-3" />
                        <span>{entry.project?.name}</span>
                        <span>•</span>
                        <span>
                          {dayjs(entry.startTime).format("DD MMM YYYY HH:mm")} -{" "}
                          {dayjs(entry.endTime).format("HH:mm")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {(
                          (dayjs(entry.endTime).diff(
                            dayjs(entry.startTime),
                            "minute",
                          ) -
                            (entry.breakMinutes || 0)) /
                          60
                        ).toFixed(2)}
                        u
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Pauze: {entry.breakMinutes || 0} min
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left p-4 font-medium text-slate-900 dark:text-slate-100">
                      Medewerker
                    </th>
                    <th className="text-left p-4 font-medium text-slate-900 dark:text-slate-100">
                      Project
                    </th>
                    <th className="text-left p-4 font-medium text-slate-900 dark:text-slate-100">
                      Datum & Tijd
                    </th>
                    <th className="text-left p-4 font-medium text-slate-900 dark:text-slate-100">
                      Uren
                    </th>
                    <th className="text-left p-4 font-medium text-slate-900 dark:text-slate-100">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {entry.user?.firstName?.charAt(0)}
                              {entry.user?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.user?.firstName} {entry.user?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {entry.project?.name}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        <div>
                          <div>
                            {dayjs(entry.startTime).format("DD MMM YYYY")}
                          </div>
                          <div className="text-sm">
                            {dayjs(entry.startTime).format("HH:mm")} -{" "}
                            {dayjs(entry.endTime).format("HH:mm")}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {(
                              (dayjs(entry.endTime).diff(
                                dayjs(entry.startTime),
                                "minute",
                              ) -
                                (entry.breakMinutes || 0)) /
                              60
                            ).toFixed(2)}
                            u
                          </span>
                          {entry.breakMinutes > 0 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Pauze: {entry.breakMinutes} min
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(entry.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
