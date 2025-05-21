"use client";
import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";

import {
    getTimeEntries,
    registerTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
} from "@/lib/api";

import WeekHeader from "./WeekHeader";
import CombinedView from "./CombinedView";
import TimeEntryModal from "./TimeEntryModal";
import ToastNotification from "../ToastNotification";
import { TimeEntry as GlobalTimeEntry } from "@/lib/types"; // Import het globale TimeEntry type

// Gebruik de interface uit de types.ts
export type TimeEntry = GlobalTimeEntry;

dayjs.extend(isoWeek);
dayjs.locale("nl");
dayjs.extend(isBetween);

export default function WeekOverview() {
    const [currentWeek, setCurrentWeek] = useState(dayjs().startOf("isoWeek"));
    const [localEntries, setLocalEntries] = useState<TimeEntry[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null);

    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        fetchFromDB();
    }, []);

    async function fetchFromDB() {
        try {
            const data = await getTimeEntries();
            const local = data.map((e: TimeEntry) => ({
                ...e,
                localStatus: "synced" as const,
            }));
            setLocalEntries(local);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleSave() {
        try {
            for (const entry of localEntries) {
                if (entry.localStatus === "draft") {
                    // Maak een kopie zonder id en localStatus
                    const { id, localStatus, ...rest } = entry;
                    // Cast naar het juiste type
                    await registerTimeEntry(rest as Omit<TimeEntry, 'id' | 'localStatus'>);
                } else if (entry.localStatus === "changed" && entry.id) {
                    // Maak een kopie zonder localStatus
                    const { localStatus, ...rest } = entry;
                    // Cast naar het juiste type
                    await updateTimeEntry(entry.id, rest as Partial<TimeEntry>);
                } else if (entry.localStatus === "deleted" && entry.id) {
                    await deleteTimeEntry(entry.id);
                }
            }
            await fetchFromDB();
            setToastMessage("Wijzigingen opgeslagen!");
            setToastType("success");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (err) {
            console.error(err);
            setToastMessage("Fout bij opslaan!");
            setToastType("error");
        }
    }

    async function handleSubmit() {
        try {
            const start = currentWeek.startOf("day");
            const end = currentWeek.add(6, "day").endOf("day");

            const relevantEntries = localEntries.filter((e) => {
                const dt = dayjs(e.startTime);
                return dt.isBetween(start, end, "day", "[]");
            });

            for (const entry of relevantEntries) {
                if (entry.id && entry.status !== "ingeleverd") {
                    // Cast naar het juiste type
                    await updateTimeEntry(entry.id, { ...entry, status: "ingeleverd" } as Partial<TimeEntry>);
                }
            }
            await fetchFromDB();
            setToastMessage("Uren ingeleverd!");
            setToastType("success");
            setTimeout(() => setToastMessage(""), 3000);
        } catch (err) {
            console.error(err);
            setToastMessage("Fout bij inleveren!");
            setToastType("error");
        }
    }

    const handlePrevWeek = () => setCurrentWeek((w) => w.subtract(1, "week"));
    const handleNextWeek = () => setCurrentWeek((w) => w.add(1, "week"));
    const handleToday = () => setCurrentWeek(dayjs().startOf("isoWeek"));

    function openModal(day: Dayjs) {
        setSelectedDay(day);
        setIsModalOpen(true);
    }
    function closeModal() {
        setSelectedDay(null);
        setIsModalOpen(false);
    }

    async function handleEntrySaved() {
        closeModal();
        await fetchFromDB();
        setToastMessage("Uren succesvol opgeslagen!");
        setToastType("success");
        setTimeout(() => setToastMessage(""), 3000);
    }

    function calculateTotalHoursInWeek(weekStart: Dayjs, entries: TimeEntry[]): number {
        let totalHours = 0;
        for (let i = 0; i < 7; i++) {
            const day = weekStart.add(i, "day").format("YYYY-MM-DD");
            const dayEntries = entries.filter((e) => e.startTime.startsWith(day));
            for (const entry of dayEntries) {
                const start = dayjs(entry.startTime);
                const end = dayjs(entry.endTime);
                const diffMin = end.diff(start, "minute") - entry.breakMinutes;
                if (diffMin > 0) totalHours += diffMin / 60;
            }
        }
        return totalHours;
    }

    const totalHoursThisWeek = calculateTotalHoursInWeek(currentWeek, localEntries);

    function handleUpdateLocalEntries(updated: TimeEntry[]) {
        setLocalEntries(updated);
    }

    return (
        <div className="w-full mx-auto py-6 px-4">
            {/* Header + Opslaan/Inleveren kaart */}
            <div className="card w-full bg-base-100 shadow-lg mb-8">
                <div className="card-body">
                    <WeekHeader
                        currentWeek={currentWeek}
                        onPrevWeek={handlePrevWeek}
                        onNextWeek={handleNextWeek}
                        onToday={handleToday}
                    />
                    <div className="flex items-center gap-4 mt-4">
                        <div>
                            <span className="font-semibold text-lg">Totaal uren deze week: </span>
                            <span className="badge badge-primary badge-lg text-lg">
                {totalHoursThisWeek.toFixed(2)} uur
              </span>
                        </div>
                        <div className="flex gap-2 ml-auto">
                            <button className="btn btn-success" onClick={handleSave}>
                                Opslaan
                            </button>
                            <button className="btn btn-warning" onClick={handleSubmit}>
                                Inleveren
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CombinedView in full width */}
            <CombinedView
                currentWeek={currentWeek}
                timeEntries={localEntries}
                onClickRegister={openModal}
                onUpdateLocalEntries={handleUpdateLocalEntries}
            />

            {/* Modal voor nieuwe entry */}
            <TimeEntryModal
                isOpen={isModalOpen}
                day={selectedDay}
                onClose={closeModal}
                onEntrySaved={handleEntrySaved}
            />

            {/* Eventuele toast */}
            {toastMessage && (
                <ToastNotification message={toastMessage} type={toastType} />
            )}
        </div>
    );
}