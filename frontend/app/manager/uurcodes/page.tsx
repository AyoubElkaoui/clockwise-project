"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import axios from "axios";
import {
  ListChecks,
  Search,
  Clock,
  Plane,
  AlertTriangle,
  Briefcase,
  Filter,
} from "lucide-react";

interface TaskCode {
  id: number;
  code: string;
  description: string;
  shortName: string | null;
  isHistorical: boolean;
}

type CategoryKey = "all" | "indirect" | "verlof" | "ziekte" | "werk";

interface Category {
  key: CategoryKey;
  label: string;
  icon: typeof ListChecks;
  color: string;
  bgColor: string;
  match: (code: string) => boolean;
  urensoort: string;
}

const categories: Category[] = [
  {
    key: "indirect",
    label: "Indirecte Uren",
    icon: Briefcase,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    match: (code) => code.startsWith("I"),
    urensoort: "200",
  },
  {
    key: "verlof",
    label: "Verlof / ADV",
    icon: Plane,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    match: (code) =>
      code.startsWith("Z0") ||
      code.startsWith("Z1") ||
      code === "SLEEFTIJD",
    urensoort: "300",
  },
  {
    key: "ziekte",
    label: "Ziekteverzuim",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    match: (code) =>
      code.startsWith("Z2") || code.startsWith("Z3") || code.startsWith("Z4"),
    urensoort: "400",
  },
  {
    key: "werk",
    label: "Werkuren",
    icon: Clock,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    match: (code) => /^\d/.test(code),
    urensoort: "100",
  },
];

function getCategory(code: string): Category | undefined {
  return categories.find((cat) => cat.match(code));
}

function getUrensoort(code: string): string {
  const cat = getCategory(code);
  return cat?.urensoort ?? "-";
}

export default function UurcodesPage() {
  const [tasks, setTasks] = useState<TaskCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryKey>("all");
  const [showHistorical, setShowHistorical] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [showHistorical]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/tasks?includeHistorical=${showHistorical}`,
        { headers: { "ngrok-skip-browser-warning": "1" } }
      );
      setTasks(response.data.tasks || []);
      setError(null);
    } catch (err) {
      setError("Kon uurcodes niet ophalen uit Syntess");
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (
        !task.code.toLowerCase().includes(query) &&
        !task.description.toLowerCase().includes(query) &&
        !(task.shortName || "").toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    // Category filter
    if (activeFilter !== "all") {
      const cat = categories.find((c) => c.key === activeFilter);
      if (cat && !cat.match(task.code)) return false;
    }
    return true;
  });

  // Count per category
  const categoryCounts = categories.reduce(
    (acc, cat) => {
      acc[cat.key] = tasks.filter((t) => cat.match(t.code)).length;
      return acc;
    },
    {} as Record<string, number>
  );

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
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Uurcodes
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Overzicht van alle uurcodes uit Syntess (AT_TAAK)
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() =>
                setActiveFilter(activeFilter === cat.key ? "all" : cat.key)
              }
              className={`p-3 md:p-4 rounded-xl border transition-all text-left ${
                activeFilter === cat.key
                  ? `${cat.bgColor} border-current ring-1 ring-current ${cat.color}`
                  : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${cat.color}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  {cat.label}
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {categoryCounts[cat.key] || 0}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek op code of omschrijving..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showHistorical}
            onChange={(e) => setShowHistorical(e.target.checked)}
            className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700 dark:text-slate-300">
            Historische tonen
          </span>
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Active filter indicator */}
      {activeFilter !== "all" && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-slate-400">
            Filter:{" "}
            <span className="font-medium text-gray-700 dark:text-slate-300">
              {categories.find((c) => c.key === activeFilter)?.label}
            </span>
          </span>
          <button
            onClick={() => setActiveFilter("all")}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Wis filter
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">
                  Code
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">
                  Omschrijving
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 hidden sm:table-cell">
                  Korte naam
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 hidden md:table-cell">
                  Categorie
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 hidden md:table-cell">
                  Urensoort
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500 dark:text-slate-400"
                  >
                    {searchQuery || activeFilter !== "all"
                      ? "Geen uurcodes gevonden voor deze zoekopdracht"
                      : "Geen uurcodes beschikbaar"}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const cat = getCategory(task.code);
                  return (
                    <tr
                      key={`${task.id}-${task.code}`}
                      className={`border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${
                        task.isHistorical ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <code className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 font-mono text-xs font-bold">
                          {task.code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {task.description}
                        {task.isHistorical && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400">
                            historisch
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell">
                        {task.shortName || "-"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {cat && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cat.bgColor} ${cat.color}`}
                          >
                            <cat.icon className="w-3 h-3" />
                            {cat.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
                          {getUrensoort(task.code)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-xs text-gray-500 dark:text-slate-400">
          {filteredTasks.length} van {tasks.length} uurcodes
        </div>
      </div>
    </div>
  );
}
