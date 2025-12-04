"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Search, Download, Calendar, ChevronLeft, ChevronRight, User, Building } from "lucide-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale("nl");

export default function ManagerTeamHoursPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [currentPeriod, setCurrentPeriod] = useState(dayjs().startOf("isoWeek"));
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const managerId = Number(localStorage.getItem("userId"));
      
      const usersRes = await fetch("${API_URL}/users");
      const users = await usersRes.json();
      const team = users.filter((u: any) => u.managerId === managerId);
      setTeamMembers(team);

      const res = await fetch(`${API_URL}/time-entries/team?managerId=${managerId}`);
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error("Failed to load data:", error);
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
      filtered = filtered.filter(entry => {
        const entryDate = dayjs(entry.startTime);
        return entryDate.isBetween(weekStart, weekEnd, null, '[]');
      });
    } else {
      const monthStart = currentPeriod.startOf("month");
      const monthEnd = currentPeriod.endOf("month");
      filtered = filtered.filter(entry => {
        const entryDate = dayjs(entry.startTime);
        return entryDate.isBetween(monthStart, monthEnd, null, '[]');
      });
    }

    // User filter
    if (selectedUser !== "all") {
      filtered = filtered.filter(entry => entry.userId === Number(selectedUser));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.user?.firstName?.toLowerCase().includes(query) ||
        entry.user?.lastName?.toLowerCase().includes(query) ||
        entry.project?.name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [entries, currentPeriod, viewMode, selectedUser, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredEntries.reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0);

    const approved = filteredEntries.filter(e => e.status === "goedgekeurd").reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0);

    const pending = filteredEntries.filter(e => e.status === "ingeleverd").reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0);

    return { total, approved, pending };
  }, [filteredEntries]);

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
    const newMode = viewMode === "week" ? "month" : "week";
    setViewMode(newMode);
    setCurrentPeriod(dayjs().startOf(newMode === "week" ? "isoWeek" : "month"));
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Datum", "Medewerker", "Bedrijf", "Project", "Start", "Eind", "Pauze", "Totaal", "Status"].join(","),
      ...filteredEntries.map(entry => {
        const hours = (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60;
        return [
          dayjs(entry.startTime).format("YYYY-MM-DD"),
          `${entry.user?.firstName} ${entry.user?.lastName}`,
          entry.project?.projectGroup?.company?.name || "",
          entry.project?.name || "",
          dayjs(entry.startTime).format("HH:mm"),
          dayjs(entry.endTime).format("HH:mm"),
          entry.breakMinutes || 0,
          hours.toFixed(2),
          entry.status
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-uren-${viewMode}-${currentPeriod.format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return <Badge className="bg-green-500">Goedgekeurd</Badge>;
      case "ingeleverd":
        return <Badge className="bg-yellow-500">In behandeling</Badge>;
      case "afgekeurd":
        return <Badge className="bg-red-500">Afgekeurd</Badge>;
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  const periodLabel = viewMode === "week"
    ? `Week ${currentPeriod.isoWeek()} • ${currentPeriod.format("D MMM")} - ${currentPeriod.add(6, "day").format("D MMM YYYY")}`
    : currentPeriod.format("MMMM YYYY");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Team Uren</h1>
          <p className="text-slate-700 dark:text-slate-300 mt-1">Overzicht van alle team uren</p>
        </div>
        <Button onClick={exportToCSV} disabled={filteredEntries.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exporteren naar CSV
        </Button>
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
                <p className="font-semibold text-slate-900 dark:text-slate-100">{periodLabel}</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Totaal Uren</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total.toFixed(1)}u</p>
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
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Goedgekeurd</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.approved.toFixed(1)}u</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">In Behandeling</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pending.toFixed(1)}u</p>
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
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                Geen uren gevonden voor deze periode
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {entry.user?.firstName?.charAt(0)}{entry.user?.lastName?.charAt(0)}
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
                        <span>{dayjs(entry.startTime).format("DD MMM YYYY HH:mm")} - {dayjs(entry.endTime).format("HH:mm")}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {((dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60).toFixed(2)}u
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Pauze: {entry.breakMinutes || 0} min</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
