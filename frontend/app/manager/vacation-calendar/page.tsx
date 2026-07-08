"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { getAllUsers, getAllVacationRequests } from "@/lib/manager-api";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";
import {
  Calendar,
  Settings,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

interface Holiday {
  date: string;
  name: string;
  type: "national" | "company";
}

interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface VacationRequest {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface ClosedDay {
  id: string;
  date: string;
  reason: string;
  type: "national" | "custom";
}

export default function VacationCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showClosedDaysModal, setShowClosedDaysModal] = useState(false);
  const [newClosedDay, setNewClosedDay] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  const handleAddClosedDays = () => {
    if (!newClosedDay.startDate || !newClosedDay.endDate || !newClosedDay.reason) {
      showToast("Vul alle velden in", "error");
      return;
    }
    const start = dayjs(newClosedDay.startDate);
    const end = dayjs(newClosedDay.endDate);
    if (start.isAfter(end)) {
      showToast("Start datum moet voor eind datum liggen", "error");
      return;
    }

    // Temporarily disabled - backend endpoint not yet implemented
    showToast("Deze functie is nog niet beschikbaar", "error");
    return;

    /* TODO: Implement when backend endpoint is ready
    fetch(`${API_URL}/holidays/closed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: newClosedDay.startDate,
        endDate: newClosedDay.endDate,
        reason: newClosedDay.reason,
      }),
    })
      .then((response) => response.json())
      .then((addedDays) => {
        setClosedDays([
          ...closedDays,
          ...addedDays.map((d: any) => ({ ...d, type: "custom" })),
        ]);
        setNewClosedDay({ startDate: "", endDate: "", reason: "" });
        setShowClosedDaysModal(false);
        showToast(`${addedDays.length} extra gesloten dagen toegevoegd`, "success");
      })
      .catch((error) => {
        showToast("Fout bij toevoegen gesloten dagen", "error");
      });
    */
  };

  useEffect(() => {
    loadData();
  }, [currentYear]);

  const getDutchHolidays = (year: number): Holiday[] => {
    return [
      { date: `${year}-01-01`, name: "Nieuwjaarsdag", type: "national" },
      { date: `${year}-04-18`, name: "Goede Vrijdag", type: "national" },
      { date: `${year}-04-21`, name: "1e Paasdag", type: "national" },
      { date: `${year}-04-22`, name: "2e Paasdag", type: "national" },
      { date: `${year}-04-27`, name: "Koningsdag", type: "national" },
      { date: `${year}-05-05`, name: "Bevrijdingsdag", type: "national" },
      { date: `${year}-05-18`, name: "Hemelvaartsdag", type: "national" },
      { date: `${year}-05-29`, name: "1e Pinksterdag", type: "national" },
      { date: `${year}-05-30`, name: "2e Pinksterdag", type: "national" },
      { date: `${year}-12-25`, name: "1e Kerstdag", type: "national" },
      { date: `${year}-12-26`, name: "2e Kerstdag", type: "national" },
    ];
  };

  const loadData = async () => {
    try {
      const managerId = authUtils.getUserId();
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      // Load team members and vacation requests
      const [users, allVacations] = await Promise.all([
        getAllUsers(),
        getAllVacationRequests(),
      ]);

      const team = users.filter((u: any) => u.managerId === managerId);
      setTeamMembers(team);

      // Filter vacations for team members only
      const teamIds = team.map((u: any) => u.id || u.medewGcId);
      const vacationsData = allVacations.filter((v: any) =>
        teamIds.includes(v.userId),
      );
      setVacations(vacationsData);

      // Load holidays
      const dutchHolidays = getDutchHolidays(currentYear);
      setHolidays(dutchHolidays);

      // Load closed days (national holidays + custom from backend if available)
      const nationalClosedDays = dutchHolidays.map((h) => ({
        id: h.date,
        date: h.date,
        reason: h.name,
        type: "national" as const,
      }));

      // Try to load custom closed days, but don't fail if endpoint doesn't exist
      let customClosedDays: any[] = [];
      try {
        const closedRes = await fetch(
          `${API_URL}/holidays/closed?year=${currentYear}`,
        );
        if (closedRes.ok) {
          customClosedDays = await closedRes.json();
        }
      } catch (error) {
        // Endpoint doesn't exist yet, use only national holidays
      }

      const allClosedDays = [
        ...nationalClosedDays,
        ...customClosedDays.map((c: any) => ({ ...c, type: "custom" as const })),
      ];
      setClosedDays(allClosedDays);
    } catch (error) {
      showToast("Fout bij laden vakantie kalender", "error");
    } finally {
      setLoading(false);
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(dayjs().month());

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      dayjs().year(currentYear).month(i),
    );
  }, [currentYear]);

  const selectedMonthObj = months[selectedMonth];
  const daysInMonth = selectedMonthObj.daysInMonth();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) =>
    selectedMonthObj.date(i + 1),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Vakantie Kaart
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Excel-achtige vakantie overzicht per maand
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentYear(currentYear - 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Vorig Jaar</span>
          </button>
          <span className="px-3 py-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 min-w-[60px] text-center">
            {currentYear}
          </span>
          <button
            onClick={() => setCurrentYear(currentYear + 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="hidden sm:inline">Volgend Jaar</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex flex-wrap gap-1 md:gap-2">
        {months.map((month, index) => (
          <button
            key={index}
            onClick={() => setSelectedMonth(index)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedMonth === index
                ? "bg-blue-600 text-white"
                : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {month.format("MMM")}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Legenda</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-slate-700 dark:text-slate-300">Vakantie (V)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 dark:bg-red-900 rounded" />
            <span className="text-slate-700 dark:text-slate-300">Gesloten dag</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 dark:bg-slate-600 rounded" />
            <span className="text-slate-700 dark:text-slate-300">Weekend</span>
          </div>
        </div>
      </div>

      {/* Vacation Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Vakantie Overzicht - {selectedMonthObj.format("MMMM YYYY")}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-auto border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border border-slate-300 dark:border-slate-600">
                  Medewerker
                </th>
                {monthDays.map((day, i) => {
                  const isClosed = closedDays.some((c) =>
                    dayjs(c.date).isSame(day, "day"),
                  );
                  const isWeekend = day.day() === 0 || day.day() === 6;
                  return (
                    <th
                      key={i}
                      className={`px-2 py-3 text-center text-xs font-medium border border-slate-300 dark:border-slate-600 ${
                        isClosed
                          ? "bg-red-100 dark:bg-red-900"
                          : isWeekend
                          ? "bg-slate-200 dark:bg-slate-600"
                          : "bg-white dark:bg-slate-800"
                      }`}
                      title={
                        isClosed
                          ? closedDays.find((c) => dayjs(c.date).isSame(day, "day"))
                              ?.reason || "Gesloten dag"
                          : isWeekend
                          ? "Weekend"
                          : ""
                      }
                    >
                      {day.format("D")}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 whitespace-nowrap">
                    {member.firstName} {member.lastName}
                  </td>
                  {monthDays.map((day, i) => {
                    const isClosed = closedDays.some((c) =>
                      dayjs(c.date).isSame(day, "day"),
                    );
                    const isOnVacation = vacations.some(
                      (v) =>
                        v.userId === member.id &&
                        v.status === "approved" &&
                        day.isBetween(
                          dayjs(v.startDate),
                          dayjs(v.endDate),
                          null,
                          "[]",
                        ),
                    );
                    return (
                      <td
                        key={i}
                        className={`px-2 py-3 text-center text-sm border border-slate-300 dark:border-slate-600 ${
                          isClosed
                            ? "bg-red-100 dark:bg-red-900"
                            : isOnVacation
                            ? "bg-blue-500 text-white font-bold"
                            : "bg-white dark:bg-slate-900"
                        }`}
                      >
                        {isOnVacation ? "V" : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closed Days Management */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          <Settings className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Gesloten Dagen Beheer
          </span>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nationale feestdagen zijn automatisch gesloten. Voeg extra gesloten dagen toe.
          </p>
          {closedDays.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Gesloten dagen:
              </h4>
              {closedDays
                .filter((day) => day.type === "custom")
                .map((day) => (
                  <div
                    key={day.id}
                    className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {dayjs(day.date).format("DD MMM YYYY")} - {day.reason}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`${API_URL}/holidays/closed/${day.id}`, {
                            method: "DELETE",
                          });
                          setClosedDays(closedDays.filter((d) => d.id !== day.id));
                          showToast("Gesloten dag verwijderd", "success");
                        } catch (error) {
                          showToast("Fout bij verwijderen gesloten dag", "error");
                        }
                      }}
                      className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                ))}
            </div>
          )}
          <button
            onClick={() => setShowClosedDaysModal(true)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Settings className="w-4 h-4" />
            Extra Gesloten Dagen Toevoegen
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Snelle Acties
          </span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <button
            onClick={() => {
              // Export current month as CSV
              const headers = [
                "Medewerker",
                ...monthDays.map((d) => d.format("DD-MM")),
              ];
              const rows = teamMembers.map((member) => [
                `${member.firstName} ${member.lastName}`,
                ...monthDays.map((day) =>
                  vacations.some(
                    (v) =>
                      v.userId === member.id &&
                      v.status === "approved" &&
                      day.isBetween(
                        dayjs(v.startDate),
                        dayjs(v.endDate),
                        null,
                        "[]",
                      ),
                  )
                    ? "Vakantie"
                    : "",
                ),
              ]);
              const csv = [headers, ...rows]
                .map((row) => row.join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `vakantie-kaart-${selectedMonthObj.format("MMMM-YYYY")}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              showToast("Vakantie kaart geëxporteerd", "success");
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Maand
          </button>
          <button
            onClick={() => window.open("/manager/vacation", "_blank")}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Vakantie Aanvragen
          </button>
        </div>
      </div>

      {/* Closed Days Modal */}
      {showClosedDaysModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Extra Gesloten Dag Toevoegen
              </h2>
              <button
                onClick={() => setShowClosedDaysModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Datum{" "}
                    <span className="text-xs text-slate-500">(DD-MM-YYYY)</span>
                  </label>
                  <input
                    type="date"
                    value={newClosedDay.startDate}
                    onChange={(e) =>
                      setNewClosedDay({ ...newClosedDay, startDate: e.target.value })
                    }
                    className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Eind Datum{" "}
                    <span className="text-xs text-slate-500">(DD-MM-YYYY)</span>
                  </label>
                  <input
                    type="date"
                    value={newClosedDay.endDate}
                    onChange={(e) =>
                      setNewClosedDay({ ...newClosedDay, endDate: e.target.value })
                    }
                    className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Reden
                </label>
                <textarea
                  placeholder="Bijv. Bedrijfsuitje, Onderhoud, etc."
                  value={newClosedDay.reason}
                  onChange={(e) =>
                    setNewClosedDay({ ...newClosedDay, reason: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddClosedDays}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => setShowClosedDaysModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
