// Enhanced Compact WeekOverview
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

import TimeEntryModal from "./TimeEntryModal";
import ToastNotification from "../ToastNotification";
import { TimeEntry as GlobalTimeEntry } from "@/lib/types";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    HomeIcon,
    ClockIcon,
    PlusIcon,
    CheckCircleIcon,
    PaperAirplaneIcon,
    CalendarDaysIcon
} from "@heroicons/react/24/outline";

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
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchFromDB();
    }, []);

    async function fetchFromDB() {
        try {
            const data = await getTimeEntries();
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
            setLocalEntries([]);
        }
    }

    async function handleSave() {
        if (!Array.isArray(localEntries)) return;

        setIsSaving(true);
        try {
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
        } catch (err) {
            console.error(err);
            setToastMessage("Fout bij opslaan!");
            setToastType("error");
        } finally {
            setIsSaving(false);
            setTimeout(() => setToastMessage(""), 3000);
        }
    }

    async function handleSubmit() {
        if (!Array.isArray(localEntries)) return;

        setIsSubmitting(true);
        try {
            const start = currentWeek.startOf("day");
            const end = currentWeek.add(6, "day").endOf("day");

            const relevantEntries = localEntries.filter((e) => {
                if (!e || typeof e !== 'object' || !e.startTime) return false;
                try {
                    const dt = dayjs(e.startTime);
                    return dt.isBetween(start, end, "day", "[]");
                } catch (error) {
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
        } catch (err) {
            console.error(err);
            setToastMessage("Fout bij inleveren!");
            setToastType("error");
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setToastMessage(""), 3000);
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

    function handleUpdateLocalEntries(updated: TimeEntry[]) {
        if (Array.isArray(updated)) {
            setLocalEntries(updated);
        } else {
            setLocalEntries([]);
        }
    }

    function calculateTotalHoursInWeek(weekStart: Dayjs, entries: TimeEntry[]): number {
        try {
            if (!Array.isArray(entries)) return 0;

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
            return 0;
        }
    }

    function formatHours(hours: number): string {
        if (hours === 0) return "0u";

        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);

        if (minutes === 0) return `${wholeHours}u`;
        else if (minutes === 15) return `${wholeHours}¼u`;
        else if (minutes === 30) return `${wholeHours}½u`;
        else if (minutes === 45) return `${wholeHours}¾u`;
        else return `${hours.toFixed(1)}u`;
    }

    function getDayEntries(day: Dayjs): TimeEntry[] {
        const dayStr = day.format("YYYY-MM-DD");
        return localEntries.filter((entry) => {
            if (!entry || typeof entry !== 'object' || !entry.startTime) return false;
            if (entry.localStatus === "deleted") return false;
            return entry.startTime.startsWith(dayStr);
        });
    }

    function getDayHours(day: Dayjs): number {
        const entries = getDayEntries(day);
        let totalHours = 0;

        for (const entry of entries) {
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
        return totalHours;
    }

    const totalHoursThisWeek = calculateTotalHoursInWeek(currentWeek, localEntries);
    const weekNummer = currentWeek.isoWeek();
    const maandNaam = currentWeek.format("MMMM");
    const jaar = currentWeek.format("YYYY");
    const startVanWeek = currentWeek;
    const eindVanWeek = currentWeek.add(6, "day");

    // Generate 7 days for the week
    const days = Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Week Header */}
            <div className="bg-gradient-elmar text-white rounded-2xl p-6 shadow-elmar-card">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            <CalendarDaysIcon className="w-8 h-8" />
                            Week {weekNummer} - {maandNaam} {jaar}
                        </h2>
                        <p className="text-blue-100 text-lg">
                            {startVanWeek.format("D MMM")} - {eindVanWeek.format("D MMM YYYY")}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-blue-200 mb-1">Totaal deze week</div>
                        <div className="text-3xl font-bold">{formatHours(totalHoursThisWeek)}</div>
                    </div>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <button
                            className="btn btn-ghost text-white hover:bg-white/20 rounded-xl"
                            onClick={handlePrevWeek}
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Vorige</span>
                        </button>
                        <button
                            className="btn btn-ghost text-white hover:bg-white/20 rounded-xl"
                            onClick={handleToday}
                        >
                            <HomeIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Vandaag</span>
                        </button>
                        <button
                            className="btn btn-ghost text-white hover:bg-white/20 rounded-xl"
                            onClick={handleNextWeek}
                        >
                            <ArrowRightIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Volgende</span>
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            className="btn bg-white/20 border-white/30 text-white hover:bg-white/30 rounded-xl"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                <CheckCircleIcon className="w-5 h-5" />
                            )}
                            <span className="hidden sm:inline">
                                {isSaving ? "Opslaan..." : "Opslaan"}
                            </span>
                        </button>
                        <button
                            className="btn bg-yellow-500 border-yellow-600 text-white hover:bg-yellow-600 rounded-xl"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                <PaperAirplaneIcon className="w-5 h-5" />
                            )}
                            <span className="hidden sm:inline">
                                {isSubmitting ? "Inleveren..." : "Inleveren"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Compact Week Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {days.map((day, index) => {
                    const entries = getDayEntries(day);
                    const dayHours = getDayHours(day);
                    const isToday = day.isSame(dayjs(), 'day');
                    const isWeekend = day.day() === 0 || day.day() === 6;

                    return (
                        <div
                            key={day.format("YYYY-MM-DD")}
                            className={`
                                card bg-white shadow-elmar-card hover:shadow-elmar-hover transition-all duration-300 hover:scale-105
                                ${isToday ? 'ring-2 ring-elmar-primary ring-opacity-50' : ''}
                                ${isWeekend ? 'bg-gradient-to-br from-gray-50 to-blue-50' : ''}
                            `}
                        >
                            <div className="card-body p-4">
                                {/* Day Header */}
                                <div className={`text-center mb-3 ${isToday ? 'text-elmar-primary font-bold' : ''}`}>
                                    <div className="text-sm font-semibold">{day.format("dddd")}</div>
                                    <div className={`text-lg font-bold ${isToday ? 'bg-elmar-primary text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                                        {day.format("D")}
                                    </div>
                                    {isToday && <div className="text-xs text-elmar-primary">Vandaag</div>}
                                </div>

                                {/* Hours Display */}
                                <div className="text-center mb-3">
                                    <div className={`text-xl font-bold ${dayHours >= 8 ? 'text-green-600' : dayHours >= 4 ? 'text-yellow-600' : 'text-gray-400'}`}>
                                        {formatHours(dayHours)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-3">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                dayHours >= 8 ? 'bg-green-500' :
                                                    dayHours >= 4 ? 'bg-yellow-500' :
                                                        'bg-gray-400'
                                            }`}
                                            style={{ width: `${Math.min((dayHours / 8) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 text-center mt-1">
                                        {((dayHours / 8) * 100).toFixed(0)}% van 8u
                                    </div>
                                </div>

                                {/* Entries Preview */}
                                {entries.length > 0 ? (
                                    <div className="space-y-1 mb-3">
                                        {entries.slice(0, 2).map((entry, entryIndex) => {
                                            const start = dayjs(entry.startTime);
                                            const end = dayjs(entry.endTime);

                                            return (
                                                <div
                                                    key={entry.id || entryIndex}
                                                    className={`text-xs p-2 rounded-lg border ${
                                                        entry.status === 'goedgekeurd' ? 'bg-green-50 border-green-200 text-green-700' :
                                                            entry.status === 'ingeleverd' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                                                entry.status === 'afgekeurd' ? 'bg-red-50 border-red-200 text-red-700' :
                                                                    'bg-gray-50 border-gray-200 text-gray-700'
                                                    }`}
                                                >
                                                    <div className="font-semibold">
                                                        {start.format("HH:mm")} - {end.format("HH:mm")}
                                                    </div>
                                                    <div className="truncate">
                                                        {entry.project?.name || 'Onbekend project'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {entries.length > 2 && (
                                            <div className="text-xs text-gray-500 text-center">
                                                +{entries.length - 2} meer...
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 mb-3 py-2">
                                        <ClockIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                        <div className="text-xs">Geen uren</div>
                                    </div>
                                )}

                                {/* Add Button */}
                                <button
                                    onClick={() => openModal(day)}
                                    className="btn btn-primary btn-sm w-full rounded-xl hover:scale-105 transition-all duration-200"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Registreren
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detailed Entries (alleen als er entries zijn) */}
            {localEntries.some(entry => {
                const weekStart = currentWeek.startOf("day");
                const weekEnd = currentWeek.add(6, "day").endOf("day");
                try {
                    const entryDate = dayjs(entry.startTime);
                    return entryDate.isBetween(weekStart, weekEnd, "day", "[]") && entry.localStatus !== "deleted";
                } catch {
                    return false;
                }
            }) && (
                <div className="card bg-white shadow-elmar-card">
                    <div className="card-body p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ClockIcon className="w-6 h-6 text-elmar-primary" />
                            Gedetailleerd Overzicht
                        </h3>

                        <div className="space-y-4">
                            {days.map((day) => {
                                const entries = getDayEntries(day);
                                if (entries.length === 0) return null;

                                return (
                                    <div key={day.format("YYYY-MM-DD")} className="border rounded-xl p-4 bg-gradient-to-r from-gray-50 to-blue-50">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-gray-800">
                                                {day.format("dddd D MMMM")}
                                            </h4>
                                            <span className="badge badge-primary badge-lg">
                                                {formatHours(getDayHours(day))}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {entries.map((entry, index) => {
                                                const start = dayjs(entry.startTime);
                                                const end = dayjs(entry.endTime);
                                                const hours = end.diff(start, "minute") - (entry.breakMinutes || 0);

                                                return (
                                                    <div
                                                        key={entry.id || index}
                                                        className={`p-3 rounded-lg border-l-4 ${
                                                            entry.status === 'goedgekeurd' ? 'border-green-500 bg-green-50' :
                                                                entry.status === 'ingeleverd' ? 'border-yellow-500 bg-yellow-50' :
                                                                    entry.status === 'afgekeurd' ? 'border-red-500 bg-red-50' :
                                                                        'border-gray-400 bg-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-semibold text-gray-800">
                                                                    {start.format("HH:mm")} - {end.format("HH:mm")}
                                                                    <span className="ml-2 text-sm text-gray-600">
                                                                        ({formatHours(hours / 60)})
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm text-gray-600">
                                                                    {entry.project?.name || 'Onbekend project'}
                                                                </div>
                                                                {entry.notes && (
                                                                    <div className="text-xs text-gray-500 italic mt-1">
                                                                        "{entry.notes}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`badge ${
                                                                    entry.status === 'goedgekeurd' ? 'badge-success' :
                                                                        entry.status === 'ingeleverd' ? 'badge-warning' :
                                                                            entry.status === 'afgekeurd' ? 'badge-error' :
                                                                                'badge-ghost'
                                                                }`}>
                                                                    {
                                                                        entry.status === 'goedgekeurd' ? '✅ Goedgekeurd' :
                                                                            entry.status === 'ingeleverd' ? '⏳ Ingeleverd' :
                                                                                entry.status === 'afgekeurd' ? '❌ Afgekeurd' :
                                                                                    '📝 Opgeslagen'
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

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