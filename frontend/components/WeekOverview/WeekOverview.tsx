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
import DayEntry from "./DaySubEntry";
import { TimeEntry as GlobalTimeEntry } from "@/lib/types";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    HomeIcon,
    ClockIcon,
    CheckCircleIcon,
    PaperAirplaneIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon
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
    const [weekStatus, setWeekStatus] = useState<string>("concept");

    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchFromDB();
    }, [currentWeek]);

    // Calculate hours with quarter-hour precision
    const calculateHours = (entry: TimeEntry): number => {
        if (!entry.startTime || !entry.endTime) return 0;

        try {
            const start = dayjs(entry.startTime);
            const end = dayjs(entry.endTime);
            const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
            const hours = diffMin > 0 ? diffMin / 60 : 0;

            // Round to nearest quarter hour
            return Math.round(hours * 4) / 4;
        } catch (error) {
            console.warn("Error calculating hours:", error);
            return 0;
        }
    };

    // Format hours with quarter notation
    const formatHours = (hours: number): string => {
        if (hours === 0) return "0u";

        const wholeHours = Math.floor(hours);
        const fraction = hours - wholeHours;

        let display = wholeHours.toString();

        if (fraction === 0.25) display += "¼";
        else if (fraction === 0.5) display += "½";
        else if (fraction === 0.75) display += "¾";
        else if (fraction > 0) display = hours.toFixed(2);

        return display + "u";
    };

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

            // Determine week status
            const weekStart = currentWeek.startOf("day");
            const weekEnd = currentWeek.add(6, "day").endOf("day");

            const weekEntries = local.filter(entry => {
                try {
                    const entryDate = dayjs(entry.startTime);
                    return entryDate.isBetween(weekStart, weekEnd, "day", "[]");
                } catch {
                    return false;
                }
            });

            if (weekEntries.length === 0) {
                setWeekStatus("concept");
            } else {
                const statuses = weekEntries.map(e => e.status);
                if (statuses.every(s => s === "goedgekeurd")) {
                    setWeekStatus("goedgekeurd");
                } else if (statuses.some(s => s === "ingeleverd")) {
                    setWeekStatus("ingeleverd");
                } else if (statuses.some(s => s === "afgekeurd")) {
                    setWeekStatus("afgekeurd");
                } else {
                    setWeekStatus("concept");
                }
            }
        } catch (err) {
            console.error("Error fetching time entries:", err);
            setLocalEntries([]);
            setWeekStatus("concept");
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
            showToast("Wijzigingen opgeslagen!", "success");
        } catch (err) {
            console.error(err);
            showToast("Fout bij opslaan!", "error");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSubmit() {
        if (!Array.isArray(localEntries)) return;

        const weekStart = currentWeek.startOf("day");
        const weekEnd = currentWeek.add(6, "day").endOf("day");

        const weekEntries = localEntries.filter(entry => {
            try {
                const entryDate = dayjs(entry.startTime);
                return entryDate.isBetween(weekStart, weekEnd, "day", "[]") && entry.localStatus !== "deleted";
            } catch {
                return false;
            }
        });

        if (weekEntries.length === 0) {
            showToast("Geen uren om in te leveren", "error");
            return;
        }

        const totalWeekHours = weekEntries.reduce((sum, entry) => sum + calculateHours(entry), 0);

        if (totalWeekHours === 0) {
            showToast("Geen geldige uren om in te leveren", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            for (const entry of weekEntries) {
                if (entry.id && entry.status !== "ingeleverd") {
                    await updateTimeEntry(entry.id, { ...entry, status: "ingeleverd" } as Partial<TimeEntry>);
                }
            }
            await fetchFromDB();
            showToast("Uren succesvol ingeleverd!", "success");
        } catch (err) {
            console.error(err);
            showToast("Fout bij inleveren!", "error");
        } finally {
            setIsSubmitting(false);
        }
    }

    const showToast = (message: string, type: "success" | "error") => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(""), 3000);
    };

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
        showToast("Uren succesvol opgeslagen!", "success");
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
        return entries.reduce((total, entry) => total + calculateHours(entry), 0);
    }

    function calculateTotalHoursInWeek(): number {
        const days = Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));
        return days.reduce((total, day) => total + getDayHours(day), 0);
    }

    const totalHoursThisWeek = calculateTotalHoursInWeek();
    const weekNummer = currentWeek.isoWeek();
    const maandNaam = currentWeek.format("MMMM");
    const jaar = currentWeek.format("YYYY");
    const startVanWeek = currentWeek;
    const eindVanWeek = currentWeek.add(6, "day");

    const days = Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));

    const hasUnsavedChanges = localEntries.some(entry =>
        entry.localStatus === "draft" || entry.localStatus === "changed" || entry.localStatus === "deleted"
    );

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
                        {weekStatus !== "concept" && (
                            <div className="mt-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    weekStatus === 'goedgekeurd' ? 'bg-green-500 text-white' :
                                        weekStatus === 'ingeleverd' ? 'bg-yellow-500 text-white' :
                                            'bg-red-500 text-white'
                                }`}>
                                    {weekStatus === 'goedgekeurd' ? '✅ Goedgekeurd' :
                                        weekStatus === 'ingeleverd' ? '⏳ Ingeleverd' :
                                            '❌ Afgekeurd'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-blue-200 mb-1">Totaal deze week</div>
                        <div className="text-3xl font-bold">{formatHours(totalHoursThisWeek)}</div>
                        <div className="text-sm text-blue-200">
                            {totalHoursThisWeek < 40 ? `${formatHours(40 - totalHoursThisWeek)} onder 40u` : 'Volledig'}
                        </div>
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
                        {hasUnsavedChanges && (
                            <div className="alert alert-warning rounded-xl py-2 px-3 mr-2">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                <span className="text-sm">Niet opgeslagen wijzigingen</span>
                            </div>
                        )}

                        <button
                            className="btn bg-white/20 border-white/30 text-white hover:bg-white/30 rounded-xl"
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
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

                        {weekStatus === "concept" && (
                            <button
                                className="btn bg-yellow-500 border-yellow-600 text-white hover:bg-yellow-600 rounded-xl"
                                onClick={handleSubmit}
                                disabled={isSubmitting || totalHoursThisWeek === 0}
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
                        )}
                    </div>
                </div>
            </div>

            {/* Compact Week Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {days.map((day, index) => {
                    const entries = getDayEntries(day);
                    const dayHours = getDayHours(day);

                    return (
                        <DayEntry
                            key={day.format("YYYY-MM-DD")}
                            date={day}
                            entries={entries}
                            onUpdate={fetchFromDB}
                            weekStatus={weekStatus}
                        />
                    );
                })}
            </div>

            {/* Week Summary */}
            {totalHoursThisWeek > 0 && (
                <div className="card bg-white shadow-elmar-card">
                    <div className="card-body p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ClockIcon className="w-6 h-6 text-elmar-primary" />
                            Week Samenvatting
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{formatHours(totalHoursThisWeek)}</div>
                                <div className="text-sm text-gray-600">Totaal uren</div>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {days.filter(day => getDayHours(day) > 0).length}
                                </div>
                                <div className="text-sm text-gray-600">Werkdagen</div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {totalHoursThisWeek > 0 ? formatHours(totalHoursThisWeek / days.filter(day => getDayHours(day) > 0).length) : '0u'}
                                </div>
                                <div className="text-sm text-gray-600">Gemiddeld</div>
                            </div>

                            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {((totalHoursThisWeek / 40) * 100).toFixed(0)}%
                                </div>
                                <div className="text-sm text-gray-600">Van 40u</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium text-gray-700">Voortgang naar 40 uur</span>
                                <span className="font-medium text-gray-700">{formatHours(totalHoursThisWeek)} / 40u</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                        totalHoursThisWeek >= 40 ? 'bg-green-500' :
                                            totalHoursThisWeek >= 32 ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min((totalHoursThisWeek / 40) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Status Messages */}
                        {totalHoursThisWeek < 32 && (
                            <div className="alert alert-warning rounded-xl">
                                <ExclamationTriangleIcon className="w-5 h-5" />
                                <span>Je hebt minder dan 32 uur geregistreerd deze week.</span>
                            </div>
                        )}

                        {totalHoursThisWeek >= 40 && (
                            <div className="alert alert-success rounded-xl">
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>Gefeliciteerd! Je hebt een volledige werkweek geregistreerd.</span>
                            </div>
                        )}
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