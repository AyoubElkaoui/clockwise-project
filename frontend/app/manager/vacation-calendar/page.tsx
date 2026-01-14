"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { getAllUsers, getAllVacationRequests } from "@/lib/manager-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
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
    if (
      !newClosedDay.startDate ||
      !newClosedDay.endDate ||
      !newClosedDay.reason
    ) {
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
        showToast(
          `${addedDays.length} extra gesloten dagen toegevoegd`,
          "success",
        );
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
        getAllVacationRequests()
      ]);

      const team = users.filter((u: any) => u.managerId === managerId);
      setTeamMembers(team);

      // Filter vacations for team members only
      const teamIds = team.map((u: any) => u.id);
      const vacationsData = allVacations.filter((v: any) => teamIds.includes(v.userId));
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
        console.log("Custom holidays endpoint not available");
      }
      
      const allClosedDays = [
        ...nationalClosedDays,
        ...customClosedDays.map((c: any) => ({
          ...c,
          type: "custom" as const,
        })),
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
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Vakantie Kaart
          </h1>
          <p className="text-slate-700 dark:text-slate-300 mt-1">
            Excel-achtige vakantie overzicht per maand
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentYear(currentYear - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Vorig Jaar
          </Button>
          <div className="text-center min-w-[100px]">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {currentYear}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentYear(currentYear + 1)}
          >
            Volgend Jaar
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex gap-2 mb-4">
        {months.map((month, index) => (
          <Button
            key={index}
            variant={selectedMonth === index ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMonth(index)}
          >
            {month.format("MMM")}
          </Button>
        ))}
      </div>

      {/* Color Legend */}
      <Card className="shadow-lg mb-4">
        <CardHeader className="bg-slate-50 dark:bg-slate-800">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Legenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Vakantie (V)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900 rounded"></div>
              <span>Gesloten dag</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-600 rounded"></div>
              <span>Weekend</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vacation Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-slate-50 dark:bg-slate-800">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Vakantie Overzicht - {selectedMonthObj.format("MMMM YYYY")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700">
                  <th className="border border-slate-300 p-3 text-left font-semibold">
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
                        className={`border border-slate-300 p-2 text-center text-xs font-medium ${
                          isClosed
                            ? "bg-red-100 dark:bg-red-900"
                            : isWeekend
                              ? "bg-slate-200 dark:bg-slate-600"
                              : "bg-white dark:bg-slate-800"
                        }`}
                        title={
                          isClosed
                            ? closedDays.find((c) =>
                                dayjs(c.date).isSame(day, "day"),
                              )?.reason || "Gesloten dag"
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
                {teamMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    className={
                      index % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50 dark:bg-slate-800"
                    }
                  >
                    <td className="border border-slate-300 p-3 font-medium">
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
                          className={`border border-slate-300 p-2 text-center text-sm ${
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
        </CardContent>
      </Card>

      {/* Closed Days Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gesloten Dagen Beheer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nationale feestdagen zijn automatisch gesloten. Voeg extra
              gesloten dagen toe.
            </p>
            {closedDays.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Gesloten dagen:</h4>
                {closedDays
                  .filter((day) => day.type === "custom")
                  .map((day, index) => (
                    <div
                      key={day.id}
                      className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border"
                    >
                      <span className="text-sm">
                        {dayjs(day.date).format("DD MMM YYYY")} - {day.reason}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await fetch(
                              `${API_URL}/holidays/closed/${day.id}`,
                              {
                                method: "DELETE",
                              },
                            );
                            setClosedDays(
                              closedDays.filter((d) => d.id !== day.id),
                            );
                            showToast("Gesloten dag verwijderd", "success");
                          } catch (error) {
                            showToast(
                              "Fout bij verwijderen gesloten dag",
                              "error",
                            );
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
            <Button
              onClick={() => setShowClosedDaysModal(true)}
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Extra Gesloten Dagen Toevoegen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-lg">
        <CardHeader className="bg-slate-50 dark:bg-slate-800">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Snelle Acties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
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
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Maand
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("/manager/vacation", "_blank")}
              className="w-full"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Vakantie Aanvragen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Closed Days Modal */}
      {showClosedDaysModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Extra Gesloten Dag Toevoegen
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClosedDaysModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Start Datum{" "}
                      <span className="text-xs text-slate-500">
                        (DD-MM-YYYY)
                      </span>
                    </label>
                    <Input
                      type="date"
                      value={newClosedDay.startDate}
                      onChange={(e) =>
                        setNewClosedDay({
                          ...newClosedDay,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full"
                      placeholder="DD-MM-YYYY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Eind Datum{" "}
                      <span className="text-xs text-slate-500">
                        (DD-MM-YYYY)
                      </span>
                    </label>
                    <Input
                      type="date"
                      value={newClosedDay.endDate}
                      onChange={(e) =>
                        setNewClosedDay({
                          ...newClosedDay,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full"
                      placeholder="DD-MM-YYYY"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reden
                  </label>
                  <Textarea
                    placeholder="Bijv. Bedrijfsuitje, Onderhoud, etc."
                    value={newClosedDay.reason}
                    onChange={(e) =>
                      setNewClosedDay({
                        ...newClosedDay,
                        reason: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleAddClosedDays}>Toevoegen</Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowClosedDaysModal(false)}
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
