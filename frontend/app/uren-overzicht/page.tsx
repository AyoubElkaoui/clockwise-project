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
import { getEnrichedTimeEntries } from "@/lib/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { getUserId } from "@/lib/auth-utils";

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
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [displayView, setDisplayView] = useState<"cards" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }
      const data = await getEnrichedTimeEntries();
      const userEntries = data.filter((entry: any) => entry.userId === userId);
      setEntries(userEntries);
    } catch (error) {
      console.error("Error in loadEntries:", error);
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
      } else {
        const monthStart = currentPeriod.startOf("month");
        const monthEnd = currentPeriod.endOf("month");
        filtered = filtered.filter((entry) => {
          const entryDate = dayjs(entry.date || entry.startTime);
          return entryDate.isBetween(monthStart, monthEnd, null, "[]");
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

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

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
    setViewMode((prev) => {
      const newMode = prev === "week" ? "month" : "week";
      setCurrentPeriod(
        dayjs().startOf(newMode === "week" ? "isoWeek" : "month"),
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
    link.href = url;
    link.download = `uren-${viewMode}-${currentPeriod.format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const SimpleBarChart = ({ data }: { data: any[] }) => {
    const maxHours = Math.max(...data.map((d) => d.hours), 1);
    return (
      <div className="flex items-end gap-2 h-32">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="bg-blue-500 dark:bg-blue-400 rounded-t w-full transition-all hover:bg-blue-600"
              style={{
                height: `${(item.hours / maxHours) * 100}%`,
                minHeight: item.hours > 0 ? "4px" : "0px",
              }}
              title={`${item.day}: ${item.hours}u`}
            ></div>
            <span className="text-xs text-slate-500 mt-1">{item.day}</span>
          </div>
        ))}
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
      : currentPeriod.format("MMMM YYYY");

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Uren Overzicht
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Bekijk en beheer al je tijdregistraties
              </p>
            </div>
            <Button
              onClick={exportToCSV}
              disabled={filteredEntries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exporteren
            </Button>
          </div>

          {/* Period Navigation */}
          <Card variant="elevated" padding="md">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Vorige
              </Button>

              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="text-slate-700 dark:text-slate-300"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Vandaag
                </Button>
                <div className="text-center min-w-[280px]">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {periodLabel}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleView}
                  className="text-slate-700 dark:text-slate-300"
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  {viewMode === "week" ? "Maand" : "Week"}
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                className="text-slate-700 dark:text-slate-300"
              >
                Volgende
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Totaal Uren", value: stats.total, color: "blue" },
              { label: "Goedgekeurd", value: stats.approved, color: "green" },
              {
                label: "In Behandeling",
                value: stats.pending,
                color: "orange",
              },
            ].map((stat) => (
              <Card key={stat.label} variant="elevated" padding="md">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      stat.color === "blue"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : stat.color === "green"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-orange-100 dark:bg-orange-900/30"
                    }`}
                  >
                    <Clock
                      className={`w-6 h-6 ${
                        stat.color === "blue"
                          ? "text-blue-600 dark:text-blue-400"
                          : stat.color === "green"
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {loading ? "..." : `${stat.value.toFixed(1)}u`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card variant="elevated" padding="md">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    icon={<Search className="w-5 h-5" />}
                    placeholder="Zoek project, bedrijf of opmerkingen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Alle Statussen</option>
                  <option value="concept">Concept</option>
                  <option value="ingeleverd">In Behandeling</option>
                  <option value="goedgekeurd">Goedgekeurd</option>
                  <option value="afgekeurd">Afgekeurd</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Datum
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Eind Datum
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="text-slate-700 dark:text-slate-300"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Chart */}
          <Card variant="elevated" padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Uren per Dag
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={chartData} />
            </CardContent>
          </Card>

          {/* Summary Card */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card variant="elevated" padding="md" className="lg:col-span-1">
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

            {/* Entries */}
            <Card variant="elevated" padding="lg" className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Registraties ({filteredEntries.length})</CardTitle>
                  <div className="flex items-center gap-2">
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
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      Geen registraties
                    </p>
                    <p className="text-sm">
                      {searchQuery ||
                      statusFilter !== "all" ||
                      startDate ||
                      endDate
                        ? "Probeer andere filters"
                        : "Start met het registreren van je uren"}
                    </p>
                  </div>
                ) : displayView === "cards" ? (
                  <div className="space-y-3">
                    {paginatedEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="w-20 text-center flex-shrink-0">
                          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                            {dayjs(entry.date || entry.startTime).format("ddd")}
                          </p>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {dayjs(entry.date || entry.startTime).format(
                              "DD/MM/YY",
                            )}
                          </p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {entry.hours}u
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {entry.projectName}
                            </p>
                            <Badge
                              variant={getStatusBadgeVariant(entry.status)}
                              size="sm"
                            >
                              {getStatusLabel(entry.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {entry.projectGroupName ||
                              `Groep ${entry.projectId}`}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic mt-1 truncate">
                              {entry.notes}
                            </p>
                          )}
                          {(entry.km > 0 || entry.expenses > 0) && (
                            <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                              {entry.km > 0 && <span>🚗 {entry.km} km</span>}
                              {entry.expenses > 0 && (
                                <span>💰 €{entry.expenses.toFixed(2)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            Datum
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            Uren
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            Projectcode
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            Projectnaam
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            Taak
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedEntries.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                              {dayjs(entry.date || entry.startTime).format(
                                "DD/MM/YYYY",
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-semibold text-blue-600 dark:text-blue-400">
                              {entry.hours}u
                            </td>
                            <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                              {entry.projectCode}
                            </td>
                            <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                              {entry.projectName}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {entry.taskName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Pagina {currentPage} van {totalPages} (
                      {filteredEntries.length} totaal)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="text-slate-700 dark:text-slate-300 disabled:text-slate-400"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Vorige
                      </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="text-slate-700 dark:text-slate-300 disabled:text-slate-400"
                      >
                        Volgende
                        <ChevronRight className="w-4 h-4" />
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
