"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import {
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import dayjs from "dayjs";

export default function AdminVacationPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/vacation-requests`);
      if (!res.ok) throw new Error("Laden mislukt");
      const data = await res.json();
      setRequests(data);
    } catch {
      showToast("Fout bij laden vakantieaanvragen", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (filterStatus !== "all") {
      filtered = filtered.filter((req) => req.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.user?.firstName?.toLowerCase().includes(query) ||
          req.user?.lastName?.toLowerCase().includes(query),
      );
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
  }, [requests, filterStatus, searchQuery]);

  const handleApprove = async (id: number, managerComment: string) => {
    try {
      const res = await fetch(`${API_URL}/vacation-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          managerComment: managerComment || undefined,
        }),
      });
      if (!res.ok) throw new Error("Goedkeuren mislukt");
      showToast("Vakantie aanvraag goedgekeurd!", "success");
      setSelectedRequest(null);
      setComment("");
      loadRequests();
    } catch {
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (id: number, managerComment: string) => {
    try {
      await fetch(`${API_URL}/vacation-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          managerComment: managerComment || undefined,
        }),
      });
      setSuccessMessage("Vakantie aanvraag afgekeurd!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setSelectedRequest(null);
      setComment("");
      loadRequests();
    } catch {}
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            Goedgekeurd
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            In behandeling
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            Afgekeurd
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const calculateDays = (start: string, end: string) =>
    dayjs(end).diff(dayjs(start), "day") + 1;

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Vakantie Aanvragen
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {pendingCount} in behandeling
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            In Behandeling
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {pendingCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            Goedgekeurd
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {approvedCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            Afgekeurd
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {rejectedCount}
          </p>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Zoek op naam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full pl-9 pr-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {status === "pending"
                  ? "In behandeling"
                  : status === "approved"
                    ? "Goedgekeurd"
                    : status === "rejected"
                      ? "Afgekeurd"
                      : "Alles"}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Requests */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Geen aanvragen
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Er zijn geen vakantie aanvragen gevonden voor de huidige filter.
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {request.user?.firstName?.charAt(0)}
                    {request.user?.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {request.user?.firstName} {request.user?.lastName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {request.user?.function || "Werknemer"}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {dayjs(request.startDate).format("DD MMM YYYY")} –{" "}
                        {dayjs(request.endDate).format("DD MMM YYYY")}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {calculateDays(request.startDate, request.endDate)}{" "}
                        dagen
                      </span>
                    </div>

                    {request.reason && (
                      <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-0.5">Reden</p>
                        <p className="text-sm text-slate-900 dark:text-slate-100">
                          {request.reason}
                        </p>
                      </div>
                    )}

                    {request.managerComment && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-500 mb-0.5">
                          Manager opmerking
                        </p>
                        <p className="text-sm text-slate-900 dark:text-slate-100">
                          {request.managerComment}
                        </p>
                      </div>
                    )}

                    {selectedRequest === request.id && (
                      <div className="mt-3 space-y-3">
                        <textarea
                          placeholder="Optionele opmerking..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleApprove(request.id, comment)
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Goedkeuren
                          </button>
                          <button
                            onClick={() => handleReject(request.id, comment)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Afkeuren
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(null);
                              setComment("");
                            }}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            Annuleren
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {request.status === "pending" &&
                  selectedRequest !== request.id && (
                    <button
                      onClick={() => setSelectedRequest(request.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex-shrink-0"
                    >
                      Behandelen
                    </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
