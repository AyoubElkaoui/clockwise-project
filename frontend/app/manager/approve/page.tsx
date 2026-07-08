"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { getSubmittedWorkflowEntries, reviewWorkflowEntries, WorkflowEntry, getCurrentPeriodId } from "@/lib/manager-api";
import {
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  Calendar,
  User,
  Filter,
  FileText,
  FileSpreadsheet,
  Clock,
  RefreshCw,
  Briefcase,
  X,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import ExcelJS from "exceljs";

dayjs.extend(relativeTime);
dayjs.locale("nl");

export default function ManagerApprovePage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WorkflowEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WorkflowEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("SUBMITTED");
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "user" | "date" | "status" | "project">("status");
  const [dateRange, setDateRange] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showFilters, setShowFilters] = useState(false);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [showConfirmReject, setShowConfirmReject] = useState(false);
  const [showBulkOptions, setShowBulkOptions] = useState(true);
  const [activeFilter, setActiveFilter] = useState<{
    type: "user" | "project" | "period" | null;
    value: string | null;
  }>({ type: null, value: null });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectEntryId, setRejectEntryId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, searchQuery, filterStatus, dateRange, groupBy, activeFilter]);

  const loadEntries = async () => {
    try {
      console.log("=== loadEntries (approve page) START ===");
      setLoading(true);
      const currentPeriodId = await getCurrentPeriodId();
      console.log("Current period ID:", currentPeriodId);

      console.log("Calling getSubmittedWorkflowEntries...");
      const response = await getSubmittedWorkflowEntries(currentPeriodId);
      console.log("Response:", response);
      console.log("Entries count:", response.entries?.length);

      const adaptedEntries = response.entries.map((entry: any) => {
        const nameParts = (entry.employeeName || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const date = new Date(entry.datum);
        const startTime = date;
        const endTime = new Date(date.getTime() + entry.aantal * 60 * 60 * 1000);

        return {
          ...entry,
          user: {
            id: entry.medewGcId,
            firstName,
            lastName,
          },
          project: {
            id: entry.werkGcId,
            name: entry.werkCode || entry.taakCode || "Geen project",
          },
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          breakMinutes: 0,
          notes: entry.omschrijving,
        };
      });

      setEntries(adaptedEntries);
      setSelectedEntries(new Set());
    } catch (error) {
      console.error("=== loadEntries ERROR ===", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      showToast("Fout bij laden van uren", "error");
    } finally {
      setLoading(false);
      console.log("=== loadEntries END ===");
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    if (filterStatus !== "all") {
      filtered = filtered.filter((e) => e.status === filterStatus);
    }

    if (dateRange !== "all") {
      const now = dayjs();
      let startDate: dayjs.Dayjs;
      switch (dateRange) {
        case "today":
          startDate = now.startOf("day");
          break;
        case "week":
          startDate = now.startOf("isoWeek");
          break;
        case "month":
          startDate = now.startOf("month");
          break;
        default:
          startDate = now.subtract(1, "year");
      }
      filtered = filtered.filter((e) => dayjs(e.startTime).isAfter(startDate));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.user?.firstName?.toLowerCase().includes(query) ||
          e.user?.lastName?.toLowerCase().includes(query) ||
          e.project?.name?.toLowerCase().includes(query) ||
          e.project?.projectGroup?.company?.name?.toLowerCase().includes(query),
      );
    }

    if (activeFilter.type && activeFilter.value) {
      switch (activeFilter.type) {
        case "user":
          filtered = filtered.filter(
            (e) => `${e.user?.firstName} ${e.user?.lastName}` === activeFilter.value,
          );
          break;
        case "project":
          filtered = filtered.filter((e) => e.project?.name === activeFilter.value);
          break;
        case "period":
          const [startDate, endDate] = activeFilter.value.split("|");
          filtered = filtered.filter((e) => {
            const entryDate = dayjs(e.startTime).format("YYYY-MM-DD");
            return entryDate >= startDate && entryDate <= endDate;
          });
          break;
      }
    }

    filtered.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    setFilteredEntries(filtered);
  };

  const handleApprove = async (id: number) => {
    try {
      const result = await reviewWorkflowEntries([id], true);
      if (result.success) {
        showToast("Uren goedgekeurd!", "success");
        loadEntries();
      } else {
        showToast(result.message || "Goedkeuren mislukt", "error");
      }
    } catch (error) {
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (id: number, comment: string) => {
    try {
      const result = await reviewWorkflowEntries([id], false, comment);
      if (result.success) {
        showToast("Uren afgekeurd!", "success");
        loadEntries();
      } else {
        showToast(result.message || "Afkeuren mislukt", "error");
      }
    } catch (error) {
      showToast("Fout bij afkeuren", "error");
    }
  };

  const openRejectModal = (entryId: number) => {
    setRejectEntryId(entryId);
    setRejectComment("");
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (!rejectComment.trim()) {
      showToast("Voeg een opmerking toe waarom je dit afkeurt", "error");
      return;
    }
    if (rejectEntryId) {
      handleReject(rejectEntryId, rejectComment);
      setShowRejectModal(false);
      setRejectEntryId(null);
      setRejectComment("");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.size === 0) {
      showToast("Selecteer eerst uren om goed te keuren", "error");
      return;
    }
    setBulkActionLoading(true);
    try {
      const result = await reviewWorkflowEntries(Array.from(selectedEntries), true);
      if (result.success) {
        showToast(result.message || `${result.processedCount} uren goedgekeurd`, "success");
      } else {
        showToast(result.message || "Fout bij bulk goedkeuren", "error");
      }
    } catch (error) {
      showToast("Er is een fout opgetreden bij het goedkeuren", "error");
    }
    setBulkActionLoading(false);
    setSelectedEntries(new Set());
    loadEntries();
  };

  const handleBulkReject = async () => {
    if (selectedEntries.size === 0) {
      showToast("Selecteer eerst uren om af te keuren", "error");
      return;
    }
    setBulkActionLoading(true);
    try {
      const result = await reviewWorkflowEntries(Array.from(selectedEntries), false, "Bulk afkeuring");
      if (result.success) {
        showToast(result.message || `${result.processedCount} uren afgekeurd`, "success");
      } else {
        showToast(result.message || "Fout bij bulk afkeuren", "error");
      }
    } catch (error) {
      showToast("Er is een fout opgetreden bij het afkeuren", "error");
    }
    setBulkActionLoading(false);
    setSelectedEntries(new Set());
    loadEntries();
  };

  const toggleEntrySelection = (entryId: number) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const toggleSelectAll = () => {
    const pendingEntries = filteredEntries.filter((e) => e.status === "SUBMITTED");
    if (selectedEntries.size === pendingEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(pendingEntries.map((e) => e.id)));
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Medewerker", "Project", "Bedrijf", "Datum", "Start", "Eind", "Uren", "Pauze", "Status", "Opmerkingen"].join(","),
      ...filteredEntries.map((entry) =>
        [
          `"${entry.user?.firstName} ${entry.user?.lastName}"`,
          `"${entry.project?.name || ""}"`,
          `"${entry.project?.projectGroup?.company?.name || ""}"`,
          dayjs(entry.startTime).format("DD-MM-YYYY"),
          dayjs(entry.startTime).format("HH:mm"),
          dayjs(entry.endTime).format("HH:mm"),
          calculateHours(entry).toFixed(2),
          entry.breakMinutes || 0,
          entry.status,
          `"${entry.notes || ""}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uren-goedkeuring-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV export gedownload", "success");
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Team Goedkeuringen");
    worksheet.columns = [
      { header: "Medewerker", key: "medewerker", width: 20 },
      { header: "Project", key: "project", width: 25 },
      { header: "Bedrijf", key: "bedrijf", width: 20 },
      { header: "Datum", key: "datum", width: 12 },
      { header: "Start", key: "start", width: 10 },
      { header: "Eind", key: "eind", width: 10 },
      { header: "Uren", key: "uren", width: 8 },
      { header: "Pauze", key: "pauze", width: 8 },
      { header: "Status", key: "status", width: 15 },
      { header: "Opmerkingen", key: "opmerkingen", width: 30 },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6E6FA" } };
    filteredEntries.forEach((entry) => {
      const hours = calculateHours(entry);
      worksheet.addRow({
        medewerker: `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim(),
        project: entry.project?.name || "",
        bedrijf: entry.project?.projectGroup?.company?.name || "",
        datum: dayjs(entry.startTime).format("DD-MM-YYYY"),
        start: dayjs(entry.startTime).format("HH:mm"),
        eind: dayjs(entry.endTime).format("HH:mm"),
        uren: hours.toFixed(2),
        pauze: entry.breakMinutes || 0,
        status:
          entry.status === "APPROVED"
            ? "Goedgekeurd"
            : entry.status === "SUBMITTED"
              ? "In behandeling"
              : entry.status === "REJECTED"
                ? "Afgekeurd"
                : entry.status,
        opmerkingen: entry.notes || "",
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-goedkeuringen-${dayjs().format("YYYY-MM-DD")}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Excel export gedownload", "success");
  };

  const groupEntriesByUser = (entries: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    entries.forEach((entry) => {
      const userKey = `${entry.user?.firstName} ${entry.user?.lastName}`;
      if (!grouped[userKey]) grouped[userKey] = [];
      grouped[userKey].push(entry);
    });
    return grouped;
  };

  const groupEntriesByDate = (entries: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    entries.forEach((entry) => {
      const dateKey = dayjs(entry.startTime).format("YYYY-MM-DD");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(entry);
    });
    return grouped;
  };

  const groupEntriesByStatus = (entries: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    const statusOrder = ["SUBMITTED", "APPROVED", "REJECTED"];
    entries.forEach((entry) => {
      const statusKey = entry.status;
      if (!grouped[statusKey]) grouped[statusKey] = [];
      grouped[statusKey].push(entry);
    });
    const sortedGrouped: { [key: string]: any[] } = {};
    statusOrder.forEach((status) => {
      if (grouped[status]) sortedGrouped[status] = grouped[status];
    });
    Object.keys(grouped).forEach((status) => {
      if (!statusOrder.includes(status)) sortedGrouped[status] = grouped[status];
    });
    return sortedGrouped;
  };

  const groupEntriesByProject = (entries: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    entries.forEach((entry) => {
      const projectKey = entry.project?.name || "Geen project";
      if (!grouped[projectKey]) grouped[projectKey] = [];
      grouped[projectKey].push(entry);
    });
    return grouped;
  };

  const handleFilterByUser = (userName: string) => {
    setActiveFilter({ type: "user", value: userName });
    setShowBulkOptions(false);
  };

  const handleFilterByProject = (projectName: string) => {
    setActiveFilter({ type: "project", value: projectName });
    setShowBulkOptions(false);
  };

  const handleFilterByPeriod = (startDate: string, endDate: string) => {
    setActiveFilter({ type: "period", value: `${startDate}|${endDate}` });
    setShowBulkOptions(false);
  };

  const clearActiveFilter = () => {
    setActiveFilter({ type: null, value: null });
  };

  const handleBulkApproveFiltered = async () => {
    const pendingEntries = filteredEntries.filter((e) => e.status === "SUBMITTED");
    if (pendingEntries.length === 0) {
      showToast("Geen openstaande uren om goed te keuren", "error");
      return;
    }
    setBulkActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/time-entries/bulk-approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: pendingEntries.map((e) => e.id), action: "approve" }),
      });
      if (res.ok) {
        const result = await res.json();
        showToast(result.message, "success");
      } else {
        const error = await res.text();
        showToast(`Fout bij bulk goedkeuren: ${error}`, "error");
      }
    } catch (error) {
      showToast("Er is een fout opgetreden bij het goedkeuren", "error");
    }
    setBulkActionLoading(false);
    loadEntries();
  };

  const handleBulkApproveByProject = async (projectId: number) => {
    const projectEntries = filteredEntries.filter(
      (e) => e.project?.id === projectId && e.status === "SUBMITTED",
    );
    if (projectEntries.length === 0) {
      showToast("Geen openstaande uren voor dit project", "error");
      return;
    }
    setBulkActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/time-entries/bulk-approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: projectEntries.map((e) => e.id), action: "approve" }),
      });
      if (res.ok) {
        const result = await res.json();
        showToast(result.message, "success");
      } else {
        const error = await res.text();
        showToast(`Fout bij bulk goedkeuren: ${error}`, "error");
      }
    } catch (error) {
      showToast("Er is een fout opgetreden bij het goedkeuren", "error");
    }
    setBulkActionLoading(false);
    loadEntries();
  };

  const handleBulkApproveByDateRange = async (startDate: string, endDate: string) => {
    const dateEntries = filteredEntries.filter((e) => {
      const entryDate = dayjs(e.startTime).format("YYYY-MM-DD");
      return entryDate >= startDate && entryDate <= endDate && e.status === "SUBMITTED";
    });
    if (dateEntries.length === 0) {
      showToast("Geen openstaande uren in deze periode", "error");
      return;
    }
    setBulkActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/time-entries/bulk-approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: dateEntries.map((e) => e.id), action: "approve" }),
      });
      if (res.ok) {
        const result = await res.json();
        showToast(result.message, "success");
      } else {
        const error = await res.text();
        showToast(`Fout bij bulk goedkeuren: ${error}`, "error");
      }
    } catch (error) {
      showToast("Er is een fout opgetreden bij het goedkeuren", "error");
    }
    setBulkActionLoading(false);
    loadEntries();
  };

  const calculateHours = (entry: any) => {
    if (!entry.startTime || !entry.endTime) return 0;
    const diff = dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute");
    return (diff - (entry.breakMinutes || 0)) / 60;
  };

  const stats = useMemo(() => {
    const pending = entries.filter((e) => e.status === "SUBMITTED").length;
    const approved = entries.filter((e) => e.status === "APPROVED").length;
    const rejected = entries.filter((e) => e.status === "REJECTED").length;
    const totalHours = entries.reduce((sum, e) => sum + calculateHours(e), 0);
    return { pending, approved, rejected, totalHours };
  }, [entries]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            Goedgekeurd
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            In Behandeling
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Afgekeurd
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
            Concept
          </span>
        );
    }
  };

  const pendingCount = entries.filter((e) => e.status === "SUBMITTED").length;
  const canSelectAll = filteredEntries.filter((e) => e.status === "SUBMITTED").length > 0;
  const selectStyle = "px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Team Goedkeuringen</h1>
          <p className="text-xs text-slate-500 mt-0.5">Beheer en keur tijdregistraties van je team goed</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={loadEntries}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Vernieuwen
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Te Behandelen</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.pending}</p>
          <p className="text-xs text-slate-500 mt-1">Wachten op actie</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Goedgekeurd</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved}</p>
          <p className="text-xs text-slate-500 mt-1">Deze periode</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Afgekeurd</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.rejected}</p>
          <p className="text-xs text-slate-500 mt-1">Vereist aandacht</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Totaal Uren</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.totalHours.toFixed(1)}</p>
          <p className="text-xs text-slate-500 mt-1">Alle registraties</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Zoek op naam, project, bedrijf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectStyle}>
            <option value="SUBMITTED">In behandeling</option>
            <option value="APPROVED">Goedgekeurd</option>
            <option value="REJECTED">Afgekeurd</option>
            <option value="all">Alle statussen</option>
          </select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectStyle}>
            <option value="all">Alle data</option>
            <option value="today">Vandaag</option>
            <option value="week">Deze week</option>
            <option value="month">Deze maand</option>
          </select>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className={selectStyle}>
            <option value="none">Niet groeperen</option>
            <option value="status">Per status</option>
            <option value="user">Per medewerker</option>
            <option value="project">Per project</option>
            <option value="date">Per datum</option>
          </select>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className={selectStyle}>
            <option value="cards">Kaarten</option>
            <option value="table">Tabel</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Filter className="w-3.5 h-3.5" />
            Snelle filters
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Quick filter panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                  <User className="w-3.5 h-3.5" />
                  Filter op medewerker
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Array.from(
                    new Set(
                      entries.filter((e) => e.status === "SUBMITTED").map((e) => `${e.user?.firstName} ${e.user?.lastName}`),
                    ),
                  ).map((userName) => {
                    const user = entries.find((e) => `${e.user?.firstName} ${e.user?.lastName}` === userName)?.user;
                    const cnt = entries.filter((e) => e.user?.id === user?.id && e.status === "SUBMITTED").length;
                    const isActive = activeFilter.type === "user" && activeFilter.value === userName;
                    return (
                      <button
                        key={user?.id}
                        onClick={() => handleFilterByUser(userName)}
                        disabled={cnt === 0}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"} disabled:opacity-40`}
                      >
                        {userName} ({cnt})
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  Filter op project
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Array.from(
                    new Set(entries.filter((e) => e.status === "SUBMITTED").map((e) => e.project?.name || "Geen project")),
                  ).map((projectName) => {
                    const project = entries.find((e) => (e.project?.name || "Geen project") === projectName)?.project;
                    const cnt = entries.filter((e) => e.project?.id === project?.id && e.status === "SUBMITTED").length;
                    const isActive = activeFilter.type === "project" && activeFilter.value === projectName;
                    return (
                      <button
                        key={project?.id || projectName}
                        onClick={() => handleFilterByProject(projectName)}
                        disabled={cnt === 0}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"} disabled:opacity-40`}
                      >
                        {projectName} ({cnt})
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Filter op periode
                </p>
                <div className="space-y-1">
                  {[
                    { label: "Deze week", start: dayjs().startOf("week").format("YYYY-MM-DD"), end: dayjs().endOf("week").format("YYYY-MM-DD") },
                    { label: "Deze maand", start: dayjs().startOf("month").format("YYYY-MM-DD"), end: dayjs().endOf("month").format("YYYY-MM-DD") },
                    { label: "Vorige week", start: dayjs().subtract(1, "week").startOf("week").format("YYYY-MM-DD"), end: dayjs().subtract(1, "week").endOf("week").format("YYYY-MM-DD") },
                  ].map((period) => {
                    const isActive = activeFilter.type === "period" && activeFilter.value === `${period.start}|${period.end}`;
                    return (
                      <button
                        key={period.label}
                        onClick={() => handleFilterByPeriod(period.start, period.end)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
                      >
                        {period.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {canSelectAll && (
        <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedEntries.size === filteredEntries.filter((e) => e.status === "SUBMITTED").length && selectedEntries.size > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {selectedEntries.size === 0
                  ? `${filteredEntries.filter((e) => e.status === "SUBMITTED").length} items beschikbaar`
                  : `${selectedEntries.size} van ${filteredEntries.filter((e) => e.status === "SUBMITTED").length} geselecteerd`}
              </span>
            </div>
            {selectedEntries.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmApprove(true)}
                  disabled={bulkActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Goedkeuren ({selectedEntries.size})
                </button>
                <button
                  onClick={() => setShowConfirmReject(true)}
                  disabled={bulkActionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Afkeuren ({selectedEntries.size})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active filter banner */}
      {activeFilter.type && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Actief filter: {activeFilter.type === "user" ? "Medewerker" : activeFilter.type === "project" ? "Project" : "Periode"} — {activeFilter.value?.split("|")[0]}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {filteredEntries.length} entries &bull; {filteredEntries.filter((e) => e.status === "SUBMITTED").length} openstaand
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {filteredEntries.filter((e) => e.status === "SUBMITTED").length > 0 && (
              <button
                onClick={handleBulkApproveFiltered}
                disabled={bulkActionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Alles goedkeuren ({filteredEntries.filter((e) => e.status === "SUBMITTED").length})
              </button>
            )}
            <button
              onClick={clearActiveFilter}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800/30"
            >
              <X className="w-3.5 h-3.5" />
              Filter wissen
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen resultaten gevonden</p>
          <p className="text-xs text-slate-500 mt-1">Probeer andere zoekcriteria of filters</p>
          <button
            onClick={() => { setSearchQuery(""); setFilterStatus("SUBMITTED"); setDateRange("all"); setGroupBy("none"); }}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Filters wissen
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* Table view */
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedEntries.size === filteredEntries.filter((e) => e.status === "SUBMITTED").length && selectedEntries.size > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Medewerker</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uren</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => { setSelectedEntry(entry); setShowDetailsModal(true); }}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {entry.status === "SUBMITTED" && (
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={() => toggleEntrySelection(entry.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400">
                        {entry.user?.firstName?.charAt(0)}{entry.user?.lastName?.charAt(0)}
                      </div>
                      <span className="font-medium">{entry.user?.firstName} {entry.user?.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    <p className="font-medium">{entry.project?.name}</p>
                    <p className="text-xs text-slate-500">{entry.project?.projectGroup?.company?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    <p className="font-medium">{dayjs(entry.startTime).format("DD MMM YYYY")}</p>
                    <p className="text-xs text-slate-500">{dayjs(entry.startTime).format("HH:mm")} – {dayjs(entry.endTime).format("HH:mm")}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{calculateHours(entry).toFixed(2)}u</span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {entry.status === "SUBMITTED" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleApprove(entry.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openRejectModal(entry.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : groupBy === "user" || groupBy === "none" ? (
        /* Grouped by user (default readable layout) */
        <div className="space-y-4">
          {Object.entries(groupEntriesByUser(filteredEntries)).map(([userName, userEntries]) => {
            const pendingInGroup = userEntries.filter((e) => e.status === "SUBMITTED").length;
            return (
              <div key={userName} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400">
                      {userName.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userName}</span>
                    <span className="text-xs text-slate-500">({userEntries.length})</span>
                  </div>
                  {pendingInGroup > 0 && (
                    <button
                      onClick={() => {
                        const user = userEntries[0]?.user;
                        const ids = userEntries.filter((e) => e.status === "SUBMITTED").map((e) => e.id);
                        reviewWorkflowEntries(ids, true).then((r) => {
                          if (r.success) { showToast(`${ids.length} uren goedgekeurd`, "success"); loadEntries(); }
                          else showToast(r.message || "Fout", "error");
                        });
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Alles goedkeuren ({pendingInGroup})
                    </button>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uren</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEntries.map((entry: any) => (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => { setSelectedEntry(entry); setShowDetailsModal(true); }}
                      >
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {dayjs(entry.startTime).format("DD MMM YYYY")}
                          <span className="text-xs text-slate-400 ml-2">{dayjs(entry.startTime).format("HH:mm")}–{dayjs(entry.endTime).format("HH:mm")}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{entry.project?.name || "Geen project"}</span>
                          {entry.notes && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-blue-500">
                              <MessageSquare className="w-3 h-3" />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                          {calculateHours(entry).toFixed(1)}u
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {entry.status === "SUBMITTED" && (
                            <div className="flex gap-1.5">
                              <button onClick={() => handleApprove(entry.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                                Goedkeuren
                              </button>
                              <button onClick={() => openRejectModal(entry.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                                Afkeuren
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : groupBy === "status" ? (
        /* Grouped by status */
        <div className="space-y-4">
          {Object.entries(groupEntriesByStatus(filteredEntries)).map(([status, statusEntries]) => (
            <div key={status} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(status)}
                  <span className="text-xs text-slate-500 ml-1">({statusEntries.length})</span>
                </div>
                {status === "SUBMITTED" && statusEntries.length > 0 && (
                  <button
                    onClick={() => handleBulkApproveByDateRange(dayjs().subtract(1, "month").format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD"))}
                    disabled={bulkActionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Alles goedkeuren
                  </button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Medewerker</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uren</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {(statusEntries as any[]).map((entry: any) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => { setSelectedEntry(entry); setShowDetailsModal(true); }}
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400">
                            {entry.user?.firstName?.charAt(0)}
                          </div>
                          <span className="font-medium">{entry.user?.firstName} {entry.user?.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{dayjs(entry.startTime).format("DD MMM YYYY")}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.project?.name || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{calculateHours(entry).toFixed(1)}u</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {entry.status === "SUBMITTED" && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleApprove(entry.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                              Goedkeuren
                            </button>
                            <button onClick={() => openRejectModal(entry.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                              Afkeuren
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : groupBy === "project" ? (
        /* Grouped by project */
        <div className="space-y-4">
          {Object.entries(groupEntriesByProject(filteredEntries)).map(([projectName, projectEntries]) => {
            const project = (projectEntries as any[])[0]?.project;
            const pendingInGroup = (projectEntries as any[]).filter((e) => e.status === "SUBMITTED").length;
            return (
              <div key={projectName} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{projectName}</span>
                    <span className="text-xs text-slate-500">({(projectEntries as any[]).length})</span>
                  </div>
                  {pendingInGroup > 0 && (
                    <button
                      onClick={() => handleBulkApproveByProject(project?.id)}
                      disabled={bulkActionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Goedkeuren ({pendingInGroup})
                    </button>
                  )}
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {(projectEntries as any[]).map((entry: any) => (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => { setSelectedEntry(entry); setShowDetailsModal(true); }}
                      >
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                          {entry.user?.firstName} {entry.user?.lastName}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{dayjs(entry.startTime).format("DD MMM YYYY")}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{calculateHours(entry).toFixed(1)}u</td>
                        <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {entry.status === "SUBMITTED" && (
                            <div className="flex gap-1.5">
                              <button onClick={() => handleApprove(entry.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                                Goedkeuren
                              </button>
                              <button onClick={() => openRejectModal(entry.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                                Afkeuren
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grouped by date */
        <div className="space-y-4">
          {Object.entries(groupEntriesByDate(filteredEntries)).map(([date, dateEntries]) => (
            <div key={date} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{dayjs(date).format("dddd DD MMMM YYYY")}</span>
                <span className="text-xs text-slate-500">({(dateEntries as any[]).length})</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {(dateEntries as any[]).map((entry: any) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => { setSelectedEntry(entry); setShowDetailsModal(true); }}
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {entry.user?.firstName} {entry.user?.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.project?.name || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{calculateHours(entry).toFixed(1)}u</td>
                      <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {entry.status === "SUBMITTED" && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleApprove(entry.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                              Goedkeuren
                            </button>
                            <button onClick={() => openRejectModal(entry.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium rounded-md">
                              Afkeuren
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Confirm bulk approve modal */}
      {showConfirmApprove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Bevestig Bulk Goedkeuring</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Weet je zeker dat je {selectedEntries.size} tijdregistratie(s) wilt goedkeuren? Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmApprove(false)} className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                Annuleren
              </button>
              <button
                onClick={() => { setShowConfirmApprove(false); handleBulkApprove(); }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Bevestig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm bulk reject modal */}
      {showConfirmReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">Bevestig Bulk Afkeuring</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Weet je zeker dat je {selectedEntries.size} tijdregistratie(s) wilt afkeuren? Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmReject(false)} className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                Annuleren
              </button>
              <button
                onClick={() => { setShowConfirmReject(false); handleBulkReject(); }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Bevestig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Afkeuren met opmerking</h3>
                <p className="text-xs text-slate-500 mt-0.5">Geef een duidelijke reden voor de afkeuring.</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reden voor afkeuring <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
                placeholder="Bijv: 'Starttijd klopt niet met project planning'"
                className="w-full mt-1.5 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500">Verplicht veld — helpt de medewerker.</p>
                <span className="text-xs text-slate-400">{rejectComment.length}/500</span>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setShowRejectModal(false); setRejectComment(""); }}
                className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Annuleren
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectComment.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Afkeuren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      {showDetailsModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Urenregistratie Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {[
                  { label: "Medewerker", value: `${selectedEntry.user?.firstName} ${selectedEntry.user?.lastName}` },
                  { label: "Datum", value: dayjs(selectedEntry.startTime).format("DD MMMM YYYY") },
                  { label: "Tijd", value: `${dayjs(selectedEntry.startTime).format("HH:mm")} – ${dayjs(selectedEntry.endTime).format("HH:mm")}` },
                  { label: "Pauze", value: `${selectedEntry.breakMinutes || 0} minuten` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedrijf</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{selectedEntry.project?.projectGroup?.company?.name || "Onbekend"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{selectedEntry.project?.name || "Onbekend"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Totaal uren</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {(() => {
                      const diff = dayjs(selectedEntry.endTime).diff(dayjs(selectedEntry.startTime), "minute") - (selectedEntry.breakMinutes || 0);
                      return diff > 0 ? (diff / 60).toFixed(2) : "0.00";
                    })()} uur
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</p>
                  <div className="mt-0.5">{getStatusBadge(selectedEntry.status)}</div>
                </div>
              </div>
            </div>
            {selectedEntry.notes && (
              <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notities</p>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{selectedEntry.notes}</p>
                </div>
              </div>
            )}
            {(selectedEntry.distanceKm || selectedEntry.travelCosts || selectedEntry.expenses) && (
              <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Aanvullende kosten</p>
                <div className="grid grid-cols-3 gap-4">
                  {selectedEntry.distanceKm && (
                    <div>
                      <p className="text-xs text-slate-500">Afstand</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{selectedEntry.distanceKm} km</p>
                    </div>
                  )}
                  {selectedEntry.travelCosts && (
                    <div>
                      <p className="text-xs text-slate-500">Reiskosten</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">€{selectedEntry.travelCosts.toFixed(2)}</p>
                    </div>
                  )}
                  {selectedEntry.expenses && (
                    <div>
                      <p className="text-xs text-slate-500">Onkosten</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">€{selectedEntry.expenses.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedEntry.status !== "APPROVED" && selectedEntry.status !== "REJECTED" && (
              <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => { openRejectModal(selectedEntry.id); setShowDetailsModal(false); }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Afkeuren
                </button>
                <button
                  onClick={() => { handleApprove(selectedEntry.id); setShowDetailsModal(false); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Goedkeuren
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
