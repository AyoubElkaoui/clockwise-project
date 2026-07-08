"use client";
import { useState, useEffect } from "react";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  toggleWorkAllowed,
  generateHolidaysForYear,
  Holiday
} from "@/lib/api/holidaysApi";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Lock,
  Unlock,
  Trash2,
  AlertCircle,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/nl";

dayjs.locale("nl");

export default function JaarkalenderPage() {
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState({
    name: "",
    type: "company" as "company" | "closed",
    isWorkAllowed: false,
    notes: "",
  });

  useEffect(() => {
    loadHolidays();
  }, [currentYear]);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const data = await getHolidays(currentYear);
      setHolidays(Array.isArray(data) ? data : []);
      if (data.length === 0) {
        showToast("Geen feestdagen gevonden - migration 012 uitgevoerd?", "info");
      }
    } catch (error) {
      showToast("Kon feestdagen niet laden", "error");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: string) => {
    const existingHoliday = holidays.find(h => h.holidayDate === date);

    if (existingHoliday) {
      setSelectedDate(date);
      setFormData({
        name: existingHoliday.name,
        type: existingHoliday.type === "national" ? "company" : (existingHoliday.type as "company" | "closed"),
        isWorkAllowed: existingHoliday.isWorkAllowed,
        notes: existingHoliday.notes || "",
      });
      setModalMode("edit");
      setShowModal(true);
    } else {
      setSelectedDate(date);
      setFormData({
        name: "",
        type: "closed",
        isWorkAllowed: false,
        notes: "",
      });
      setModalMode("add");
      setShowModal(true);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate) return;

    try {
      if (modalMode === "add") {
        const finalName = formData.name.trim() ||
          (formData.type === "closed" ? `Gesloten dag ${selectedDate}` : "");

        if (!finalName) {
          showToast("Naam is verplicht", "error");
          return;
        }

        await createHoliday({
          holidayDate: selectedDate,
          name: finalName,
          type: formData.type,
          isWorkAllowed: formData.isWorkAllowed,
          notes: formData.notes,
        });
        showToast("Feestdag toegevoegd", "success");
      } else {
        const holiday = holidays.find(h => h.holidayDate === selectedDate);
        if (holiday) {
          await updateHoliday(holiday.id, {
            isWorkAllowed: formData.isWorkAllowed,
            notes: formData.notes,
          });
          showToast("Feestdag bijgewerkt", "success");
        }
      }
      setShowModal(false);
      loadHolidays();
    } catch (error: any) {
      showToast(error.message || "Fout bij opslaan", "error");
    }
  };

  const handleDelete = async (holidayId: number) => {
    if (!confirm("Weet je zeker dat je deze dag wilt verwijderen?")) return;

    try {
      await deleteHoliday(holidayId);
      showToast("Dag verwijderd", "success");
      setShowModal(false);
      loadHolidays();
    } catch (error: any) {
      showToast(error.message || "Fout bij verwijderen", "error");
    }
  };

  const handleToggleWork = async (holidayId: number) => {
    try {
      await toggleWorkAllowed(holidayId);
      showToast("Status gewijzigd", "success");
      loadHolidays();
    } catch (error: any) {
      showToast(error.message || "Fout bij wijzigen", "error");
    }
  };

  const handleGenerateHolidays = async () => {
    if (!confirm(`Wil je de Nederlandse feestdagen genereren voor ${currentYear}?`)) return;

    try {
      const result = await generateHolidaysForYear(currentYear);
      showToast(result.message, "success");
      loadHolidays();
    } catch (error: any) {
      showToast(error.message || "Fout bij genereren", "error");
    }
  };

  const renderCalendar = () => {
    const months = [];

    for (let month = 0; month < 12; month++) {
      const firstDay = dayjs().year(currentYear).month(month).startOf("month");
      const daysInMonth = firstDay.daysInMonth();
      const startDay = firstDay.day();
      const days = [];

      for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
        days.push(<div key={`empty-${i}`} className="p-1" />);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = firstDay.date(day);
        const dateStr = date.format("YYYY-MM-DD");
        const holiday = holidays.find(h => h.holidayDate === dateStr);
        const isWeekend = date.day() === 0 || date.day() === 6;
        const isToday = date.isSame(dayjs(), "day");

        days.push(
          <div
            key={day}
            onClick={() => handleDateClick(dateStr)}
            className={`
              p-1.5 text-center cursor-pointer rounded-md border transition-all text-xs
              ${isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""}
              ${
                holiday
                  ? holiday.type === "national"
                    ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                    : holiday.isWorkAllowed
                    ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                    : "bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700"
                  : isWeekend
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              }
            `}
          >
            <span className="font-medium text-slate-800 dark:text-slate-200">{day}</span>
            {holiday && (
              <div className="flex items-center justify-center mt-0.5">
                {holiday.isWorkAllowed ? (
                  <Unlock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />
                )}
              </div>
            )}
          </div>
        );
      }

      months.push(
        <div key={month} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            {firstDay.format("MMMM YYYY")}
          </p>
          <div className="grid grid-cols-7 gap-0.5 mb-1.5">
            {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 pb-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days}
          </div>
        </div>
      );
    }

    return months;
  };

  const selectedHoliday = selectedDate ? holidays.find(h => h.holidayDate === selectedDate) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Jaarkalender</h1>
          <p className="text-xs text-slate-500 mt-0.5">Beheer feestdagen en gesloten dagen</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentYear(currentYear - 1)}
            className="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-lg font-bold min-w-[60px] text-center text-slate-900 dark:text-slate-100">
            {currentYear}
          </span>
          <button
            onClick={() => setCurrentYear(currentYear + 1)}
            className="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleGenerateHolidays}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors ml-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Feestdagen Genereren</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 rounded-md" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Nationale feestdag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-rose-100 dark:bg-rose-900/30 border border-rose-300 rounded-md" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Gesloten (geen uren)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 rounded-md" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Feestdag (uren toegestaan)</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Uren geblokkeerd</span>
          </div>
          <div className="flex items-center gap-2">
            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Uren toegestaan</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {renderCalendar()}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-md shadow-xl">
            <div className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {modalMode === "add" ? "Dag Toevoegen" : "Dag Bewerken"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dayjs(selectedDate).format("dddd D MMMM YYYY")}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              {selectedHoliday?.type === "national" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                        Nationale Feestdag
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                        Je kunt aangeven of uren registratie toegestaan is op deze dag. De feestdag zelf kan niet worden verwijderd.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {modalMode === "add" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Naam
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Bijv. Bedrijfsuitje"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as "company" | "closed" })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="closed">Gesloten Dag</option>
                      <option value="company">Bedrijfsdag</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {selectedHoliday?.name}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {selectedHoliday?.type === "national"
                      ? "Nationale Feestdag"
                      : selectedHoliday?.type === "company"
                      ? "Bedrijfsdag"
                      : "Gesloten Dag"}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="workAllowed"
                  checked={formData.isWorkAllowed}
                  onChange={(e) => setFormData({ ...formData, isWorkAllowed: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="workAllowed" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Uren registratie toegestaan
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Notities
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Optionele notities..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                {selectedHoliday && selectedHoliday.type !== "national" && (
                  <button
                    onClick={() => handleDelete(selectedHoliday.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Verwijderen
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
