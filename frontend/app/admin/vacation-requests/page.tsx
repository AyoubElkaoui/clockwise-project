"use client";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
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
  const [selectedRequest, setSelectedRequest] =
    useState<VacationRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters
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
      console.error("Error loading vacation requests:", error);
      showToast(t("common.errorLoading"), "error");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;
      const userName =
        request.user?.fullName ||
        `${request.user?.firstName || ""} ${request.user?.lastName || ""}`.trim();
      const matchesSearch =
        !searchTerm ||
        userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.reason &&
          request.reason.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);

  // Stats
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
      setRequests(
        requests.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
      );
      showToast("Vakantie-aanvraag goedgekeurd", "success");
    } catch (error) {
      console.error("Error approving:", error);
      showToast("Fout bij goedkeuren", "error");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await processVacationRequest(id, "rejected");
      setRequests(
        requests.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
      );
      showToast("Vakantie-aanvraag afgekeurd", "success");
    } catch (error) {
      console.error("Error rejecting:", error);
      showToast("Fout bij afkeuren", "error");
    }
  };

  const exportRequests = () => {
    const csvContent = [
      [
        "Gebruiker",
        "Startdatum",
        "Einddatum",
        "Uren",
        "Dagen",
        "Reden",
        "Status",
      ].join(","),
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
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Goedgekeurd
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            In Behandeling
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            Afgekeurd
          </Badge>
        );
      default:
        return <Badge variant="secondary">Onbekend</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Vakantie-aanvragen laden...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Vakantie Beheer
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Beheer en verwerk vakantie-aanvragen
              </p>
            </div>
            <Button onClick={exportRequests} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporteren
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Totaal
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    In Behandeling
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.pending}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Goedgekeurd
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.approved}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Afgekeurd
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.rejected}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600" />
              Filters & Zoeken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="all">Alle aanvragen ({stats.total})</option>
                  <option value="pending">
                    In Behandeling ({stats.pending})
                  </option>
                  <option value="approved">
                    Goedgekeurd ({stats.approved})
                  </option>
                  <option value="rejected">Afgekeurd ({stats.rejected})</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Zoeken
                </label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Naam of reden..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" />
              Vakantie-aanvragen ({filteredRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Geen aanvragen gevonden
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Probeer andere filters of wacht op nieuwe aanvragen.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Gebruiker
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Periode
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Uren
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Dagen
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Reden
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        Acties
                      </th>
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
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white text-xs font-bold">
                                {userName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)}
                              </div>
                              <span className="font-medium">{userName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {dayjs(request.startDate).format("DD-MM-YYYY")} -{" "}
                            {dayjs(request.endDate).format("DD-MM-YYYY")}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{request.hours}u</Badge>
                          </td>
                          <td className="py-3 px-4">{days} dagen</td>
                          <td className="py-3 px-4 max-w-xs truncate">
                            {request.reason || "Geen reden"}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewDetails(request)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {request.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-emerald-600 hover:text-emerald-700"
                                    onClick={() => handleApprove(request.id)}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleReject(request.id)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Vakantie-aanvraag Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Gebruiker
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedRequest.user?.fullName || "Onbekend"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Periode
                    </label>
                    <p className="text-lg font-semibold">
                      {dayjs(selectedRequest.startDate).format("DD MMMM YYYY")}{" "}
                      - {dayjs(selectedRequest.endDate).format("DD MMMM YYYY")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Totaal Uren
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedRequest.hours} uur
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Werkdagen
                    </label>
                    <p className="text-lg font-semibold">
                      {Math.ceil(selectedRequest.hours / 8)} dagen
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Status
                    </label>
                    <div className="mt-1">
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                </div>

                {selectedRequest.reason && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Reden
                    </label>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mt-1">
                      <p className="text-slate-900 dark:text-slate-100">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  </div>
                )}

                {selectedRequest.status === "pending" && (
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsModal(false)}
                    >
                      Sluiten
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReject(selectedRequest.id);
                        setShowDetailsModal(false);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Afkeuren
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        handleApprove(selectedRequest.id);
                        setShowDetailsModal(false);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Goedkeuren
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
