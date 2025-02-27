"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { TimeEntry } from "./WeekOverview";
import DaysTableRow from "./DaysTableRow";

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
    // Maak 7 dagen
    const days = Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));

    // Bouw array met rows
    const rows: { day: Dayjs; entry?: TimeEntry }[] = [];

    for (const day of days) {
        const dayStr = day.format("YYYY-MM-DD");
        const entries = localEntries.filter(
            (e) => e.localStatus !== "deleted" && e.startTime.startsWith(dayStr)
        );
        if (entries.length === 0) {
            rows.push({ day, entry: undefined });
        } else {
            for (const entry of entries) {
                rows.push({ day, entry });
            }
        }
    }

    return (
        <div className="card shadow-xl overflow-x-auto max-w-5xl mx-auto">
            <table className="table table-zebra w-full">
                <thead>
                <tr>
                    <th>Dag</th>
                    <th>Datum</th>
                    <th>Start</th>
                    <th>Eind</th>
                    <th>Pauze</th>
                    <th>KM</th>
                    <th>Reis (€)</th>
                    <th>Onkosten (€)</th>
                    <th>Notities</th>
                    <th className="text-right">Acties</th>
                </tr>
                </thead>
                <tbody>
                {rows.map(({ day, entry }, idx) => (
                    <DaysTableRow
                        key={idx}
                        day={day}
                        entry={entry}
                        localEntries={localEntries}
                        onRegisterClick={onRegisterClick}
                        onUpdateLocalEntries={onUpdateLocalEntries}
                    />
                ))}
                </tbody>
            </table>
        </div>
    );
}
