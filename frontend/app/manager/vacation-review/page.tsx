"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import authUtils from "@/lib/auth-utils";
import {
  CheckCircle,
  XCircle,
  Search,
  Clock,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/nl";

dayjs.locale("nl");

interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  vacationType: string;
  totalDays: number;
  notes: string;
  status: string;
  createdAt?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ManagerVacationReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VacationRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("SUBMITTED");
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    const userRole = authUtils.getRole();
    if (userRole !== "manager") {
      showToast("Alleen managers kunnen vakantie aanvragen beoordelen", "error");
      router.push("/vakantie");
      return;
    }
    loadVacationRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, searchQuery, statusFilter]);

  const loadVacationRequests = async () => {
    try {
      setLoading(true);
      const medewGcId = authUtils.getMedewGcId();

      const response = await fetch(`${API_URL}/api/vacation/all`, {
        headers: {
          "X-MEDEW-GC-ID": medewGcId?.toString() || "",
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load vacation requests");
      }

      const data = await response.json();
      setRequests(data);
    } catch (error) {
      showToast("Fout bij laden van vakantie aanvragen", "error");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((r) =>
        r.status?.toUpperCase() === statusFilter ||
        (statusFilter === "SUBMITTED" && r.status?.toUpperCase() === "PENDING")
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.user?.firstName?.toLowerCase().includes(query) ||
          r.user?.lastName?.toLowerCase().includes(query) ||
          r.user?.email?.toLowerCase().includes(query) ||
          r.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (request: VacationRequest) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      setShowApproveModal(false);
      const managerId = authUtils.getUserId();

      const response = await fetch(`${API_URL}/api/vacation/${selectedRequest.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MEDEW-GC-ID": authUtils.getMedewGcId()?.toString() || "",
          "ngrok-skip-browser-warning": "1",
        },
        body: JSON.stringify({
          reviewedBy: managerId,
          managerComment: "Goedgekeurd",
        }),
      });

      if (!response.ok) {
        throw new Error("Kan vakantie aanvraag niet goedkeuren");
      }

      const userName = selectedRequest.user
        ? `${selectedRequest.user.firstName} ${selectedRequest.user.lastName}`
        : "Medewerker";
      showToast(`✓ Vakantie aanvraag van ${userName} goedgekeurd en verwerkt in Firebird`, "success");
      setSelectedRequest(null);
      await loadVacationRequests();
    } catch (error: any) {
      const errorMessage = error.message || "Er ging iets mis. Probeer het opnieuw.";
      showToast("✕ " + errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (request: VacationRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;

    if (!rejectionComment.trim()) {
      showToast("⚠️ Geef een duidelijke reden waarom de vakantie wordt afgekeurd", "warning");
      return;
    }

    try {
      setProcessing(true);
      const managerId = authUtils.getUserId();

      const response = await fetch(`${API_URL}/api/vacation/${selectedRequest.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MEDEW-GC-ID": authUtils.getMedewGcId()?.toString() || "",
          "ngrok-skip-browser-warning": "1",
        },
        body: JSON.stringify({
          reviewedBy: managerId,
          managerComment: rejectionComment.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Kan vakantie aanvraag niet afkeuren");
      }

      const userName = selectedRequest.user
        ? `${selectedRequest.user.firstName} ${selectedRequest.user.lastName}`
        : "Medewerker";
      showToast(`✓ Vakantie aanvraag van ${userName} afgekeurd. ${userName} krijgt een notificatie.`, "success");
      setShowRejectModal(false);
      setRejectionComment("");
      setSelectedRequest(null);
      await loadVacationRequests();
    } catch (error: any) {
      const errorMessage = error.message || "Er ging iets mis. Probeer het opnieuw.";
      showToast("✕ " + errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            Goedgekeurd
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Afgekeurd
          </span>
        );
      case "SUBMITTED":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            In behandeling
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getVacationType = (type: string) => {
    const types: Record<string, string> = {
      Z03: "Vakantie",
      Z01: "Ziekte",
      Z02: "Bijzonder verlof",
      Z04: "Onbetaald verlof",
    };
    return types[type] || type;
  };

  const calculateStats = () => {
    const pending = requests.filter((r) =>
      r.status?.toUpperCase() === "SUBMITTED" || r.status?.toUpperCase() === "PENDING"
    );
    const approved = requests.filter((r) => r.status?.toUpperCase() === "APPROVED");
    const rejected = requests.filter((r) => r.status?.toUpperCase() === "REJECTED");

    const totalDays = requests.reduce((sum, r) => sum + (r.totalDays || 0), 0);
    const pendingDays = pending.reduce((sum, r) => sum + (r.totalDays || 0), 0);

    return {
      total: requests.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      totalDays,
      pendingDays,
    };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = calculateStats();

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        title="Verlofaanvragen"
        description="Beoordeel en verwerk verlofaanvragen van je team"
        actions={
          stats.pending > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="w-3 h-3" />
              {stats.pending} wachtend
            </span>
          ) : undefined
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Te Behandelen"
          value={stats.pending}
          icon={Clock}
          color="amber"
          subtitle={`${stats.pendingDays} dagen`}
        />
        <StatCard
          title="Goedgekeurd"
          value={stats.approved}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Afgekeurd"
          value={stats.rejected}
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Totaal Aanvragen"
          value={stats.total}
          icon={CalendarDays}
          color="blue"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 h-9"
            placeholder="Zoeken op naam of notities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="SUBMITTED">Wachtend</option>
          <option value="APPROVED">Goedgekeurd</option>
          <option value="REJECTED">Afgekeurd</option>
          <option value="ALL">Alle statussen</option>
        </select>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              Aanvragen ({filteredRequests.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen aanvragen</p>
              <p className="text-xs text-slate-500 mt-1">
                {requests.length === 0
                  ? "Er zijn momenteel geen verlofaanvragen."
                  : "Geen resultaten gevonden met de huidige filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Medewerker
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Aangevraagd
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Periode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Dagen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reden
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Medewerker */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {request.user?.firstName?.charAt(0) || "U"}
                            {request.user?.lastName?.charAt(0) || ""}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {request.user?.firstName} {request.user?.lastName}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[160px]">
                              {request.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Aangevraagd */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {request.createdAt
                          ? dayjs(request.createdAt).format("DD MMM YYYY")
                          : "—"}
                      </td>

                      {/* Periode */}
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {dayjs(request.startDate).format("DD MMM")} –{" "}
                        {dayjs(request.endDate).format("DD MMM YYYY")}
                      </td>

                      {/* Dagen */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {request.totalDays}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {getVacationType(request.vacationType)}
                      </td>

                      {/* Reden */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        <span
                          className="block truncate max-w-[180px]"
                          title={request.notes || undefined}
                        >
                          {request.notes || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">{getStatusBadge(request.status)}</td>

                      {/* Acties */}
                      <td className="px-4 py-3">
                        {(request.status?.toUpperCase() === "SUBMITTED" ||
                          request.status?.toUpperCase() === "PENDING") && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request)}
                              disabled={processing}
                              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Goedkeuren
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRejectClick(request)}
                              disabled={processing}
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Afkeuren
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Verlofaanvraag Afkeuren
            </DialogTitle>
            <DialogDescription>
              Je staat op het punt om deze verlofaanvraag af te keuren. Geef een reden
              op zodat de medewerker weet waarom.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Reden voor afwijzing <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="bijv. Overlapping met andere afwezigheid, te drukke periode, etc."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRejectModal(false)}>
              Annuleren
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionComment.trim() || processing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Afkeuren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              Verlof Goedkeuren
            </DialogTitle>
            <DialogDescription>
              Je staat op het punt om deze verlofaanvraag goed te keuren en te verwerken.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Medewerker</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periode</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {dayjs(selectedRequest.startDate).format("DD MMM YYYY")} –{" "}
                    {dayjs(selectedRequest.endDate).format("DD MMM YYYY")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {getVacationType(selectedRequest.vacationType)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Werkdagen</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {selectedRequest.totalDays} dagen
                  </span>
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>Let op:</strong> Goedgekeurd verlof wordt automatisch verwerkt
                  in Firebird, zichtbaar in de planning en afgetrokken van het saldo.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowApproveModal(false)}>
              Annuleren
            </Button>
            <Button
              size="sm"
              onClick={handleApproveConfirm}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Ja, Goedkeuren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
