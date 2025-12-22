"use client";

import React, { useState, useEffect } from "react";
import {
  getLeaveTypes,
  bookLeave,
  getMyLeave,
  LeaveType,
  LeaveBooking,
} from "@/lib/api/tasksApi";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

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

  // Message state
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Fetch leave types
  useEffect(() => {
    fetchLeaveTypes();
  }, [includeHistorical]);

  // Fetch my bookings
  useEffect(() => {
    if (viewFrom && viewTo) {
      fetchMyBookings();
    }
  }, [viewFrom, viewTo]);

  const showMessage = (msg: string, success: boolean) => {
    setMessage(msg);
    setIsSuccess(success);
    setTimeout(() => setMessage(""), 5000);
  };

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const response = await getLeaveTypes(includeHistorical);
      setLeaveTypes(response.leaveTypes);
    } catch (error: any) {
      console.error("Error fetching leave types:", error);
      showMessage(
        "Fout bij ophalen verloftypen: " +
          (error.response?.data?.error || error.message),
        false,
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
      showMessage(
        "Fout bij ophalen boekingen: " +
          (error.response?.data?.error || error.message),
        false,
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTaskId) {
      showMessage("Selecteer een verloftype", false);
      return;
    }

    if (!startDate || !endDate) {
      showMessage("Selecteer start- en einddatum", false);
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
        showMessage("Geen werkdagen gevonden in geselecteerde periode", false);
        return;
      }

      const response = await bookLeave({
        taskId: selectedTaskId,
        entries,
      });

      if (response.success) {
        showMessage(
          `${response.message} (${entries.length} werkdagen geboekt)`,
          true,
        );

        // Reset form
        setSelectedTaskId(null);
        setStartDate("");
        setEndDate("");
        setDescription("");

        // Refresh bookings
        fetchMyBookings();
      } else {
        showMessage(response.message, false);
      }
    } catch (error: any) {
      console.error("Error booking leave:", error);
      showMessage(
        "Fout bij boeken verlof: " +
          (error.response?.data?.error || error.message),
        false,
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

  // Category display names (Nederlandse namen)
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <CalendarDaysIcon className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Verlof Boeken</h1>
            <p className="text-blue-100 text-lg">
              Beheer je verlof en afwezigheid
            </p>
          </div>
        </div>
      </div>

      {/* Message alert */}
      {message && (
        <div
          className={`alert ${isSuccess ? "alert-success" : "alert-error"} shadow-lg`}
        >
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircleIcon className="w-6 h-6" />
            ) : (
              <InformationCircleIcon className="w-6 h-6" />
            )}
            <span>{message}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Boekingsformulier - 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <PlusCircleIcon className="w-6 h-6 text-blue-600" />
              Nieuw Verlof
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type Selector */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Verloftype</span>
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text text-sm">Toon historisch</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-primary"
                      checked={includeHistorical}
                      onChange={(e) => setIncludeHistorical(e.target.checked)}
                    />
                  </label>
                </label>

                {loading ? (
                  <div className="skeleton h-14 w-full rounded-xl"></div>
                ) : (
                  <select
                    className="select select-bordered select-lg w-full rounded-xl"
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
                )}
              </div>

              {/* Waarschuwing bij historische taak */}
              {selectedTask?.isHistorical && (
                <div className="alert alert-warning rounded-xl">
                  <InformationCircleIcon className="w-6 h-6" />
                  <span>Dit verloftype is gemarkeerd als historisch.</span>
                </div>
              )}

              {/* Datums */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Startdatum</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered input-lg rounded-xl"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Einddatum</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered input-lg rounded-xl"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Uren per dag */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Uren per dag</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-lg rounded-xl"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  min="0.1"
                  max="24"
                  step="0.5"
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-gray-500">
                    <ClockIcon className="w-4 h-4 inline mr-1" />
                    Alleen werkdagen (ma-vr) worden geboekt
                  </span>
                </label>
              </div>

              {/* Omschrijving */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    Omschrijving (optioneel)
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered textarea-lg rounded-xl"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Eventuele toelichting..."
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary btn-lg w-full rounded-xl text-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Bezig met boeken...
                  </>
                ) : (
                  <>
                    <CalendarDaysIcon className="w-6 h-6" />
                    Boek Verlof
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info sectie */}
          <div className="bg-blue-50 rounded-2xl shadow p-6 mt-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <InformationCircleIcon className="w-6 h-6 text-blue-600" />
              Informatie
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>
                  Verlof wordt automatisch geboekt voor alle{" "}
                  <strong>werkdagen</strong> (ma-vr)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Weekends worden automatisch overgeslagen</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>
                  Alle verloftypen starten met code <strong>Z</strong> (bijv.
                  Z05 = Vakantie)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Bij dubbele boekingen krijg je een foutmelding</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Mijn Boekingen - 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
            <h2 className="text-2xl font-bold mb-6">Mijn Boekingen</h2>

            {/* Filter */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm font-semibold">Van</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered input-sm rounded-lg"
                  value={viewFrom}
                  onChange={(e) => setViewFrom(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm font-semibold">Tot</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered input-sm rounded-lg"
                  value={viewTo}
                  onChange={(e) => setViewTo(e.target.value)}
                />
              </div>
            </div>

            {/* Totaal */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-6 mb-6">
              <div className="text-sm opacity-90 mb-1">Totaal Uren</div>
              <div className="text-4xl font-bold mb-2">
                {totalHours.toFixed(1)}
              </div>
              <div className="text-sm opacity-75">
                {myBookings.length} boekingen
              </div>
            </div>

            {/* Lijst */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {myBookings.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <CalendarDaysIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Geen boekingen gevonden</p>
                </div>
              ) : (
                myBookings.map((booking) => (
                  <div
                    key={booking.bookingId}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {new Date(booking.date).toLocaleDateString("nl-NL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="badge badge-sm bg-blue-100 text-blue-700 border-0">
                            {booking.taskCode}
                          </span>
                        </div>
                        {booking.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {booking.description}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {booking.hours.toFixed(1)}u
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
