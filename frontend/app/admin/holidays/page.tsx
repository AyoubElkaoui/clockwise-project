"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, Loader2, Shield, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ui/toast";
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  toggleWorkAllowed,
  generateHolidaysForYear,
} from "@/lib/api/holidaysApi";
import { PageHeader } from "@/components/ui/page-header";
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "national":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "company":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "closed":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800";
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Feestdagen & Sluitingsdagen"
        description="Beheer nationale en bedrijfsvrije dagen"
        actions={
          <div className="flex gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Button variant="outline" onClick={handleGenerateYear}>
              <Calendar className="w-4 h-4 mr-2" />
              Genereer {selectedYear}
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Dag
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Naam</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Werken Toegestaan</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {holidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {dayjs(holiday.holidayDate).format("DD-MM-YYYY")}
                      </td>
                      <td className="px-4 py-3 font-medium">{holiday.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(holiday.type)}`}>
                          {getTypeLabel(holiday.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleWork(holiday.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            holiday.isWorkAllowed
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
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
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen feestdagen gevonden</p>
                  <p className="text-sm text-slate-500 mt-1">Klik op &quot;Genereer {selectedYear}&quot; om Nederlandse feestdagen toe te voegen.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
              Nieuwe Dag Toevoegen
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bijv. Bedrijfsuitje"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Datum</label>
                <Input
                  type="date"
                  value={formData.holidayDate}
                  onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "company" | "closed" })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                >
                  <option value="company">Bedrijfsdag</option>
                  <option value="closed">Sluitingsdag</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notities (optioneel)</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Extra informatie..."
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isWorkAllowed}
                  onChange={(e) => setFormData({ ...formData, isWorkAllowed: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Werken toegestaan op deze dag</label>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="submit" className="flex-1">
                  Toevoegen
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">
                  Annuleren
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
