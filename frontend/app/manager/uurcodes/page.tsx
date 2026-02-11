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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Uurcode Toewijzingen
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Stel per medewerker het jaarlijks budget in per uurcode
          </p>
        </div>
        {selectedMember && hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Opslaan..." : "Opslaan"}
          </button>
        )}
      </div>

      {/* Team Member Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Selecteer medewerker
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {teamMembers.map((member) => (
            <button
              key={member.medewGcId}
              onClick={() => handleSelectMember(member)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                selectedMember?.medewGcId === member.medewGcId
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700"
                  : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
              </div>
              <span className="font-medium">
                {member.firstName} {member.lastName}
              </span>
            </button>
          ))}
          {teamMembers.length === 0 && (
            <p className="text-sm text-gray-400">Geen teamleden gevonden</p>
          )}
        </div>
      </div>

      {/* Allocations Table */}
      {selectedMember ? (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek uurcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {selectedMember.firstName} {selectedMember.lastName}
                <span className="ml-2 text-gray-400 font-normal">
                  ({selectedMember.contractHours || 40} uur/week)
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-400 w-20">
                      Code
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-400">
                      Omschrijving
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-400 hidden md:table-cell w-24">
                      Categorie
                    </th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-400 w-24">
                      Budget
                    </th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-400 w-20">
                      Gebruikt
                    </th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 dark:text-slate-400 w-20">
                      Rest
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const alloc = getAllocation(task.code);
                    const budget = alloc?.annualBudget ?? 0;
                    const used = alloc?.used ?? 0;
                    const remaining = budget - used;
                    const cat = getCategoryInfo(task.code);

                    return (
                      <tr
                        key={task.id}
                        className={`border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors ${
                          budget > 0 ? "" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 font-mono text-xs font-bold">
                            {task.code}
                          </code>
                        </td>
                        <td className="px-4 py-2.5 text-gray-900 dark:text-white text-sm">
                          {task.description}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={budget || ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateBudget(task.code, task.description, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 h-8 text-center text-sm border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mx-auto"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-500 dark:text-slate-400 text-sm font-mono">
                          {used > 0 ? used : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {budget > 0 ? (
                            <span
                              className={`text-sm font-bold font-mono ${
                                remaining < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : remaining <= budget * 0.1
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {remaining}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer with save */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {allocations.filter((a) => a.annualBudget > 0).length} van {tasks.length} uurcodes ingesteld
              </span>
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Opslaan..." : "Wijzigingen opslaan"}
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-1">
            Selecteer een medewerker
          </h3>
          <p className="text-sm text-gray-400 dark:text-slate-500">
            Kies hierboven een teamlid om hun uurcode budgetten in te stellen
          </p>
        </div>
      )}
    </div>
  );
}
