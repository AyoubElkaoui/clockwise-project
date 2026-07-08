"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import {
  Clock,
  Filter,
  Download,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { getDrafts, getSubmitted, getRejected } from "@/lib/api/workflowApi";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale("nl");

interface TimeEntryWithDetails {
  id: number;
  userId: number;
  date: string;
  projectId: number;
  projectCode?: string;
  projectName?: string;
  taskName?: string;
  companyId: number;
  companyName?: string;
  projectGroupId: number;
  projectGroupName?: string;
  hours: number;
  km: number;
  expenses: number;
  breakMinutes: number;
  notes: string;
  status: string;
  startTime?: string;
  endTime?: string;
}

export default function UrenOverzichtPage() {
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPeriod, setCurrentPeriod] = useState(
    dayjs().startOf("isoWeek"),
  );
  const [viewMode, setViewMode] = useState<"week" | "month" | "year">("month");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(dayjs().year());

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadEntries(startDate, endDate);
    }
  }, [startDate, endDate]);

  const loadEntries = async (from?: string, to?: string) => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const urenperGcId = 100426;

      const [drafts, submitted, rejected] = await Promise.all([
        getDrafts(urenperGcId),
        getSubmitted(urenperGcId),
        getRejected(urenperGcId),
      ]);

      const allEntries = [...drafts, ...submitted, ...rejected];

      const transformed = allEntries.map((e: any) => ({
        id: e.id,
        userId: userId,
        date: e.datum.split("T")[0],
        projectId: e.werkGcId || 0,
        projectCode: e.werkCode || "",
        projectName: e.werkDescription || `Project ${e.werkGcId}`,
        taskName: e.taakDescription || "",
        hours: e.aantal,
        km: 0,
        expenses: 0,
        breakMinutes: 0,
        notes: e.omschrijving || "",
        status: e.status,
        startTime: e.datum,
        endTime: e.datum,
        companyId: 0,
        companyName: "",
        projectGroupId: 0,
        projectGroupName: "",
      }));

      setEntries(transformed);
    } catch (error) {
      showToast("Fout bij laden uren", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    if (startDate && endDate) {
      const start = dayjs(startDate);
      const end = dayjs(endDate);
      filtered = filtered.filter((entry) => {
        const entryDate = dayjs(entry.date || entry.startTime);
        return entryDate.isBetween(start, end, null, "[]");
      });
    } else {
      if (viewMode === "week") {
        const weekStart = currentPeriod.startOf("day");
        const weekEnd = currentPeriod.add(6, "day").endOf("day");
        filtered = filtered.filter((entry) => {
          const entryDate = dayjs(entry.date || entry.startTime);
          return entryDate.isBetween(weekStart, weekEnd, null, "[]");
        });
      } else if (viewMode === "month") {
        const monthStart = currentPeriod.startOf("month");
        const monthEnd = currentPeriod.endOf("month");
        filtered = filtered.filter((entry) => {
          const entryDate = dayjs(entry.date || entry.startTime);
          return entryDate.isBetween(monthStart, monthEnd, null, "[]");
        });
      } else if (viewMode === "year") {
        const yearStart = currentPeriod.startOf("year");
        const yearEnd = currentPeriod.endOf("year");
        filtered = filtered.filter((entry) => {
          const entryDate = dayjs(entry.date || entry.startTime);
          return entryDate.isBetween(yearStart, yearEnd, null, "[]");
        });
      }
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((entry) => entry.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.projectName?.toLowerCase().includes(query) ||
          entry.companyName?.toLowerCase().includes(query) ||
          entry.notes?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [
    entries,
    currentPeriod,
    viewMode,
    statusFilter,
    searchQuery,
    startDate,
    endDate,
  ]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const chartData = useMemo(() => {
    const days =
      viewMode === "week" ? 7 : dayjs(currentPeriod).daysInMonth();
    const data = [];
    for (let i = 0; i < days; i++) {
      const date =
        viewMode === "week"
          ? currentPeriod.add(i, "day")
          : currentPeriod.date(i + 1);
      const dayEntries = filteredEntries.filter((entry) => {
        const entryDate = dayjs(entry.date || entry.startTime);
        return entryDate.isSame(date, "day");
      });
      const totalHours = dayEntries.reduce(
        (sum, e) => sum + (e.hours || 0),
        0,
      );
      data.push({
        day: date.format("DD/MM"),
        hours: totalHours,
        fullDate: date.format("YYYY-MM-DD"),
      });
    }
    return data;
  }, [filteredEntries, currentPeriod, viewMode]);

  const stats = useMemo(
    () => ({
      total: filteredEntries.reduce((sum, e) => sum + (e.hours || 0), 0),
      approved: filteredEntries
        .filter((e) => e.status === "goedgekeurd")
        .reduce((sum, e) => sum + (e.hours || 0), 0),
      pending: filteredEntries
        .filter((e) => e.status === "ingeleverd")
        .reduce((sum, e) => sum + (e.hours || 0), 0),
    }),
    [filteredEntries],
  );

  // Group paginated entries by ISO week for week-total rows
  const weekGroups = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; entries: TimeEntryWithDetails[]; total: number }
    >();
    paginatedEntries.forEach((entry) => {
      const d = dayjs(entry.date || entry.startTime);
      const key = `${d.year()}-W${String(d.isoWeek()).padStart(2, "0")}`;
      if (!groups.has(key)) {
        const weekStart = d.startOf("isoWeek");
        groups.set(key, {
          label: `Week ${d.isoWeek()} · ${weekStart.format("DD/MM")} – ${weekStart.add(6, "day").format("DD/MM")}`,
          entries: [],
          total: 0,
        });
      }
      const g = groups.get(key)!;
      g.entries.push(entry);
      g.total += entry.hours || 0;
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [paginatedEntries]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const from = `${year}-01-01`;
    const to = `${year + 1}-01-01`;
    setStartDate(from);
    setEndDate(to);
    setViewMode("year");
    setCurrentPeriod(dayjs().year(year).startOf("year"));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handlePrev = () => {
    setCurrentPeriod((p) =>
      p.subtract(
        1,
        viewMode === "week"
          ? "week"
          : viewMode === "month"
            ? "month"
            : "year",
      ),
    );
  };

  const handleNext = () => {
    setCurrentPeriod((p) =>
      p.add(
        1,
        viewMode === "week"
          ? "week"
          : viewMode === "month"
            ? "month"
            : "year",
      ),
    );
  };

  const handleToday = () => {
    setCurrentPeriod(
      dayjs().startOf(
        viewMode === "week"
          ? "isoWeek"
          : viewMode === "month"
            ? "month"
            : "year",
      ),
    );
  };

  const toggleView = () => {
    setViewMode((prev) => {
      let newMode: "week" | "month" | "year";
      if (prev === "week") newMode = "month";
      else if (prev === "month") newMode = "year";
      else newMode = "week";
      setCurrentPeriod(
        dayjs().startOf(
          newMode === "week"
            ? "isoWeek"
            : newMode === "month"
              ? "month"
              : "year",
        ),
      );
      return newMode;
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      [
        "Datum",
        "Groep",
        "Project",
        "Uren",
        "KM",
        "Onkosten",
        "Status",
        "Opmerkingen",
      ].join(","),
      ...filteredEntries.map((entry) =>
        [
          entry.date,
          entry.projectGroupName || "",
          entry.projectName,
          entry.hours,
          entry.km,
          entry.expenses,
          getStatusLabel(entry.status),
          `"${entry.notes || ""}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uren-${viewMode}-${currentPeriod.format("YYYY-MM-DD")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const SimpleBarChart = ({ data }: { data: any[] }) => {
    const maxHours = Math.max(...data.map((d) => d.hours), 1);
    const barCount = data.length;
    const needsScroll = barCount > 10;
    return (
      <div className={needsScroll ? "overflow-x-auto -mx-2 px-2" : ""}>
        <div
          className="flex items-end gap-1 md:gap-2 h-28 md:h-32"
          style={needsScroll ? { minWidth: `${barCount * 28}px` } : undefined}
        >
          {data.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center flex-1 min-w-0"
            >
              <div
                className="bg-blue-500 dark:bg-blue-400 rounded-t w-full transition-all hover:bg-blue-600"
                style={{
                  height: `${(item.hours / maxHours) * 100}%`,
                  minHeight: item.hours > 0 ? "4px" : "0px",
                }}
                title={`${item.day}: ${item.hours}u`}
              />
              <span className="text-[9px] md:text-xs text-slate-500 mt-1 truncate w-full text-center">
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "ingeleverd":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "afgekeurd":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return "Goedgekeurd";
      case "ingeleverd":
        return "In Behandeling";
      case "afgekeurd":
        return "Afgekeurd";
      default:
        return "Concept";
    }
  };

  const periodLabel =
    viewMode === "week"
      ? `Week ${currentPeriod.isoWeek()} • ${currentPeriod.format("DD/MM")} - ${currentPeriod.add(6, "day").format("DD/MM/YYYY")}`
      : viewMode === "month"
        ? currentPeriod.format("MMMM YYYY")
        : currentPeriod.format("YYYY");

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="p-6 space-y-6">

          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Uren Overzicht
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Bekijk en beheer al je tijdregistraties
              </p>
            </div>
            <button
              onClick={exportToCSV}
              disabled={filteredEntries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exporteren
            </button>
          </div>

          {/* Period Navigation */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden md:inline">Vorige</span>
              </button>

              <div className="flex items-center gap-3 flex-1 justify-center flex-wrap">
                <button
                  onClick={handleToday}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Vandaag
                </button>
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 text-center min-w-0">
                  {periodLabel}
                </span>
                <button
                  onClick={toggleView}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {viewMode === "week"
                      ? "Maand"
                      : viewMode === "month"
                        ? "Jaar"
                        : "Week"}
                  </span>
                </button>
                {viewMode === "year" && (
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from(
                      { length: dayjs().year() - 2017 },
                      (_, i) => 2018 + i,
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="hidden md:inline">Volgende</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                TOTAAL UREN
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {loading ? "..." : `${stats.total.toFixed(1)}u`}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                GOEDGEKEURD
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {loading ? "..." : `${stats.approved.toFixed(1)}u`}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                IN BEHANDELING
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {loading ? "..." : `${stats.pending.toFixed(1)}u`}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  className="h-9 pl-9 pr-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  placeholder="Zoek project, bedrijf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle Statussen</option>
                <option value="concept">Concept</option>
                <option value="ingeleverd">In Behandeling</option>
                <option value="goedgekeurd">Goedgekeurd</option>
                <option value="afgekeurd">Afgekeurd</option>
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Start
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Eind
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 h-9 px-3 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Filter className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              Uren per Dag
            </h2>
            <SimpleBarChart data={chartData} />
          </div>

          {/* Entries Table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Registraties{" "}
                <span className="text-slate-400 font-normal ml-1">
                  ({filteredEntries.length})
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Geen registraties
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery || statusFilter !== "all" || startDate || endDate
                    ? "Probeer andere filters"
                    : "Start met het registreren van je uren"}
                </p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Datum
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                        Taak
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Uren
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                        Notitie
                      </th>
                    </tr>
                  </thead>
                  {weekGroups.map((group, gi) => (
                    <tbody key={gi}>
                      {group.entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            <span className="capitalize">
                              {dayjs(entry.date || entry.startTime).format(
                                "ddd DD/MM",
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                              {entry.projectName}
                            </p>
                            {entry.projectCode && (
                              <p className="text-xs text-slate-400">
                                {entry.projectCode}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                            {entry.taskName}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {entry.hours}u
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(entry.status)}`}
                            >
                              {getStatusLabel(entry.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell max-w-[200px] truncate">
                            {entry.notes}
                          </td>
                        </tr>
                      ))}
                      {/* Week total row */}
                      <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                        <td colSpan={6} className="px-4 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {group.label}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {group.total.toFixed(1)}u totaal
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  ))}
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500">
                      Pagina {currentPage} van {totalPages} ·{" "}
                      {filteredEntries.length} registraties
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Vorige
                      </button>
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          const page =
                            Math.max(
                              1,
                              Math.min(totalPages - 4, currentPage - 2),
                            ) + i;
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                                page === currentPage
                                  ? "bg-blue-600 text-white font-medium"
                                  : "text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        },
                      )}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Volgende
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
