"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building,
} from "lucide-react";
import dayjs from "dayjs";

export default function AdminApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ingeleverd");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const res = await fetch(`${API_URL}/time-entries`);
      if (!res.ok) throw new Error("Laden mislukt");
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      showToast("Fout bij laden uren", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    if (filterStatus !== "all") {
      filtered = filtered.filter((entry) => entry.status === filterStatus);
    }

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
  }, [entries, filterStatus, searchQuery]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/time-entries/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      if (!res.ok) throw new Error("Goedkeuren mislukt");
      showToast("Uren goedgekeurd!", "success");
      loadEntries();
    } catch (error) {
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/time-entries/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      });
      if (!res.ok) throw new Error("Afkeuren mislukt");
      showToast("Uren afgekeurd!", "success");
      loadEntries();
    } catch (error) {

    }
  };

  const handleBulkApprove = async () => {
    const pending = filteredEntries.filter((e) => e.status === "ingeleverd");
    for (const entry of pending) {
      await handleApprove(entry.id);
    }
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
            In behandeling
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingCount = entries.filter((e) => e.status === "ingeleverd").length;
  const approvedCount = entries.filter((e) => e.status === "goedgekeurd").length;
  const rejectedCount = entries.filter((e) => e.status === "afgekeurd").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Alle Goedkeuringen
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{pendingCount} in behandeling</p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Alles Goedkeuren ({pendingCount})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">IN BEHANDELING</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">GOEDGEKEURD</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{approvedCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">AFGEKEURD</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Zoek op naam, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        {(["ingeleverd", "goedgekeurd", "afgekeurd", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              filterStatus === s
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {s === "ingeleverd"
              ? "In behandeling"
              : s === "goedgekeurd"
              ? "Goedgekeurd"
              : s === "afgekeurd"
              ? "Afgekeurd"
              : "Alles"}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen registraties</p>
          <p className="text-sm text-slate-500 mt-1">
            Er zijn geen uren gevonden voor de huidige filter.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Medewerker
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Project
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Datum
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
              {filteredEntries.map((entry) => {
                const hours = (
                  (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
                    (entry.breakMinutes || 0)) /
                  60
                ).toFixed(2);
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {entry.user?.firstName?.charAt(0)}
                          {entry.user?.lastName?.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {entry.user?.firstName} {entry.user?.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{entry.project?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {dayjs(entry.startTime).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                      {dayjs(entry.startTime).format("HH:mm")} –{" "}
                      {dayjs(entry.endTime).format("HH:mm")}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {hours}u
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                    <td className="px-4 py-3">
                      {entry.status === "ingeleverd" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(entry.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Goedkeuren
                          </button>
                          <button
                            onClick={() => handleReject(entry.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Afkeuren
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
