"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getAllUsers, getWorkflowEntriesByRange } from "@/lib/manager-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import authUtils from "@/lib/auth-utils";
import {
  Clock,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building,
  FileSpreadsheet,
  FileText,
  Table,
  List,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "dayjs/locale/nl";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale("nl");

export default function ManagerTeamHoursPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [currentPeriod, setCurrentPeriod] = useState(
    dayjs().startOf("isoWeek"),
  );
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [entriesViewMode, setEntriesViewMode] = useState<"cards" | "table">(
    "table",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId) {
      setSelectedUser(userId);
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod, viewMode]);

  const loadData = async () => {
    try {
      const managerId = authUtils.getUserId();
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const from = currentPeriod.format("YYYY-MM-DD");
      const to = (viewMode === "week" ? currentPeriod.add(6, "day") : currentPeriod.endOf("month")).format("YYYY-MM-DD");
      const [users, workflowResponse] = await Promise.all([
        getAllUsers(),
        getWorkflowEntriesByRange(from, to), // alle statussen in het gekozen bereik
      ]);

      // Alle actieve medewerkers (geen admins); de manager ziet het hele team
      const team = users.filter((u: any) => u.isActive !== false && u.role !== "admin");
      setTeamMembers(team);
      
      // Convert workflow entries to format expected by UI
      // Note: workflow uses 'aantal' (hours) directly, but UI expects startTime/endTime
      // We create synthetic start/end times based on the date and hours
      const allEntries = workflowResponse.entries.map((e: any) => {
        const date = dayjs(e.datum);
        const startTime = date.hour(8).minute(0).second(0); // Start at 8:00
        const endTime = startTime.add(e.aantal, 'hour'); // Add aantal hours
        
        return {
          userId: e.medewGcId,
          date: e.datum,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          hours: e.aantal,
          breakMinutes: 0,
          projectId: e.werkGcId,
          projectCode: e.werkCode,
          projectName: e.werkDescription,
          status: e.status,
          notes: e.omschrijving,
          userFirstName: e.employeeName?.split(' ')[0] || '',
          userLastName: e.employeeName?.split(' ').slice(1).join(' ') || '',
          project: {
            name: e.werkDescription || e.werkCode,
            code: e.werkCode
          },
          user: {
            firstName: e.employeeName?.split(' ')[0] || '',
            lastName: e.employeeName?.split(' ').slice(1).join(' ') || ''
          }
        };
      });
      
      setEntries(allEntries);
    } catch (error) {
      showToast("Fout bij laden uren", "error");
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
      filtered = filtered.filter((entry) => {
        const entryDate = dayjs(entry.date);
        return entryDate.isBetween(weekStart, weekEnd, null, "[]");
      });
    } else {
      const monthStart = currentPeriod.startOf("month");
      const monthEnd = currentPeriod.endOf("month");
      filtered = filtered.filter((entry) => {
        const entryDate = dayjs(entry.date);
        return entryDate.isBetween(monthStart, monthEnd, null, "[]");
      });
    }

    // User filter
    if (selectedUser !== "all") {
      filtered = filtered.filter(
        (entry) => entry.userId === Number(selectedUser),
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.user?.firstName?.toLowerCase().includes(query) ||
          entry.user?.lastName?.toLowerCase().includes(query) ||
          entry.project?.name?.toLowerCase().includes(query),
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
  }, [entries, currentPeriod, viewMode, selectedUser, searchQuery]);

  const analytics = useMemo(() => {
    // Current period stats
    const total = filteredEntries.reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0);

    const approved = filteredEntries
      .filter((e) => e.status === "APPROVED")
      .reduce((sum, e) => {
        const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
        return sum + (diff - (e.breakMinutes || 0)) / 60;
      }, 0);

    const pending = filteredEntries
      .filter((e) => e.status === "SUBMITTED")
      .reduce((sum, e) => {
        const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
        return sum + (diff - (e.breakMinutes || 0)) / 60;
      }, 0);

    // Previous period comparison
    const prevPeriod = currentPeriod.subtract(
      1,
      viewMode === "week" ? "week" : "month",
    );
    const prevEntries = entries.filter((entry) => {
      const entryDate = dayjs(entry.startTime);
      if (viewMode === "week") {
        const weekStart = prevPeriod.startOf("isoWeek");
        const weekEnd = prevPeriod.endOf("isoWeek");
        return entryDate.isBetween(weekStart, weekEnd, null, "[]");
      } else {
        const monthStart = prevPeriod.startOf("month");
        const monthEnd = prevPeriod.endOf("month");
        return entryDate.isBetween(monthStart, monthEnd, null, "[]");
      }
    });

    const prevTotal = prevEntries.reduce((sum, e) => {
      const diff = dayjs(e.endTime).diff(dayjs(e.startTime), "minute");
      return sum + (diff - (e.breakMinutes || 0)) / 60;
    }, 0);

    // Utilization (assuming 8 hours per day, 5 days per week for week view, or 20 days for month)
    const workingDays = viewMode === "week" ? 5 : 20;
    const expectedHours = teamMembers.length * workingDays * 8;
    const utilizationRate =
      expectedHours > 0 ? (total / expectedHours) * 100 : 0;

    // Project distribution
    const projectStats = filteredEntries.reduce(
      (acc, entry) => {
        const projectName = entry.project?.name || "Onbekend";
        if (!acc[projectName]) {
          acc[projectName] = { hours: 0, entries: 0 };
        }
        const hours =
          (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
            (entry.breakMinutes || 0)) /
          60;
        acc[projectName].hours += hours;
        acc[projectName].entries += 1;
        return acc;
      },
      {} as Record<string, { hours: number; entries: number }>,
    );

    // Daily distribution (for week view)
    const dailyStats = viewMode === "week" ? [0, 0, 0, 0, 0, 0, 0] : [];
    if (viewMode === "week") {
      filteredEntries.forEach((entry) => {
        const dayOfWeek = dayjs(entry.startTime).isoWeekday() - 1; // 0 = Monday
        const hours =
          (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
            (entry.breakMinutes || 0)) /
          60;
        dailyStats[dayOfWeek] += hours;
      });
    }

    // Average hours per day
    const periodDays =
      viewMode === "week" ? 7 : dayjs(currentPeriod).daysInMonth();
    const avgHoursPerDay = periodDays > 0 ? total / periodDays : 0;

    return {
      total,
      approved,
      pending,
      prevTotal,
      utilizationRate,
      projectStats,
      dailyStats,
      avgHoursPerDay,
      periodDays,
      expectedHours,
    };
  }, [filteredEntries, currentPeriod, viewMode, teamMembers, entries]);

  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0)
      return { icon: null, color: "text-slate-500", change: "0%" };
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return {
        icon: ArrowUpRight,
        color: "text-emerald-600",
        change: `+${change.toFixed(1)}%`,
      };
    } else if (change < 0) {
      return {
        icon: ArrowDownRight,
        color: "text-red-600",
        change: `${change.toFixed(1)}%`,
      };
    }
    return { icon: null, color: "text-slate-500", change: "0%" };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

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
    const newMode = viewMode === "week" ? "month" : "week";
    setViewMode(newMode);
    setCurrentPeriod(dayjs().startOf(newMode === "week" ? "isoWeek" : "month"));
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Clockwise";
    workbook.created = new Date();

    // === OVERZICHT TAB ===
    const summarySheet = workbook.addWorksheet("Overzicht");

    // Title
    summarySheet.mergeCells("A1:E1");
    summarySheet.getCell("A1").value = "Team Uren Rapport";
    summarySheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FF1E3A8A" } };
    summarySheet.getCell("A1").alignment = { horizontal: "center" };

    // Period info
    summarySheet.mergeCells("A2:E2");
    summarySheet.getCell("A2").value = `Periode: ${periodLabel}`;
    summarySheet.getCell("A2").font = { size: 12, color: { argb: "FF64748B" } };
    summarySheet.getCell("A2").alignment = { horizontal: "center" };

    summarySheet.mergeCells("A3:E3");
    summarySheet.getCell("A3").value = `Gegenereerd op: ${dayjs().format("DD-MM-YYYY HH:mm")}`;
    summarySheet.getCell("A3").font = { size: 10, color: { argb: "FF94A3B8" } };
    summarySheet.getCell("A3").alignment = { horizontal: "center" };

    // Empty row
    summarySheet.addRow([]);

    // Analytics section header
    summarySheet.getRow(5).values = ["SAMENVATTING"];
    summarySheet.getCell("A5").font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
    summarySheet.mergeCells("A5:E5");

    // Analytics data
    const summaryData = [
      ["Totaal Uren", `${analytics.total.toFixed(1)} uur`],
      ["Goedgekeurde Uren", `${analytics.approved.toFixed(1)} uur`],
      ["In Behandeling", `${analytics.pending.toFixed(1)} uur`],
      ["Benutting", `${analytics.utilizationRate.toFixed(0)}%`],
      ["Gemiddeld per Dag", `${analytics.avgHoursPerDay.toFixed(1)} uur`],
      ["Verwachte Uren", `${analytics.expectedHours.toFixed(0)} uur`],
      ["Aantal Teamleden", `${teamMembers.length}`],
      ["Aantal Registraties", `${filteredEntries.length}`],
    ];

    summaryData.forEach((row, index) => {
      const rowNum = 6 + index;
      summarySheet.getRow(rowNum).values = row;
      summarySheet.getCell(`A${rowNum}`).font = { bold: true };
      summarySheet.getCell(`B${rowNum}`).alignment = { horizontal: "right" };
    });

    // Empty row
    summarySheet.addRow([]);

    // Project verdeling section
    const projectStartRow = 6 + summaryData.length + 2;
    summarySheet.getRow(projectStartRow).values = ["PROJECT VERDELING"];
    summarySheet.getCell(`A${projectStartRow}`).font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
    summarySheet.mergeCells(`A${projectStartRow}:E${projectStartRow}`);

    // Project headers
    summarySheet.getRow(projectStartRow + 1).values = ["Project", "Uren", "Registraties", "Percentage"];
    summarySheet.getRow(projectStartRow + 1).font = { bold: true };
    summarySheet.getRow(projectStartRow + 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };

    // Project data
    Object.entries(analytics.projectStats)
      .sort(([, a], [, b]) => (b as any).hours - (a as any).hours)
      .forEach(([project, stats]: [string, any], index) => {
        const rowNum = projectStartRow + 2 + index;
        const percentage = analytics.total > 0 ? ((stats.hours / analytics.total) * 100).toFixed(1) : "0";
        summarySheet.getRow(rowNum).values = [
          project,
          `${stats.hours.toFixed(1)} uur`,
          stats.entries,
          `${percentage}%`,
        ];
      });

    // Set column widths for summary sheet
    summarySheet.columns = [
      { width: 30 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    // === DETAILS TAB ===
    const detailsSheet = workbook.addWorksheet("Uren Details");

    // Headers
    detailsSheet.columns = [
      { header: "Datum", key: "date", width: 14 },
      { header: "Medewerker", key: "employee", width: 22 },
      { header: "Project", key: "project", width: 28 },
      { header: "Projectcode", key: "projectCode", width: 15 },
      { header: "Start", key: "start", width: 10 },
      { header: "Eind", key: "end", width: 10 },
      { header: "Pauze (min)", key: "break", width: 12 },
      { header: "Totaal (uren)", key: "total", width: 14 },
      { header: "Status", key: "status", width: 15 },
      { header: "Omschrijving", key: "notes", width: 35 },
    ];

    // Style header row
    detailsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    detailsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };
    detailsSheet.getRow(1).alignment = { horizontal: "center" };

    // Add data rows
    filteredEntries.forEach((entry, index) => {
      const hours =
        (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
          (entry.breakMinutes || 0)) /
        60;

      const row = detailsSheet.addRow({
        date: dayjs(entry.startTime).format("DD-MM-YYYY"),
        employee: `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim(),
        project: entry.project?.name || "",
        projectCode: entry.projectCode || "",
        start: dayjs(entry.startTime).format("HH:mm"),
        end: dayjs(entry.endTime).format("HH:mm"),
        break: entry.breakMinutes || 0,
        total: parseFloat(hours.toFixed(2)),
        status: entry.status === "APPROVED" ? "Goedgekeurd" : entry.status === "SUBMITTED" ? "In behandeling" : entry.status === "REJECTED" ? "Afgekeurd" : "Concept",
        notes: entry.notes || "",
      });

      // Alternate row colors
      if (index % 2 === 1) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      // Status coloring
      const statusCell = row.getCell("status");
      if (entry.status === "APPROVED") {
        statusCell.font = { color: { argb: "FF16A34A" } };
      } else if (entry.status === "SUBMITTED") {
        statusCell.font = { color: { argb: "FFEA580C" } };
      } else if (entry.status === "REJECTED") {
        statusCell.font = { color: { argb: "FFDC2626" } };
      }
    });

    // Add totals row
    const totalRow = detailsSheet.addRow({
      date: "",
      employee: "",
      project: "",
      projectCode: "",
      start: "",
      end: "TOTAAL:",
      break: "",
      total: parseFloat(analytics.total.toFixed(2)),
      status: "",
      notes: "",
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };

    // Add borders to all data cells
    detailsSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    // === PER MEDEWERKER TAB ===
    const perEmployeeSheet = workbook.addWorksheet("Per Medewerker");

    // Group entries by employee
    const employeeStats = filteredEntries.reduce((acc: any, entry: any) => {
      const name = `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim() || "Onbekend";
      if (!acc[name]) {
        acc[name] = { hours: 0, approved: 0, pending: 0, entries: 0 };
      }
      const hours = (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60;
      acc[name].hours += hours;
      acc[name].entries += 1;
      if (entry.status === "APPROVED") acc[name].approved += hours;
      if (entry.status === "SUBMITTED") acc[name].pending += hours;
      return acc;
    }, {});

    perEmployeeSheet.columns = [
      { header: "Medewerker", key: "employee", width: 25 },
      { header: "Totaal Uren", key: "total", width: 15 },
      { header: "Goedgekeurd", key: "approved", width: 15 },
      { header: "In Behandeling", key: "pending", width: 15 },
      { header: "Registraties", key: "entries", width: 15 },
    ];

    perEmployeeSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    perEmployeeSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };

    Object.entries(employeeStats)
      .sort(([, a]: any, [, b]: any) => b.hours - a.hours)
      .forEach(([name, stats]: [string, any]) => {
        perEmployeeSheet.addRow({
          employee: name,
          total: parseFloat(stats.hours.toFixed(2)),
          approved: parseFloat(stats.approved.toFixed(2)),
          pending: parseFloat(stats.pending.toFixed(2)),
          entries: stats.entries,
        });
      });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-uren-rapport-${currentPeriod.format("YYYY-MM-DD")}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text("Team Uren Rapport", 105, 20, { align: "center" });

    // Period
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(periodLabel, 105, 30, { align: "center" });

    // Generated date
    doc.setFontSize(10);
    doc.text(`Gegenereerd op: ${dayjs().format("DD-MM-YYYY HH:mm")}`, 105, 38, { align: "center" });

    // Summary section
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text("Samenvatting", 14, 52);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const summaryY = 60;
    doc.text(`Totaal Uren: ${analytics.total.toFixed(1)} uur`, 14, summaryY);
    doc.text(`Goedgekeurd: ${analytics.approved.toFixed(1)} uur`, 14, summaryY + 6);
    doc.text(`In Behandeling: ${analytics.pending.toFixed(1)} uur`, 14, summaryY + 12);
    doc.text(`Benutting: ${analytics.utilizationRate.toFixed(0)}%`, 100, summaryY);
    doc.text(`Teamleden: ${teamMembers.length}`, 100, summaryY + 6);
    doc.text(`Registraties: ${filteredEntries.length}`, 100, summaryY + 12);

    // Entries table
    const tableData = filteredEntries.map((entry) => {
      const hours = (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") - (entry.breakMinutes || 0)) / 60;
      return [
        dayjs(entry.startTime).format("DD-MM-YYYY"),
        `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim(),
        entry.project?.name || "",
        dayjs(entry.startTime).format("HH:mm"),
        dayjs(entry.endTime).format("HH:mm"),
        hours.toFixed(2),
        entry.status === "APPROVED" ? "Goedgekeurd" : entry.status === "SUBMITTED" ? "In behandeling" : entry.status === "REJECTED" ? "Afgekeurd" : "Concept",
      ];
    });

    autoTable(doc, {
      startY: summaryY + 25,
      head: [["Datum", "Medewerker", "Project", "Start", "Eind", "Uren", "Status"]],
      body: tableData,
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 25 },
      },
    });

    // Footer with totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Totaal: ${analytics.total.toFixed(1)} uur`, 14, finalY);

    doc.save(`team-uren-rapport-${currentPeriod.format("YYYY-MM-DD")}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            Goedgekeurd
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            In behandeling
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800">
            Afgekeurd
          </Badge>
        );
      default:
        return <Badge variant="secondary">Concept</Badge>;
    }
  };

  const periodLabel =
    viewMode === "week"
      ? `Week ${currentPeriod.isoWeek()} • ${currentPeriod.format("D MMM")} - ${currentPeriod.add(6, "day").format("D MMM YYYY")}`
      : currentPeriod.format("MMMM YYYY");

  const displayEntries =
    statusFilter === "all"
      ? filteredEntries
      : filteredEntries.filter((e) => e.status === statusFilter);

  const trend = getTrendIndicator(analytics.total, analytics.prevTotal);

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        title="Team Uren"
        description={periodLabel}
        actions={
          <>
            <Button
              onClick={exportToExcel}
              disabled={filteredEntries.length === 0}
              size="sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={filteredEntries.length === 0}
              variant="outline"
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </>
        }
      />

      {/* Filter balk */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period navigation */}
        <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800">
          <button
            onClick={handlePrev}
            className="h-9 px-2 flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="h-9 px-3 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors border-x border-slate-200 dark:border-slate-700"
          >
            <Calendar className="w-3.5 h-3.5" />
            Vandaag
          </button>
          <button
            onClick={handleNext}
            className="h-9 px-2 flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <Button variant="outline" size="sm" onClick={toggleView}>
          {viewMode === "week" ? "Maandweergave" : "Weekweergave"}
        </Button>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 h-9"
            placeholder="Zoeken op naam, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="all">Alle medewerkers</option>
          {teamMembers.map((member) => (
            <option key={member.medewGcId ?? member.id} value={member.medewGcId ?? member.id}>
              {member.firstName} {member.lastName}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="all">Alle statussen</option>
          <option value="APPROVED">Goedgekeurd</option>
          <option value="SUBMITTED">In behandeling</option>
          <option value="REJECTED">Afgekeurd</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Clock}
          title="Totaal Uren"
          value={`${analytics.total.toFixed(1)}u`}
          subtitle={`${trend.change} vs vorige periode`}
          color="blue"
        />
        <StatCard
          icon={Target}
          title="Goedgekeurd"
          value={`${analytics.approved.toFixed(1)}u`}
          subtitle={`${analytics.total > 0 ? ((analytics.approved / analytics.total) * 100).toFixed(0) : 0}% van totaal`}
          color="emerald"
        />
        <StatCard
          icon={Activity}
          title="In Behandeling"
          value={`${analytics.pending.toFixed(1)}u`}
          subtitle={`${filteredEntries.filter((e) => e.status === "SUBMITTED").length} registraties`}
          color="indigo"
        />
      </div>

      {/* Urenregistraties tabel */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Urenregistraties
              <span className="text-xs font-normal text-slate-400">
                ({displayEntries.length})
              </span>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setEntriesViewMode(
                  entriesViewMode === "cards" ? "table" : "cards",
                )
              }
            >
              {entriesViewMode === "table" ? (
                <>
                  <List className="w-4 h-4 mr-1" />
                  Kaarten
                </>
              ) : (
                <>
                  <Table className="w-4 h-4 mr-1" />
                  Tabel
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {displayEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Geen uren gevonden
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Er zijn geen urenregistraties voor deze periode en filters.
              </p>
            </div>
          ) : entriesViewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Medewerker
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Uren
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {displayEntries.map((entry, idx) => {
                    const hours =
                      (dayjs(entry.endTime).diff(
                        dayjs(entry.startTime),
                        "minute",
                      ) -
                        (entry.breakMinutes || 0)) /
                      60;
                    return (
                      <tr
                        key={entry.id ?? idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {entry.user?.firstName?.charAt(0)}
                              {entry.user?.lastName?.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {entry.user?.firstName} {entry.user?.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          <div className="text-sm">
                            {dayjs(entry.startTime).format("DD MMM YYYY")}
                          </div>
                          <div className="text-xs text-slate-400">
                            {dayjs(entry.startTime).format("HH:mm")} –{" "}
                            {dayjs(entry.endTime).format("HH:mm")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{entry.project?.name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {hours.toFixed(1)}u
                          </span>
                          {entry.breakMinutes > 0 && (
                            <div className="text-xs text-slate-400">
                              Pauze: {entry.breakMinutes} min
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(entry.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {displayEntries.map((entry, idx) => {
                const hours =
                  (dayjs(entry.endTime).diff(
                    dayjs(entry.startTime),
                    "minute",
                  ) -
                    (entry.breakMinutes || 0)) /
                  60;
                return (
                  <div
                    key={entry.id ?? idx}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {entry.user?.firstName?.charAt(0)}
                      {entry.user?.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {entry.user?.firstName} {entry.user?.lastName}
                        </span>
                        {getStatusBadge(entry.status)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Building className="w-3 h-3" />
                        <span>{entry.project?.name || "—"}</span>
                        <span>•</span>
                        <span>
                          {dayjs(entry.startTime).format("DD MMM YYYY")}{" "}
                          {dayjs(entry.startTime).format("HH:mm")}–
                          {dayjs(entry.endTime).format("HH:mm")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {hours.toFixed(1)}u
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
