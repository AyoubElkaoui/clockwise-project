"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Calendar,
  Clock,
  User,
  FileText,
  AlertCircle,
  Filter,
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

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((r) =>
        r.status?.toUpperCase() === statusFilter ||
        (statusFilter === "SUBMITTED" && r.status?.toUpperCase() === "PENDING")
      );
    }

    // Search filter
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

      const userName = selectedRequest.user ? `${selectedRequest.user.firstName} ${selectedRequest.user.lastName}` : "Medewerker";
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

      const userName = selectedRequest.user ? `${selectedRequest.user.firstName} ${selectedRequest.user.lastName}` : "Medewerker";
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
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Goedgekeurd
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Afgekeurd
          </Badge>
        );
      case "SUBMITTED":
      case "PENDING":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            In Behandeling
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Vakantie Aanvragen Beoordelen"
        description="Beoordeel en verwerk vakantie aanvragen van je team"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          icon={Clock}
          title="Te Behandelen"
          value={stats.pending}
          subtitle={`${stats.pendingDays} dagen`}
          color="amber"
        />
        <StatCard
          icon={CheckCircle}
          title="Goedgekeurd"
          value={stats.approved}
          color="emerald"
        />
        <StatCard
          icon={XCircle}
          title="Afgekeurd"
          value={stats.rejected}
          color="rose"
        />
        <StatCard
          icon={CalendarDays}
          title="Totaal Aanvragen"
          value={stats.total}
          color="blue"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Zoek op naam of notities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="SUBMITTED">Te behandelen</option>
                <option value="APPROVED">Goedgekeurd</option>
                <option value="REJECTED">Afgekeurd</option>
                <option value="ALL">Alle statussen</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vacation Requests */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen vakantie aanvragen</p>
              <p className="text-sm text-slate-500 mt-1">
                {requests.length === 0
                  ? "Er zijn momenteel geen vakantie aanvragen."
                  : "Geen resultaten gevonden met de huidige filters."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 md:gap-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {request.user?.firstName?.charAt(0) || "U"}
                      {request.user?.lastName?.charAt(0) || ""}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {request.user?.firstName} {request.user?.lastName}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {dayjs(request.startDate).format("DD MMM YYYY")} -{" "}
                            {dayjs(request.endDate).format("DD MMM YYYY")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" />
                          <span>
                            {request.totalDays} dag(en) • {getVacationType(request.vacationType)}
                          </span>
                        </div>
                        {request.notes && (
                          <div className="flex items-start gap-2 mt-2">
                            <FileText className="w-4 h-4 mt-0.5" />
                            <span className="text-slate-700 dark:text-slate-300">
                              {request.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {(request.status?.toUpperCase() === "SUBMITTED" ||
                    request.status?.toUpperCase() === "PENDING") && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request)}
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none"
                      >
                        <CheckCircle className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Goedkeuren</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRejectClick(request)}
                        disabled={processing}
                        variant="destructive"
                        className="flex-1 sm:flex-none"
                      >
                        <XCircle className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Afkeuren</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vakantie Aanvraag Afkeuren</DialogTitle>
            <DialogDescription>
              Je staat op het punt om deze vakantie aanvraag af te keuren.
              Geef een reden op zodat de medewerker weet waarom.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Reden voor afwijzing *
            </label>
            <textarea
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="bijv. Overlapping met andere afwezigheid, te drukke periode, etc."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Annuleren
            </Button>
            <Button
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
              Vakantie Goedkeuren
            </DialogTitle>
            <DialogDescription>
              Je staat op het punt om deze vakantie aanvraag goed te keuren en te verwerken.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
                <p>
                  <strong>Medewerker:</strong> {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}
                </p>
                <p>
                  <strong>Periode:</strong> {dayjs(selectedRequest.startDate).format("DD MMMM YYYY")} - {dayjs(selectedRequest.endDate).format("DD MMMM YYYY")}
                </p>
                <p>
                  <strong>Type:</strong> {selectedRequest.vacationType}
                </p>
                <p>
                  <strong>Werkdagen:</strong> {selectedRequest.totalDays} dagen
                </p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>Let op:</strong> Goedgekeurde vakantie wordt:
                  <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                    <li>Automatisch verwerkt in Firebird</li>
                    <li>Zichtbaar in de planning</li>
                    <li>Afgetrokken van het saldo</li>
                  </ul>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Annuleren
            </Button>
            <Button
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
