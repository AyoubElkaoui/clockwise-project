"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { showToast } from "@/components/ui/toast";
import {
  getTimeEntries,
  getTimeEntryDetails,
  approveTimeEntry,
  rejectTimeEntry,
} from "@/lib/api";
import {
  Clock,
  Search,
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
  const [selectedEntry, setSelectedEntry] = useState<ExtendedTimeEntry | null>(null);
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

  const stats = useMemo(
    () => ({
      total: entries.length,
      pending: entries.filter((e) => e.status === "ingeleverd").length,
      approved: entries.filter((e) => e.status === "goedgekeurd").length,
      rejected: entries.filter((e) => e.status === "afgekeurd").length,
    }),
    [entries],
  );

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            Goedgekeurd
          </span>
        );
      case "ingeleverd":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            In Behandeling
          </span>
        );
      case "afgekeurd":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Afgekeurd
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            Concept
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Urenregistraties laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Uren Beheer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Beheer en keur urenregistraties goed
          </p>
        </div>
        <button
          onClick={exportEntries}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Exporteren</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">TOTAAL</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">TE BEHANDELEN</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">GOEDGEKEURD</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">AFGEKEURD</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Startdatum
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Einddatum
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Gebruiker
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle gebruikers</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle projecten</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Zoeken
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Naam, project of notities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full pl-9 pr-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <button
          onClick={resetFilters}
          className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
        >
          Reset Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Urenregistraties ({filteredEntries.length})
          </span>
        </div>

        {currentEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              Geen registraties gevonden
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Probeer andere filters of voeg nieuwe registraties toe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Gebruiker
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Bedrijf
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Project
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Tijd
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Uren
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                    entry.project?.projectGroup?.company?.name || "Onbekend";
                  const projectName = entry.project?.name || "Onbekend";

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {dayjs(entry.startTime).format("DD-MM-YYYY")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {userName
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .substring(0, 2)}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {userName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                        {companyName}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 hidden md:table-cell">
                        {projectName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                        {dayjs(entry.startTime).format("HH:mm")} –{" "}
                        {dayjs(entry.endTime).format("HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {hours}u
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(entry.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewDetails(entry.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Details"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          {entry.status !== "goedgekeurd" &&
                            entry.status !== "afgekeurd" && (
                              <>
                                <button
                                  onClick={() => handleApprove(entry.id)}
                                  className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                  title="Goedkeuren"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleReject(entry.id)}
                                  className="p-1.5 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  title="Afkeuren"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
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
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pagina {currentPage} van {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Vorige
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Volgende
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedEntry && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <Info className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Urenregistratie Details
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Gebruiker</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedEntry.user?.fullName ||
                      `${selectedEntry.user?.firstName || ""} ${selectedEntry.user?.lastName || ""}`.trim() ||
                      "Onbekend"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Datum</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {dayjs(selectedEntry.startTime).format("DD MMMM YYYY")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Tijd</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {dayjs(selectedEntry.startTime).format("HH:mm")} –{" "}
                    {dayjs(selectedEntry.endTime).format("HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Pauze</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedEntry.breakMinutes || 0} minuten
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Bedrijf</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedEntry.project?.projectGroup?.company?.name || "Onbekend"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Project</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedEntry.project?.name || "Onbekend"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Totaal Uren</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
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
                  <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedEntry.status)}</div>
                </div>
              </div>

              {selectedEntry.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Notities</p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedEntry.notes}
                    </p>
                  </div>
                </div>
              )}

              {(selectedEntry.distanceKm || selectedEntry.expenses) && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Aanvullende Kosten</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedEntry.distanceKm && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Afstand</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {selectedEntry.distanceKm} km
                        </p>
                      </div>
                    )}
                    {selectedEntry.expenses && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Onkosten</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          €{selectedEntry.expenses.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedEntry.status !== "goedgekeurd" &&
                selectedEntry.status !== "afgekeurd" && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Sluiten
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedEntry.id);
                        setShowDetailsModal(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Afkeuren
                    </button>
                    <button
                      onClick={() => {
                        handleApprove(selectedEntry.id);
                        setShowDetailsModal(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Goedkeuren
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
