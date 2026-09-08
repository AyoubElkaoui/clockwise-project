"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Filter,
  Download,
  Search,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Table,
  List,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getEnrichedTimeEntries } from "@/lib/api";
import { getMyEntries } from "@/lib/api/workflowApi";
import BudgetOverview from "@/components/BudgetOverview";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
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
  const [displayView, setDisplayView] = useState<"cards" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(dayjs().year());

  // Bereik = vrij gekozen datums, anders de gekozen week / maand / jaar
  const rangeFrom = startDate && endDate ? startDate : currentPeriod.format("YYYY-MM-DD");
  const rangeTo = startDate && endDate ? endDate
    : (viewMode === "week" ? currentPeriod.add(6, "day") : viewMode === "month" ? currentPeriod.endOf("month") : currentPeriod.endOf("year")).format("YYYY-MM-DD");

  useEffect(() => {
    loadEntries(rangeFrom, rangeTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo]);

  const loadEntries = async (from: string, to: string) => {
    setLoading(true);
    try {
      const userId = authUtils.getUserId();
      if (!userId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }
      // Alle eigen regels, alle statussen, voor het gekozen bereik
      const allEntries = await getMyEntries(from, to);
      const transformed = allEntries.map((e: any) => ({
        id: e.id,
        userId: userId,
        date: String(e.datum).split("T")[0],
        projectId: e.werkGcId || 0,
        projectCode: e.werkCode || (e.werkGcId ? "" : e.taakCode || ""),
        projectName: e.werkDescription || (e.werkGcId ? `Project ${e.werkGcId}` : e.taakDescription || "Indirecte uren"),
        taskName: e.taakDescription || "",
        hours: Number(e.aantal) || 0,
        km: Number(e.distanceKm) || 0,
        expenses: (Number(e.travelCosts) || 0) + (Number(e.otherExpenses) || 0),
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

  // Fast filtering with useMemo
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Custom date range filter
    if (startDate && endDate) {
      const start = dayjs(startDate);
      const end = dayjs(endDate);
      filtered = filtered.filter((entry) => {
        const entryDate = dayjs(entry.date || entry.startTime);
        return entryDate.isBetween(start, end, null, "[]");
      });
    } else {
      // Period filter
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

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((entry) => entry.status === statusFilter);
    }

    // Search filter
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

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  // Chart data
  const chartData = useMemo(() => {
    const days = viewMode === "week" ? 7 : dayjs(currentPeriod).daysInMonth();
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
      const totalHours = dayEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
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
      p.subtract(1, viewMode === "week" ? "week" : viewMode === "month" ? "month" : "year"),
    );
  };

  const handleNext = () => {
    setCurrentPeriod((p) => p.add(1, viewMode === "week" ? "week" : viewMode === "month" ? "month" : "year"));
  };

  const handleToday = () => {
    setCurrentPeriod(
      dayjs().startOf(viewMode === "week" ? "isoWeek" : viewMode === "month" ? "month" : "year"),
    );
  };

  const toggleView = () => {
    setViewMode((prev) => {
      let newMode: "week" | "month" | "year";
      if (prev === "week") newMode = "month";
      else if (prev === "month") newMode = "year";
      else newMode = "week";
      setCurrentPeriod(
        dayjs().startOf(newMode === "week" ? "isoWeek" : newMode === "month" ? "month" : "year"),
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
    // On mobile with many bars (month/year), make scrollable
    const needsScroll = barCount > 10;
    return (
      <div className={needsScroll ? "overflow-x-auto -mx-2 px-2" : ""}>
        <div
          className="flex items-end gap-1 md:gap-2 h-28 md:h-32"
          style={needsScroll ? { minWidth: `${barCount * 28}px` } : undefined}
        >
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1 min-w-0">
              <div
                className="bg-blue-500 dark:bg-blue-400 rounded-t w-full transition-all hover:bg-blue-600"
                style={{
                  height: `${(item.hours / maxHours) * 100}%`,
                  minHeight: item.hours > 0 ? "4px" : "0px",
                }}
                title={`${item.day}: ${item.hours}u`}
              ></div>
              <span className="text-[9px] md:text-xs text-slate-500 mt-1 truncate w-full text-center">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return "success";
      case "ingeleverd":
        return "warning";
      case "afgekeurd":
        return "danger";
      default:
        return "secondary";
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
        <div className="space-y-6 animate-fadeIn">
          <PageHeader
            title="Uren Overzicht"
            description="Bekijk en beheer al je tijdregistraties"
            actions={
              <Button
                size="sm"
                onClick={exportToCSV}
                disabled={filteredEntries.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            }
          />

          {/* Period Navigation */}
          <Card variant="elevated" padding="md">
            <div className="flex items-center justify-between gap-1 md:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="text-slate-700 dark:text-slate-300 flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 md:mr-1" />
                <span className="hidden md:inline">Vorige</span>
              </Button>

              <div className="flex items-center gap-1.5 md:gap-4 min-w-0 flex-1 justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="text-slate-700 dark:text-slate-300 hidden sm:flex flex-shrink-0"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Vandaag
                </Button>
                <div className="text-center min-w-0">
                  <p className="font-semibold text-xs md:text-base text-slate-900 dark:text-slate-100 truncate">
                    {periodLabel}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleView}
                  className="text-slate-700 dark:text-slate-300 flex-shrink-0 text-xs md:text-sm"
                >
                  <CalendarDays className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{viewMode === "week" ? "Maand" : viewMode === "month" ? "Jaar" : "Week"}</span>
                </Button>
                {viewMode === "year" && (
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="hidden sm:block px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Array.from({ length: dayjs().year() - 2017 }, (_, i) => 2018 + i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                className="text-slate-700 dark:text-slate-300 flex-shrink-0"
              >
                <span className="hidden md:inline">Volgende</span>
                <ChevronRight className="w-4 h-4 md:ml-1" />
              </Button>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-6">
            <StatCard
              title="Totaal Uren"
              value={loading ? "..." : `${stats.total.toFixed(1)}u`}
              icon={Clock}
              color="blue"
            />
            <StatCard
              title="Goedgekeurd"
              value={loading ? "..." : `${stats.approved.toFixed(1)}u`}
              icon={Clock}
              color="emerald"
            />
            <StatCard
              title="In Behandeling"
              value={loading ? "..." : `${stats.pending.toFixed(1)}u`}
              icon={Clock}
              color="amber"
            />
          </div>

          {/* Filters */}
          <Card variant="elevated" padding="md">
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
                <div className="flex-1">
                  <Input
                    icon={<Search className="w-5 h-5" />}
                    placeholder="Zoek project, bedrijf..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 md:px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Alle Statussen</option>
                  <option value="concept">Concept</option>
                  <option value="ingeleverd">In Behandeling</option>
                  <option value="goedgekeurd">Goedgekeurd</option>
                  <option value="afgekeurd">Afgekeurd</option>
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Eind
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-end">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="text-slate-700 dark:text-slate-300 w-full sm:w-auto"
                    size="sm"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Chart */}
          <Card variant="elevated" padding="md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Uren per Dag
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={chartData} />
            </CardContent>
          </Card>

          {/* Summary Card + Entries */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-6">
            <div className="hidden lg:flex lg:col-span-1 flex-col gap-4">
            <Card variant="elevated" padding="md">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Deze Periode
                </h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {stats.total.toFixed(1)}u
                </p>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <p>Goedgekeurd: {stats.approved.toFixed(1)}u</p>
                  <p>In Behandeling: {stats.pending.toFixed(1)}u</p>
                </div>
              </div>
            </Card>
            <BudgetOverview year={currentPeriod.year()} />
            </div>

            {/* Entries */}
            <Card variant="elevated" padding="md" className="lg:col-span-3">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">Registraties ({filteredEntries.length})</CardTitle>
                  <div className="hidden md:flex items-center gap-2">
                    <Button
                      variant={displayView === "cards" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDisplayView("cards")}
                      className={
                        displayView === "cards"
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }
                    >
                      <List className="w-4 h-4 mr-2" />
                      Kaarten
                    </Button>
                    <Button
                      variant={displayView === "table" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDisplayView("table")}
                      className={
                        displayView === "table"
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }
                    >
                      <Table className="w-4 h-4 mr-2" />
                      Tabel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-slate-600 dark:text-slate-400">
                      Laden...
                    </span>
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                      <Calendar className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen registraties</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {searchQuery || statusFilter !== "all" || startDate || endDate
                        ? "Probeer andere filters"
                        : "Start met het registreren van je uren"}
                    </p>
                  </div>
                ) : (
                  <div className="-mx-6 -mb-6">
                    {paginatedEntries.map((entry) => {
                      const s = (entry.status || "").toUpperCase();
                      const pill =
                        s.includes("APPROV") || s.includes("GOEDGE")
                          ? { c: "var(--green)", b: "var(--green-weak)", l: "Goedgekeurd" }
                          : s.includes("REJECT") || s.includes("AFGE")
                            ? { c: "var(--red)", b: "var(--red-weak)", l: "Afgewezen" }
                            : s.includes("SUBMIT") || s.includes("INGELE") || s.includes("PENDING") || s.includes("BEHANDEL")
                              ? { c: "var(--accent)", b: "var(--accent-weak)", l: "In behandeling" }
                              : { c: "var(--muted)", b: "var(--panel-2)", l: getStatusLabel(entry.status) };
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 md:gap-4 px-6 py-[13px] border-t border-[var(--border)]"
                        >
                          <div className="w-14 flex-shrink-0 text-center">
                            <div style={{ font: "500 11px 'Geist'", color: "var(--muted)", textTransform: "capitalize" }}>{dayjs(entry.date || entry.startTime).format("dd")}</div>
                            <div style={{ font: "600 13px 'Geist'", color: "var(--text)" }}>{dayjs(entry.date || entry.startTime).format("D MMM")}</div>
                          </div>
                          <span className="flex-shrink-0 rounded-full" style={{ width: 9, height: 9, background: pill.c }} />
                          <div className="flex-1 min-w-0">
                            <div className="truncate" style={{ font: "600 13.5px 'Geist'", color: "var(--text)" }}>{entry.projectName}</div>
                            <div className="truncate" style={{ font: "500 11.5px 'Geist Mono', monospace", color: "var(--muted)" }}>
                              {entry.projectCode ? `${entry.projectCode} · ` : ""}{entry.projectGroupName || `Groep ${entry.projectId}`}
                            </div>
                          </div>
                          {entry.km > 0 && (
                            <div className="hidden sm:flex items-center gap-1.5" style={{ font: "400 12px 'Geist'", color: "var(--muted)" }}>
                              <Clock className="w-3.5 h-3.5" /> {entry.km} km
                            </div>
                          )}
                          <div className="w-[52px] text-right" style={{ font: "600 15px 'Geist Mono', monospace", color: "var(--text)" }}>{entry.hours}u</div>
                          <div className="hidden sm:flex w-[132px] justify-end">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ font: "600 11.5px 'Geist'", background: pill.b, color: pill.c }}>
                              <span className="rounded-full" style={{ width: 6, height: 6, background: pill.c }} />
                              {pill.l}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 md:mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                      {currentPage}/{totalPages} ({filteredEntries.length} totaal)
                    </p>
                    <div className="flex items-center gap-1 md:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="text-slate-700 dark:text-slate-300 disabled:text-slate-400"
                      >
                        <ChevronLeft className="w-4 h-4 md:mr-1" />
                        <span className="hidden md:inline">Vorige</span>
                      </Button>
                      <div className="hidden sm:flex items-center gap-1 md:gap-2">
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            const page =
                              Math.max(
                                1,
                                Math.min(totalPages - 4, currentPage - 2),
                              ) + i;
                            return (
                              <Button
                                key={page}
                                variant={
                                  page === currentPage ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className={
                                  page === currentPage
                                    ? "text-slate-900 dark:text-white"
                                    : "text-slate-700 dark:text-slate-300"
                                }
                              >
                                {page}
                              </Button>
                            );
                          },
                        )}
                      </div>
                      <span className="sm:hidden text-sm font-medium text-slate-700 dark:text-slate-300 px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="text-slate-700 dark:text-slate-300 disabled:text-slate-400"
                      >
                        <span className="hidden md:inline">Volgende</span>
                        <ChevronRight className="w-4 h-4 md:ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
