"use client";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { showToast } from "@/components/ui/toast";
import { getVacationRequests, processVacationRequest } from "@/lib/api";
import {
  Calendar,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  hours: number;
  reason?: string;
  status: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
}

export default function AdminVacationRequestsPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getVacationRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(t("common.errorLoading"), "error");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const userName =
        request.user?.fullName ||
        `${request.user?.firstName || ""} ${request.user?.lastName || ""}`.trim();
      const matchesSearch =
        !searchTerm ||
        userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.reason && request.reason.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  const handleViewDetails = (request: VacationRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleApprove = async (id: number) => {
    try {
      await processVacationRequest(id, "approved");
      setRequests(requests.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
      showToast("Vakantie-aanvraag goedgekeurd", "success");
    } catch (error) {
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await processVacationRequest(id, "rejected");
      setRequests(requests.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
      showToast("Vakantie-aanvraag afgekeurd", "success");
    } catch (error) {
      showToast("Fout bij afkeuren", "error");
    }
  };

  const exportRequests = () => {
    const csvContent = [
      ["Gebruiker", "Startdatum", "Einddatum", "Uren", "Dagen", "Reden", "Status"].join(","),
      ...filteredRequests.map((request) => {
        const userName =
          request.user?.fullName ||
          `${request.user?.firstName || ""} ${request.user?.lastName || ""}`.trim();
        const days = Math.ceil(request.hours / 8);
        return [
          `"${userName}"`,
          dayjs(request.startDate).format("YYYY-MM-DD"),
          dayjs(request.endDate).format("YYYY-MM-DD"),
          request.hours,
          days,
          `"${request.reason || ""}"`,
          request.status,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vakantie-aanvragen-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            Goedgekeurd
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            In Behandeling
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Afgekeurd
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Onbekend
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Vakantie Beheer</h1>
          <p className="text-xs text-slate-500 mt-0.5">Beheer en verwerk vakantie-aanvragen</p>
        </div>
        <button
          onClick={exportRequests}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium rounded-md transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporteren
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Totaal</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">In Behandeling</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Goedgekeurd</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.approved}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Afgekeurd</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filters &amp; Zoeken</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle aanvragen ({stats.total})</option>
              <option value="pending">In Behandeling ({stats.pending})</option>
              <option value="approved">Goedgekeurd ({stats.approved})</option>
              <option value="rejected">Afgekeurd ({stats.rejected})</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Zoeken</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="h-9 w-full pl-9 pr-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Naam of reden..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Eye className="w-5 h-5 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Vakantie-aanvragen ({filteredRequests.length})
          </h2>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <Calendar className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen aanvragen gevonden</p>
            <p className="text-xs text-slate-500 mt-1">Probeer andere filters of wacht op nieuwe aanvragen.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gebruiker</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Periode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uren</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dagen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reden</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const userName =
                  request.user?.fullName ||
                  `${request.user?.firstName || ""} ${request.user?.lastName || ""}`.trim() ||
                  "Onbekend";
                const days = Math.ceil(request.hours / 8);

                return (
                  <tr
                    key={request.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {userName.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{userName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 tabular-nums">
                      {dayjs(request.startDate).format("DD-MM-YYYY")} &ndash; {dayjs(request.endDate).format("DD-MM-YYYY")}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {request.hours}u
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{days} dagen</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {request.reason || "Geen reden"}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(request.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {request.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="p-1.5 rounded text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                              title="Goedkeuren"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Afkeuren"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vakantie-aanvraag Details</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Gebruiker</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedRequest.user?.fullName || "Onbekend"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Periode</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {dayjs(selectedRequest.startDate).format("DD MMMM YYYY")} &ndash; {dayjs(selectedRequest.endDate).format("DD MMMM YYYY")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Totaal Uren</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedRequest.hours} uur
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Werkdagen</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {Math.ceil(selectedRequest.hours / 8)} dagen
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              {selectedRequest.reason && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Reden</p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <p className="text-sm text-slate-900 dark:text-slate-100">{selectedRequest.reason}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium rounded-md transition-colors"
                >
                  Sluiten
                </button>
                {selectedRequest.status === "pending" && (
                  <>
                    <button
                      onClick={() => { handleReject(selectedRequest.id); setShowDetailsModal(false); }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Afkeuren
                    </button>
                    <button
                      onClick={() => { handleApprove(selectedRequest.id); setShowDetailsModal(false); }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Goedkeuren
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
