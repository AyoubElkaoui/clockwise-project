"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Filter, Download, Search, Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import { getTimeEntries } from "@/lib/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);

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
  const [filteredEntries, setFilteredEntries] = useState<TimeEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentWeek, setCurrentWeek] = useState(dayjs());
  const [userId] = useState(1); // TODO: Get from auth context

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, searchQuery, statusFilter, currentWeek]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await getTimeEntries();
      console.log('🔍 [DEBUG] Raw API data:', data.length, 'entries');
      console.log('🔍 [DEBUG] First entry:', data[0]);
      console.log('🔍 [DEBUG] First entry has hours?', data[0]?.hours);
      console.log('🔍 [DEBUG] First entry has date?', data[0]?.date);
      
      // Filter by current user
      const userEntries = data.filter((entry: any) => entry.userId === userId);
      console.log('🔍 [DEBUG] User entries:', userEntries.length);
      
      // Auto-select week with data if current week has no entries
      if (userEntries.length > 0) {
        // Find the most recent entry date
        const latestEntry = userEntries.reduce((latest, entry) => {
          return dayjs(entry.date).isAfter(dayjs(latest.date)) ? entry : latest;
        }, userEntries[0]);
        
        // Check if current week has any data
        const weekStart = currentWeek.startOf('isoWeek');
        const weekEnd = currentWeek.endOf('isoWeek');
        const hasDataInCurrentWeek = userEntries.some(entry => {
          const entryDate = dayjs(entry.date);
          return entryDate.isBetween(weekStart, weekEnd, null, '[]');
        });
        
        console.log('📅 [DEBUG] Current week has data?', hasDataInCurrentWeek);
        console.log('📅 [DEBUG] Latest entry date:', latestEntry.date);
        
        // If no data in current week, jump to latest entry's week BEFORE setting entries
        if (!hasDataInCurrentWeek && latestEntry) {
          const newWeek = dayjs(latestEntry.date);
          console.log('🔄 [DEBUG] Jumping to week of:', newWeek.format('YYYY-MM-DD'));
          setCurrentWeek(newWeek);
        }
      }
      
      // Set entries AFTER potentially updating the week
      setEntries(userEntries);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];
    console.log('🔧 [DEBUG] Filtering', filtered.length, 'entries');

    // Filter by week
    const weekStart = currentWeek.startOf('isoWeek');
    const weekEnd = currentWeek.endOf('isoWeek');
    console.log('📅 [DEBUG] Week range:', weekStart.format('YYYY-MM-DD'), 'to', weekEnd.format('YYYY-MM-DD'));
    
    filtered = filtered.filter(entry => {
      const entryDate = dayjs(entry.date);
      const inRange = entryDate.isBetween(weekStart, weekEnd, null, '[]');
      if (!inRange && filtered.indexOf(entry) < 3) {
        console.log('❌ [DEBUG] Entry excluded:', entry.date, 'not in range');
      }
      return inRange;
    });
    
    console.log('📊 [DEBUG] After week filter:', filtered.length, 'entries');
    if (filtered.length > 0) {
      console.log('📋 [DEBUG] First filtered entry:', filtered[0]);
      console.log('💰 [DEBUG] First entry hours:', filtered[0].hours, 'type:', typeof filtered[0].hours);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(entry => 
        entry.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  };

  const calculateTotalHours = () => {
    const total = filteredEntries.reduce((sum, entry) => {
      console.log('➕ [DEBUG] Adding hours:', entry.hours, 'current sum:', sum);
      return sum + (entry.hours || 0);
    }, 0);
    console.log('💰 [DEBUG] Total hours:', total);
    return total;
  };

  const calculateApprovedHours = () => {
    return filteredEntries
      .filter(entry => entry.status === "goedgekeurd")
      .reduce((sum, entry) => sum + (entry.hours || 0), 0);
  };

  const calculatePendingHours = () => {
    return filteredEntries
      .filter(entry => entry.status === "ingeleverd")
      .reduce((sum, entry) => sum + (entry.hours || 0), 0);
  };

  const getStatusBadgeVariant = (status: string): "default" | "success" | "warning" | "secondary" | "danger" | "info" => {
    switch (status) {
      case "goedgekeurd":
        return "success";
      case "ingeleverd":
        return "warning";
      case "afgewezen":
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
      case "afgewezen":
        return "Afgewezen";
      case "opgeslagen":
        return "Concept";
      default:
        return status;
    }
  };

  const prevWeek = () => {
    setCurrentWeek(currentWeek.subtract(1, 'week'));
  };

  const nextWeek = () => {
    setCurrentWeek(currentWeek.add(1, 'week'));
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
        `"${entry.notes || ""}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uren-overzicht-week-${currentWeek.isoWeek()}.csv`;
    a.click();
  };

  // Bereken stats dynamisch
  const totalHours = loading ? 0 : calculateTotalHours();
  const approvedHours = loading ? 0 : calculateApprovedHours();
  const pendingHours = loading ? 0 : calculatePendingHours();

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Uren Overzicht
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Bekijk en beheer al je tijdregistraties
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
            <Button variant="outline" size="sm" onClick={prevWeek}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Vorige
            </Button>
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Week {currentWeek.isoWeek()}</p>
              <p className="font-semibold">{currentWeek.startOf('isoWeek').format('D MMM')} - {currentWeek.endOf('isoWeek').format('D MMM YYYY')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              Volgende
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Totaal Uren</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {loading ? "..." : `${totalHours.toFixed(1)}u`}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Goedgekeurde Uren</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {loading ? "..." : `${approvedHours.toFixed(1)}u`}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">In Behandeling</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {loading ? "..." : `${pendingHours.toFixed(1)}u`}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <Card variant="elevated" padding="md" className="flex-1">
              <Input
                icon={<Search className="w-5 h-5" />}
                placeholder="Zoek in tijdregistraties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </Card>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Alle statussen</option>
              <option value="opgeslagen">Concept</option>
              <option value="ingeleverd">In Behandeling</option>
              <option value="goedgekeurd">Goedgekeurd</option>
              <option value="afgewezen">Afgewezen</option>
            </select>
          </div>

          {/* Entries List */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tijd Registraties</CardTitle>
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredEntries.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporteren
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Geen registraties gevonden</p>
                  <p className="text-sm">
                    {searchQuery || statusFilter !== "all" 
                      ? "Probeer andere filters" 
                      : "Start met het registreren van je uren"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="w-20 text-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {dayjs(entry.date).format('ddd')}
                        </p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {dayjs(entry.date).format('D MMM')}
                        </p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                          {entry.hours}u
                        </p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {entry.projectName || `Project ${entry.projectId}`}
                          </p>
                          <Badge variant={getStatusBadgeVariant(entry.status)} size="sm">
                            {getStatusLabel(entry.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {entry.companyName || `Bedrijf ${entry.companyId}`} • {entry.projectGroupName || `Groep ${entry.projectGroupId}`}
                        </p>
                        {entry.notes && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                            {entry.notes}
                          </p>
                        )}
                        {(entry.km > 0 || entry.expenses > 0) && (
                          <div className="flex gap-4 mt-2 text-xs text-slate-500">
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
