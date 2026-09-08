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
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import authUtils from "@/lib/auth-utils";
import {
  CheckCircle,
  XCircle,
  Search,
  Clock,
  User,
  FileText,
  AlertCircle,
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

  // New: tab state
  const [activeTab, setActiveTab] = useState<"wachtend" | "goedgekeurd" | "afgewezen">("wachtend");

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
      console.log("=== loadPendingEntries START ===");
      setLoading(true);
      const period = periodId || currentPeriod;
      console.log("Period ID:", period);

      if (!period) {
        console.error("No period available");
        showToast("Geen periode beschikbaar", "error");
        return;
      }

      console.log("Calling getPendingReview with period:", period);
      const response = await getPendingReview(period);
      console.log("getPendingReview response:", response);
      console.log("Entries count:", response.entries?.length);

      setEntries(response.entries);
      console.log("=== loadPendingEntries END ===");
    } catch (error) {
      console.error("=== loadPendingEntries ERROR ===", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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

  // New: approve all visible entries
  const handleApproveAll = () => {
    if (filteredEntries.length === 0) return;
    setSelectedEntries(new Set(filteredEntries.map((e) => e.id)));
    setShowApproveModal(true);
  };

  // New: single-row approve
  const handleSingleApprove = (id: number) => {
    setSelectedEntries(new Set([id]));
    setShowApproveModal(true);
  };

  // New: single-row reject
  const handleSingleReject = (id: number) => {
    setSelectedEntries(new Set([id]));
    setShowRejectModal(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const groupedEntries = groupEntriesByEmployee();
  const totalHours = calculateTotalHours(filteredEntries);
  const selectedHours = calculateTotalHours(
    filteredEntries.filter((e) => selectedEntries.has(e.id))
  );

  // Tab-filtered view
  const tabFilteredEntries = filteredEntries.filter((e) => {
    if (activeTab === "goedgekeurd") return e.status === "goedgekeurd";
    if (activeTab === "afgewezen") return e.status === "afgewezen";
    return e.status !== "goedgekeurd" && e.status !== "afgewezen";
  });

  const tabCounts = {
    wachtend: entries.filter((e) => e.status !== "goedgekeurd" && e.status !== "afgewezen").length,
    goedgekeurd: entries.filter((e) => e.status === "goedgekeurd").length,
    afgewezen: entries.filter((e) => e.status === "afgewezen").length,
  };

  const allTabSelected =
    tabFilteredEntries.length > 0 &&
    tabFilteredEntries.every((e) => selectedEntries.has(e.id));
  const someTabSelected =
    tabFilteredEntries.some((e) => selectedEntries.has(e.id));

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <PageHeader
        title="Uren Beoordelen"
        description={`${entries.length} wachtend op beoordeling`}
        actions={
          <Button
            size="sm"
            onClick={handleApproveAll}
            disabled={filteredEntries.length === 0 || processing}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Alles goedkeuren
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Wachtend"
          value={entries.length}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Medewerkers"
          value={getUniqueEmployees().length}
          icon={User}
          color="blue"
        />
        <StatCard
          title="Totaal uren"
          value={`${totalHours.toFixed(1)}u`}
          icon={FileText}
          color="indigo"
        />
        <StatCard
          title="Geselecteerd"
          value={selectedEntries.size}
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      {/* Main card */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col gap-3">

            {/* Filter tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-700 -mx-6 px-6 pb-3">
              {(["wachtend", "goedgekeurd", "afgewezen"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === tab
                        ? "bg-white/20 dark:bg-slate-900/20"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Zoeken op naam, taak, project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="all">Alle medewerkers</option>
                {getUniqueEmployees().map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk action bar */}
            {selectedEntries.size > 0 && (
              <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedEntries.size} geselecteerd
                  {selectedHours > 0 && (
                    <span className="ml-1 font-normal text-blue-500 dark:text-blue-400">
                      ({selectedHours.toFixed(1)}u)
                    </span>
                  )}
                </span>
                <span className="text-blue-300 dark:text-blue-600">—</span>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={processing}
                  className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Alles goedkeuren
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRejectClick}
                  disabled={processing}
                  className="h-7 px-3 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Alles afwijzen
                </Button>
                <button
                  onClick={() => setSelectedEntries(new Set())}
                  className="ml-auto text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                >
                  Deselecteer
                </button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {tabFilteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {activeTab === "wachtend" ? "Geen wachtende uren" : activeTab === "goedgekeurd" ? "Geen goedgekeurde uren" : "Geen afgewezen uren"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {entries.length === 0
                  ? "Er zijn momenteel geen uren om te beoordelen."
                  : "Geen resultaten gevonden met de huidige filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allTabSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someTabSelected && !allTabSelected;
                        }}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const newSelected = new Set(selectedEntries);
                          tabFilteredEntries.forEach((entry) => {
                            if (checked) newSelected.add(entry.id);
                            else newSelected.delete(entry.id);
                          });
                          setSelectedEntries(newSelected);
                        }}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Medewerker
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Project / Taak
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Uren
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Notities
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {tabFilteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        selectedEntries.has(entry.id)
                          ? "bg-blue-50/50 dark:bg-blue-900/10"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={(e) => handleSelectEntry(entry.id, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(entry.employeeName || "?")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="text-slate-900 dark:text-slate-100 font-medium">
                            {entry.employeeName || "Onbekend"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {dayjs(entry.datum).format("DD MMM YYYY")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900 dark:text-slate-100">
                          {entry.taakDescription || entry.taakCode || "—"}
                        </div>
                        {entry.werkDescription && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {entry.werkDescription}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {entry.aantal.toFixed(1)}u
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {entry.omschrijving ? (
                          <span
                            className="text-slate-600 dark:text-slate-400 truncate block"
                            title={entry.omschrijving}
                          >
                            {entry.omschrijving.length > 50
                              ? entry.omschrijving.substring(0, 50) + "…"
                              : entry.omschrijving}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.status === "goedgekeurd" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Goedgekeurd
                          </span>
                        ) : entry.status === "afgewezen" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Afgewezen
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            In behandeling
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-[7px]">
                          <button
                            onClick={() => handleSingleReject(entry.id)}
                            disabled={processing}
                            title="Afkeuren"
                            className="flex items-center justify-center rounded-lg disabled:opacity-40"
                            style={{ width: 32, height: 32, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--muted)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "var(--red-weak)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "var(--panel)"; }}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSingleApprove(entry.id)}
                            disabled={processing}
                            title="Goedkeuren"
                            className="flex items-center justify-center rounded-lg disabled:opacity-40"
                            style={{ width: 32, height: 32, border: "1px solid transparent", background: "var(--green-btn)", color: "#fff" }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
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
