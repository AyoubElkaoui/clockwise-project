"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { Calendar, Plus, Trash2, Edit2, Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastContainer } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string; // "Feestdag" or "Sluitingsdag"
  isRecurring: boolean;
  companyId: number | null;
  company?: { id: number; name: string };
  createdAt: string;
}

interface Company {
  id: number;
  name: string;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    type: "Feestdag",
    isRecurring: false,
    companyId: null as number | null,
  });

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [holidaysRes, companiesRes] = await Promise.all([
        fetch("${API_URL}/holidays"),
        fetch("${API_URL}/companies"),
      ]);
      const holidaysData = await holidaysRes.json();
      const companiesData = await companiesRes.json();
      setHolidays(holidaysData);
      setCompanies(companiesData);
    } catch (error) {
      console.error("Failed to load data:", error);
      addToast("Kon gegevens niet laden", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${API_URL}/holidays/${editingId}`
        : "${API_URL}/holidays";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save holiday");

      addToast(
        editingId ? "Dag bijgewerkt!" : "Dag toegevoegd!",
        "success"
      );
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Failed to save holiday:", error);
      addToast("Opslaan mislukt", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Weet je zeker dat je deze dag wilt verwijderen?")) return;

    try {
      const response = await fetch(`${API_URL}/holidays/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete holiday");

      addToast("Dag verwijderd", "success");
      loadData();
    } catch (error) {
      console.error("Failed to delete holiday:", error);
      addToast("Verwijderen mislukt", "error");
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingId(holiday.id);
    setFormData({
      name: holiday.name,
      date: holiday.date.split("T")[0],
      type: holiday.type,
      isRecurring: holiday.isRecurring,
      companyId: holiday.companyId,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      date: "",
      type: "Feestdag",
      isRecurring: false,
      companyId: null,
    });
    setEditingId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              Feestdagen & Sluitingsdagen
            </h1>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Dag
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <Card variant="elevated" padding="lg">
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Naam
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Datum
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Jaarlijks
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Bedrijf
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Acties
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {holidays.map((holiday) => (
                        <tr
                          key={holiday.id}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <td className="py-3 px-4">{holiday.name}</td>
                          <td className="py-3 px-4">
                            {new Date(holiday.date).toLocaleDateString("nl-NL")}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                holiday.type === "Feestdag"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                              }`}
                            >
                              {holiday.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {holiday.isRecurring ? "Ja" : "Nee"}
                          </td>
                          <td className="py-3 px-4">
                            {holiday.company?.name || "Alle bedrijven"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleEdit(holiday)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(holiday.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {holidays.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      Geen feestdagen of sluitingsdagen gevonden
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
                {editingId ? "Dag Bewerken" : "Nieuwe Dag Toevoegen"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Naam</label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Bijv. Kerst, Bedrijfsdag"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Datum</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  >
                    <option value="Feestdag">Feestdag</option>
                    <option value="Sluitingsdag">Sluitingsdag</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Bedrijf (optioneel)
                  </label>
                  <select
                    value={formData.companyId ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  >
                    <option value="">Alle bedrijven</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData({ ...formData, isRecurring: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label className="text-sm">Jaarlijks terugkerend</label>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button type="submit" className="flex-1">
                    {editingId ? "Bijwerken" : "Toevoegen"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ModernLayout>
    </ProtectedRoute>
  );
}
