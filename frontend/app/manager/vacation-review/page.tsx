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
      
      const response = await fetch(`${API_URL}/api/vacation`, {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Vakantie Aanvragen Beoordelen
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Controleer en keur vakantie aanvragen goed of af
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Te Behandelen
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.pending}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {stats.pendingDays} dagen
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
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
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
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
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.rejected}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Totaal Aanvragen
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Geen vakantie aanvragen
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {requests.length === 0
                ? "Er zijn momenteel geen vakantie aanvragen."
                : "Geen resultaten gevonden met de huidige filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-timr-orange rounded-full flex items-center justify-center text-white font-semibold">
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
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(request)}
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Goedkeuren
                      </Button>
                      <Button
                        onClick={() => handleRejectClick(request)}
                        disabled={processing}
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Afkeuren
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
