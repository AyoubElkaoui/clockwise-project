"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Save,
  Send,
  Trash2,
  Calendar,
  Copy,
  Clipboard,
} from "lucide-react";
import {
  getCompanies,
  getProjectGroups,
  getProjects,
} from "@/lib/api/companyApi";
import { saveDraft, submitEntries, getDrafts, getSubmitted, getRejected } from "@/lib/api/workflowApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";

interface Company {
  id: number;
  name: string;
}
interface ProjectGroup {
  id: number;
  name: string;
  companyId: number;
}
interface Project {
  id: number;
  name: string;
  projectGroupId: number;
}
interface ProjectRow {
  companyId: number;
  companyName: string;
  projectGroupId: number;
  projectGroupName: string;
  projectId: number;
  projectName: string;
}
interface TimeEntry {
  date: string;
  projectId: number;
  hours: number;
  km?: number;
  expenses?: number;
  notes?: string;
  status?: string;
  rejectionReason?: string | null;
}

interface ClosedDay {
  id: number;
  date: string;
  reason: string;
}

const MAX_HOURS_PER_DAY = 8;

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonthWeeks(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const weeks: Date[] = [];
  let current = new Date(firstDay);

  while (current <= lastDay) {
    const weekDays = getWeekDays(current);
    if (!weeks.some((w) => formatDate(w) === formatDate(weekDays[0]))) {
      weeks.push(weekDays[0]);
    }
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

export default function TimeRegistrationPage() {
  const { t } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projectGroups, setProjectGroups] = useState<
    Record<number, ProjectGroup[]>
  >({});
  const [projects, setProjects] = useState<Record<number, Project[]>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<number[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [entries, setEntries] = useState<Record<string, TimeEntry>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [copiedCell, setCopiedCell] = useState<TimeEntry | null>(null);
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  const monthNames = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];
  const weekNumber = getWeekNumber(currentWeek);
  const monthWeeks = getMonthWeeks(currentWeek);

  useEffect(() => {
    loadCompanies();
    loadEntries();
  }, [currentWeek, viewMode]);

  useEffect(() => {
    loadClosedDays();
  }, [currentWeek]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadClosedDays = async () => {
    try {
      const year = currentWeek.getFullYear();
      console.log("Loading closed days for year:", year);
      const response = await axios.get(
        `/api/holidays/closed?year=${year}`,
      );
      console.log("Loaded closed days:", response.data);
      setClosedDays(response.data);
    } catch (error) {
      console.error("Fout bij laden gesloten dagen:", error);
    }
  };

  const isClosedDay = (date: string) => {
    const isClosed = closedDays.some((day) => day.date === date);
    console.log(`Checking if ${date} is closed:`, isClosed, closedDays);
    return isClosed;
  };

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      showToast("Kon bedrijven niet laden", "error");
    }
  };

  const loadEntries = async () => {
    try {
      const urenperGcId = getCurrentPeriodId();

      // Load ALL statuses: DRAFT, SUBMITTED, APPROVED, REJECTED
      const [drafts, submitted, rejected] = await Promise.all([
        getDrafts(urenperGcId),
        getSubmitted(urenperGcId),
        getRejected(urenperGcId)
      ]);

      const allEntries = [...drafts, ...submitted, ...rejected];

      const map: Record<string, TimeEntry> = {};
      allEntries.forEach((e: any) => {
        const projectId = e.werkGcId || 0;
        map[`${e.datum}-${projectId}`] = {
          date: e.datum,
          projectId: projectId,
          hours: e.aantal,
          km: 0,
          expenses: 0,
          notes: e.omschrijving || "",
          status: e.status, // DRAFT, SUBMITTED, APPROVED, REJECTED
          rejectionReason: e.rejectionReason || null,
        };
      });
      setEntries(map);
    } catch (error) {
      showToast("Kon uren niet laden", "error");
    }
  };

  const toggleCompany = async (id: number) => {
    if (expandedCompanies.includes(id)) {
      setExpandedCompanies((prev) => prev.filter((x) => x !== id));
    } else {
      setExpandedCompanies((prev) => [...prev, id]);
      if (!projectGroups[id]) {
        try {
          const groups = await getProjectGroups(id);
          setProjectGroups((prev) => ({ ...prev, [id]: groups }));
        } catch (error) {
          showToast("Kon groepen niet laden", "error");
        }
      }
    }
  };

  const toggleGroup = async (id: number) => {
    if (expandedGroups.includes(id)) {
      setExpandedGroups((prev) => prev.filter((x) => x !== id));
    } else {
      setExpandedGroups((prev) => [...prev, id]);
      if (!projects[id]) {
        try {
          const projs = await getProjects(id);
          setProjects((prev) => ({ ...prev, [id]: projs }));
        } catch (error) {
          showToast("Kon projecten niet laden", "error");
        }
      }
    }
  };

  const addProject = (
    company: Company,
    group: ProjectGroup,
    project: Project,
  ) => {
    if (!projectRows.some((r) => r.projectId === project.id)) {
      setProjectRows((prev) => [
        ...prev,
        {
          companyId: company.id,
          companyName: company.name,
          projectGroupId: group.id,
          projectGroupName: group.name,
          projectId: project.id,
          projectName: project.name,
        },
      ]);
    }
  };

  const copyCell = (projectId: number, date: string) => {
    const key = `${date}-${projectId}`;
    const entry = entries[key];

    if (
      !entry ||
      (entry.hours === 0 &&
        entry.km === 0 &&
        entry.expenses === 0 &&
        !entry.notes)
    ) {
      showToast("Geen data om te kopiëren", "error");
      return;
    }

    setCopiedCell({ ...entry });
    showToast(
      "Cel gekopieerd! Klik op een andere cel om te plakken",
      "success",
    );
  };

  const pasteCell = (projectId: number, date: string) => {
    if (!copiedCell) {
      showToast("Geen data om te plakken", "error");
      return;
    }

    const key = `${date}-${projectId}`;
    const existingEntry = entries[key];

    // Check of cel niet ingeleverd is
    if (existingEntry && existingEntry.status === "ingeleverd") {
      showToast("Kan niet plakken in ingeleverde cel", "error");
      return;
    }

    // Plak de data
    setEntries((prev) => ({
      ...prev,
      [key]: {
        date,
        projectId,
        hours: copiedCell.hours || 0,
        km: copiedCell.km || 0,
        expenses: copiedCell.expenses || 0,
        notes: copiedCell.notes || "",
        status: "opgeslagen",
      },
    }));

    showToast("Geplakt!", "success");
  };

  const removeProject = (projectId: number) => {
    setProjectRows((prev) => prev.filter((r) => r.projectId !== projectId));
    const newEntries = { ...entries };
    Object.keys(newEntries).forEach((k) => {
      if (newEntries[k].projectId === projectId) delete newEntries[k];
    });
    setEntries(newEntries);
  };

  const updateEntry = (
    projectId: number,
    date: string,
    field: "hours" | "km" | "expenses" | "notes",
    value: any,
  ) => {
    const key = `${date}-${projectId}`;
    setEntries((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        projectId,
        [field]: value,
      },
    }));
  };

  const getTotalDay = (date: string) =>
    Object.values(entries)
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + (e.hours || 0), 0);

  const getTotalProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      return sum + (entries[key]?.hours || 0);
    }, 0);

  const getTotalWeek = () =>
    projectRows.reduce((sum, r) => sum + getTotalProject(r.projectId), 0);

  // KM totals
  const getTotalKmDay = (date: string) =>
    Object.values(entries)
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + (e.km || 0), 0);

  const getTotalKmProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      return sum + (entries[key]?.km || 0);
    }, 0);

  const getTotalKmWeek = () =>
    projectRows.reduce((sum, r) => sum + getTotalKmProject(r.projectId), 0);

  // Expenses totals
  const getTotalExpensesDay = (date: string) =>
    Object.values(entries)
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + (e.expenses || 0), 0);

  const getTotalExpensesProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      return sum + (entries[key]?.expenses || 0);
    }, 0);

  const getTotalExpensesWeek = () =>
    projectRows.reduce(
      (sum, r) => sum + getTotalExpensesProject(r.projectId),
      0,
    );

  const getCurrentPeriodId = () => 100426; // Hardcoded for now

  // Helper functions for entry status styling and editability
  const isEditable = (status?: string) => {
    // DRAFT, REJECTED, and old "opgeslagen" status are editable
    // SUBMITTED and APPROVED are not editable
    return !status || status === "DRAFT" || status === "REJECTED" || status === "opgeslagen";
  };

  const getEntryClassName = (status?: string) => {
    // Return CSS class based on status
    if (status === "APPROVED") return "bg-green-50 dark:bg-green-900/20";
    if (status === "SUBMITTED") return "bg-gray-50 dark:bg-gray-700/50";
    if (status === "REJECTED") return "bg-red-50 dark:bg-red-900/20";
    return ""; // DRAFT - normal styling
  };

  const getInputClassName = (baseClass: string, status?: string) => {
    const editable = isEditable(status);
    if (!editable) {
      return `${baseClass} bg-gray-100 dark:bg-gray-700 cursor-not-allowed`;
    }
    if (status === "REJECTED") {
      return `${baseClass} border-red-300 dark:border-red-700`;
    }
    return baseClass;
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Validate total hours per day
      const dayTotals: Record<string, number> = {};
      Object.values(entries).forEach(e => {
        if (e.hours > 0) {
          dayTotals[e.date] = (dayTotals[e.date] || 0) + e.hours;
        }
      });
      const invalidDays = Object.entries(dayTotals).filter(([, total]) => total > MAX_HOURS_PER_DAY);
      if (invalidDays.length > 0) {
        showToast(`Te veel uren op: ${invalidDays.map(([date]) => date).join(', ')} (max ${MAX_HOURS_PER_DAY}u)`, "error");
        setSaving(false);
        return;
      }

      const toSave = Object.values(entries)
        .filter((e: TimeEntry) => e.hours > 0)
        .filter((e: TimeEntry) => !isClosedDay(e.date));

      if (toSave.length === 0) {
        showToast("Geen uren om op te slaan", "error");
        return;
      }

      const urenperGcId = getCurrentPeriodId();

      // Save each entry as draft using workflow API
      for (const entry of toSave) {
        await saveDraft({
          urenperGcId,
          taakGcId: 100256, // Montage task
          werkGcId: entry.projectId || null,
          datum: entry.date,
          aantal: entry.hours,
          omschrijving: entry.notes || "",
        });
      }

      showToast("Opgeslagen!", "success");
      await loadEntries();
    } catch (error) {
      showToast("Opslaan mislukt", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitAll = async () => {
    setSaving(true);
    try {
      // Validate total hours per day
      const dayTotals: Record<string, number> = {};
      Object.values(entries).forEach((e: TimeEntry) => {
        if (e.hours > 0) {
          dayTotals[e.date] = (dayTotals[e.date] || 0) + e.hours;
        }
      });
      const invalidDays = Object.entries(dayTotals).filter(([, total]) => total > MAX_HOURS_PER_DAY);
      if (invalidDays.length > 0) {
        showToast(`Te veel uren op: ${invalidDays.map(([date]) => date).join(', ')} (max ${MAX_HOURS_PER_DAY}u)`, "error");
        setSaving(false);
        return;
      }

      const toSave = Object.values(entries)
        .filter((e: TimeEntry) => e.hours > 0)
        .filter((e: TimeEntry) => !isClosedDay(e.date));

      if (toSave.length === 0) {
        showToast("Geen uren om in te leveren", "error");
        return;
      }

      const urenperGcId = getCurrentPeriodId();

      // First save all entries as drafts
      const savedIds: number[] = [];
      for (const entry of toSave as TimeEntry[]) {
        const result = await saveDraft({
          urenperGcId,
          taakGcId: 100256, // Montage task
          werkGcId: entry.projectId || null,
          datum: entry.date,
          aantal: entry.hours,
          omschrijving: entry.notes || "",
        });
        savedIds.push(result.id);
      }

      // Then submit all saved drafts
      await submitEntries({
        urenperGcId,
        entryIds: savedIds,
      });

      showToast("Ingeleverd!", "success");
      await loadEntries();
    } catch (error) {
      showToast("Inleveren mislukt", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
          {toast && (
            <div
              className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl text-white animate-in slide-in-from-top-2 ${
                toast.type === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {toast.type === "success" ? "✓" : "✕"}
                </span>
                <span className="font-medium">{toast.message}</span>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-40">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Uren Registreren
                </h1>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("week")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "week"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode("month")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "month"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Maand
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => {
                      const d = new Date(currentWeek);
                      if (viewMode === "week") {
                        d.setDate(d.getDate() - 7);
                      } else {
                        d.setMonth(d.getMonth() - 1);
                      }
                      setCurrentWeek(d);
                    }}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <div className="px-4 py-2 font-semibold text-slate-900 dark:text-slate-100">
                    {viewMode === "week"
                      ? `Week ${weekNumber}`
                      : monthNames[currentWeek.getMonth()]}
                  </div>
                  <button
                    onClick={() => {
                      const d = new Date(currentWeek);
                      if (viewMode === "week") {
                        d.setDate(d.getDate() + 7);
                      } else {
                        d.setMonth(d.getMonth() + 1);
                      }
                      setCurrentWeek(d);
                    }}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" /> {saving ? "Bezig..." : "Opslaan"}
                </button>
                <button
                  onClick={submitAll}
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" /> Inleveren
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100vh-5rem)]">
            <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto shadow-lg">
              <div className="p-4 space-y-1">
                {companies.map((company) => (
                  <div key={company.id}>
                    <div
                      onClick={() => toggleCompany(company.id)}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg cursor-pointer group"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform text-slate-400 group-hover:text-blue-600 ${expandedCompanies.includes(company.id) ? "" : "-rotate-90"}`}
                      />
                      <span className="font-medium group-hover:text-blue-600">
                        {company.name}
                      </span>
                    </div>
                    {expandedCompanies.includes(company.id) && (
                      <div className="ml-5 space-y-1">
                        {projectGroups[company.id]?.map((group, index) => (
                          <div key={group.id || `group-${index}`}>
                            <div
                              onClick={() => toggleGroup(group.id)}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-lg cursor-pointer group"
                            >
                              <ChevronDown
                                className={`w-3 h-3 transition-transform text-slate-400 group-hover:text-purple-600 ${expandedGroups.includes(group.id) ? "" : "-rotate-90"}`}
                              />
                              <span className="text-sm group-hover:text-purple-600">
                                {group.name}
                              </span>
                            </div>
                            {expandedGroups.includes(group.id) && (
                              <div className="ml-5 space-y-1">
                                {projects[group.id]?.map((project) => (
                                  <div
                                    key={project.id}
                                    onClick={() =>
                                      addProject(company, group, project)
                                    }
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 rounded-lg cursor-pointer group"
                                  >
                                    <Plus className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="text-sm text-slate-600 group-hover:text-emerald-600">
                                      {project.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {projectRows.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      Geen projecten geselecteerd
                    </h3>
                    <p className="text-slate-600">
                      Selecteer een project in de sidebar
                    </p>
                  </div>
                </div>
              ) : viewMode === "month" ? (
                <div className="space-y-6">
                  {monthWeeks.map((weekStart, idx) => {
                    const weekDaysForWeek = getWeekDays(weekStart);
                    const currentMonth = currentWeek.getMonth();
                    const currentYear = currentWeek.getFullYear();
                    const weekNum = getWeekNumber(weekStart);
                    return (
                      <div
                        key={`week-${weekStart.toISOString()}`}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                      >
                        <div className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 px-4 py-2">
                          <div className="font-semibold text-slate-900">
                            Week {weekNum}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatDate(weekDaysForWeek[0])} -{" "}
                            {formatDate(weekDaysForWeek[6])}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-3 p-4 bg-slate-100 dark:bg-slate-800">
                            <div />
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              Project
                            </div>
                            {weekDaysForWeek.map((day, i) => {
                              const isInCurrentMonth =
                                day.getMonth() === currentMonth &&
                                day.getFullYear() === currentYear;
                              return (
                                <div
                                  key={`day-${day.toISOString()}`}
                                  className={
                                    "text-center" +
                                    (!isInCurrentMonth ? " opacity-50" : "")
                                  }
                                >
                                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                    {
                                      dayNames[
                                        day.getDay() === 0
                                          ? 6
                                          : day.getDay() - 1
                                      ]
                                    }
                                  </div>
                                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                    {day.getDate()}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="text-center font-bold text-slate-800 dark:text-slate-200">
                              Totaal
                            </div>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {projectRows.map((row, idx) => (
                            <div
                              key={`${weekStart.toISOString()}-${row.projectId}`}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700"
                            >
                              <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-3 p-4">
                                <div />
                                <div>
                                  <div className="text-xs text-slate-500">
                                    {row.companyName} › {row.projectGroupName}
                                  </div>
                                  <div className="font-medium mb-2">
                                    {row.projectName}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() =>
                                        removeProject(row.projectId)
                                      }
                                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                                      title="Verwijder project"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {weekDaysForWeek.map((day) => {
                                  const date = formatDate(day);
                                  const key = `${date}-${row.projectId}`;
                                  const entry = entries[key] || {
                                    date,
                                    projectId: row.projectId,
                                    hours: 0,
                                    km: 0,
                                    expenses: 0,
                                    notes: "",
                                    status: "opgeslagen",
                                  };
                                  const isInCurrentMonth =
                                    day.getMonth() === currentMonth &&
                                    day.getFullYear() === currentYear;
                                  const entryEditable = isEditable(entry.status);
                                  const isClosed = isClosedDay(date);
                                  const isDisabled =
                                    !isInCurrentMonth ||
                                    !entryEditable ||
                                    isClosed;
                                  return (
                                    <div
                                      key={`entry-${date}-${row.projectId}`}
                                      className={
                                        "space-y-1 p-2 rounded " +
                                        getEntryClassName(entry.status) +
                                        (!isInCurrentMonth ? " opacity-30" : "")
                                      }
                                    >
                                      {!isDisabled && (
                                        <div className="flex gap-1 mb-1">
                                          <button
                                            onClick={() =>
                                              copyCell(row.projectId, date)
                                            }
                                            className="flex-1 p-0.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"
                                            title="Kopieer cel"
                                          >
                                            Kopiëren
                                          </button>
                                          <button
                                            onClick={() =>
                                              pasteCell(row.projectId, date)
                                            }
                                            className="flex-1 p-0.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"
                                            title="Plak cel"
                                          >
                                            Plakken
                                          </button>
                                        </div>
                                      )}
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="24"
                                        value={entry.hours || ""}
                                        onChange={(e) =>
                                          updateEntry(
                                            row.projectId,
                                            date,
                                            "hours",
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        disabled={isDisabled}
                                        className={getInputClassName("w-full px-3 py-2 border rounded-lg text-center font-semibold", entry.status)}
                                        placeholder="Uren"
                                        title={
                                          isClosed
                                            ? "Gesloten dag - geen uren registratie mogelijk"
                                            : entry.status === "SUBMITTED" ? "Ingeleverd - niet meer te wijzigen"
                                            : entry.status === "APPROVED" ? "Goedgekeurd - niet meer te wijzigen"
                                            : ""
                                        }
                                      />
                                      <input
                                        type="text"
                                        value={entry.notes || ""}
                                        onChange={(e) =>
                                          updateEntry(
                                            row.projectId,
                                            date,
                                            "notes",
                                            e.target.value,
                                          )
                                        }
                                        disabled={isDisabled}
                                        className={getInputClassName("w-full px-3 py-2 border rounded text-sm", entry.status)}
                                        placeholder="Opmerking"
                                        title={
                                          isClosed
                                            ? "Gesloten dag - geen uren registratie mogelijk"
                                            : entry.status === "SUBMITTED" ? "Ingeleverd - niet meer te wijzigen"
                                            : entry.status === "APPROVED" ? "Goedgekeurd - niet meer te wijzigen"
                                            : ""
                                        }
                                      />
                                      {entry.status === "REJECTED" && entry.rejectionReason && (
                                        <div className="mt-1 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs">
                                          <p className="font-semibold text-red-800 dark:text-red-300">Afgekeurd:</p>
                                          <p className="text-red-700 dark:text-red-400">{entry.rejectionReason}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className="text-sm font-bold text-blue-600">
                                    {weekDaysForWeek.reduce((sum, day) => {
                                      const key = `${formatDate(day)}-${row.projectId}`;
                                      return sum + (entries[key]?.hours || 0);
                                    }, 0)}
                                    u
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-3 p-4">
                            <div />
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              Totaal per dag
                            </div>
                            {weekDaysForWeek.map((day) => {
                              const dayTotal = projectRows.reduce(
                                (sum, row) => {
                                  const key = `${formatDate(day)}-${row.projectId}`;
                                  return sum + (entries[key]?.hours || 0);
                                },
                                0,
                              );
                              const dayKmTotal = projectRows.reduce(
                                (sum, row) => {
                                  const key = `${formatDate(day)}-${row.projectId}`;
                                  return sum + (entries[key]?.km || 0);
                                },
                                0,
                              );
                              const dayExpensesTotal = projectRows.reduce(
                                (sum, row) => {
                                  const key = `${formatDate(day)}-${row.projectId}`;
                                  return sum + (entries[key]?.expenses || 0);
                                },
                                0,
                              );
                              return (
                                <div
                                  key={`total-${formatDate(day)}`}
                                  className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-slate-700 rounded-lg"
                                >
                                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {dayTotal}u
                                  </span>
                                </div>
                              );
                            })}
                            <div className="flex flex-col items-center gap-1 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {weekDaysForWeek.reduce(
                                  (sum, day) =>
                                    sum +
                                    projectRows.reduce((s, row) => {
                                      const key = `${formatDate(day)}-${row.projectId}`;
                                      return s + (entries[key]?.hours || 0);
                                    }, 0),
                                  0,
                                )}
                                u
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                      <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                        <div />
                        <div className="font-semibold text-slate-700">
                          Project
                        </div>
                        {weekDays.map((day, i) => (
                          <div key={i} className="text-center">
                            <div className="text-xs text-slate-500">
                              {dayNames[i]}
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                              {day.getDate()}
                            </div>
                          </div>
                        ))}
                        <div className="text-center font-semibold text-slate-700">
                          Totaal
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {projectRows.map((row, idx) => (
                        <div
                          key={row.projectId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700"
                        >
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                            <div />
                            <div>
                              <div className="text-xs text-slate-500">
                                {row.companyName} › {row.projectGroupName}
                              </div>
                              <div className="font-medium mb-2">
                                {row.projectName}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => removeProject(row.projectId)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200"
                                  title="Verwijder"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {weekDays.map((day) => {
                              const date = formatDate(day);
                              const key = `${date}-${row.projectId}`;
                              const entry = entries[key] || {
                                date,
                                projectId: row.projectId,
                                hours: 0,
                                km: 0,
                                expenses: 0,
                                notes: "",
                                status: "opgeslagen",
                              };
                              const entryEditable = isEditable(entry.status);
                              const isClosed = isClosedDay(date);
                              const isDisabled = !entryEditable || isClosed;
                              return (
                                <div
                                  key={`week-entry-${date}-${row.projectId}`}
                                  className={"space-y-1 p-2 rounded " + getEntryClassName(entry.status)}
                                >
                                  {!isDisabled && (
                                    <div className="flex gap-1 mb-1">
                                      <button
                                        onClick={() =>
                                          copyCell(row.projectId, date)
                                        }
                                        className="flex-1 p-0.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"
                                        title="Kopieer cel"
                                      >
                                        Kopiëren
                                      </button>
                                      <button
                                        onClick={() =>
                                          pasteCell(row.projectId, date)
                                        }
                                        className="flex-1 p-0.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"
                                        title="Plak cel"
                                      >
                                        Plakken
                                      </button>
                                    </div>
                                  )}
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    value={entry.hours || ""}
                                    onChange={(e) =>
                                      updateEntry(
                                        row.projectId,
                                        date,
                                        "hours",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    disabled={isDisabled}
                                    className={getInputClassName("w-full px-3 py-2 border rounded text-center", entry.status)}
                                    placeholder="Uren"
                                    title={
                                      isClosed
                                        ? "Gesloten dag - geen uren registratie mogelijk"
                                        : entry.status === "SUBMITTED" ? "Ingeleverd - niet meer te wijzigen"
                                        : entry.status === "APPROVED" ? "Goedgekeurd - niet meer te wijzigen"
                                        : ""
                                    }
                                  />
                                  <input
                                    type="text"
                                    value={entry.notes || ""}
                                    onChange={(e) =>
                                      updateEntry(
                                        row.projectId,
                                        date,
                                        "notes",
                                        e.target.value,
                                      )
                                    }
                                    disabled={isDisabled}
                                    className={getInputClassName("w-full px-3 py-2 border rounded text-sm", entry.status)}
                                    placeholder="Opmerking"
                                    title={
                                      isClosed
                                        ? "Gesloten dag - geen uren registratie mogelijk"
                                        : entry.status === "SUBMITTED" ? "Ingeleverd - niet meer te wijzigen"
                                        : entry.status === "APPROVED" ? "Goedgekeurd - niet meer te wijzigen"
                                        : ""
                                    }
                                  />
                                  {entry.status === "REJECTED" && entry.rejectionReason && (
                                    <div className="mt-1 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs">
                                      <p className="font-semibold text-red-800 dark:text-red-300">Afgekeurd:</p>
                                      <p className="text-red-700 dark:text-red-400">{entry.rejectionReason}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="text-sm font-bold text-blue-600">
                                {getTotalProject(row.projectId)}u
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border-t border-slate-200">
                      <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                        <div />
                        <div className="font-semibold text-slate-700">
                          Totaal per dag
                        </div>
                        {weekDays.map((day) => (
                          <div
                            key={`week-total-${formatDate(day)}`}
                            className="flex flex-col items-center gap-0.5"
                          >
                            <span className="text-sm font-bold text-blue-600">
                              {getTotalDay(formatDate(day))}u
                            </span>
                          </div>
                        ))}
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-bold text-emerald-600">
                            {getTotalWeek()}u
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
