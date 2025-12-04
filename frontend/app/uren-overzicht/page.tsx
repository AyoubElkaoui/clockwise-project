"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock, Filter, Download, Search, Loader2, Calendar, ChevronLeft, ChevronRight, CalendarDays
} from "lucide-react";
import { getTimeEntries } from "@/lib/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale("nl");

interface TimeEntryWithDetails {
  id: number;
  userId: number;
  date: string;
  projectId: number;
  projectName?: string;
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
  const [currentPeriod, setCurrentPeriod] = useState(dayjs().startOf("isoWeek"));
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const userId = Number(localStorage.getItem("userId") || "1");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await getTimeEntries();
      const userEntries = data.filter((entry: any) => entry.userId === userId);
      setEntries(userEntries);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fast filtering with useMemo
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Period filter
    if (viewMode === "week") {
      const weekStart = currentPeriod.startOf("day");
      const weekEnd = currentPeriod.add(6, "day").endOf("day");
      filtered = filtered.filter(entry => {
        const entryDate = dayjs(entry.date || entry.startTime);
        return entryDate.isBetween(weekStart, weekEnd, null, "[]");
      });
    } else {
      const monthStart = currentPeriod.startOf("month");
      const monthEnd = currentPeriod.endOf("month");
      filtered = filtered.filter(entry => {
        const entryDate = dayjs(entry.date || entry.startTime);
        return entryDate.isBetween(monthStart, monthEnd, null, "[]");
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.projectName?.toLowerCase().includes(query) ||
        entry.companyName?.toLowerCase().includes(query) ||
        entry.notes?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [entries, currentPeriod, viewMode, statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: filteredEntries.reduce((sum, e) => sum + (e.hours || 0), 0),
    approved: filteredEntries.filter(e => e.status === "goedgekeurd").reduce((sum, e) => sum + (e.hours || 0), 0),
    pending: filteredEntries.filter(e => e.status === "ingeleverd").reduce((sum, e) => sum + (e.hours || 0), 0),
  }), [filteredEntries]);

  const handlePrev = () => {
    setCurrentPeriod(p => p.subtract(1, viewMode === "week" ? "week" : "month"));
  };

  const handleNext = () => {
    setCurrentPeriod(p => p.add(1, viewMode === "week" ? "week" : "month"));
  };

  const handleToday = () => {
    setCurrentPeriod(dayjs().startOf(viewMode === "week" ? "isoWeek" : "month"));
  };

  const toggleView = () => {
    setViewMode(prev => {
      const newMode = prev === "week" ? "month" : "week";
      setCurrentPeriod(dayjs().startOf(newMode === "week" ? "isoWeek" : "month"));
      return newMode;
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Datum", "Bedrijf", "Project", "Uren", "KM", "Onkosten", "Status", "Opmerkingen"].join(","),
      ...filteredEntries.map(entry => [
        entry.date,
        entry.companyName || "",
        entry.projectName || "",
        entry.hours,
        entry.km,
        entry.expenses,
        getStatusLabel(entry.status),
        `"${entry.notes || ""}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uren-${viewMode}-${currentPeriod.format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "goedgekeurd": return "success";
      case "ingeleverd": return "warning";
      case "afgekeurd": return "danger";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "goedgekeurd": return "Goedgekeurd";
      case "ingeleverd": return "In Behandeling";
      case "afgekeurd": return "Afgekeurd";
      default: return "Concept";
    }
  };

  const periodLabel = viewMode === "week"
    ? `Week ${currentPeriod.isoWeek()} • ${currentPeriod.format("D MMM")} - ${currentPeriod.add(6, "day").format("D MMM YYYY")}`
    : currentPeriod.format("MMMM YYYY");

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Uren Overzicht</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Bekijk en beheer al je tijdregistraties</p>
            </div>
            <Button onClick={exportToCSV} disabled={filteredEntries.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exporteren
            </Button>
          </div>

          {/* Period Navigation */}
          <Card variant="elevated" padding="md">
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
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{periodLabel}</p>
                </div>
                <Button variant="outline" size="sm" onClick={toggleView}>
                  <CalendarDays className="w-4 h-4 mr-2" />
                  {viewMode === "week" ? "Maand" : "Week"}
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={handleNext}>
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
              { label: "In Behandeling", value: stats.pending, color: "orange" },
            ].map((stat) => (
              <Card key={stat.label} variant="elevated" padding="md">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    stat.color === "blue" ? "bg-blue-100 dark:bg-blue-900/30" :
                    stat.color === "green" ? "bg-green-100 dark:bg-green-900/30" :
                    "bg-orange-100 dark:bg-orange-900/30"
                  }`}>
                    <Clock className={`w-6 h-6 ${
                      stat.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                      stat.color === "green" ? "text-green-600 dark:text-green-400" :
                      "text-orange-600 dark:text-orange-400"
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {loading ? "..." : `${stat.value.toFixed(1)}u`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
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

          {/* Entries Table */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Registraties ({filteredEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-slate-600">Laden...</span>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Geen registraties</p>
                  <p className="text-sm">
                    {searchQuery || statusFilter !== "all"
                      ? "Probeer andere filters"
                      : "Start met het registreren van je uren"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="w-20 text-center flex-shrink-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                          {dayjs(entry.date || entry.startTime).format("ddd")}
                        </p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {dayjs(entry.date || entry.startTime).format("D MMM")}
                        </p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                          {entry.hours}u
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {entry.projectName || `Project ${entry.projectId}`}
                          </p>
                          <Badge variant={getStatusBadgeVariant(entry.status)} size="sm">
                            {getStatusLabel(entry.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {entry.companyName || `Bedrijf ${entry.companyId}`}
                          {entry.projectGroupName && ` • ${entry.projectGroupName}`}
                        </p>
                        {entry.notes && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 italic mt-1 truncate">
                            {entry.notes}
                          </p>
                        )}
                        {(entry.km > 0 || entry.expenses > 0) && (
                          <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {entry.km > 0 && <span>🚗 {entry.km} km</span>}
                            {entry.expenses > 0 && <span>💰 €{entry.expenses.toFixed(2)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
