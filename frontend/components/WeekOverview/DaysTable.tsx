"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { TimeEntry } from "./WeekOverview";
import DaySubEntry from "./DaySubEntry";
import { ClockIcon } from "@heroicons/react/24/outline";

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
    // Safe array handling
    const safeEntries = Array.isArray(localEntries) ? localEntries : [];

    // Maak de 7 dagen (ma → zo)
    const days = Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4">
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

                            // Safe filtering with null checks
                            const entriesForDay = safeEntries.filter((entry) => {
                                if (!entry || typeof entry !== 'object') return false;
                                if (!entry.startTime || typeof entry.startTime !== 'string') return false;
                                if (entry.localStatus === "deleted") return false;

                                try {
                                    return entry.startTime.startsWith(dayStr);
                                } catch (error) {
                                    console.warn("Error filtering entry for day:", entry, error);
                                    return false;
                                }
                            });

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
                                            <div className="flex flex-col gap-3">
                                                {entriesForDay.map((entry, index) => {
                                                    if (!entry || !entry.id) {
                                                        return (
                                                            <div key={index} className="text-sm text-red-500">
                                                                Ongeldige entry
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <DaySubEntry
                                                            key={entry.id}
                                                            entry={entry}
                                                            allEntries={safeEntries}
                                                            onUpdateLocalEntries={onUpdateLocalEntries}
                                                        />
                                                    );
                                                })}
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