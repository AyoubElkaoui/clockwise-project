"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  ChevronLeft,
  Send,
  Calendar,
  Loader2,
} from "lucide-react";
import { getWeekEntries, saveBulkEntries, submitEntries, deleteEntry } from "@/lib/api/timeEntryApi";
import { getCompanies, getProjectGroups, getProjects, type Company, type ProjectGroup, type Project } from "@/lib/api/companyApi";
import { ToastContainer } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDays(date: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(date);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diff));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function getMonthWeeks(date: Date): Date[][] {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  
  // Get the Monday of the week containing the first day
  const startDate = new Date(firstDay);
  const day = startDate.getDay();
  const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
  startDate.setDate(diff);
  
  const weeks: Date[][] = [];
  let currentWeekStart = new Date(startDate);
  
  // Generate weeks until we pass the last day of the month
  while (currentWeekStart <= lastDay || weeks.length < 4) {
    const weekDays = getWeekDays(currentWeekStart);
    weeks.push(weekDays);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    
    // Stop if we have 6 weeks (max for any month)
    if (weeks.length >= 6) break;
  }
  
  return weeks;
}

interface TimeEntry {
  date: string;
  companyId: number;
  projectGroupId: number;
  projectId: number;
  hours: number;
  km: number;
  expenses: number;
  breakMinutes: number;
  notes: string;
}

