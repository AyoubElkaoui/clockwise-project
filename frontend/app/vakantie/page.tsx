"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Plus,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { getVacationRequests } from "@/lib/api";
import { registerVacationRequest } from "@/lib/api/vacationApi";
import dayjs from "dayjs";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import { useTranslation } from "react-i18next";
import { API_URL } from "@/lib/api";

async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const bodyText = await response.text();
    console.error("[SAFE JSON PARSE] Expected JSON but got:", contentType, "Body snippet:", bodyText.substring(0, 200));
    throw new Error(`Expected JSON response but got ${contentType || 'unknown'}: ${bodyText.substring(0, 100)}`);
  }
  return response.json();
}

interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  vacationType: string;
  totalDays: number;
  notes: string;
  status: string;
  // Backwards compatibility
  hours?: number;
  reason?: string;
}

interface VacationType {
  gcId: number;
  gcCode: string;
  omschrijving: string;
}

export default function VakantiePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [vacationTypes, setVacationTypes] = useState<VacationType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    vacationType: "Z03", // Default vakantie type
    notes: "",
  });

  useEffect(() => {
    loadVacationRequests();
    loadVacationTypes();
  }, []);

  // ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
        } else if (showModal) {
          setShowModal(false);
          setValidationError("");
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showModal, showConfirmDialog]);

  const loadVacationRequests = async () => {
    try {
      setLoading(true);
      const medewGcId = authUtils.getMedewGcId();
      const userId = authUtils.getUserId();
      if (!medewGcId || !userId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      // Use the correct API endpoint for user vacation requests
      const response = await fetch(
        `${API_URL}/vacation`,
        {
          headers: {
            "X-MEDEW-GC-ID": medewGcId,
            "ngrok-skip-browser-warning": "1",
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to load vacation requests");
      }
      const data = await safeJsonParse(response);

      // Already filtered by backend based on medewGcId
      setRequests(data);
    } catch (error) {
      console.error("Error loading vacation requests:", error);
      showToast("Fout bij laden vakantie aanvragen", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadVacationTypes = async () => {
    try {
      const medewGcId = authUtils.getMedewGcId();
      if (!medewGcId) {
        return;
      }

      const response = await fetch(
        `${API_URL}/vacation/types`,
        {
          headers: {
            "X-MEDEW-GC-ID": medewGcId,
            "ngrok-skip-browser-warning": "1",
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to load vacation types");
      }
      const data = await safeJsonParse(response);
      setVacationTypes(data);
    } catch (error) {
      console.error("Error loading vacation types:", error);
      // Don't show error toast, just use default types
    }
  };

  const validateForm = () => {
    setValidationError("");

    if (!formData.startDate || !formData.endDate) {
      setValidationError("Vul alle verplichte velden in");
      return false;
    }

    const startDate = dayjs(formData.startDate);
    const endDate = dayjs(formData.endDate);
    const today = dayjs().startOf("day");

    // Check if dates are in the past
    if (startDate.isBefore(today)) {
      setValidationError("Startdatum kan niet in het verleden liggen");
      return false;
    }

    // Check if end date is before start date
    if (endDate.isBefore(startDate)) {
      setValidationError("Einddatum moet na de startdatum liggen");
      return false;
    }

    // Check if notes are provided
    if (!formData.notes.trim()) {
      setValidationError("Voeg een reden toe voor je verlofaanvraag");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      setShowConfirmDialog(false);
      const medewGcId = authUtils.getMedewGcId();
      const userId = authUtils.getUserId();
      if (!medewGcId || !userId) {
        showToast("Je bent niet ingelogd. Log opnieuw in.", "error");
        return;
      }

      // Calculate hours based on date range
      const startDate = dayjs(formData.startDate);
      const endDate = dayjs(formData.endDate);
      const days = endDate.diff(startDate, "day") + 1;

      // Calculate working days (exclude weekends)
      let workingDays = 0;
      for (let i = 0; i < days; i++) {
        const currentDate = startDate.add(i, "day");
        if (currentDate.day() !== 0 && currentDate.day() !== 6) {
          // Not Sunday (0) or Saturday (6)
          workingDays++;
        }
      }

      const response = await fetch(
        `${API_URL}/vacation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MEDEW-GC-ID": medewGcId,
            "ngrok-skip-browser-warning": "1",
          },
          body: JSON.stringify({
            userId: userId,
            startDate: formData.startDate,
            endDate: formData.endDate,
            vacationType: formData.vacationType,
            totalDays: workingDays,
            notes: formData.notes,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Vacation request failed:", errorData);
        throw new Error(response.status === 409 ? "Er bestaat al een aanvraag voor deze periode" : "Kan aanvraag niet indienen");
      }

      showToast("Vakantie aanvraag succesvol ingediend! Je manager ontvangt een notificatie.", "success");
      setShowModal(false);
      setValidationError("");
      setFormData({ startDate: "", endDate: "", vacationType: "Z03", notes: "" });
      loadVacationRequests();
    } catch (error) {
      console.error("Error creating vacation request:", error);
      const errorMessage = error instanceof Error ? error.message : "Er ging iets mis. Probeer het opnieuw.";
      showToast(errorMessage, "error");
    }
  };

  const calculateStats = () => {
    const approved = requests.filter((r) => r.status === "APPROVED" || r.status === "approved");
    const pending = requests.filter((r) => r.status === "SUBMITTED" || r.status === "pending");
    const rejected = requests.filter((r) => r.status === "REJECTED" || r.status === "rejected");

    const totalDays = requests.reduce((sum, r) => sum + (r.totalDays || r.hours / 8 || 0), 0);
    const approvedDays = approved.reduce((sum, r) => sum + (r.totalDays || r.hours / 8 || 0), 0);
    const pendingDays = pending.reduce((sum, r) => sum + (r.totalDays || r.hours / 8 || 0), 0);
    const rejectedDays = rejected.reduce((sum, r) => sum + (r.totalDays || r.hours / 8 || 0), 0);
    const availableDays = 25 - approvedDays; // Aangenomen 25 dagen per jaar

    return {
      totalDays,
      approvedDays,
      pendingDays,
      rejectedDays,
      availableDays,
    };
  };

  const stats = calculateStats();

  const getStatusBadge = (status: string) => {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Goedgekeurd
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Afgekeurd
          </Badge>
        );
      case "SUBMITTED":
      case "PENDING":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            In Behandeling
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t("vacation.title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {t("vacation.subtitle")}
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("vacation.request")}
            </Button>
          </div>

          {/* Balance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t("vacation.totalRequested")}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {loading ? "..." : Math.round(stats.totalDays)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t("vacation.vacationDays")}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t("status.approved")}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {loading ? "..." : Math.round(stats.approvedDays)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t("vacation.used")}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t("status.pending")}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {loading ? "..." : Math.round(stats.pendingDays)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t("vacation.waitingAction")}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t("status.rejected")}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {loading ? "..." : Math.round(stats.rejectedDays)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t("vacation.thisYear")}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-timr-blue">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t("vacation.available")}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {loading
                        ? "..."
                        : Math.max(0, Math.round(stats.availableDays))}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t("vacation.remainingYear")}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-timr-blue-light dark:bg-timr-blue-light/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-timr-blue dark:text-timr-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vacation Requests */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>{t("vacation.myRequests")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-timr-orange" />
                  <span className="ml-2 text-slate-600">
                    {t("common.loading")}
                  </span>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    {t("vacation.noRequests")}
                  </p>
                  <Button className="mt-4" onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("vacation.request")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests
                    .sort(
                      (a, b) =>
                        new Date(b.startDate).getTime() -
                        new Date(a.startDate).getTime(),
                    )
                    .map((request) => {
                      const days = Math.ceil(request.hours / 8);
                      const period =
                        request.startDate === request.endDate
                          ? dayjs(request.startDate).format("DD MMMM YYYY")
                          : `${dayjs(request.startDate).format("DD MMM")} - ${dayjs(request.endDate).format("DD MMM YYYY")}`;

                      return (
                        <Card
                          key={request.id}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                      {period}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {days}{" "}
                                      {days > 1
                                        ? t("vacation.workingDaysPlural")
                                        : t("vacation.workingDays")}{" "}
                                      • {request.hours} {t("vacation.hours")}
                                    </p>
                                  </div>
                                </div>
                                {request.reason && (
                                  <div className="ml-13 mb-3">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                                      {request.reason}
                                    </p>
                                  </div>
                                )}
                                <div className="ml-13">
                                  {getStatusBadge(request.status)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal voor nieuwe aanvraag */}
          {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    {t("vacation.newRequest")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                          {t("vacation.startDate")}
                        </label>
                        <Input
                          type="date"
                          required
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                          {t("vacation.endDate")}
                        </label>
                        <Input
                          type="date"
                          required
                          value={formData.endDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              endDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                        Type Verlof
                      </label>
                      <select
                        value={formData.vacationType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vacationType: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-timr-orange focus:border-transparent"
                      >
                        {vacationTypes.length > 0 ? (
                          vacationTypes.map((type) => (
                            <option key={type.gcCode} value={type.gcCode}>
                              {type.gcCode} - {type.omschrijving}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Z03">Z03 - Vakantie (ATV)</option>
                            <option value="Z04">Z04 - Snipperdag</option>
                            <option value="Z05">Z05 - Verlof eigen rekening</option>
                            <option value="Z06">Z06 - Bijzonder verlof</option>
                            <option value="Z08">Z08 - Opbouw tijd voor tijd</option>
                            <option value="Z09">Z09 - Opname tijd voor tijd</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                        Reden / Opmerking <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-timr-orange focus:border-transparent resize-none"
                        rows={3}
                        placeholder="Voeg een reden toe voor je verlofaanvraag..."
                      />
                    </div>

                    {/* Validation Error */}
                    {validationError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                          ⚠️ {validationError}
                        </p>
                      </div>
                    )}

                    {formData.startDate && formData.endDate && (
                      <div className="bg-timr-orange-light dark:bg-timr-orange/10 border border-timr-orange/30 dark:border-timr-orange/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-timr-orange dark:text-timr-orange mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">
                            Samenvatting
                          </span>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                          <p>
                            <strong>Periode:</strong> {dayjs(formData.startDate).format("DD MMMM YYYY")} - {dayjs(formData.endDate).format("DD MMMM YYYY")}
                          </p>
                          <p>
                            <strong>Type:</strong> {formData.vacationType}
                          </p>
                          <p>
                            <strong>Werkdagen:</strong> {(() => {
                              const start = dayjs(formData.startDate);
                              const end = dayjs(formData.endDate);
                              const days = end.diff(start, "day") + 1;
                              let workingDays = 0;
                              for (let i = 0; i < days; i++) {
                                const currentDate = start.add(i, "day");
                                if (currentDate.day() !== 0 && currentDate.day() !== 6) {
                                  workingDays++;
                                }
                              }
                              return workingDays;
                            })()} dagen (ma-vr)
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" className="flex-1">
                        <Plus className="w-4 h-4 mr-2" />
                        Aanvraag Indienen
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowModal(false);
                          setValidationError("");
                        }}
                        className="flex-1"
                      >
                        Annuleren
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmDialog && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-timr-orange">
                    <AlertCircle className="w-5 h-5" />
                    Bevestig je aanvraag
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-slate-700 dark:text-slate-300">
                      Je staat op het punt om een verlofaanvraag in te dienen voor:
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                      <p className="text-sm">
                        <strong>Periode:</strong> {dayjs(formData.startDate).format("DD MMMM YYYY")} - {dayjs(formData.endDate).format("DD MMMM YYYY")}
                      </p>
                      <p className="text-sm">
                        <strong>Type:</strong> {formData.vacationType}
                      </p>
                      <p className="text-sm">
                        <strong>Werkdagen:</strong> {(() => {
                          const start = dayjs(formData.startDate);
                          const end = dayjs(formData.endDate);
                          const days = end.diff(start, "day") + 1;
                          let workingDays = 0;
                          for (let i = 0; i < days; i++) {
                            const currentDate = start.add(i, "day");
                            if (currentDate.day() !== 0 && currentDate.day() !== 6) {
                              workingDays++;
                            }
                          }
                          return workingDays;
                        })()} dagen
                      </p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Je manager ontvangt automatisch een notificatie om je aanvraag goed te keuren.
                    </p>
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleConfirmSubmit}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Ja, Indienen
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowConfirmDialog(false)}
                        className="flex-1"
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
