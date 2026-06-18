"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { getAllUsers } from "@/lib/manager-api";
import axios from "axios";
import {
  ListChecks,
  Search,
  Users,
  Save,
  ChevronDown,
  Briefcase,
  Plane,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { showToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

interface TaskCode {
  id: number;
  code: string;
  description: string;
  shortName: string | null;
  isHistorical: boolean;
}

interface Allocation {
  taskCode: string;
  taskDescription: string;
  annualBudget: number;
  used: number;
}

interface TeamMember {
  medewGcId: number;
  firstName: string;
  lastName: string;
  rank: string;
  isActive: boolean;
  contractHours: number;
}

function getCategoryInfo(code: string) {
  if (code.startsWith("I"))
    return { label: "Indirect", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Briefcase };
  if (code.startsWith("Z0") || code.startsWith("Z1") || code === "SLEEFTIJD")
    return { label: "Verlof", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: Plane };
  if (code.startsWith("Z2") || code.startsWith("Z3") || code.startsWith("Z4"))
    return { label: "Ziekte", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle };
  return { label: "Werk", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: Clock };
}

export default function UurcodesPage() {
  const [tasks, setTasks] = useState<TaskCode[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`, { headers: { "ngrok-skip-browser-warning": "1" } }),
        getAllUsers(),
      ]);

      // Filter to relevant uurcodes (I, Z, SLEEFTIJD)
      const allTasks = (tasksRes.data.tasks || []).filter(
        (t: TaskCode) =>
          t.code.startsWith("I") ||
          t.code.startsWith("Z") ||
          t.code === "SLEEFTIJD"
      );
      setTasks(allTasks);

      const activeMembers = (usersRes || []).filter(
        (u: any) => u.rank !== "inactive" && u.isActive !== false
      );
      setTeamMembers(activeMembers);
    } catch (err) {
      console.error("Error loading data:", err);
      showToast("Fout bij laden gegevens", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAllocations = async (member: TeamMember) => {
    try {
      const res = await axios.get(
        `${API_URL}/users/${member.medewGcId}/hour-allocations`,
        { headers: { "ngrok-skip-browser-warning": "1" } }
      );
      setAllocations(res.data || []);
      setHasChanges(false);
    } catch {
      setAllocations([]);
    }
  };

  const handleSelectMember = (member: TeamMember) => {
    if (hasChanges) {
      if (!confirm("Je hebt onopgeslagen wijzigingen. Wil je doorgaan?")) return;
    }
    setSelectedMember(member);
    loadAllocations(member);
  };

  const getAllocation = (taskCode: string): Allocation | undefined => {
    return allocations.find((a) => a.taskCode === taskCode);
  };

  const updateBudget = (taskCode: string, taskDescription: string, value: number) => {
    setHasChanges(true);
    setAllocations((prev) => {
      const idx = prev.findIndex((a) => a.taskCode === taskCode);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], annualBudget: value };
        return updated;
      }
      return [...prev, { taskCode, taskDescription, annualBudget: value, used: 0 }];
    });
  };

  const handleSave = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      // Send all allocations that exist in state (including 0 to clear old values)
      await axios.put(
        `${API_URL}/users/${selectedMember.medewGcId}/hour-allocations`,
        {
          year: new Date().getFullYear(),
          allocations: allocations.map((a) => ({
            taskCode: a.taskCode,
            taskDescription: a.taskDescription,
            annualBudget: a.annualBudget,
            used: a.used || 0,
          })),
        }
      );
      showToast(
        `Toewijzingen opgeslagen voor ${selectedMember.firstName} ${selectedMember.lastName}`,
        "success"
      );
      setHasChanges(false);
    } catch {
      showToast("Fout bij opslaan", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      task.code.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <PageHeader
        title="Uurcode Toewijzingen"
        description="Stel per medewerker het jaarlijks budget in per uurcode"
        actions={
          selectedMember && hasChanges ? (
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Opslaan..." : "Opslaan"}
            </Button>
          ) : undefined
        }
      />

      {/* Team Member Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Selecteer medewerker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => (
              <button
                key={member.medewGcId}
                onClick={() => handleSelectMember(member)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  selectedMember?.medewGcId === member.medewGcId
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                </div>
                <span className="font-medium">
                  {member.firstName} {member.lastName}
                </span>
              </button>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-sm text-slate-400">Geen teamleden gevonden</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allocations Table */}
      {selectedMember ? (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Zoek uurcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                {selectedMember.firstName} {selectedMember.lastName}
                <span className="ml-1 text-slate-400 font-normal text-sm">
                  ({selectedMember.contractHours || 40} uur/week)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Omschrijving
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell w-24">
                        Categorie
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">
                        Budget
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">
                        Gebruikt
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">
                        Rest
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredTasks.map((task) => {
                      const alloc = getAllocation(task.code);
                      const budget = alloc?.annualBudget ?? 0;
                      const used = alloc?.used ?? 0;
                      const remaining = budget - used;
                      const cat = getCategoryInfo(task.code);

                      return (
                        <tr
                          key={task.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                            budget > 0 ? "" : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold">
                              {task.code}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white text-sm">
                            {task.description}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cat.color}`}>
                              {cat.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={budget || ""}
                              placeholder="0"
                              onChange={(e) =>
                                updateBudget(task.code, task.description, parseFloat(e.target.value) || 0)
                              }
                              className="w-16 h-8 text-center text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mx-auto"
                            />
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-sm font-mono">
                            {used > 0 ? used : "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {budget > 0 ? (
                              <span
                                className={`text-sm font-bold font-mono ${
                                  remaining < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : remaining <= budget * 0.1
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {remaining}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer with save */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {allocations.filter((a) => a.annualBudget > 0).length} van {tasks.length} uurcodes ingesteld
                </span>
                {hasChanges && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {saving ? "Opslaan..." : "Wijzigingen opslaan"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Selecteer een medewerker</p>
              <p className="text-sm text-slate-500 mt-1">Kies hierboven een teamlid om hun uurcode budgetten in te stellen</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
