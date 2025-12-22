"use client";
import { useState, useEffect } from "react";
import {
  getPendingReview,
  reviewEntries,
  getPeriods,
  type WorkflowEntry,
} from "@/lib/api";
import { showToast } from "@/components/ui/toast";

interface GroupedEntries {
  medewGcId: number;
  medewName: string;
  entries: WorkflowEntry[];
  totalHours: number;
}

export default function ReviewTime() {
  const [urenperGcId, setUrenperGcId] = useState(1);
  const [periods, setPeriods] = useState<any[]>([]);
  const [pendingEntries, setPendingEntries] = useState<WorkflowEntry[]>([]);
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntries[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (urenperGcId) {
      loadPendingReview();
    }
  }, [urenperGcId]);

  useEffect(() => {
    groupEntriesByEmployee();
  }, [pendingEntries]);

  const loadPeriods = async () => {
    try {
      const data = await getPeriods(10);
      setPeriods(data);

      // Set default period to current
      const currentPeriod = data.find((p: any) => {
        const now = new Date();
        const begin = new Date(p.BeginDatum);
        const end = new Date(p.EndDate);
        return now >= begin && now <= end;
      });
      if (currentPeriod) {
        setUrenperGcId(currentPeriod.GcId);
      }
    } catch (error) {
      console.error("Error loading periods:", error);
      showToast("Fout bij laden van periodes", "error");
    }
  };

  const loadPendingReview = async () => {
    setLoading(true);
    try {
      const data = await getPendingReview(urenperGcId);
      setPendingEntries(data);
    } catch (error) {
      console.error("Error loading pending review:", error);
      showToast("Fout bij laden van ingediende uren", "error");
    } finally {
      setLoading(false);
    }
  };

  const groupEntriesByEmployee = () => {
    const grouped = pendingEntries.reduce((acc, entry) => {
      const existing = acc.find((g) => g.medewGcId === entry.medewGcId);
      if (existing) {
        existing.entries.push(entry);
        existing.totalHours += entry.aantal;
      } else {
        acc.push({
          medewGcId: entry.medewGcId,
          medewName: entry.medewName || `Medewerker ${entry.medewGcId}`,
          entries: [entry],
          totalHours: entry.aantal,
        });
      }
      return acc;
    }, [] as GroupedEntries[]);

    setGroupedEntries(grouped);
  };

  const handleApprove = async () => {
    if (selectedEntries.length === 0) {
      showToast("Selecteer minimaal 1 entry om goed te keuren", "error");
      return;
    }

    if (
      !confirm(
        `Wil je ${selectedEntries.length} uren goedkeuren? Deze worden naar Firebird gekopieerd.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await reviewEntries({
        entryIds: selectedEntries,
        approve: true,
      });
      showToast("Uren goedgekeurd en opgeslagen in Firebird!", "success");
      setSelectedEntries([]);
      await loadPendingReview();
    } catch (error: any) {
      console.error("Error approving:", error);
      showToast(
        error.response?.data?.error || "Fout bij goedkeuren",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (selectedEntries.length === 0) {
      showToast("Selecteer minimaal 1 entry om af te keuren", "error");
      return;
    }

    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      showToast("Geef een reden op voor de afkeuring", "error");
      return;
    }

    setLoading(true);
    setShowRejectModal(false);
    try {
      await reviewEntries({
        entryIds: selectedEntries,
        approve: false,
        rejectionReason,
      });
      showToast("Uren afgekeurd", "success");
      setSelectedEntries([]);
      setRejectionReason("");
      await loadPendingReview();
    } catch (error: any) {
      console.error("Error rejecting:", error);
      showToast(
        error.response?.data?.error || "Fout bij afkeuren",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleEntrySelection = (id: number) => {
    setSelectedEntries((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllForEmployee = (medewGcId: number) => {
    const employeeEntries = groupedEntries.find(
      (g) => g.medewGcId === medewGcId
    );
    if (!employeeEntries) return;

    const entryIds = employeeEntries.entries.map((e) => e.id);
    const allSelected = entryIds.every((id) => selectedEntries.includes(id));

    if (allSelected) {
      setSelectedEntries((prev) => prev.filter((id) => !entryIds.includes(id)));
    } else {
      setSelectedEntries((prev) => [...new Set([...prev, ...entryIds])]);
    }
  };

  const toggleEmployeeExpand = (medewGcId: number) => {
    setExpandedEmployee((prev) => (prev === medewGcId ? null : medewGcId));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Uren Beoordelen</h1>

      {/* Period Selector & Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Periode</label>
            <select
              value={urenperGcId}
              onChange={(e) => setUrenperGcId(Number(e.target.value))}
              className="w-full md:w-64 border rounded px-3 py-2"
            >
              {periods.map((p: any) => (
                <option key={p.GcId} value={p.GcId}>
                  {p.GcCode} ({p.Description})
                </option>
              ))}
            </select>
          </div>

          {selectedEntries.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Goedkeuren ({selectedEntries.length})
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                Afkeuren ({selectedEntries.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && pendingEntries.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Bezig met laden...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && pendingEntries.length === 0 && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">
            Geen ingediende uren voor deze periode
          </p>
        </div>
      )}

      {/* Grouped Entries by Employee */}
      {groupedEntries.map((group) => {
        const isExpanded = expandedEmployee === group.medewGcId;
        const allSelected = group.entries.every((e) =>
          selectedEntries.includes(e.id)
        );

        return (
          <div key={group.medewGcId} className="bg-white shadow rounded-lg mb-4">
            {/* Employee Header */}
            <div
              className="p-4 border-b cursor-pointer hover:bg-gray-50"
              onClick={() => toggleEmployeeExpand(group.medewGcId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      selectAllForEmployee(group.medewGcId);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{group.medewName}</h3>
                    <p className="text-sm text-gray-600">
                      {group.entries.length} entries • {group.totalHours.toFixed(1)} uren
                    </p>
                  </div>
                </div>
                <div className="text-gray-400">
                  {isExpanded ? "▼" : "▶"}
                </div>
              </div>
            </div>

            {/* Employee Entries */}
            {isExpanded && (
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Selecteer
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Datum
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Taak
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Project
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Uren
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Omschrijving
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ingediend Op
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selectedEntries.includes(entry.id)}
                            onChange={() => toggleEntrySelection(entry.id)}
                            className="w-5 h-5"
                          />
                        </td>
                        <td className="px-3 py-4 text-sm">
                          {new Date(entry.datum).toLocaleDateString("nl-NL")}
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium">
                              {entry.taakCode || entry.taakGcId}
                            </div>
                            {entry.taakDescription && (
                              <div className="text-gray-500 text-xs">
                                {entry.taakDescription}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          {entry.werkCode ? (
                            <div>
                              <div className="font-medium">{entry.werkCode}</div>
                              {entry.werkDescription && (
                                <div className="text-gray-500 text-xs">
                                  {entry.werkDescription}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm font-medium">
                          {entry.aantal}
                        </td>
                        <td className="px-3 py-4 text-sm">
                          {entry.omschrijving || (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {entry.submittedAt
                            ? new Date(entry.submittedAt).toLocaleString("nl-NL")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Uren Afkeuren</h3>
            <p className="text-sm text-gray-600 mb-4">
              Je staat op het punt {selectedEntries.length} uren af te keuren.
              Geef een reden op waarom deze uren worden afgekeurd.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="bijv. Verkeerd project geselecteerd, geen omschrijving..."
              rows={4}
              className="w-full border rounded px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Afkeuren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
