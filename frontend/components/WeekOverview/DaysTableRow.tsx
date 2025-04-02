// DaysTable.tsx (aanpassing: 1 row per day, met meerdere entries in 1 cel)

"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { TimeEntry } from "./WeekOverview";
import dayjs from "dayjs";

interface Props {
    currentWeek: Dayjs;
    localEntries: TimeEntry[];
    onRegisterClick: (day: Dayjs) => void;
    onUpdateLocalEntries: (updatedEntries: TimeEntry[]) => void;
}

export default function DaysTable({
                                      currentWeek,
                                      localEntries,
                                      onRegisterClick,
                                      onUpdateLocalEntries,
                                  }: Props) {
    // 7 dagen
    const days = Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));

    // per dag => alle entries
    return (
        <div className="bg-base-100 shadow-lg rounded-lg">
            <table className="table w-full">
                <thead>
                <tr className="bg-base-200">
                    <th>Dag</th>
                    <th>Datum</th>
                    <th>Invoer</th>
                    <th className="text-right">Acties</th>
                </tr>
                </thead>
                <tbody>
                {days.map((day) => {
                    const dayStr = day.format("YYYY-MM-DD");
                    const entriesForDay = localEntries.filter(
                        (e) =>
                            e.localStatus !== "deleted" && e.startTime.startsWith(dayStr)
                    );

                    // Bepaal totale uren
                    let totalHours = 0;
                    entriesForDay.forEach((entry) => {
                        const start = dayjs(entry.startTime);
                        const end = dayjs(entry.endTime);
                        const diffMin = end.diff(start, "minute") - entry.breakMinutes;
                        if (diffMin > 0) totalHours += diffMin / 60;
                    });

                    return (
                        <tr key={dayStr}>
                            <td className="font-semibold">{day.format("dddd")}</td>
                            <td>{day.format("D MMM YYYY")}</td>
                            <td>
                                {entriesForDay.length === 0 ? (
                                    <span className="text-gray-500 text-sm">
                      Geen uren geregistreerd
                    </span>
                                ) : (
                                    <div className="space-y-1">
                                        {entriesForDay.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="border rounded p-2 bg-base-200 flex flex-col gap-1"
                                            >
                                                <div className="text-sm font-semibold">
                                                    {dayjs(entry.startTime).format("HH:mm")} -{" "}
                                                    {dayjs(entry.endTime).format("HH:mm")} | Pauze:{" "}
                                                    {entry.breakMinutes} min
                                                </div>
                                                <div className="text-xs text-gray-600 flex gap-2 flex-wrap">
                                                    <span>KM: {entry.distanceKm ?? 0}</span>
                                                    <span>Reis: €{entry.travelCosts ?? 0}</span>
                                                    <span>Onkosten: €{entry.expenses ?? 0}</span>
                                                </div>
                                                <div className="text-xs italic">
                                                    {entry.notes || "Geen notities"}
                                                </div>
                                                {/* Voorbeeld van knoppen: */}
                                                <div className="flex gap-2 mt-1">
                                                    <button
                                                        className="btn btn-xs btn-outline btn-error"
                                                        onClick={() => handleDelete(entry.id!)}
                                                    >
                                                        Verwijderen
                                                    </button>
                                                    <button
                                                        className="btn btn-xs btn-outline"
                                                        onClick={() => handleEdit(entry)}
                                                    >
                                                        Bewerken
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </td>
                            <td className="text-right">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => onRegisterClick(day)}
                                >
                                    Registreren
                                </button>
                                {/* Totaal daguren (optioneel) */}
                                {entriesForDay.length > 0 && (
                                    <div className="mt-2 text-sm text-gray-700">
                                        Totaal: {totalHours.toFixed(2)} uur
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );

    // Voorbeeld: implementaties van handleDelete/handleEdit
    function handleDelete(entryId: number) {
        const updated = localEntries.map((e) =>
            e.id === entryId ? { ...e, localStatus: "deleted" } : e
        );
        onUpdateLocalEntries(updated);
    }

    function handleEdit(entry: TimeEntry) {
        // Hier kun je een modal of inline-edit starten
        // of local state bijwerken.
        alert("Bewerken van entry nog niet geïmplementeerd in dit voorbeeld!");
    }
}
