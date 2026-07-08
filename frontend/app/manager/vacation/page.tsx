"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getAllUsers, getAllVacationRequests, updateVacationRequestStatus } from "@/lib/manager-api";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import {
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  Calendar,
} from "lucide-react";
import dayjs from "dayjs";

export default function ManagerVacationPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [filteredUser, setFilteredUser] = useState<any>(null);

  const filterRequests = () => {
    let filtered = requests;
    if (filterStatus !== "all") {
      if (filterStatus === "pending") {
        filtered = filtered.filter((r) =>
          r.status?.toLowerCase() === "pending" ||
          r.status?.toLowerCase() === "submitted"
        );
      } else {
        filtered = filtered.filter((r) => r.status?.toLowerCase() === filterStatus.toLowerCase());
      }
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.userFirstName?.toLowerCase().includes(query) ||
          r.userLastName?.toLowerCase().includes(query),
      );
    }
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt || b.startDate).getTime() -
        new Date(a.createdAt || a.startDate).getTime(),
    );
    setFilteredRequests(filtered);
  };

  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId) {
      setFilterStatus("all");
    }
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, filterStatus]);

  const loadRequests = async () => {
    try {
      const managerId = authUtils.getUserId();
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const userId = searchParams.get("userId");
      const [users, allRequests] = await Promise.all([
        getAllUsers(),
        getAllVacationRequests()
      ]);

      const team = users.filter((u: any) => u.managerId === managerId);
      const teamIds = team.map((u: any) => u.id || u.medewGcId);

      let teamRequests;

      if (userId) {
        const user = team.find((u: any) => u.id === Number(userId) || u.medewGcId === Number(userId));
        if (user) {
          setFilteredUser(user);
          teamRequests = allRequests.filter((r: any) => r.userId === Number(userId));
        } else {
          showToast("Gebruiker niet gevonden in team", "error");
          teamRequests = [];
        }
      } else {
        teamRequests = allRequests.filter((r: any) => teamIds.includes(r.userId));
      }

      setRequests(teamRequests);
    } catch (error) {
      showToast("Fout bij laden vakantieaanvragen", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, comment: string) => {
    try {
      await updateVacationRequestStatus(id, "approved", comment);
      showToast("✅ Vakantie succesvol goedgekeurd! Werknemer ontvangt een notificatie.", "success");
      setSelectedRequest(null);
      setComment("");
      loadRequests();
    } catch (error) {
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (id: number, comment: string) => {
    try {
      await updateVacationRequestStatus(id, "rejected", comment);
      showToast("❌ Vakantie afgekeurd. Werknemer ontvangt een notificatie.", "success");
      setSelectedRequest(null);
      setComment("");
      loadRequests();
    } catch (error) {
      showToast("Fout bij afkeuren", "error");
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    return dayjs(endDate).diff(dayjs(startDate), "day") + 1;
  };

  const getStatusBadge = (status: string) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case "approved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            Goedgekeurd
          </span>
        );
      case "submitted":
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            In afwachting
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
            {status}
          </span>
        );
    }
  };

  const pendingCount = requests.filter((r) =>
    r.status?.toLowerCase() === "pending" || r.status?.toLowerCase() === "submitted"
  ).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {filteredUser
            ? `Vakantie - ${filteredUser.firstName} ${filteredUser.lastName}`
            : "Vakantie Verzoeken"}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {pendingCount} verzoeken wachten op goedkeuring
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Zoek op naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {s === "pending"
                  ? "In afwachting"
                  : s === "approved"
                  ? "Goedgekeurd"
                  : s === "rejected"
                  ? "Afgekeurd"
                  : "Alles"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Request list */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen verzoeken</p>
          <p className="text-sm text-slate-500 mt-1">
            Geen vakantie verzoeken gevonden voor de geselecteerde filters
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {request.userFirstName?.charAt(0)}{request.userLastName?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {request.userFirstName} {request.userLastName}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {request.user?.function || "Medewerker"}
                  </p>
                </div>
              </div>

              {/* Date info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-3">
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" />Start Datum
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {dayjs(request.startDate).format("DD MMM YYYY")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" />Eind Datum
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {dayjs(request.endDate).format("DD MMM YYYY")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Aantal Dagen</p>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {calculateDays(request.startDate, request.endDate)} dagen
                  </p>
                </div>
              </div>

              {request.reason && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-slate-500 mb-1">Reden:</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{request.reason}</p>
                </div>
              )}

              {request.managerComment && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Manager Opmerking:</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{request.managerComment}</p>
                </div>
              )}

              {(request.status?.toLowerCase() === "pending" ||
                request.status?.toLowerCase() === "submitted") &&
                (selectedRequest?.id === request.id ? (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                    <textarea
                      placeholder="Voeg een opmerking toe (optioneel)..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id, comment)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Goedkeuren
                      </button>
                      <button
                        onClick={() => handleReject(request.id, comment)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Afkeuren
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(null);
                          setComment("");
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      Behandelen
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
