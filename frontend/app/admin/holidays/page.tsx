"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, Shield, ShieldOff } from "lucide-react";
import { showToast } from "@/components/ui/toast";
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  toggleWorkAllowed,
  generateHolidaysForYear,
} from "@/lib/api/holidaysApi";
import dayjs from "dayjs";

interface Holiday {
  id: number;
  holidayDate: string;
  name: string;
  type: string;
  isWorkAllowed: boolean;
  createdBy?: number;
  createdAt?: string;
  notes?: string;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    name: "",
    holidayDate: "",
    type: "company" as "company" | "closed",
    isWorkAllowed: false,
    notes: "",
  });

  useEffect(() => {
    loadHolidays();
  }, [selectedYear]);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await getHolidays(selectedYear);
      setHolidays(Array.isArray(data) ? data : []);
    } catch {
      showToast("Fout bij laden feestdagen", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHoliday({
        holidayDate: formData.holidayDate,
        name: formData.name,
        type: formData.type,
        isWorkAllowed: formData.isWorkAllowed,
        notes: formData.notes || undefined,
      });
      showToast("Feestdag succesvol toegevoegd", "success");
      setShowModal(false);
      resetForm();
      loadHolidays();
    } catch {
      showToast("Fout bij opslaan feestdag", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Weet je zeker dat je deze dag wilt verwijderen?")) return;
    try {
      await deleteHoliday(id);
      showToast("Feestdag verwijderd", "success");
      loadHolidays();
    } catch {
      showToast("Fout bij verwijderen", "error");
    }
  };

  const handleToggleWork = async (id: number) => {
    try {
      await toggleWorkAllowed(id);
      loadHolidays();
    } catch {
      showToast("Fout bij wijzigen", "error");
    }
  };

  const handleGenerateYear = async () => {
    try {
      const result = await generateHolidaysForYear(selectedYear);
      showToast(result?.message || `Feestdagen gegenereerd voor ${selectedYear}`, "success");
      loadHolidays();
    } catch {
      showToast(`Feestdagen voor ${selectedYear} bestaan mogelijk al`, "error");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      holidayDate: "",
      type: "company",
      isWorkAllowed: false,
      notes: "",
    });
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "national": return "bg-emerald-100 text-emerald-700";
      case "company": return "bg-blue-100 text-blue-700";
      case "closed": return "bg-orange-100 text-orange-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "national": return "Feestdag";
      case "company": return "Bedrijfsdag";
      case "closed": return "Sluitingsdag";
      default: return type;
    }
  };

  const inputClass = "h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Feestdagen &amp; Sluitingsdagen</h1>
          <p className="text-xs text-slate-500 mt-0.5">Beheer nationale en bedrijfsvrije dagen</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleGenerateYear}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium rounded-md transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Genereer {selectedYear}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nieuwe Dag
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Naam</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Werken Toegestaan</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium tabular-nums">
                    {dayjs(holiday.holidayDate).format("DD-MM-YYYY")}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{holiday.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(holiday.type)}`}>
                      {getTypeLabel(holiday.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleWork(holiday.id)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        holiday.isWorkAllowed
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                      }`}
                    >
                      {holiday.isWorkAllowed ? (
                        <><Shield className="w-3 h-3" /> Ja</>
                      ) : (
                        <><ShieldOff className="w-3 h-3" /> Nee</>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {holiday.type !== "national" && (
                      <button
                        onClick={() => handleDelete(holiday.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {holidays.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen feestdagen gevonden</p>
              <p className="text-xs text-slate-500 mt-1">Klik op &quot;Genereer {selectedYear}&quot; om Nederlandse feestdagen toe te voegen.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-5">
              Nieuwe Dag Toevoegen
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Naam</label>
                <input
                  className={inputClass}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bijv. Bedrijfsuitje"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Datum</label>
                <input
                  type="date"
                  className={inputClass}
                  value={formData.holidayDate}
                  onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Type</label>
                <select
                  className={inputClass}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "company" | "closed" })}
                >
                  <option value="company">Bedrijfsdag</option>
                  <option value="closed">Sluitingsdag</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Notities (optioneel)</label>
                <input
                  className={inputClass}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Extra informatie..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="workAllowed"
                  checked={formData.isWorkAllowed}
                  onChange={(e) => setFormData({ ...formData, isWorkAllowed: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="workAllowed" className="text-sm text-slate-700 dark:text-slate-300">
                  Werken toegestaan op deze dag
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Toevoegen
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium rounded-md transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
