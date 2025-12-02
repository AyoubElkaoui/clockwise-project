"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Save, Send, Trash2, Calendar, Copy, Clipboard } from "lucide-react";
import { getCompanies, getProjectGroups, getProjects } from "@/lib/api/companyApi";
import { saveBulkEntries, getWeekEntries } from "@/lib/api/timeEntryApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";

interface Company { id: number; name: string; }
interface ProjectGroup { id: number; name: string; companyId: number; }
interface Project { id: number; name: string; projectGroupId: number; }
interface ProjectRow {
  companyId: number;
  companyName: string;
  projectGroupId: number;
  projectGroupName: string;
  projectId: number;
  projectName: string;
}
interface TimeEntry { date: string; projectId: number; hours: number; km?: number; expenses?: number; notes?: string; status?: string; }

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
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
    if (!weeks.some(w => formatDate(w) === formatDate(weekDays[0]))) {
      weeks.push(weekDays[0]);
    }
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

export default function TimeRegistrationPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projectGroups, setProjectGroups] = useState<Record<number, ProjectGroup[]>>({});
  const [projects, setProjects] = useState<Record<number, Project[]>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<number[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [entries, setEntries] = useState<Record<string, TimeEntry>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copiedCell, setCopiedCell] = useState<TimeEntry | null>(null);

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  const monthNames = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  const weekNumber = getWeekNumber(currentWeek);
  const monthWeeks = getMonthWeeks(currentWeek);

  useEffect(() => { loadCompanies(); loadEntries(); }, [currentWeek, viewMode]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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
      if (viewMode === "month") {
        // Load all weeks of the month
        const allEntries: Record<string, TimeEntry> = {};
        for (const weekStart of monthWeeks) {
          const data = await getWeekEntries(1, formatDate(weekStart));
          data.forEach((e: any) => { allEntries[`${e.date}-${e.projectId}`] = e; });
        }
        setEntries(allEntries);
      } else {
        // Load only current week
        const data = await getWeekEntries(1, formatDate(weekDays[0]));
        const map: Record<string, TimeEntry> = {};
        data.forEach((e: any) => { map[`${e.date}-${e.projectId}`] = e; });
        setEntries(map);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleCompany = async (id: number) => {
    if (expandedCompanies.includes(id)) {
      setExpandedCompanies(prev => prev.filter(x => x !== id));
    } else {
      setExpandedCompanies(prev => [...prev, id]);
      if (!projectGroups[id]) {
        try {
          const groups = await getProjectGroups(id);
          setProjectGroups(prev => ({ ...prev, [id]: groups }));
        } catch (error) {
          showToast("Kon groepen niet laden", "error");
        }
      }
    }
  };

  const toggleGroup = async (id: number) => {
    if (expandedGroups.includes(id)) {
      setExpandedGroups(prev => prev.filter(x => x !== id));
    } else {
      setExpandedGroups(prev => [...prev, id]);
      if (!projects[id]) {
        try {
          const projs = await getProjects(id);
          setProjects(prev => ({ ...prev, [id]: projs }));
        } catch (error) {
          showToast("Kon projecten niet laden", "error");
        }
      }
    }
  };

  const addProject = (company: Company, group: ProjectGroup, project: Project) => {
    if (!projectRows.some(r => r.projectId === project.id)) {
      setProjectRows(prev => [...prev, {
        companyId: company.id,
        companyName: company.name,
        projectGroupId: group.id,
        projectGroupName: group.name,
        projectId: project.id,
        projectName: project.name
      }]);
    }
  };

  const copyCell = (projectId: number, date: string) => {
    const key = `${date}-${projectId}`;
    const entry = entries[key];

    if (!entry || (entry.hours === 0 && entry.km === 0 && entry.expenses === 0 && !entry.notes)) {
      showToast("Geen data om te kopiëren", "error");
      return;
    }

    setCopiedCell({ ...entry });
    showToast("Cel gekopieerd! Klik op een andere cel om te plakken", "success");
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
    setEntries(prev => ({
      ...prev,
      [key]: {
        date,
        projectId,
        hours: copiedCell.hours || 0,
        km: copiedCell.km || 0,
        expenses: copiedCell.expenses || 0,
        notes: copiedCell.notes || "",
        status: "opgeslagen"
      }
    }));

    showToast("Geplakt!", "success");
  };

  const removeProject = (projectId: number) => {
    setProjectRows(prev => prev.filter(r => r.projectId !== projectId));
    const newEntries = { ...entries };
    Object.keys(newEntries).forEach(k => {
      if (newEntries[k].projectId === projectId) delete newEntries[k];
    });
    setEntries(newEntries);
  };

  const updateEntry = (projectId: number, date: string, field: 'hours' | 'km' | 'expenses' | 'notes', value: any) => {
    const key = `${date}-${projectId}`;
    setEntries(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        projectId,
        [field]: value
      }
    }));
  };

  const getTotalDay = (date: string) =>
    Object.values(entries).filter(e => e.date === date).reduce((sum, e) => sum + (e.hours || 0), 0);

  const getTotalProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      return sum + (entries[key]?.hours || 0);
    }, 0);

  const getTotalWeek = () => projectRows.reduce((sum, r) => sum + getTotalProject(r.projectId), 0);

  // KM totals
  const getTotalKmDay = (date: string) =>
    Object.values(entries).filter(e => e.date === date).reduce((sum, e) => sum + (e.km || 0), 0);

  const getTotalKmProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      return sum + (entries[key]?.km || 0);
    }, 0);

  const getTotalKmWeek = () => projectRows.reduce((sum, r) => sum + getTotalKmProject(r.projectId), 0);

  // Expenses totals
  const getTotalExpensesDay = (date: string) =>
    Object.values(entries).filter(e => e.date === date).reduce((sum, e) => sum + (e.expenses || 0), 0);

  const getTotalExpensesProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      return sum + (entries[key]?.expenses || 0);
    }, 0);

  const getTotalExpensesWeek = () => projectRows.reduce((sum, r) => sum + getTotalExpensesProject(r.projectId), 0);

  const saveAll = async () => {
    setSaving(true);
    try {
      const toSave = Object.values(entries).filter(e => e.hours > 0 || e.km > 0 || e.expenses > 0).map(e => {
        const row = projectRows.find(r => r.projectId === e.projectId);
        return {
          date: e.date,
          projectId: e.projectId,
          hours: e.hours || 0,
          km: e.km || 0,
          expenses: e.expenses || 0,
          notes: e.notes || "",
          userId: 1,
          companyId: row?.companyId || 0,
          projectGroupId: row?.projectGroupId || 0,
          breakMinutes: 0,
          status: "opgeslagen"
        };
      });
      if (toSave.length === 0) { showToast("Geen uren om op te slaan", "error"); return; }
      await saveBulkEntries(1, toSave);
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
      const toSave = Object.values(entries).filter(e => e.hours > 0 || e.km > 0 || e.expenses > 0).map(e => {
        const row = projectRows.find(r => r.projectId === e.projectId);
        return {
          date: e.date,
          projectId: e.projectId,
          hours: e.hours || 0,
          km: e.km || 0,
          expenses: e.expenses || 0,
          notes: e.notes || "",
          userId: 1,
          companyId: row?.companyId || 0,
          projectGroupId: row?.projectGroupId || 0,
          breakMinutes: 0,
          status: "ingeleverd"
        };
      });
      if (toSave.length === 0) { showToast("Geen uren om in te leveren", "error"); return; }
      await saveBulkEntries(1, toSave);
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
            <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl text-white animate-in slide-in-from-top-2 ${toast.type === "success"
                ? "bg-blue-100"
                : "bg-blue-100"
              }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{toast.type === "success" ? "✓" : "✕"}</span>
                <span className="font-medium">{toast.message}</span>
              </div>
            </div>
          )}

          <div className="bg-white shadow-md sticky top-0 z-40">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Uren Registreren</h1>

                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("week")}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${viewMode === "week"
                        ? "bg-blue-100 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode("month")}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${viewMode === "month"
                        ? "bg-blue-100 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Maand
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
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
                    className="p-2 hover:bg-white rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="px-4 py-2 font-semibold">
                    {viewMode === "week"
                      ? `Week ${weekNumber}`
                      : monthNames[currentWeek.getMonth()]
                    }
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
                    className="p-2 hover:bg-white rounded-lg">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={saveAll} disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 transition">
                  <Save className="w-4 h-4" /> {saving ? "Bezig..." : "Opslaan"}
                </button>
                <button onClick={submitAll} disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 transition">
                  <Send className="w-4 h-4" /> Inleveren
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100vh-5rem)]">
            <div className="  w-80 
    bg-white dark:bg-slate-800 
    border-r 
    border-slate-200 dark:border-slate-700 
    overflow-y-auto 
    shadow-lg">
              <div className="p-4 space-y-1">
                {companies.map(company => (
                  <div key={company.id}>
                    <div onClick={() => toggleCompany(company.id)}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg cursor-pointer group">
                      <ChevronDown className={`w-4 h-4 transition-transform text-slate-400 group-hover:text-blue-600 ${expandedCompanies.includes(company.id) ? "" : "-rotate-90"}`} />
                      <span className="font-medium group-hover:text-blue-600">{company.name}</span>
                    </div>
                    {expandedCompanies.includes(company.id) && (
                      <div className="ml-5 space-y-1">
                        {projectGroups[company.id]?.map(group => (
                          <div key={group.id}>
                            <div onClick={() => toggleGroup(group.id)}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-lg cursor-pointer group">
                              <ChevronDown className={`w-3 h-3 transition-transform text-slate-400 group-hover:text-purple-600 ${expandedGroups.includes(group.id) ? "" : "-rotate-90"}`} />
                              <span className="text-sm group-hover:text-purple-600">{group.name}</span>
                            </div>
                            {expandedGroups.includes(group.id) && (
                              <div className="ml-5 space-y-1">
                                {projects[group.id]?.map(project => (
                                  <div key={project.id} onClick={() => addProject(company, group, project)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 rounded-lg cursor-pointer group">
                                    <Plus className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="text-sm text-slate-600 group-hover:text-emerald-600">{project.name}</span>
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
                    <h3 className="text-xl font-semibold mb-2">Geen projecten geselecteerd</h3>
                    <p className="text-slate-600">Selecteer een project in de sidebar</p>
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
                      <div key={idx} className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
                          <div className="font-semibold text-slate-900">Week {weekNum}</div>
                          <div className="text-xs text-slate-600">
                            {formatDate(weekDaysForWeek[0])} - {formatDate(weekDaysForWeek[6])}
                          </div>
                        </div>

                        <div className="bg-slate-50 border-b border-slate-200">
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                            <div />
                            <div className="font-semibold text-slate-700">Project</div>
                            {weekDaysForWeek.map((day, i) => {
                              const isInCurrentMonth = day.getMonth() === currentMonth && day.getFullYear() === currentYear;
                              return (
                                <div key={i} className={`text-center ${!isInCurrentMonth ? 'opacity-40' : ''}`}>
                                  <div className="text-xs text-slate-500">{dayNames[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                                  <div className="text-sm font-semibold text-slate-700">{day.getDate()}</div>
                                </div>
                              );
                            })}
                            <div className="text-center font-semibold text-slate-700">Totaal</div>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {projectRows.map(row => {
                            const weekTotal = weekDaysForWeek.reduce((sum, day) => {
                              const key = `${formatDate(day)}-${row.projectId}`;
                              return sum + (entries[key]?.hours || 0);
                            }, 0);
                            const weekKmTotal = weekDaysForWeek.reduce((sum, day) => {
                              const key = `${formatDate(day)}-${row.projectId}`;
                              return sum + (entries[key]?.km || 0);
                            }, 0);
                            const weekExpensesTotal = weekDaysForWeek.reduce((sum, day) => {
                              const key = `${formatDate(day)}-${row.projectId}`;
                              return sum + (entries[key]?.expenses || 0);
                            }, 0);

                            return (
                              <div key={row.projectId} className="hover:bg-slate-50 transition-colors">
                                <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                                  <div />
                                  <div>
                                    <div className="text-xs text-slate-500">{row.companyName} › {row.projectGroupName}</div>
                                    <div className="font-medium mb-2">{row.projectName}</div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => removeProject(row.projectId)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200"
                                        title="Verwijder project"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  {weekDaysForWeek.map(day => {
                                    const date = formatDate(day);
                                    const key = `${date}-${row.projectId}`;
                                    const entry = entries[key] || { date, projectId: row.projectId, hours: 0, km: 0, expenses: 0, notes: "", status: "opgeslagen" };
                                    const isInCurrentMonth = day.getMonth() === currentMonth && day.getFullYear() === currentYear;
                                    const isSubmitted = entry.status === "ingeleverd";
                                    const isDisabled = !isInCurrentMonth || isSubmitted;
                                    return (
                                      <div key={date} className={`space-y-1 ${!isInCurrentMonth ? 'opacity-30' : ''}`}>
                                        {!isDisabled && (
                                          <div className="flex gap-1 mb-1">
                                            <button
                                              onClick={() => copyCell(row.projectId, date)}
                                              className="flex-1 p-0.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"
                                              title="Kopieer cel"
                                            >
                                              Kopiëren
                                            </button>
                                            <button
                                              onClick={() => pasteCell(row.projectId, date)}
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
                                          onChange={e => updateEntry(row.projectId, date, 'hours', parseFloat(e.target.value) || 0)}
                                          disabled={isDisabled}
                                          className={`w-full px-2 py-1.5 border border-slate-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${isDisabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                          placeholder="Uren"
                                        />
                                        <input
                                          type="number"
                                          min="0"
                                          value={entry.km || ""}
                                          onChange={e => updateEntry(row.projectId, date, 'km', parseInt(e.target.value) || 0)}
                                          disabled={isDisabled}
                                          className={`w-full px-2 py-1 border border-slate-200 rounded text-xs text-center bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDisabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                          placeholder="KM"
                                        />
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={entry.expenses || ""}
                                          onChange={e => updateEntry(row.projectId, date, 'expenses', parseFloat(e.target.value) || 0)}
                                          disabled={isDisabled}
                                          className={`w-full px-2 py-1 border border-slate-200 rounded text-xs text-center bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-500 ${isDisabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                          placeholder="€ Onkosten"
                                        />
                                        <input
                                          type="text"
                                          value={entry.notes || ""}
                                          onChange={e => updateEntry(row.projectId, date, 'notes', e.target.value)}
                                          disabled={isDisabled}
                                          className={`w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDisabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                          placeholder="Opmerking"
                                        />
                                      </div>
                                    );
                                  })}
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-sm font-bold text-blue-600">{weekTotal}u</span>
                                    <span className="text-xs text-slate-600">{weekKmTotal} km</span>
                                    <span className="text-xs text-slate-600">€ {weekExpensesTotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-slate-50 border-t border-slate-200">
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                            <div />
                            <div className="font-semibold text-slate-700">Totaal per dag</div>
                            {weekDaysForWeek.map(day => {
                              const dayTotal = projectRows.reduce((sum, row) => {
                                const key = `${formatDate(day)}-${row.projectId}`;
                                return sum + (entries[key]?.hours || 0);
                              }, 0);
                              const dayKmTotal = projectRows.reduce((sum, row) => {
                                const key = `${formatDate(day)}-${row.projectId}`;
                                return sum + (entries[key]?.km || 0);
                              }, 0);
                              const dayExpensesTotal = projectRows.reduce((sum, row) => {
                                const key = `${formatDate(day)}-${row.projectId}`;
                                return sum + (entries[key]?.expenses || 0);
                              }, 0);
                              return (
                                <div key={formatDate(day)} className="flex flex-col items-center gap-0.5">
                                  <span className="text-sm font-bold text-blue-600">{dayTotal}u</span>
                                  <span className="text-xs text-slate-600">{dayKmTotal} km</span>
                                  <span className="text-xs text-slate-600">€ {dayExpensesTotal.toFixed(2)}</span>
                                </div>
                              );
                            })}
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-sm font-bold text-emerald-600">
                                {weekDaysForWeek.reduce((sum, day) => {
                                  return sum + projectRows.reduce((s, row) => {
                                    const key = `${formatDate(day)}-${row.projectId}`;
                                    return s + (entries[key]?.hours || 0);
                                  }, 0);
                                }, 0)}u
                              </span>
                              <span className="text-xs text-slate-600">
                                {weekDaysForWeek.reduce((sum, day) => {
                                  return sum + projectRows.reduce((s, row) => {
                                    const key = `${formatDate(day)}-${row.projectId}`;
                                    return s + (entries[key]?.km || 0);
                                  }, 0);
                                }, 0)} km
                              </span>
                              <span className="text-xs text-slate-600">
                                € {weekDaysForWeek.reduce((sum, day) => {
                                  return sum + projectRows.reduce((s, row) => {
                                    const key = `${formatDate(day)}-${row.projectId}`;
                                    return s + (entries[key]?.expenses || 0);
                                  }, 0);
                                }, 0).toFixed(2)}
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
                  <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200">
                      <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                        <div />
                        <div className="font-semibold text-slate-700">Project</div>
                        {weekDays.map((day, i) => (
                          <div key={i} className="text-center">
                            <div className="text-xs text-slate-500">{dayNames[i]}</div>
                            <div className="text-sm font-semibold text-slate-700">{day.getDate()}</div>
                          </div>
                        ))}
                        <div className="text-center font-semibold text-slate-700">Totaal</div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {projectRows.map(row => (
                        <div key={row.projectId} className="hover:bg-slate-50 transition-colors">
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                            <div />
                            <div>
                              <div className="text-xs text-slate-500">{row.companyName} › {row.projectGroupName}</div>
                              <div className="font-medium mb-2">{row.projectName}</div>
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
                            {weekDays.map(day => {
                              const date = formatDate(day);
                              const key = `${date}-${row.projectId}`;
                              const entry = entries[key] || { date, projectId: row.projectId, hours: 0, km: 0, expenses: 0, notes: "", status: "opgeslagen" };
                              const isSubmitted = entry.status === "ingeleverd";
                              return (
                                <div key={date} className="space-y-1">
                                  {!isSubmitted && (
                                    <div className="flex gap-1 mb-1">
                                      <button
                                        onClick={() => copyCell(row.projectId, date)}
                                        className="flex-1 p-0.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"
                                        title="Kopieer cel"
                                      >
                                        Kopiëren
                                      </button>
                                      <button
                                        onClick={() => pasteCell(row.projectId, date)}
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
                                    onChange={e => updateEntry(row.projectId, date, 'hours', parseFloat(e.target.value) || 0)}
                                    disabled={isSubmitted}
                                    className={`w-full px-2 py-1.5 border border-slate-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${isSubmitted ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                    placeholder="Uren"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    value={entry.km || ""}
                                    onChange={e => updateEntry(row.projectId, date, 'km', parseInt(e.target.value) || 0)}
                                    disabled={isSubmitted}
                                    className={`w-full px-2 py-1 border border-slate-200 rounded text-xs text-center bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isSubmitted ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                    placeholder="KM"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={entry.expenses || ""}
                                    onChange={e => updateEntry(row.projectId, date, 'expenses', parseFloat(e.target.value) || 0)}
                                    disabled={isSubmitted}
                                    className={`w-full px-2 py-1 border border-slate-200 rounded text-xs text-center bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-500 ${isSubmitted ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                    placeholder="€ Onkosten"
                                  />
                                  <input
                                    type="text"
                                    value={entry.notes || ""}
                                    onChange={e => updateEntry(row.projectId, date, 'notes', e.target.value)}
                                    disabled={isSubmitted}
                                    className={`w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isSubmitted ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                    placeholder="Opmerking"
                                  />
                                </div>
                              );
                            })}
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="text-sm font-bold text-blue-600">{getTotalProject(row.projectId)}u</span>
                              <span className="text-xs text-slate-600">{getTotalKmProject(row.projectId)} km</span>
                              <span className="text-xs text-slate-600">€ {getTotalExpensesProject(row.projectId).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border-t border-slate-200">
                      <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                        <div />
                        <div className="font-semibold text-slate-700">Totaal per dag</div>
                        {weekDays.map(day => (
                          <div key={formatDate(day)} className="flex flex-col items-center gap-0.5">
                            <span className="text-sm font-bold text-blue-600">{getTotalDay(formatDate(day))}u</span>
                            <span className="text-xs text-slate-600">{getTotalKmDay(formatDate(day))} km</span>
                            <span className="text-xs text-slate-600">€ {getTotalExpensesDay(formatDate(day)).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-bold text-emerald-600">{getTotalWeek()}u</span>
                          <span className="text-xs text-slate-600">{getTotalKmWeek()} km</span>
                          <span className="text-xs text-slate-600">€ {getTotalExpensesWeek().toFixed(2)}</span>
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