function TijdRegistratiePage() {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [entries, setEntries] = useState<Record<string, TimeEntry>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<number[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId] = useState(1); // TODO: Haal dit uit auth context
  
  // Data uit database
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projectGroups, setProjectGroups] = useState<Record<number, ProjectGroup[]>>({});
  const [projects, setProjects] = useState<Record<number, Project[]>>({});

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  // Laad companies bij mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Laad entries wanneer week verandert
  useEffect(() => {
    loadWeekEntries();
  }, [currentWeek]);

  const loadCompanies = async () => {
    try {
      const companiesList = await getCompanies();
      setCompanies(companiesList);
    } catch (error) {
      console.error("Failed to load companies:", error);
      addToast("Kon bedrijven niet laden uit database", "error");
    }
  };

  const loadWeekEntries = async () => {
    setLoading(true);
    try {
      const startDate = formatDateForInput(weekDays[0]);
      const data = await getWeekEntries(userId, startDate);
      
      // Converteer array naar object met date als key
      const entriesMap: Record<string, TimeEntry> = {};
      data.forEach((entry: any) => {
        entriesMap[entry.date] = {
          date: entry.date,
          companyId: entry.companyId || 0,
          projectGroupId: entry.projectGroupId || 0,
          projectId: entry.projectId || 0,
          hours: entry.hours,
          km: entry.km,
          expenses: entry.expenses,
          breakMinutes: entry.breakMinutes,
          notes: entry.notes || "",
        };
      });
      
      setEntries(entriesMap);
    } catch (error) {
      console.error("Failed to load entries:", error);
      addToast("Kon uren niet laden uit database", "error");
    } finally {
      setLoading(false);
    }
  };

  const prevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const selectProject = (companyId: number, groupId: number, projectId: number) => {
    if (!selectedDay) return;
    
    setEntries((prev) => ({
      ...prev,
      [selectedDay]: {
        date: selectedDay,
        companyId,
        projectGroupId: groupId,
        projectId,
        hours: prev[selectedDay]?.hours || 8,
        km: prev[selectedDay]?.km || 0,
        expenses: prev[selectedDay]?.expenses || 0,
        breakMinutes: prev[selectedDay]?.breakMinutes || 30,
        notes: prev[selectedDay]?.notes || "",
      },
    }));
  };

  const updateEntry = (date: string, field: keyof TimeEntry, value: any) => {
    setEntries((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
      },
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const entriesToSave = Object.values(entries).map(entry => ({
        ...entry,
        status: "opgeslagen"
      }));
      
      await saveBulkEntries(userId, entriesToSave);
      addToast("Uren succesvol opgeslagen!", "success");
      await loadWeekEntries(); // Reload om IDs te krijgen
    } catch (error) {
      console.error("Save failed:", error);
      addToast("Opslaan mislukt. Probeer opnieuw.", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitAll = async () => {
    setSaving(true);
    try {
      // Eerst opslaan
      const entriesToSave = Object.values(entries).map(entry => ({
        ...entry,
        status: "ingeleverd"
      }));
      
      await saveBulkEntries(userId, entriesToSave);
      addToast("Uren ingeleverd voor goedkeuring!", "success");
      await loadWeekEntries();
    } catch (error) {
      console.error("Submit failed:", error);
      addToast("Inleveren mislukt. Probeer opnieuw.", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyWeek = async () => {
    const confirmed = confirm("Wil je deze week dupliceren naar de volgende week?");
    if (!confirmed) return;
    
    const nextWeekStart = new Date(currentWeek);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekDays = getWeekDays(nextWeekStart);
    
    const newEntries: TimeEntry[] = [];
    
    weekDays.forEach((currentDay, index) => {
      const currentDateStr = formatDateForInput(currentDay);
      const nextDateStr = formatDateForInput(nextWeekDays[index]);
      
      if (entries[currentDateStr]) {
        newEntries.push({
          ...entries[currentDateStr],
          date: nextDateStr,
        });
      }
    });
    
    if (newEntries.length > 0) {
      setSaving(true);
      try {
        await saveBulkEntries(userId, newEntries);
        setCurrentWeek(nextWeekStart);
        addToast("Week succesvol gedupliceerd!", "success");
      } catch (error) {
        addToast("Dupliceren mislukt. Probeer opnieuw.", "error");
      } finally {
        setSaving(false);
      }
    }
  };

  const getTotalHours = () => {
    return weekDays.reduce((sum, day) => {
      const dateStr = formatDateForInput(day);
      return sum + (entries[dateStr]?.hours || 0);
    }, 0);
  };

  const toggleCompany = async (id: number) => {
    setExpandedCompanies(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    
    // Laad project groups voor deze company als ze nog niet geladen zijn
    if (!projectGroups[id]) {
      try {
        const groups = await getProjectGroups(id);
        setProjectGroups(prev => ({ ...prev, [id]: groups }));
      } catch (error) {
        console.error("Failed to load project groups:", error);
      }
    }
  };

  const toggleGroup = async (id: number) => {
    setExpandedGroups(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    
    // Laad projects voor deze group als ze nog niet geladen zijn
    if (!projects[id]) {
      try {
        const projectList = await getProjects(id);
        setProjects(prev => ({ ...prev, [id]: projectList }));
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    }
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-slate-900">
          {/* LEFT SIDEBAR - Project Tree */}
          <div className="w-80 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-4">
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Zoeken..."
                  className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                {companies.map((company) => (
                  <div key={company.id}>
                    <div
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                      onClick={() => toggleCompany(company.id)}
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          expandedCompanies.includes(company.id) ? "rotate-90" : ""
                        }`}
                      />
                      <span className="font-medium">{company.name}</span>
                    </div>

                    {expandedCompanies.includes(company.id) && (
                      <div className="ml-6">
                        {projectGroups[company.id]?.map((group) => (
                          <div key={group.id}>
                            <div
                              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                              onClick={() => toggleGroup(group.id)}
                            >
                              <ChevronRight
                                className={`w-4 h-4 transition-transform ${
                                  expandedGroups.includes(group.id) ? "rotate-90" : ""
                                }`}
                              />
                              <span className="text-sm">{group.name}</span>
                            </div>

                            {expandedGroups.includes(group.id) && (
                              <div className="ml-6">
                                {projects[group.id]?.map((project) => (
                                  <div
                                    key={project.id}
                                    className={`px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer ${
                                      entries[selectedDay || ""]?.projectId === project.id
                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                        : ""
                                    }`}
                                    onClick={() => selectProject(company.id, group.id, project.id)}
                                  >
                                    {project.name}
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
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">Uren Registreren</h1>
                
                {/* Help button */}
                <button
                  onClick={() => {
                    const helpText = `Hoe werkt tijd registratie?

1. 📁 Selecteer eerst een bedrijf door op de naam te klikken
2. 📂 Klik op een project groep om projecten te zien  
3. ✅ Klik op een project om deze te selecteren
4. 📅 Klik op een dag in de week om uren in te voeren
5. ⏱️ Vul je uren, kilometers, onkosten en pauze in
6. 💾 Klik "Opslaan" om je uren op te slaan als concept
7. 📤 Klik "Inleveren" om je week in te dienen voor goedkeuring
8. 📋 Gebruik "Dupliceer Week" om vorige week te kopiëren`;
                    
                    addToast(helpText, "info");
                  }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  title="Help"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("week")}
                  >
                    Week
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                  >
                    Maand
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevWeek}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <select className="px-3 py-1 border rounded bg-white dark:bg-slate-800 text-sm">
                    <option>
                      Week {getWeekNumber(currentWeek)} ({weekDays[0].getDate()} {weekDays[0].toLocaleDateString("nl-NL", { month: "short" })} - {weekDays[6].getDate()} {weekDays[6].toLocaleDateString("nl-NL", { month: "short" })})
                    </option>
                  </select>
                  <Button variant="outline" size="sm" onClick={nextWeek}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyWeek}
                  disabled={saving || Object.keys(entries).length === 0}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Copy className="w-4 h-4 mr-1" />}
                  Dupliceer Week
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={saveAll}
                  disabled={saving || Object.keys(entries).length === 0}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  💾 Opslaan
                </Button>
                <Button 
                  size="sm"
                  onClick={submitAll}
                  disabled={saving || Object.keys(entries).length === 0}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                  Inleveren
                </Button>
              </div>
            </div>

            {/* WEEK VIEW */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-slate-600">Uren laden...</span>
                </div>
              ) : viewMode === "week" ? (
                <div className="grid grid-cols-7 gap-2 mb-6">
                  {weekDays.map((day, index) => {
                    const dateStr = formatDateForInput(day);
                    const entry = entries[dateStr];
                    const isToday = formatDateForInput(new Date()) === dateStr;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                      <div
                        key={dateStr}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedDay === dateStr
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : isToday
                            ? "border-blue-300 bg-blue-50/50"
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                        } ${isWeekend ? "opacity-60" : ""}`}
                        onClick={() => setSelectedDay(dateStr)}
                      >
                        <div className="text-center">
                          <div className="text-xs text-slate-500 mb-1">
                            {dayNames[index]}
                          </div>
                          <div className={`text-2xl font-bold ${isToday ? "text-blue-600" : ""}`}>
                            {day.getDate()}
                          </div>
                          {entry && (
                            <div className="mt-2 text-sm text-slate-600">
                              {entry.hours}u
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* MONTH VIEW */
                <div className="space-y-3 mb-6">
                  {getMonthWeeks(currentWeek).map((week, weekIndex) => {
                    const weekTotal = week.reduce((sum, day) => {
                      const dateStr = formatDateForInput(day);
                      return sum + (entries[dateStr]?.hours || 0);
                    }, 0);

                    return (
                      <div key={weekIndex} className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Week {getWeekNumber(week[0])}
                          </span>
                          <span className="text-xs text-slate-500">
                            {week[0].getDate()} {week[0].toLocaleDateString("nl-NL", { month: "short" })} - {week[6].getDate()} {week[6].toLocaleDateString("nl-NL", { month: "short" })}
                          </span>
                          <Badge variant={weekTotal >= 40 ? "success" : "secondary"} className="ml-auto text-xs">
                            {weekTotal}u
                          </Badge>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {week.map((day, dayIndex) => {
                            const dateStr = formatDateForInput(day);
                            const entry = entries[dateStr];
                            const isToday = formatDateForInput(new Date()) === dateStr;
                            const isCurrentMonth = day.getMonth() === currentWeek.getMonth();

                            return (
                              <div
                                key={dateStr}
                                className={`p-2 text-center rounded cursor-pointer transition-all ${
                                  selectedDay === dateStr
                                    ? "bg-blue-500 text-white"
                                    : isToday
                                    ? "bg-blue-100 dark:bg-blue-900/30"
                                    : entry
                                    ? "bg-white dark:bg-slate-700 hover:bg-blue-50"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-700"
                                } ${!isCurrentMonth ? "opacity-40" : ""}`}
                                onClick={() => setSelectedDay(dateStr)}
                              >
                                <div className="text-xs font-medium">{day.getDate()}</div>
                                {entry && (
                                  <div className="text-xs mt-1">{entry.hours}u</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedDay && entries[selectedDay] && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">
                      {dayNames[new Date(selectedDay).getDay() === 0 ? 6 : new Date(selectedDay).getDay() - 1]}{" "}
                      {new Date(selectedDay).getDate()}{" "}
                      {new Date(selectedDay).toLocaleDateString("nl-NL", { month: "long" })}
                    </h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-1" />
                        Kopieer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newEntries = { ...entries };
                          delete newEntries[selectedDay];
                          setEntries(newEntries);
                          setSelectedDay(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Uren *</label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="15"
                          value={entries[selectedDay]?.hours || ""}
                          onChange={(e) => updateEntry(selectedDay, "hours", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Kilometers</label>
                        <Input
                          type="number"
                          min="0"
                          value={entries[selectedDay]?.km || ""}
                          onChange={(e) => updateEntry(selectedDay, "km", parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Onkosten (€)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entries[selectedDay]?.expenses || ""}
                          onChange={(e) => updateEntry(selectedDay, "expenses", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Pauze (min)</label>
                        <Input
                          type="number"
                          min="0"
                          step="5"
                          value={entries[selectedDay]?.breakMinutes || 30}
                          onChange={(e) => updateEntry(selectedDay, "breakMinutes", parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Opmerkingen</label>
                        <Input
                          value={entries[selectedDay]?.notes || ""}
                          onChange={(e) => updateEntry(selectedDay, "notes", e.target.value)}
                          placeholder="Bijv: Werkzaamheden op locatie..."
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {!selectedDay && (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Selecteer een dag om te beginnen</p>
                  <p className="text-sm">Klik op een dag in de week hierboven om uren te registreren</p>
                </div>
              )}

              {!loading && (
                <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Totaal deze week</div>
                    <div className="text-2xl font-bold">{getTotalHours()} uren</div>
                  </div>
                  <Badge variant={getTotalHours() >= 40 ? "success" : "secondary"} className="text-lg px-4 py-2">
                    {getTotalHours()}/40u
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModernLayout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ProtectedRoute>
  );
}

export default TijdRegistratiePage;
