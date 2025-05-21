// Fix voor DaysTableEntryRow.tsx (vervolg)

"use client";
import React, { useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
    ClockIcon,
    TrashIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { TimeEntry } from "@/lib/types";

interface Props {
    day: Dayjs;
    entry: TimeEntry;
    allEntries: TimeEntry[];
    onRegisterClick: () => void;
    onUpdateLocalEntries: (updated: TimeEntry[]) => void;
    showDayInfo: boolean; // <-- nieuwe prop
}

export default function DaysTableEntryRow({
                                              day,
                                              entry,
                                              allEntries,
                                              onRegisterClick,
                                              onUpdateLocalEntries,
                                              showDayInfo,
                                          }: Props) {
    const [isEditing, setIsEditing] = useState(false);

    const [startTime, setStartTime] = useState(extractTime(entry.startTime));
    const [endTime, setEndTime] = useState(extractTime(entry.endTime));
    const [breakMinutes, setBreakMinutes] = useState<number>(entry.breakMinutes);
    const [distanceKm, setDistanceKm] = useState<number>(entry.distanceKm ?? 0);
    const [travelCosts, setTravelCosts] = useState<number>(entry.travelCosts ?? 0);
    const [expenses, setExpenses] = useState<number>(entry.expenses ?? 0);
    const [notes, setNotes] = useState<string>(entry.notes || "");

    function handleDelete() {
        const updated = allEntries.map((e) =>
            e.id === entry.id ? { ...e, localStatus: "deleted" as const } : e
        );
        onUpdateLocalEntries(updated);
    }

        function handleEdit() {
        setIsEditing(true);
    }

    function handleCancel() {
        setIsEditing(false);
        setStartTime(extractTime(entry.startTime));
        setEndTime(extractTime(entry.endTime));
        setBreakMinutes(entry.breakMinutes);
        setDistanceKm(entry.distanceKm ?? 0);
        setTravelCosts(entry.travelCosts ?? 0);
        setExpenses(entry.expenses ?? 0);
        setNotes(entry.notes || "");
    }

    function handleSaveEdit() {
        const dayStr = entry.startTime.substring(0, 10);
        const newStart = dayStr + "T" + startTime;
        const newEnd = dayStr + "T" + endTime;

        const updatedEntry: TimeEntry = {
            ...entry,
            startTime: newStart,
            endTime: newEnd,
            breakMinutes,
            distanceKm,
            travelCosts,
            expenses,
            notes,
            localStatus: entry.localStatus === "draft" ? "draft" : "changed",
        };

        const newList = allEntries.map((e) =>
            e.id === entry.id ? updatedEntry : e
        );
        onUpdateLocalEntries(newList);
        setIsEditing(false);
    }

    if (!isEditing) {
        // READ ONLY
        return (
            <tr>
                {/* Dag en Datum alleen tonen als showDayInfo == true */}
                {showDayInfo ? (
                    <>
                        <td className="font-semibold">{day.format("dddd")}</td>
                        <td>{day.format("D MMM YYYY")}</td>
                    </>
                ) : (
                    <>
                        <td />
                        <td />
                    </>
                )}

                <td>{dayjs(entry.startTime).format("HH:mm")}</td>
                <td>{dayjs(entry.endTime).format("HH:mm")}</td>
                <td>{entry.breakMinutes} min</td>
                <td>{entry.distanceKm ?? 0}</td>
                <td>{entry.travelCosts ?? 0}</td>
                <td>{entry.expenses ?? 0}</td>
                <td>{entry.notes || "-"}</td>
                <td className="text-right">
                    <div className="flex flex-wrap gap-1 justify-end">
                        <button
                            className="btn btn-xs btn-ghost text-error"
                            title="Verwijderen"
                            onClick={handleDelete}
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                        <button
                            className="btn btn-xs btn-ghost"
                            title="Bewerken"
                            onClick={handleEdit}
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="btn btn-primary btn-xs" onClick={onRegisterClick}>
                            <ClockIcon className="w-4 h-4 mr-1" />
                            Registreren
                        </button>
                    </div>
                </td>
            </tr>
        );
    } else {
        // EDIT MODE
        return (
            <tr className="bg-base-200">
                {showDayInfo ? (
                    <>
                        <td className="font-semibold">{day.format("dddd")}</td>
                        <td>{day.format("D MMM YYYY")}</td>
                    </>
                ) : (
                    <>
                        <td />
                        <td />
                    </>
                )}

                <td>
                    <input
                        type="time"
                        className="input input-bordered input-xs w-16"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                    />
                </td>
                <td>
                    <input
                        type="time"
                        className="input input-bordered input-xs w-16"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                    />
                </td>
                <td>
                    <input
                        type="number"
                        className="input input-bordered input-xs w-16"
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(Number(e.target.value))}
                    />
                </td>
                <td>
                    <input
                        type="number"
                        className="input input-bordered input-xs w-16"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                    />
                </td>
                <td>
                    <input
                        type="number"
                        className="input input-bordered input-xs w-16"
                        value={travelCosts}
                        onChange={(e) => setTravelCosts(Number(e.target.value))}
                    />
                </td>
                <td>
                    <input
                        type="number"
                        className="input input-bordered input-xs w-16"
                        value={expenses}
                        onChange={(e) => setExpenses(Number(e.target.value))}
                    />
                </td>
                <td>
                    <input
                        type="text"
                        className="input input-bordered input-xs w-24"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </td>
                <td className="text-right">
                    <div className="flex flex-wrap gap-1 justify-end">
                        <button
                            className="btn btn-xs btn-success"
                            title="Opslaan"
                            onClick={handleSaveEdit}
                        >
                            <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                            className="btn btn-xs btn-ghost"
                            title="Annuleren"
                            onClick={handleCancel}
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                        <button
                            className="btn btn-xs btn-ghost text-error"
                            title="Verwijderen"
                            onClick={handleDelete}
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                        <button className="btn btn-primary btn-xs" onClick={onRegisterClick}>
                            <ClockIcon className="w-4 h-4 mr-1" />
                            Registreren
                        </button>
                    </div>
                </td>
            </tr>
        );
    }
}

function extractTime(isoString: string): string {
    return dayjs(isoString).format("HH:mm");
}