"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  getTimeEntries,
  getTimeEntryDetails,
  approveTimeEntry,
  rejectTimeEntry,
} from "@/lib/api";
import {
  Clock,
  Search,
  Filter,
  Info,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.locale("nl");

interface ExtendedTimeEntry {
  id: number;
  userId: number;
  projectId: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  distanceKm?: number;
  expenses?: number;
  notes?: string;
  status: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
  project?: {
    id: number;
    name: string;
    projectGroup?: {
      id: number;
      name: string;
      company?: {
        id: number;
        name: string;
      };
    };
  };
}

export default function AdminTimeEntriesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ExtendedTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(20);
  const [selectedEntry, setSelectedEntry] = useState<ExtendedTimeEntry | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState(
    dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await getTimeEntries();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      
      showToast(t("common.errorLoading"), "error");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Create unique lists for filters
  const users = useMemo(() => {
    const userMap = new Map<number, { id: number; name: string }>();
    entries.forEach((entry) => {
      if (entry.user?.id) {
        const fullName =
          entry.user.fullName ||
          `${entry.user.firstName || ""} ${entry.user.lastName || ""}`.trim();
        userMap.set(entry.user.id, {
          id: entry.user.id,
          name: fullName || "Onbekend",
        });
      }
    });
    return Array.from(userMap.values());
  }, [entries]);

  const projects = useMemo(() => {
    const projectMap = new Map<number, { id: number; name: string }>();
    entries.forEach((entry) => {
      if (entry.project?.id && entry.project.name) {
        projectMap.set(entry.project.id, {
          id: entry.project.id,
          name: entry.project.name,
        });
      }
    });
    return Array.from(projectMap.values());
  }, [entries]);

  // Filtered and sorted entries
  const filteredEntries = useMemo(() => {
    const start = dayjs(startDate).startOf("day");
    const end = dayjs(endDate).endOf("day");

    return entries.filter((entry) => {
      const entryDate = dayjs(entry.startTime);
      const dateInRange = entryDate.isBetween(start, end, "day", "[]");
      const userMatch = selectedUser
        ? entry.user?.id === parseInt(selectedUser)
        : true;
      const projectMatch = selectedProject
        ? entry.project?.id === parseInt(selectedProject)
        : true;
      const searchLower = searchTerm.toLowerCase();
      const userName =
        entry.user?.fullName ||
        `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim();
      const searchMatch =
        !searchTerm ||
        userName.toLowerCase().includes(searchLower) ||
        (entry.project?.name &&
          entry.project.name.toLowerCase().includes(searchLower)) ||
        (entry.notes && entry.notes.toLowerCase().includes(searchLower));

      return dateInRange && userMatch && projectMatch && searchMatch;
    });
  }, [entries, startDate, endDate, selectedUser, selectedProject, searchTerm]);

  // Stats
  const stats = useMemo(
    () => ({
      total: entries.length,
      pending: entries.filter((e) => e.status === "ingeleverd").length,
      approved: entries.filter((e) => e.status === "goedgekeurd").length,
      rejected: entries.filter((e) => e.status === "afgekeurd").length,
    }),
    [entries],
  );

  // Pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(
    indexOfFirstEntry,
    indexOfLastEntry,
  );
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);

  const handleViewDetails = async (entryId: number) => {
    try {
      const details = await getTimeEntryDetails(entryId);
      setSelectedEntry(details);
      setShowDetailsModal(true);
    } catch (error) {
      
      showToast("Fout bij ophalen details", "error");
    }
  };

  const handleApprove = async (entryId: number) => {
    try {
      await approveTimeEntry(entryId);
      setEntries(
        entries.map((e) =>
          e.id === entryId ? { ...e, status: "goedgekeurd" } : e,
        ),
      );
      showToast("Urenregistratie goedgekeurd", "success");
    } catch (error) {
      
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (entryId: number) => {
    try {
      await rejectTimeEntry(entryId);
      setEntries(
        entries.map((e) =>
          e.id === entryId ? { ...e, status: "afgekeurd" } : e,
        ),
      );
      showToast("Urenregistratie afgekeurd", "success");
    } catch (error) {
      
      showToast("Fout bij afkeuren", "error");
    }
  };

  const resetFilters = () => {
    setStartDate(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
    setEndDate(dayjs().format("YYYY-MM-DD"));
    setSelectedUser("");
    setSelectedProject("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const exportEntries = () => {
    const csvContent = [
      [
        "Datum",
        "Gebruiker",
        "Project",
        "Bedrijf",
        "Start",
        "Eind",
        "Uren",
        "Status",
        "Notities",
      ].join(","),
      ...filteredEntries.map((entry) =>
        [
          dayjs(entry.startTime).format("YYYY-MM-DD"),
          `"${entry.user?.firstName} ${entry.user?.lastName}"`,
          `"${entry.project?.name || ""}"`,
          `"${entry.project?.projectGroup?.company?.name || ""}"`,
          dayjs(entry.startTime).format("HH:mm"),
          dayjs(entry.endTime).format("HH:mm"),
          (
            (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
              (entry.breakMinutes || 0)) /
            60
          ).toFixed(2),
          entry.status,
          `"${entry.notes || ""}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uren-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Goedgekeurd
          </Badge>
        );
      case "ingeleverd":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            In Behandeling
          </Badge>
        );
      case "afgekeurd":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            Afgekeurd
          </Badge>
        );
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Urenregistraties laden...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Uren Beheer"
        description="Beheer en keur urenregistraties goed"
        actions={
          <Button onClick={exportEntries} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Exporteren</span>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Totaal" value={stats.total} icon={Clock} color="blue" />
        <StatCard title="Te Behandelen" value={stats.pending} icon={AlertTriangle} color="amber" />
        <StatCard title="Goedgekeurd" value={stats.approved} icon={CheckCircle} color="emerald" />
        <StatCard title="Afgekeurd" value={stats.rejected} icon={XCircle} color="rose" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Filters &amp; Zoeken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Startdatum
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Einddatum
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Gebruiker
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Alle gebruikers</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">Alle projecten</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Zoeken
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Naam, project of notities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <Button onClick={resetFilters} variant="outline" size="sm">
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            Urenregistraties ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {currentEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen registraties gevonden</p>
              <p className="text-sm text-slate-500 mt-1">Probeer andere filters of voeg nieuwe registraties toe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Gebruiker</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Bedrijf</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tijd</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Uren</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {currentEntries.map((entry) => {
                    const hours = (
                      (dayjs(entry.endTime).diff(
                        dayjs(entry.startTime),
                        "minute",
                      ) -
                        (entry.breakMinutes || 0)) /
                      60
                    ).toFixed(2);
                    const userName =
                      entry.user?.fullName ||
                      `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim() ||
                      "Onbekend";
                    const companyName =
                      entry.project?.projectGroup?.company?.name ||
                      "Onbekend";
                    const projectName = entry.project?.name || "Onbekend";

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {dayjs(entry.startTime).format("DD-MM-YYYY")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                              {userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{userName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{companyName}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {projectName}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {dayjs(entry.startTime).format("HH:mm")} -{" "}
                          {dayjs(entry.endTime).format("HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{hours}u</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(entry.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(entry.id)}
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            {entry.status !== "goedgekeurd" &&
                              entry.status !== "afgekeurd" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-emerald-600 hover:text-emerald-700"
                                    onClick={() => handleApprove(entry.id)}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-rose-600 hover:text-rose-700"
                                    onClick={() => handleReject(entry.id)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Pagina {currentPage} van {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Vorige
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Volgende
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedEntry && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                Urenregistratie Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Gebruiker
                  </label>
                  <p className="text-lg font-semibold">
                    {selectedEntry.user?.fullName ||
                      `${selectedEntry.user?.firstName || ""} ${selectedEntry.user?.lastName || ""}`.trim() ||
                      "Onbekend"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Datum
                  </label>
                  <p className="text-lg font-semibold">
                    {dayjs(selectedEntry.startTime).format("DD MMMM YYYY")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tijd
                  </label>
                  <p className="text-lg font-semibold">
                    {dayjs(selectedEntry.startTime).format("HH:mm")} -{" "}
                    {dayjs(selectedEntry.endTime).format("HH:mm")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Pauze
                  </label>
                  <p className="text-lg font-semibold">
                    {selectedEntry.breakMinutes || 0} minuten
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Bedrijf
                  </label>
                  <p className="text-lg font-semibold">
                    {selectedEntry.project?.projectGroup?.company?.name ||
                      "Onbekend"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Project
                  </label>
                  <p className="text-lg font-semibold">
                    {selectedEntry.project?.name || "Onbekend"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Totaal Uren
                  </label>
                  <p className="text-lg font-semibold">
                    {(
                      (dayjs(selectedEntry.endTime).diff(
                        dayjs(selectedEntry.startTime),
                        "minute",
                      ) -
                        (selectedEntry.breakMinutes || 0)) /
                      60
                    ).toFixed(2)}{" "}
                    uur
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(selectedEntry.status)}
                  </div>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Notities
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-slate-900 dark:text-slate-100">
                      {selectedEntry.notes}
                    </p>
                  </div>
                </div>
              )}

              {(selectedEntry.distanceKm || selectedEntry.expenses) && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Aanvullende Kosten
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedEntry.distanceKm && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                        <span className="text-xs text-slate-500">
                          Afstand
                        </span>
                        <p className="font-medium">
                          {selectedEntry.distanceKm} km
                        </p>
                      </div>
                    )}
                    {selectedEntry.expenses && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                        <span className="text-xs text-slate-500">
                          Onkosten
                        </span>
                        <p className="font-medium">
                          €{selectedEntry.expenses.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedEntry.status !== "goedgekeurd" &&
                selectedEntry.status !== "afgekeurd" && (
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsModal(false)}
                    >
                      Sluiten
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReject(selectedEntry.id);
                        setShowDetailsModal(false);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Afkeuren
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        handleApprove(selectedEntry.id);
                        setShowDetailsModal(false);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Goedkeuren
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
