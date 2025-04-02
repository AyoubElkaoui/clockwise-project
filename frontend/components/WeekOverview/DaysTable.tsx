"use client";
import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { TimeEntry } from "./WeekOverview";
import DaySubEntry from "./DaySubEntry"; // <-- Voor bewerken/verwijderen per sub-entry
import { ClockIcon } from "@heroicons/react/24/outline";

interface Props {
    currentWeek: Dayjs;
    localEntries: TimeEntry[];
    onRegisterClick: (day: Dayjs) => void;
    onUpdateLocalEntries: (updatedEntries: TimeEntry[]) => void;
}

/**
 * DaysTable: toont één rij per dag. Elke dag-cel bevat meerdere sub-entries (als die bestaan).
 * In de 'Acties'-kolom staat een "Registreren"-knop om een nieuw entry te maken op die dag.
 */
export default function DaysTable({
                                      currentWeek,
                                      localEntries,
                                      onRegisterClick,
                                      onUpdateLocalEntries,
                                  }: Props) {
    // Maak de 7 dagen (ma → zo)
    const days = Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4">
                {/* Eventueel een titel */}
                <h2 className="card-title text-xl mb-4">Urenregistraties</h2>

                <div className="overflow-x-auto">
                    <table className="table w-full table-zebra">
                        <thead>
                        <tr>
                            <th>Dag</th>
                            <th>Datum</th>
                            <th>Urenregistraties</th>
                            <th>Acties</th>
                        </tr>
                        </thead>
                        <tbody>
                        {days.map((day) => {
                            const dayStr = day.format("YYYY-MM-DD");
                            // Filter entries die niet 'deleted' zijn en die op deze dag vallen
                            const entriesForDay = localEntries.filter(
                                (entry) =>
                                    entry.localStatus !== "deleted" &&
                                    entry.startTime.startsWith(dayStr)
                            );

                            return (
                                <tr key={dayStr}>
                                    <td className="font-semibold">{day.format("dddd")}</td>
                                    <td>{day.format("D MMM YYYY")}</td>
                                    <td>
                                        {entriesForDay.length === 0 ? (
                                            <span className="text-sm text-gray-500">
                          Geen uren geregistreerd
                        </span>
                                        ) : (
                                            // Toon alle entries als sub-onderdelen (verticale lijst)
                                            <div className="flex flex-col gap-3">
                                                {entriesForDay.map((entry) => (
                                                    <DaySubEntry
                                                        key={entry.id}
                                                        entry={entry}
                                                        allEntries={localEntries}
                                                        onUpdateLocalEntries={onUpdateLocalEntries}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => onRegisterClick(day)}
                                        >
                                            <ClockIcon className="w-4 h-4 mr-1" />
                                            Registreren
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
