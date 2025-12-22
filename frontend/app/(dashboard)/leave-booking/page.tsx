"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertCircle, CheckCircle, Info } from "lucide-react";
import {
  getLeaveTypes,
  bookLeave,
  getMyLeave,
  LeaveType,
  LeaveBooking,
} from "@/lib/api/tasksApi";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import dayjs from "dayjs";

export default function LeaveBookingPage() {
  // State
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myBookings, setMyBookings] = useState<LeaveBooking[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [includeHistorical, setIncludeHistorical] = useState(false);

  // Form state
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter state voor bookings
  const [viewFrom, setViewFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [viewTo, setViewTo] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split("T")[0];
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, [includeHistorical]);

  useEffect(() => {
    if (viewFrom && viewTo) {
      fetchMyBookings();
    }
  }, [viewFrom, viewTo]);

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const response = await getLeaveTypes(includeHistorical);
      if (response && response.leaveTypes) {
        setLeaveTypes(response.leaveTypes);
      }
    } catch (error: any) {
      console.error("Error fetching leave types:", error);
      showToast(
        error.response?.data?.error || "Fout bij ophalen verloftypen",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await getMyLeave(viewFrom, viewTo);
      setMyBookings(response.bookings);
      setTotalHours(response.totalHours);
    } catch (error: any) {
      console.error("Error fetching my leave bookings:", error);
      // Niet tonen als error - kan zijn dat er nog geen boekingen zijn
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTaskId) {
      showToast("Selecteer een verloftype", "error");
      return;
    }

    if (!startDate || !endDate) {
      showToast("Selecteer start- en einddatum", "error");
      return;
    }

    try {
      setSubmitting(true);

      // Genereer entries voor elke dag (alleen werkdagen)
      const entries = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();

        // Skip weekends (0 = zondag, 6 = zaterdag)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        entries.push({
          date: d.toISOString().split("T")[0],
          hours: hoursPerDay,
          description: description || undefined,
        });
      }

      if (entries.length === 0) {
        showToast("Geen werkdagen gevonden in geselecteerde periode", "error");
        return;
      }

      const response = await bookLeave({
        taskId: selectedTaskId,
        entries,
      });

      if (response.success) {
        showToast(`${entries.length} werkdagen geboekt`, "success");

        // Warnings tonen
        if (response.warnings && response.warnings.length > 0) {
          response.warnings.forEach((warning) => showToast(warning, "info"));
        }

        // Reset form
        setSelectedTaskId(null);
        setStartDate("");
        setEndDate("");
        setDescription("");

        // Refresh bookings
        fetchMyBookings();
      } else {
        showToast(response.message, "error");
      }
    } catch (error: any) {
      console.error("Error booking leave:", error);
      showToast(
        error.response?.data?.error || "Fout bij boeken verlof",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Group leave types by category
  const groupedLeaveTypes = leaveTypes.reduce(
    (acc, lt) => {
      if (!acc[lt.category]) {
        acc[lt.category] = [];
      }
      acc[lt.category].push(lt);
      return acc;
    },
    {} as Record<string, LeaveType[]>,
  );

  // Category display names
  const categoryNames: Record<string, string> = {
    VACATION: "Vakantie",
    SICK_LEAVE: "Ziekteverlof",
    TIME_FOR_TIME_ACCRUAL: "T.v.T. Opbouw",
    TIME_FOR_TIME_USAGE: "T.v.T. Opname",
    SPECIAL_LEAVE: "Bijzonder Verlof",
    PUBLIC_HOLIDAY: "Feestdag",
    FROST_DELAY: "Vorstverlet",
    SINGLE_DAY_LEAVE: "Snipperdag",
    SCHEDULED_FREE: "Roostervrij",
    MEDICAL_APPOINTMENT: "Artsbezoek",
    OTHER_ABSENCE: "Overige Afwezigheid",
    UNKNOWN: "Onbekend",
  };

  const selectedTask = leaveTypes.find((lt) => lt.id === selectedTaskId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vakantie & Verlof</h1>
        <p className="text-muted-foreground mt-2">
          Beheer je vakantieaanvragen en verlof
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Boekingsformulier - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Nieuw Verlof
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Leave Type Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Verloftype</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={includeHistorical}
                        onChange={(e) => setIncludeHistorical(e.target.checked)}
                      />
                      <span className="text-muted-foreground">
                        Toon historisch
                      </span>
                    </label>
                  </div>

                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={selectedTaskId || ""}
                    onChange={(e) =>
                      setSelectedTaskId(Number(e.target.value) || null)
                    }
                    required
                  >
                    <option value="">Selecteer verloftype...</option>
                    {Object.entries(groupedLeaveTypes).map(
                      ([category, types]) => (
                        <optgroup
                          key={category}
                          label={categoryNames[category] || category}
                        >
                          {types.map((lt) => (
                            <option key={lt.id} value={lt.id}>
                              {lt.code} - {lt.description}
                              {lt.isHistorical ? " (HISTORISCH)" : ""}
                            </option>
                          ))}
                        </optgroup>
                      ),
                    )}
                  </select>
                </div>

                {/* Waarschuwing bij historische taak */}
                {selectedTask?.isHistorical && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">
                      Dit verloftype is gemarkeerd als historisch
                    </span>
                  </div>
                )}

                {/* Datums */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Startdatum</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-md bg-background"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Einddatum</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-md bg-background"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Uren per dag */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Uren per dag</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-md bg-background"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                    min="0.1"
                    max="24"
                    step="0.5"
                    required
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Alleen werkdagen (ma-vr) worden geboekt
                  </p>
                </div>

                {/* Omschrijving */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Omschrijving (optioneel)
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-md bg-background min-h-[80px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Eventuele toelichting..."
                  />
                </div>

                {/* Submit */}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <LoadingSpinner className="mr-2" />
                      Bezig met boeken...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Boek Verlof
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info sectie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="w-5 h-5" />
                Informatie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Verlof wordt automatisch geboekt voor alle{" "}
                    <strong>werkdagen</strong> (ma-vr)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Weekends worden automatisch overgeslagen</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Alle verloftypen starten met code <strong>Z</strong> (bijv.
                    Z05 = Vakantie)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Bij dubbele boekingen krijg je een foutmelding</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Mijn Boekingen - 1 column */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Mijn Boekingen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Van
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 text-sm border rounded-md bg-background"
                    value={viewFrom}
                    onChange={(e) => setViewFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tot
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 text-sm border rounded-md bg-background"
                    value={viewTo}
                    onChange={(e) => setViewTo(e.target.value)}
                  />
                </div>
              </div>

              {/* Totaal */}
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Totaal Uren</div>
                <div className="text-3xl font-bold text-primary mt-1">
                  {totalHours.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {myBookings.length} boekingen
                </div>
              </div>

              {/* Lijst */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {myBookings.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Geen boekingen gevonden</p>
                  </div>
                ) : (
                  myBookings.map((booking) => (
                    <div
                      key={booking.bookingId}
                      className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {dayjs(booking.date).format("ddd D MMM YYYY")}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                              {booking.taskCode}
                            </span>
                          </div>
                          {booking.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {booking.description}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {booking.hours.toFixed(1)}u
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
