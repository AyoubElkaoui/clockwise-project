// Fixed frontend/components/WeekOverview/WeekOverview.tsx

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
import { TimeEntry as GlobalTimeEntry } from "@/lib/types";

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
            // SAFE ARRAY HANDLING
            let safeData: TimeEntry[] = [];
            if (Array.isArray(data)) {
                safeData = data;
            } else if (data && typeof data === 'object' && Array.isArray(data.timeEntries)) {
                safeData = data.timeEntries;
            } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
                safeData = data.data;
            }

            const local = safeData.map((e: TimeEntry) => ({
                ...e,
                localStatus: "synced" as const,
            }));
            setLocalEntries(local);
        } catch (err) {
            console.error("Error fetching time entries:", err);
            setLocalEntries([]); // Fallback to empty array
        }
    }

    async function handleSave() {
        try {
            // Safe array check
            if (!Array.isArray(localEntries)) {
                console.error("localEntries is not an array");
                return;
            }

            for (const entry of localEntries) {
                if (!entry || typeof entry !== 'object') continue;

                if (entry.localStatus === "draft") {
                    const entryCopy = { ...entry };
                    delete entryCopy.id;
                    delete entryCopy.localStatus;
                    await registerTimeEntry(entryCopy as Omit<TimeEntry, 'id' | 'localStatus'>);
                } else if (entry.localStatus === "changed" && entry.id) {
                    const entryCopy = { ...entry };
                    delete entryCopy.localStatus;
                    await updateTimeEntry(entry.id, entryCopy as Partial<TimeEntry>);
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
            if (!Array.isArray(localEntries)) {
                console.error("localEntries is not an array");
                return;
            }

            const start = currentWeek.startOf("day");
            const end = currentWeek.add(6, "day").endOf("day");

            const relevantEntries = localEntries.filter((e) => {
                if (!e || typeof e !== 'object' || !e.startTime) return false;
                try {
                    const dt = dayjs(e.startTime);
                    return dt.isBetween(start, end, "day", "[]");
                } catch (error) {
                    console.warn("Error filtering entry:", e, error);
                    return false;
                }
            });

            for (const entry of relevantEntries) {
                if (entry.id && entry.status !== "ingeleverd") {
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
        try {
            if (!Array.isArray(entries)) {
                console.warn("Entries is not an array:", entries);
                return 0;
            }

            let totalHours = 0;
            for (let i = 0; i < 7; i++) {
                const day = weekStart.add(i, "day").format("YYYY-MM-DD");
                const dayEntries = entries.filter((e) => {
                    if (!e || typeof e !== 'object' || !e.startTime) return false;
                    return e.startTime.startsWith(day);
                });

                for (const entry of dayEntries) {
                    try {
                        if (!entry.startTime || !entry.endTime) continue;
                        const start = dayjs(entry.startTime);
                        const end = dayjs(entry.endTime);
                        if (!start.isValid() || !end.isValid()) continue;

                        const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
                        if (diffMin > 0) totalHours += diffMin / 60;
                    } catch (error) {
                        console.warn("Error calculating hours for entry:", entry, error);
                    }
                }
            }
            return totalHours;
        } catch (error) {
            console.error("Error in calculateTotalHoursInWeek:", error);
            return 0;
        }
    }

    const totalHoursThisWeek = calculateTotalHoursInWeek(currentWeek, localEntries);

    function handleUpdateLocalEntries(updated: TimeEntry[]) {
        if (Array.isArray(updated)) {
            setLocalEntries(updated);
        } else {
            console.error("Updated entries is not an array:", updated);
            setLocalEntries([]);
        }
    }

    return (
        <div className="w-full mx-auto py-6 px-4">
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
                                {isFinite(totalHoursThisWeek) ? totalHoursThisWeek.toFixed(2) : "0.00"} uur
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

            <CombinedView
                currentWeek={currentWeek}
                timeEntries={Array.isArray(localEntries) ? localEntries : []}
                onClickRegister={openModal}
                onUpdateLocalEntries={handleUpdateLocalEntries}
            />

            <TimeEntryModal
                isOpen={isModalOpen}
                day={selectedDay}
                onClose={closeModal}
                onEntrySaved={handleEntrySaved}
            />

            {toastMessage && (
                <ToastNotification message={toastMessage} type={toastType} />
            )}
        </div>
    );
}