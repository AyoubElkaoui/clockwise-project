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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Uren Beheer
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Beheer en keur urenregistraties goed
              </p>
            </div>
            <Button onClick={exportEntries} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporteren
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Totaal
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Te Behandelen
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.pending}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Goedgekeurd
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.approved}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Afgekeurd
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.rejected}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600" />
              Filters & Zoeken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Startdatum
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Einddatum
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Gebruiker
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="">Alle gebruikers</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="">Alle projecten</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Zoeken
                </label>
                <div className="relative mt-1">
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
            <Button onClick={resetFilters} variant="outline">
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-slate-600" />
              Urenregistraties ({filteredEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentEntries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Geen registraties gevonden
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Probeer andere filters of voeg nieuwe registraties toe.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Datum
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Gebruiker
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Bedrijf
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Project
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Tijd
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Uren
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody>
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
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="py-3 px-4">
                            {dayjs(entry.startTime).format("DD-MM-YYYY")}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white text-xs font-bold">
                                {userName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)}
                              </div>
                              <span className="font-medium">{userName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{companyName}</td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                            {projectName}
                          </td>
                          <td className="py-3 px-4">
                            {dayjs(entry.startTime).format("HH:mm")} -{" "}
                            {dayjs(entry.endTime).format("HH:mm")}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{hours}u</Badge>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(entry.status)}
                          </td>
                          <td className="py-3 px-4">
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
                                      className="text-red-600 hover:text-red-700"
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
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-600" />
                  Urenregistratie Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Gebruiker
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedEntry.user?.fullName ||
                        `${selectedEntry.user?.firstName || ""} ${selectedEntry.user?.lastName || ""}`.trim() ||
                        "Onbekend"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Datum
                    </label>
                    <p className="text-lg font-semibold">
                      {dayjs(selectedEntry.startTime).format("DD MMMM YYYY")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tijd
                    </label>
                    <p className="text-lg font-semibold">
                      {dayjs(selectedEntry.startTime).format("HH:mm")} -{" "}
                      {dayjs(selectedEntry.endTime).format("HH:mm")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Pauze
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedEntry.breakMinutes || 0} minuten
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Bedrijf
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedEntry.project?.projectGroup?.company?.name ||
                        "Onbekend"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Project
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedEntry.project?.name || "Onbekend"}
                    </p>
                  </div>
                  <div>
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
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Status
                    </label>
                    <div className="mt-1">
                      {getStatusBadge(selectedEntry.status)}
                    </div>
                  </div>
                </div>

                {selectedEntry.notes && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Notities
                    </label>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mt-1">
                      <p className="text-slate-900 dark:text-slate-100">
                        {selectedEntry.notes}
                      </p>
                    </div>
                  </div>
                )}

                {(selectedEntry.distanceKm || selectedEntry.expenses) && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Aanvullende Kosten
                    </label>
                    <div className="grid grid-cols-2 gap-4 mt-1">
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
    </div>
  );
}
