"use client";
import { useState, useEffect } from "react";
import { 
  getHolidays, 
  createHoliday, 
  updateHoliday, 
  deleteHoliday, 
  toggleWorkAllowed,
  Holiday 
} from "@/lib/api/holidaysApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
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
      console.error("Jaarkalender: Error loading holidays:", error);
      showToast("Kon feestdagen niet laden", "error");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: string) => {
    const existingHoliday = holidays.find(h => h.holidayDate === date);
    
    if (existingHoliday) {
      // Show holiday details
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
      // Add new holiday
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
        await createHoliday({
          holidayDate: selectedDate,
          name: formData.name,
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

  const renderCalendar = () => {
    const months = [];
    
    for (let month = 0; month < 12; month++) {
      const firstDay = dayjs().year(currentYear).month(month).startOf("month");
      const daysInMonth = firstDay.daysInMonth();
      const startDay = firstDay.day(); // 0 = Sunday
      const days = [];

      // Add empty cells for days before month starts
      for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
        days.push(<div key={`empty-${i}`} className="p-2"></div>);
      }

      // Add days of month
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
              p-2 text-center cursor-pointer rounded-lg border transition-all
              ${isToday ? "ring-2 ring-blue-500" : ""}
              ${holiday
                ? holiday.type === "national"
                  ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300"
                  : holiday.isWorkAllowed
                  ? "bg-green-100 dark:bg-green-900/30 border-green-300"
                  : "bg-pink-100 dark:bg-pink-900/30 border-pink-300"
                : isWeekend
                ? "bg-slate-100 dark:bg-slate-800"
                : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              }
              border-slate-200 dark:border-slate-700
            `}
          >
            <div className="font-semibold text-sm">{day}</div>
            {holiday && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {holiday.isWorkAllowed ? (
                  <Unlock className="w-3 h-3 text-green-600 dark:text-green-400" />
                ) : (
                  <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                )}
              </div>
            )}
          </div>
        );
      }

      months.push(
        <Card key={month} className="flex-1 min-w-[280px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {firstDay.format("MMMM YYYY")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map(day => (
                <div key={day} className="text-xs font-semibold text-center text-slate-600 dark:text-slate-400">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days}
            </div>
          </CardContent>
        </Card>
      );
    }

    return months;
  };

  const selectedHoliday = selectedDate ? holidays.find(h => h.holidayDate === selectedDate) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Jaarkalender
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Beheer feestdagen en gesloten dagen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentYear(currentYear - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xl font-bold min-w-[100px] text-center">
            {currentYear}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentYear(currentYear + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 rounded"></div>
              <span className="text-sm">Nationale feestdag</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-pink-100 dark:bg-pink-900/30 border border-pink-300 rounded"></div>
              <span className="text-sm">Gesloten (geen uren)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 border border-green-300 rounded"></div>
              <span className="text-sm">Feestdag (uren toegestaan)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 border border-red-300 rounded flex items-center justify-center">
                <Lock className="w-3 h-3 text-red-600" />
              </div>
              <span className="text-sm">Uren geblokkeerd</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 border border-green-300 rounded flex items-center justify-center">
                <Unlock className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm">Uren toegestaan</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {renderCalendar()}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {modalMode === "add" ? "Dag Toevoegen" : "Dag Bewerken"}
                </CardTitle>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {dayjs(selectedDate).format("dddd D MMMM YYYY")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedHoliday?.type === "national" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                        Nationale Feestdag
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Je kunt aangeven of uren registratie toegestaan is op deze dag. De feestdag zelf kan niet worden verwijderd.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {modalMode === "add" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Naam</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                      placeholder="Bijv. Bedrijfsuitje"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as "company" | "closed" })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    >
                      <option value="closed">Gesloten Dag</option>
                      <option value="company">Bedrijfsdag</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-2">{selectedHoliday?.name}</p>
                  <Badge variant="outline">
                    {selectedHoliday?.type === "national" ? "Nationale Feestdag" : 
                     selectedHoliday?.type === "company" ? "Bedrijfsdag" : "Gesloten Dag"}
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="workAllowed"
                  checked={formData.isWorkAllowed}
                  onChange={(e) => setFormData({ ...formData, isWorkAllowed: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="workAllowed" className="text-sm font-medium">
                  Uren registratie toegestaan
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notities</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                  rows={3}
                  placeholder="Optionele notities..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                {selectedHoliday && selectedHoliday.type !== "national" && (
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(selectedHoliday.id)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Verwijderen
                  </Button>
                )}
                <div className="flex-1"></div>
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSubmit}>
                  <Check className="w-4 h-4 mr-2" />
                  Opslaan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
