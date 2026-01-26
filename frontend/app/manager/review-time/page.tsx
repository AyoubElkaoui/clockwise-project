"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPendingReview, reviewEntries } from "@/lib/workflowApi";
import { getCurrentPeriodId } from "@/lib/manager-api";
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
  X,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/nl";

dayjs.locale("nl");

interface WorkflowEntry {
  id: number;
  medewGcId: number;
  datum: string;
  aantal: number;
  omschrijving?: string;
  status: string;
  employeeName?: string;
  taakCode?: string;
  taakDescription?: string;
  werkCode?: string;
  werkDescription?: string;
  submittedAt?: string;
}

export default function ManagerReviewTimePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WorkflowEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WorkflowEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<number | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      const userRole = authUtils.getRole();
      if (userRole !== "manager") {
        showToast("Alleen managers kunnen uren beoordelen", "error");
        router.push("/tijd-registratie");
        return;
      }
      
      try {
        const periodId = await getCurrentPeriodId();
        setCurrentPeriod(periodId);
        await loadPendingEntries(periodId);
      } catch (error) {
        showToast("Kon periode niet laden", "error");
      }
    };
    initializePage();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchQuery, selectedEmployee]);

  const loadPendingEntries = async (periodId?: number) => {
    try {
      setLoading(true);
      const period = periodId || currentPeriod;
      if (!period) {
        showToast("Geen periode beschikbaar", "error");
        return;
      }
      const response = await getPendingReview(period);
      setEntries(response.entries);
    } catch (error) {
      showToast("Fout bij laden van in te dienen uren", "error");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    // Employee filter
    if (selectedEmployee !== "all") {
      filtered = filtered.filter((e) => e.medewGcId.toString() === selectedEmployee);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.employeeName?.toLowerCase().includes(query) ||
          e.taakDescription?.toLowerCase().includes(query) ||
          e.werkDescription?.toLowerCase().includes(query) ||
          e.omschrijving?.toLowerCase().includes(query)
      );
    }

    setFilteredEntries(filtered);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(new Set(filteredEntries.map((e) => e.id)));
    } else {
      setSelectedEntries(new Set());
    }
  };

  const handleSelectEntry = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedEntries);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedEntries(newSelected);
  };

  const handleApprove = async () => {
    if (selectedEntries.size === 0) {
      showToast("⚠️ Selecteer minimaal één uurregistratie om goed te keuren", "warning");
      return;
    }
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    try {
      setProcessing(true);
      setShowApproveModal(false);
      await reviewEntries({
        entryIds: Array.from(selectedEntries),
        approve: true,
      });
      const count = selectedEntries.size;
      showToast(`✓ ${count} uurregistratie${count > 1 ? 's' : ''} succesvol goedgekeurd en verwerkt`, "success");
      setSelectedEntries(new Set());
      await loadPendingEntries();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Kan uren niet goedkeuren. Probeer het opnieuw.";
      showToast("✕ " + errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = () => {
    if (selectedEntries.size === 0) {
      showToast("⚠️ Selecteer minimaal één uurregistratie om af te keuren", "warning");
      return;
    }
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      showToast("⚠️ Geef een duidelijke reden voor afwijzing zodat de medewerker weet wat te verbeteren", "warning");
      return;
    }

    try {
      setProcessing(true);
      await reviewEntries({
        entryIds: Array.from(selectedEntries),
        approve: false,
        rejectionReason: rejectionReason.trim(),
      });
      const count = selectedEntries.size;
      showToast(`✓ ${count} uurregistratie${count > 1 ? 's' : ''} afgekeurd. Medewerker krijgt feedback.`, "success");
      setSelectedEntries(new Set());
      setShowRejectModal(false);
      setRejectionReason("");
      await loadPendingEntries();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Kan uren niet afkeuren. Probeer het opnieuw.";
      showToast("✕ " + errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const getUniqueEmployees = () => {
    const employees = new Map<string, string>();
    entries.forEach((e) => {
      if (e.medewGcId && e.employeeName) {
        employees.set(e.medewGcId.toString(), e.employeeName);
      }
    });
    return Array.from(employees.entries());
  };

  const groupEntriesByEmployee = () => {
    const grouped = new Map<string, WorkflowEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = entry.employeeName || "Onbekend";
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(entry);
    });
    return Array.from(grouped.entries());
  };

  const calculateTotalHours = (entries: WorkflowEntry[]) => {
    return entries.reduce((sum, e) => sum + e.aantal, 0);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const groupedEntries = groupEntriesByEmployee();
  const totalHours = calculateTotalHours(filteredEntries);
  const selectedHours = calculateTotalHours(
    filteredEntries.filter((e) => selectedEntries.has(e.id))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Uren Beoordelen
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Controleer en keur ingediende uren goed of af
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={selectedEntries.size === 0 || processing}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Goedkeuren ({selectedEntries.size})
          </Button>
          <Button
            onClick={handleRejectClick}
            disabled={selectedEntries.size === 0 || processing}
            variant="destructive"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Afkeuren ({selectedEntries.size})
          </Button>
        </div>
      </div>

      {/* Snelle Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Snelle Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Zoek op naam, taak, project of omschrijving..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Employee Filter */}
            <div>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">Alle medewerkers</option>
                {getUniqueEmployees().map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {groupedEntries.length} medewerker(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {totalHours.toFixed(1)}u totaal
              </span>
            </div>
            {selectedEntries.size > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600 font-medium">
                  {selectedHours.toFixed(1)}u geselecteerd
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entries Grouped by Employee */}
      {groupedEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Geen ingediende uren
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {entries.length === 0
                ? "Er zijn momenteel geen uren om te beoordelen."
                : "Geen resultaten gevonden met de huidige filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        groupedEntries.map(([employeeName, employeeEntries]) => {
          const employeeHours = calculateTotalHours(employeeEntries);
          const allSelected = employeeEntries.every((e) => selectedEntries.has(e.id));
          const someSelected = employeeEntries.some((e) => selectedEntries.has(e.id));

          return (
            <Card key={employeeName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        employeeEntries.forEach((entry) => {
                          handleSelectEntry(entry.id, checked);
                        });
                      }}
                      className="w-5 h-5 rounded border-slate-300 dark:border-slate-600"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-timr-orange rounded-full flex items-center justify-center text-white font-semibold">
                        {employeeName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{employeeName}</CardTitle>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {employeeEntries.length} registratie(s) • {employeeHours.toFixed(1)}u
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employeeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={(e) => handleSelectEntry(entry.id, e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {dayjs(entry.datum).format("DD MMM YYYY")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <FileText className="w-4 h-4" />
                              <span>
                                {entry.taakDescription || entry.taakCode}
                                {entry.werkDescription && ` • ${entry.werkDescription}`}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {entry.aantal.toFixed(1)}u
                            </div>
                            {entry.submittedAt && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Ingediend {dayjs(entry.submittedAt).format("DD/MM HH:mm")}
                              </div>
                            )}
                          </div>
                        </div>
                        {entry.omschrijving && (
                          <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                            {entry.omschrijving}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uren Afkeuren</DialogTitle>
            <DialogDescription>
              Je staat op het punt om {selectedEntries.size} urenregistratie(s) af te keuren.
              Geef een reden op zodat de medewerker weet wat er aangepast moet worden.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Reden voor afwijzing *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="bijv. Verkeerd project geselecteerd, te veel uren, etc."
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
              disabled={!rejectionReason.trim() || processing}
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
              Uren Goedkeuren
            </DialogTitle>
            <DialogDescription>
              Je staat op het punt om {selectedEntries.size} urenregistratie(s) goed te keuren en definitief te verwerken.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <p className="text-sm text-emerald-800 dark:text-emerald-200 space-y-2">
                <strong>Let op:</strong> Goedgekeurde uren worden:
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>Definitief verwerkt in het systeem</li>
                  <li>Zichtbaar in rapportages</li>
                  <li>Niet meer te wijzigen door de medewerker</li>
                </ul>
              </p>
            </div>
          </div>
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
