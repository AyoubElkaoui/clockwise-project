"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { getSubmittedWorkflowEntries, reviewWorkflowEntries, WorkflowEntry } from "@/lib/manager-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  Building,
  CheckSquare,
  Square,
  Filter,
  Calendar,
  User,
  ChevronDown,
  MoreHorizontal,
  Download,
  FileText,
  FileSpreadsheet,
  Clock,
  TrendingUp,
  Users,
  BarChart3,
  Eye,
  MessageSquare,
  RefreshCw,
  Zap,
  Briefcase,
  X,
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
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(
    new Set(),
  );
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<
    "none" | "user" | "date" | "status" | "project"
  >("status");
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
      const response = await getSubmittedWorkflowEntries(100426); // Current period ID

      // Adapt workflow entries to match UI expectations
      const adaptedEntries = response.entries.map((entry: any) => {
        // Split employee name into first/last (simple split on first space)
        const nameParts = (entry.employeeName || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Convert datum + aantal (hours) to startTime/endTime for display
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
      showToast("Fout bij laden van uren", "error");
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((e) => e.status === filterStatus);
    }

    // Date range filter
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

    // Search filter
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

    // Active filter (from quick filters)
    if (activeFilter.type && activeFilter.value) {
      switch (activeFilter.type) {
        case "user":
          filtered = filtered.filter(
            (e) =>
              `${e.user?.firstName} ${e.user?.lastName}` === activeFilter.value,
          );
          break;
        case "project":
          filtered = filtered.filter(
            (e) => e.project?.name === activeFilter.value,
          );
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

    // Sort by date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
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
    const pendingEntries = filteredEntries.filter(
      (e) => e.status === "SUBMITTED",
    );
    if (selectedEntries.size === pendingEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(pendingEntries.map((e) => e.id)));
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      [
        "Medewerker",
        "Project",
        "Bedrijf",
        "Datum",
        "Start",
        "Eind",
        "Uren",
        "Pauze",
        "Status",
        "Opmerkingen",
      ].join(","),
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

    // Add headers
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

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6FA" },
    };

    // Add data rows
    filteredEntries.forEach((entry) => {
      const hours = calculateHours(entry);
      worksheet.addRow({
        medewerker:
          `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim(),
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

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create blob and download
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
    // Sort groups by status order (pending first)
    const sortedGrouped: { [key: string]: any[] } = {};
    statusOrder.forEach((status) => {
      if (grouped[status]) {
        sortedGrouped[status] = grouped[status];
      }
    });
    // Add any other statuses
    Object.keys(grouped).forEach((status) => {
      if (!statusOrder.includes(status)) {
        sortedGrouped[status] = grouped[status];
      }
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
    const pendingEntries = filteredEntries.filter(
      (e) => e.status === "SUBMITTED",
    );
    if (pendingEntries.length === 0) {
      showToast("Geen openstaande uren om goed te keuren", "error");
      return;
    }

    setBulkActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/time-entries/bulk-approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryIds: pendingEntries.map((e) => e.id),
          action: "approve",
        }),
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
        body: JSON.stringify({
          entryIds: projectEntries.map((e) => e.id),
          action: "approve",
        }),
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

  const handleBulkApproveByDateRange = async (
    startDate: string,
    endDate: string,
  ) => {
    const dateEntries = filteredEntries.filter((e) => {
      const entryDate = dayjs(e.startTime).format("YYYY-MM-DD");
      return (
        entryDate >= startDate &&
        entryDate <= endDate &&
        e.status === "SUBMITTED"
      );
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
        body: JSON.stringify({
          entryIds: dateEntries.map((e) => e.id),
          action: "approve",
        }),
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

  // Statistics
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
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Goedgekeurd
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            In Behandeling
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Afgekeurd
          </Badge>
        );
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  const pendingCount = entries.filter((e) => e.status === "SUBMITTED").length;
  const selectedCount = selectedEntries.size;
  const canSelectAll =
    filteredEntries.filter((e) => e.status === "SUBMITTED").length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Team Goedkeuringen
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Beheer en keur tijdregistraties van je team goed
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button
            onClick={loadEntries}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Vernieuwen
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Te Behandelen
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.pending}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Wachten op actie
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
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
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.approved}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Deze periode
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
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.rejected}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Vereist aandacht
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Totaal Uren
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.totalHours.toFixed(1)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Alle registraties
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="animate-in slide-in-from-top-2">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoek op naam, project, bedrijf..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm min-w-[140px]"
                  >
                    <option value="SUBMITTED">In behandeling</option>
                    <option value="APPROVED">Goedgekeurd</option>
                    <option value="REJECTED">Afgekeurd</option>
                    <option value="all">Alle statussen</option>
                  </select>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm min-w-[120px]"
                  >
                    <option value="all">Alle data</option>
                    <option value="today">Vandaag</option>
                    <option value="week">Deze week</option>
                    <option value="month">Deze maand</option>
                  </select>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm min-w-[140px]"
                  >
                    <option value="none">Niet groeperen</option>
                    <option value="status">Per status</option>
                    <option value="user">Per medewerker</option>
                    <option value="project">Per project</option>
                    <option value="date">Per datum</option>
                  </select>
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as any)}
                    className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm min-w-[100px]"
                  >
                    <option value="cards">Kaarten</option>
                    <option value="table">Tabel</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {canSelectAll && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={
                    selectedEntries.size ===
                      filteredEntries.filter((e) => e.status === "SUBMITTED")
                        .length && selectedEntries.size > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedEntries.size === 0
                    ? `${filteredEntries.filter((e) => e.status === "SUBMITTED").length} items beschikbaar`
                    : `${selectedEntries.size} van ${filteredEntries.filter((e) => e.status === "SUBMITTED").length} geselecteerd`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedEntries.size > 0 && (
                  <>
                    <Button
                      onClick={() => setShowConfirmApprove(true)}
                      disabled={bulkActionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Goedkeuren ({selectedEntries.size})
                    </Button>
                    <Button
                      onClick={() => setShowConfirmReject(true)}
                      disabled={bulkActionLoading}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Afkeuren ({selectedEntries.size})
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => setShowBulkOptions(!showBulkOptions)}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Snelle Filters
                </Button>
              </div>
            </div>

            {/* Smart Filter Options */}
            {showBulkOptions && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    Snelle Filters
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Klik op een filter om alleen die entries te zien en
                    individueel te beheren
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Filter op Medewerker
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {Array.from(
                        new Set(
                          entries
                            .filter((e) => e.status === "SUBMITTED")
                            .map(
                              (e) => `${e.user?.firstName} ${e.user?.lastName}`,
                            ),
                        ),
                      ).map((userName) => {
                        const user = entries.find(
                          (e) =>
                            `${e.user?.firstName} ${e.user?.lastName}` ===
                            userName,
                        )?.user;
                        const pendingCount = entries.filter(
                          (e) =>
                            e.user?.id === user?.id &&
                            e.status === "SUBMITTED",
                        ).length;
                        const isActive =
                          activeFilter.type === "user" &&
                          activeFilter.value === userName;
                        return (
                          <Button
                            key={user?.id}
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            onClick={() => handleFilterByUser(userName)}
                            disabled={pendingCount === 0}
                            className="w-full justify-start text-xs"
                          >
                            <User className="w-3 h-3 mr-1" />
                            {userName} ({pendingCount})
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Filter op Project
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {Array.from(
                        new Set(
                          entries
                            .filter((e) => e.status === "SUBMITTED")
                            .map((e) => e.project?.name || "Geen project"),
                        ),
                      ).map((projectName) => {
                        const project = entries.find(
                          (e) =>
                            (e.project?.name || "Geen project") === projectName,
                        )?.project;
                        const pendingCount = entries.filter(
                          (e) =>
                            e.project?.id === project?.id &&
                            e.status === "SUBMITTED",
                        ).length;
                        const isActive =
                          activeFilter.type === "project" &&
                          activeFilter.value === projectName;
                        return (
                          <Button
                            key={project?.id || projectName}
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            onClick={() => handleFilterByProject(projectName)}
                            disabled={pendingCount === 0}
                            className="w-full justify-start text-xs"
                          >
                            <Briefcase className="w-3 h-3 mr-1" />
                            {projectName} ({pendingCount})
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Filter op Periode
                    </h4>
                    <div className="space-y-1">
                      <Button
                        size="sm"
                        variant={
                          activeFilter.type === "period" &&
                          activeFilter.value ===
                            `${dayjs().startOf("week").format("YYYY-MM-DD")}|${dayjs().endOf("week").format("YYYY-MM-DD")}`
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          handleFilterByPeriod(
                            dayjs().startOf("week").format("YYYY-MM-DD"),
                            dayjs().endOf("week").format("YYYY-MM-DD"),
                          )
                        }
                        className="w-full justify-start text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Deze week
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          activeFilter.type === "period" &&
                          activeFilter.value ===
                            `${dayjs().startOf("month").format("YYYY-MM-DD")}|${dayjs().endOf("month").format("YYYY-MM-DD")}`
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          handleFilterByPeriod(
                            dayjs().startOf("month").format("YYYY-MM-DD"),
                            dayjs().endOf("month").format("YYYY-MM-DD"),
                          )
                        }
                        className="w-full justify-start text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Deze maand
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          activeFilter.type === "period" &&
                          activeFilter.value ===
                            `${dayjs().subtract(1, "week").startOf("week").format("YYYY-MM-DD")}|${dayjs().subtract(1, "week").endOf("week").format("YYYY-MM-DD")}`
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          handleFilterByPeriod(
                            dayjs()
                              .subtract(1, "week")
                              .startOf("week")
                              .format("YYYY-MM-DD"),
                            dayjs()
                              .subtract(1, "week")
                              .endOf("week")
                              .format("YYYY-MM-DD"),
                          )
                        }
                        className="w-full justify-start text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Vorige week
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Filter Indicator & Actions */}
      {activeFilter.type && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Actief Filter:{" "}
                    {activeFilter.type === "user"
                      ? "Medewerker"
                      : activeFilter.type === "project"
                        ? "Project"
                        : "Periode"}{" "}
                    - {activeFilter.value?.split("|")[0]}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {filteredEntries.length} entries •{" "}
                    {
                      filteredEntries.filter((e) => e.status === "SUBMITTED")
                        .length
                    }{" "}
                    openstaand
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {filteredEntries.filter((e) => e.status === "SUBMITTED")
                  .length > 0 && (
                  <Button
                    onClick={handleBulkApproveFiltered}
                    disabled={bulkActionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Alles Goedkeuren (
                    {
                      filteredEntries.filter((e) => e.status === "SUBMITTED")
                        .length
                    }
                    )
                  </Button>
                )}
                <Button
                  onClick={clearActiveFilter}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Filter Wissen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries Display */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Geen resultaten gevonden
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Probeer andere zoekcriteria of filters aan te passen
            </p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("SUBMITTED");
                setDateRange("all");
                setGroupBy("none");
              }}
              variant="outline"
            >
              Filters wissen
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* Table View */
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <Checkbox
                        checked={
                          selectedEntries.size ===
                            filteredEntries.filter(
                              (e) => e.status === "SUBMITTED",
                            ).length && selectedEntries.size > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      Medewerker
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      Project
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      Datum & Tijd
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      Uren
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      Snelle Acties
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-4 px-4">
                        {entry.status === "SUBMITTED" && (
                          <Checkbox
                            checked={selectedEntries.has(entry.id)}
                            onCheckedChange={() =>
                              toggleEntrySelection(entry.id)
                            }
                          />
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {entry.user?.firstName?.charAt(0)}
                              {entry.user?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.user?.firstName} {entry.user?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.project?.name}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {entry.project?.projectGroup?.company?.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {dayjs(entry.startTime).format("DD MMM YYYY")}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {dayjs(entry.startTime).format("HH:mm")} -{" "}
                            {dayjs(entry.endTime).format("HH:mm")}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {calculateHours(entry).toFixed(2)}u
                        </span>
                        {entry.breakMinutes > 0 && (
                          <p className="text-xs text-slate-500">
                            {entry.breakMinutes}min pauze
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(entry.status)}
                      </td>
                      <td className="py-4 px-4">
                        {entry.status === "SUBMITTED" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleApprove(entry.id)}
                              title="Snel goedkeuren"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 h-7 px-2 text-xs"
                              onClick={() => openRejectModal(entry.id)}
                              title="Afkeuren - Opmerking verplicht"
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : groupBy === "status" ? (
        /* Group by Status - Compact */
        <div className="space-y-4">
          {Object.entries(groupEntriesByStatus(filteredEntries)).map(
            ([status, statusEntries]) => (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getStatusBadge(status)}
                      <span className="capitalize">
                        {status === "SUBMITTED"
                          ? "In Behandeling"
                          : status === "APPROVED"
                            ? "Goedgekeurd"
                            : status === "REJECTED"
                              ? "Afgekeurd"
                              : status}
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {statusEntries.length}
                      </Badge>
                      {status === "SUBMITTED" && statusEntries.length > 0 && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleBulkApproveByDateRange(
                              dayjs().subtract(1, "month").format("YYYY-MM-DD"),
                              dayjs().format("YYYY-MM-DD"),
                            )
                          }
                          disabled={bulkActionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Alles goedkeuren
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {statusEntries.map((entry: any) => (
                      <TimeEntryCard
                        key={entry.id}
                        entry={entry}
                        isSelected={selectedEntries.has(entry.id)}
                        onToggleSelect={() => toggleEntrySelection(entry.id)}
                        onApprove={() => handleApprove(entry.id)}
                        onReject={() => openRejectModal(entry.id)}
                        onClick={() => {
                          setSelectedEntry(entry);
                          setShowDetailsModal(true);
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      ) : groupBy === "project" ? (
        /* Group by Project - Compact */
        <div className="space-y-4">
          {Object.entries(groupEntriesByProject(filteredEntries)).map(
            ([projectName, projectEntries]) => {
              const project = projectEntries[0]?.project;
              const pendingCount = projectEntries.filter(
                (e) => e.status === "SUBMITTED",
              ).length;
              return (
                <Card key={projectName}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Briefcase className="w-4 h-4 text-slate-600" />
                        <span className="truncate">{projectName}</span>
                        {project?.projectGroup?.company && (
                          <span className="text-sm text-slate-500 truncate">
                            - {project.projectGroup.company.name}
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {projectEntries.length}
                        </Badge>
                        {pendingCount > 0 && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleBulkApproveByProject(project?.id)
                            }
                            disabled={bulkActionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Goedkeuren ({pendingCount})
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {projectEntries.map((entry: any) => (
                        <TimeEntryCard
                          key={entry.id}
                          entry={entry}
                          isSelected={selectedEntries.has(entry.id)}
                          onToggleSelect={() => toggleEntrySelection(entry.id)}
                          onApprove={() => handleApprove(entry.id)}
                          onReject={() => openRejectModal(entry.id)}
                          onClick={() => {
                            setSelectedEntry(entry);
                            setShowDetailsModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>
      ) : groupBy === "user" ? (
        /* Group by User - Compact */
        <div className="space-y-4">
          {Object.entries(groupEntriesByUser(filteredEntries)).map(
            ([userName, userEntries]) => (
              <Card key={userName}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-4 h-4 text-slate-600" />
                      {userName}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {userEntries.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {userEntries.map((entry: any) => (
                      <TimeEntryCard
                        key={entry.id}
                        entry={entry}
                        isSelected={selectedEntries.has(entry.id)}
                        onToggleSelect={() => toggleEntrySelection(entry.id)}
                        onApprove={() => handleApprove(entry.id)}
                        onReject={() => openRejectModal(entry.id)}
                        onClick={() => {
                          setSelectedEntry(entry);
                          setShowDetailsModal(true);
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      ) : groupBy === "date" ? (
        /* Group by Date - Compact */
        <div className="space-y-4">
          {Object.entries(groupEntriesByDate(filteredEntries)).map(
            ([date, dateEntries]) => (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      {dayjs(date).format("dddd DD MMMM YYYY")}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {dateEntries.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dateEntries.map((entry: any) => (
                      <TimeEntryCard
                        key={entry.id}
                        entry={entry}
                        isSelected={selectedEntries.has(entry.id)}
                        onToggleSelect={() => toggleEntrySelection(entry.id)}
                        onApprove={() => handleApprove(entry.id)}
                        onReject={() => openRejectModal(entry.id)}
                        onClick={() => {
                          setSelectedEntry(entry);
                          setShowDetailsModal(true);
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      ) : (
        /* Default Card View - Compact Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEntries.map((entry) => (
            <TimeEntryCard
              key={entry.id}
              entry={entry}
              isSelected={selectedEntries.has(entry.id)}
              onToggleSelect={() => toggleEntrySelection(entry.id)}
              onApprove={() => handleApprove(entry.id)}
              onReject={() => openRejectModal(entry.id)}
              onClick={() => {
                setSelectedEntry(entry);
                setShowDetailsModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Bulk Approve */}
      <Dialog open={showConfirmApprove} onOpenChange={setShowConfirmApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bevestig Bulk Goedkeuring</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je {selectedEntries.size} tijdregistratie(s)
              wilt goedkeuren? Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmApprove(false)}
            >
              Annuleren
            </Button>
            <Button
              onClick={() => {
                setShowConfirmApprove(false);
                handleBulkApprove();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Bevestig Goedkeuring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Bulk Reject */}
      <Dialog open={showConfirmReject} onOpenChange={setShowConfirmReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bevestig Bulk Afkeuring</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je {selectedEntries.size} tijdregistratie(s)
              wilt afkeuren? Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmReject(false)}
            >
              Annuleren
            </Button>
            <Button
              onClick={() => {
                setShowConfirmReject(false);
                handleBulkReject();
              }}
              variant="danger"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Bevestig Afkeuring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal with Required Comment */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Afkeuren met Opmerking
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Geef een duidelijke reden waarom deze tijdregistratie wordt
                  afgekeurd.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  Reden voor afkeuring
                  <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Bijvoorbeeld: 'Starttijd klopt niet met project planning' of 'Pauze tijd ontbreekt'"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  rows={4}
                  className="mt-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400 resize-none transition-colors"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deze opmerking is verplicht en helpt de medewerker te
                    verbeteren.
                  </p>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {rejectComment.length}/500
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectComment("");
              }}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              onClick={confirmReject}
              disabled={!rejectComment.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300 disabled:text-red-100"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Afkeuren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      {showDetailsModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Urenregistratie Details
              </h3>
              <button
                className="btn btn-ghost btn-circle"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Medewerker
                  </label>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    {selectedEntry.user?.firstName}{" "}
                    {selectedEntry.user?.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Datum
                  </label>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    {dayjs(selectedEntry.startTime).format("DD MMMM YYYY")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Tijd
                  </label>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    {dayjs(selectedEntry.startTime).format("HH:mm")} -{" "}
                    {dayjs(selectedEntry.endTime).format("HH:mm")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Pauze
                  </label>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    {selectedEntry.breakMinutes || 0} minuten
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Bedrijf
                  </label>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    {selectedEntry.project?.projectGroup?.company?.name ||
                      "Onbekend"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Project
                  </label>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    {selectedEntry.project?.name || "Onbekend"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Totaal uren
                  </label>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    {(() => {
                      const start = dayjs(selectedEntry.startTime);
                      const end = dayjs(selectedEntry.endTime);
                      const diffMin =
                        end.diff(start, "minute") -
                        (selectedEntry.breakMinutes || 0);
                      return diffMin > 0 ? (diffMin / 60).toFixed(2) : "0.00";
                    })()}{" "}
                    uur
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Status
                  </label>
                  <div>{getStatusBadge(selectedEntry.status)}</div>
                </div>
              </div>
            </div>

            {selectedEntry.notes && (
              <div className="mt-6">
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Notities
                </label>
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl mt-2">
                  <p className="text-slate-800 dark:text-slate-200">
                    {selectedEntry.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Additional Info */}
            {(selectedEntry.distanceKm ||
              selectedEntry.travelCosts ||
              selectedEntry.expenses) && (
              <div className="mt-6">
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Aanvullende Kosten
                </label>
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedEntry.distanceKm && (
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Afstand
                      </span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {selectedEntry.distanceKm} km
                      </p>
                    </div>
                  )}
                  {selectedEntry.travelCosts && (
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Reiskosten
                      </span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        €{selectedEntry.travelCosts.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {selectedEntry.expenses && (
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Onkosten
                      </span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        €{selectedEntry.expenses.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedEntry.status !== "APPROVED" &&
              selectedEntry.status !== "REJECTED" && (
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => {
                      openRejectModal(selectedEntry.id);
                      setShowDetailsModal(false);
                    }}
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Afkeuren
                  </Button>
                  <Button
                    onClick={() => {
                      handleApprove(selectedEntry.id);
                      setShowDetailsModal(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Goedkeuren
                  </Button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Time Entry Card Component */
function TimeEntryCard({
  entry,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  onClick,
}: {
  entry: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onClick: () => void;
}) {
  const calculateHours = (entry: any) => {
    if (!entry.startTime || !entry.endTime) return 0;
    const diff = dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute");
    return (diff - (entry.breakMinutes || 0)) / 60;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Goedgekeurd
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            In Behandeling
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Afgekeurd
          </Badge>
        );
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
        isSelected ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          {entry.status === "SUBMITTED" && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 mt-1"
            />
          )}

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white font-semibold text-xs">
            {entry.user?.firstName?.charAt(0)}
            {entry.user?.lastName?.charAt(0)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {entry.user?.firstName} {entry.user?.lastName}
                  </h4>
                  {getStatusBadge(entry.status)}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{entry.project?.name || "Geen project"}</span>
                  <span>•</span>
                  <span>{dayjs(entry.startTime).format("DD MMM")}</span>
                  <span>•</span>
                  <span>
                    {dayjs(entry.startTime).format("HH:mm")}-
                    {dayjs(entry.endTime).format("HH:mm")}
                  </span>
                </div>
              </div>
              <div className="text-right ml-2">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {calculateHours(entry).toFixed(1)}u
                </div>
                {entry.breakMinutes > 0 && (
                  <div className="text-xs text-slate-500">
                    {entry.breakMinutes}min pauze
                  </div>
                )}
              </div>
            </div>

            {/* Compact Project Info */}
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              <span className="font-medium">
                {entry.project?.projectGroup?.company?.name || "Geen bedrijf"}
              </span>
            </div>

            {/* Notes - Compact */}
            {entry.notes && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 mb-2">
                <div className="flex items-start gap-1">
                  <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800 dark:text-blue-200 line-clamp-2">
                    {entry.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions - Compact */}
          {entry.status === "SUBMITTED" && (
            <div className="flex flex-col gap-1 ml-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                title="Snel goedkeuren"
              >
                <CheckCircle className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
                title="Afkeuren - Opmerking verplicht"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
