"use client";
import { useState, useEffect } from "react";
import {
  getWorkTasks,
  getProjects,
  getPeriods,
  saveDraft,
  getDrafts,
  getRejected,
  submitEntries,
  resubmitRejected,
  deleteDraft,
  type WorkflowEntry,
  type SaveDraftRequest,
} from "@/lib/api";
import { showToast } from "@/components/ui/toast";

export default function RegisterTime() {
  // Form state
  const [urenperGcId, setUrenperGcId] = useState(1);
  const [taakGcId, setTaakGcId] = useState(30);
  const [werkGcId, setWerkGcId] = useState<number | null>(1);
  const [aantal, setAantal] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [omschrijving, setOmschrijving] = useState("");

  // Dropdown data
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);

  // Workflow data
  const [drafts, setDrafts] = useState<WorkflowEntry[]>([]);
  const [rejectedEntries, setRejectedEntries] = useState<WorkflowEntry[]>([]);
  const [selectedDrafts, setSelectedDrafts] = useState<number[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  // Load drafts and rejected when period changes
  useEffect(() => {
    if (urenperGcId) {
      loadDrafts();
      loadRejected();
    }
  }, [urenperGcId]);

  const loadAllData = async () => {
    try {
      const [tasksData, projectsData, periodsData] = await Promise.all([
        getWorkTasks(),
        getProjects(1),
        getPeriods(10),
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setPeriods(periodsData);

      // Set default period to current
      const currentPeriod = periodsData.find((p: any) => {
        const now = new Date();
        const begin = new Date(p.BeginDatum);
        const end = new Date(p.EndDate);
        return now >= begin && now <= end;
      });
      if (currentPeriod) {
        setUrenperGcId(currentPeriod.GcId);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("Fout bij laden van gegevens", "error");
    }
  };

  const loadDrafts = async () => {
    try {
      const data = await getDrafts(urenperGcId);
      setDrafts(data);
    } catch (error) {
      console.error("Error loading drafts:", error);
    }
  };

  const loadRejected = async () => {
    try {
      const data = await getRejected(urenperGcId);
      setRejectedEntries(data);
    } catch (error) {
      console.error("Error loading rejected:", error);
    }
  };

  const handleSaveDraft = async () => {
    if (!aantal || parseFloat(aantal) <= 0 || parseFloat(aantal) >= 24) {
      showToast("Aantal uren moet tussen 0.1 en 23.9 liggen", "error");
      return;
    }

    if (!datum) {
      showToast("Datum is verplicht", "error");
      return;
    }

    setLoading(true);
    try {
      const draftData: SaveDraftRequest = {
        urenperGcId,
        taakGcId,
        werkGcId,
        datum,
        aantal: parseFloat(aantal),
        omschrijving,
      };

      await saveDraft(draftData);
      showToast(
        editingDraftId ? "Concept bijgewerkt!" : "Concept opgeslagen!",
        "success",
      );

      // Reset form
      resetForm();

      // Reload drafts
      await loadDrafts();
    } catch (error: any) {
      console.error("Error saving draft:", error);
      showToast(
        error.response?.data?.error || "Fout bij opslaan concept",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditDraft = (draft: WorkflowEntry) => {
    setTaakGcId(draft.taakGcId);
    setWerkGcId(draft.werkGcId);
    setDatum(draft.datum);
    setAantal(draft.aantal.toString());
    setOmschrijving(draft.omschrijving);
    setEditingDraftId(draft.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteDraft = async (id: number) => {
    if (!confirm("Weet je zeker dat je dit concept wilt verwijderen?")) {
      return;
    }

    try {
      await deleteDraft(id);
      showToast("Concept verwijderd", "success");
      await loadDrafts();
    } catch (error) {
      console.error("Error deleting draft:", error);
      showToast("Fout bij verwijderen", "error");
    }
  };

  const handleSubmitDrafts = async () => {
    if (selectedDrafts.length === 0) {
      showToast("Selecteer minimaal 1 concept om in te leveren", "error");
      return;
    }

    if (
      !confirm(
        `Wil je ${selectedDrafts.length} concept(en) inleveren? Je kunt deze daarna niet meer bewerken.`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await submitEntries({
        urenperGcId,
        entryIds: selectedDrafts,
      });
      showToast("Uren ingediend voor beoordeling!", "success");
      setSelectedDrafts([]);
      await loadDrafts();
    } catch (error: any) {
      console.error("Error submitting:", error);
      showToast(error.response?.data?.error || "Fout bij inleveren", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResubmitRejected = async (entryIds: number[]) => {
    if (
      !confirm(`Wil je ${entryIds.length} afgekeurde uren opnieuw inleveren?`)
    ) {
      return;
    }

    setLoading(true);
    try {
      await resubmitRejected({
        urenperGcId,
        entryIds,
      });
      showToast("Uren opnieuw ingediend!", "success");
      await loadRejected();
    } catch (error: any) {
      console.error("Error resubmitting:", error);
      showToast(
        error.response?.data?.error || "Fout bij opnieuw inleveren",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAantal("");
    setOmschrijving("");
    setEditingDraftId(null);
    setDatum(new Date().toISOString().split("T")[0]);
  };

  const toggleDraftSelection = (id: number) => {
    setSelectedDrafts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllDrafts = () => {
    if (selectedDrafts.length === drafts.length) {
      setSelectedDrafts([]);
    } else {
      setSelectedDrafts(drafts.map((d) => d.id));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Uren Registratie</h1>

      {/* Form Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editingDraftId ? "Concept Bewerken" : "Nieuwe Uren Registratie"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Period */}
          <div>
            <label className="block text-sm font-medium mb-1">Periode</label>
            <select
              value={urenperGcId}
              onChange={(e) => setUrenperGcId(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              {periods.map((p: any) => (
                <option key={p.GcId} value={p.GcId}>
                  {p.GcCode} ({p.Description})
                </option>
              ))}
            </select>
          </div>

          {/* Task */}
          <div>
            <label className="block text-sm font-medium mb-1">Taak</label>
            <select
              value={taakGcId}
              onChange={(e) => setTaakGcId(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              {tasks.map((t: any) => (
                <option key={t.GcId} value={t.GcId}>
                  {t.GcCode} - {t.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium mb-1">Project</label>
            <select
              value={werkGcId || ""}
              onChange={(e) =>
                setWerkGcId(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Geen project</option>
              {projects.map((p: any) => (
                <option key={p.GcId} value={p.GcId}>
                  {p.GcCode} - {p.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Datum</label>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* Hours */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Aantal Uren
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="23.9"
              value={aantal}
              onChange={(e) => setAantal(e.target.value)}
              placeholder="8.0"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Omschrijving
            </label>
            <textarea
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
              placeholder="Beschrijf je werkzaamheden..."
              rows={3}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Bezig..."
              : editingDraftId
                ? "Bijwerken"
                : "Opslaan als Concept"}
          </button>
          {editingDraftId && (
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Annuleren
            </button>
          )}
        </div>
      </div>

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Concepten ({drafts.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={selectAllDrafts}
                className="text-sm text-blue-600 hover:underline"
              >
                {selectedDrafts.length === drafts.length
                  ? "Deselecteer alles"
                  : "Selecteer alles"}
              </button>
              {selectedDrafts.length > 0 && (
                <button
                  onClick={handleSubmitDrafts}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Inleveren ({selectedDrafts.length})
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      type="checkbox"
                      checked={selectedDrafts.length === drafts.length}
                      onChange={selectAllDrafts}
                    />
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
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drafts.map((draft) => (
                  <tr key={draft.id}>
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selectedDrafts.includes(draft.id)}
                        onChange={() => toggleDraftSelection(draft.id)}
                      />
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {new Date(draft.datum).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {draft.taakCode || draft.taakGcId}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {draft.werkCode || draft.werkGcId || "-"}
                    </td>
                    <td className="px-3 py-4 text-sm">{draft.aantal}</td>
                    <td className="px-3 py-4 text-sm">
                      {draft.omschrijving || "-"}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <button
                        onClick={() => handleEditDraft(draft)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Bewerk
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="text-red-600 hover:underline"
                      >
                        Verwijder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejected Entries Section */}
      {rejectedEntries.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-600">
            Afgekeurde Uren ({rejectedEntries.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
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
                    Reden Afkeuring
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rejectedEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-4 text-sm">
                      {new Date(entry.datum).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {entry.taakCode || entry.taakGcId}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {entry.werkCode || entry.werkGcId || "-"}
                    </td>
                    <td className="px-3 py-4 text-sm">{entry.aantal}</td>
                    <td className="px-3 py-4 text-sm text-red-600">
                      {entry.rejectionReason || "Geen reden opgegeven"}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <button
                        onClick={() => handleResubmitRejected([entry.id])}
                        disabled={loading}
                        className="text-green-600 hover:underline disabled:opacity-50"
                      >
                        Opnieuw Inleveren
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
