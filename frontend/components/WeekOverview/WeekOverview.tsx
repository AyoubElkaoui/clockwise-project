"use client";
import React, { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";

import {
    getTimeEntries,
    updateTimeEntry,
} from "@/lib/api";

import TimeEntryModal from "./TimeEntryModal";
import ToastNotification from "../ToastNotification";
import { TimeEntry as GlobalTimeEntry } from "@/lib/types";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    HomeIcon,
    ClockIcon,
    CheckCircleIcon,
    PaperAirplaneIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    PencilIcon,
    BuildingOfficeIcon,
    CurrencyEuroIcon,
    DocumentTextIcon,
    LockClosedIcon,
    XCircleIcon,
    BookmarkIcon
} from "@heroicons/react/24/outline";

export type TimeEntry = GlobalTimeEntry;

dayjs.extend(isoWeek);
dayjs.locale("nl");
dayjs.extend(isBetween);

// DayEntry Component
interface DayEntryProps {
    date: Dayjs;
    entries: TimeEntry[];
    onUpdate: () => void;
    weekStatus: string;
    onShowToast: (message: string, type: "success" | "error") => void;
    onSelectEntry: (entryId: number, selected: boolean) => void;
    selectedEntries: Set<number>;
}

function DayEntry({ date, entries, onUpdate, weekStatus, onShowToast, onSelectEntry, selectedEntries }: DayEntryProps) {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    const isToday = date.isSame(dayjs(), "day");
    const isWeekend = date.day() === 0 || date.day() === 6;
    const canEdit = weekStatus === "concept";

    // Calculate hours with quarter-hour rounding
    const calculateHours = (entry: TimeEntry): number => {
        if (!entry.startTime || !entry.endTime) return 0;

        try {
            const start = dayjs(entry.startTime);
            const end = dayjs(entry.endTime);
            const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
            const hours = diffMin > 0 ? diffMin / 60 : 0;
            return Math.round(hours * 4) / 4;
        } catch (error) {
            console.warn("Error calculating hours for entry:", entry, error);
            return 0;
        }
    };

    const totalHours = entries.reduce((total, entry) => {
        return total + calculateHours(entry);
    }, 0);

    const totalExpenses = entries.reduce((total, entry) => {
        return total + (entry.expenses || 0) + (entry.travelCosts || 0);
    }, 0);

    // Format hours in quarters
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

    const handleAddEntry = (): void => {
        setEditingEntry(null);
        setShowModal(true);
    };

    const handleEditEntry = (entry: TimeEntry): void => {
        setEditingEntry(entry);
        setShowModal(true);
    };

    const handleCloseModal = (): void => {
        setShowModal(false);
        setEditingEntry(null);
        onUpdate();
    };

    const handleSelectEntry = (entryId: number): void => {
        onSelectEntry(entryId, !selectedEntries.has(entryId));
    };

    const getDayDisplayName = (): string => {
        const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
        return dayNames[date.day()];
    };

    const getStatusColor = (): string => {
        if (totalHours === 0) return "border-gray-200 bg-gradient-to-r from-gray-50 to-white";
        if (totalHours >= 8) return "border-green-200 bg-blue-100";
        if (totalHours >= 4) return "border-yellow-200 bg-blue-100";
        return "border-orange-200 bg-blue-100";
    };

    const getHoursColor = (): string => {
        if (totalHours >= 8) return 'text-green-600';
        if (totalHours >= 4) return 'text-yellow-600';
        if (totalHours > 0) return 'text-orange-600';
        return 'text-gray-400';
    };

    const getStatusIcon = () => {
        if (totalHours === 0) return <ClockIcon className="w-4 h-4 text-gray-400" />;
        if (totalHours >= 8) return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
        if (totalHours >= 4) return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
        return <XCircleIcon className="w-4 h-4 text-orange-500" />;
    };

    const conceptEntries = entries.filter(entry => entry.status === "concept" || !entry.status);
    const hasSelectableEntries = conceptEntries.length > 0;

    return (
        <>
            <div className={`
                relative overflow-hidden rounded-xl border-2 hover:shadow-md
                ${isToday ? 'ring-1 ring-elmar-primary ring-opacity-30' : ''}
                ${getStatusColor()}
            `}>
                <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {getStatusIcon()}
                            <div>
                                <h3 className={`font-bold ${isToday ? 'text-elmar-primary' : 'text-gray-800'}`}>
                                    {getDayDisplayName()}
                                </h3>
                                <p className="text-xs text-gray-600">
                                    {date.format("DD-MM")}
                                    {isToday && <span className="ml-1 text-elmar-primary">•</span>}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className={`text-lg font-bold ${getHoursColor()}`}>
                                {formatHours(totalHours)}
                            </div>
                            {totalExpenses > 0 && (
                                <div className="text-xs text-purple-600">
                                    €{totalExpenses.toFixed(2)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                                className={`h-1.5 rounded-full ${
                                    totalHours >= 8 ? 'bg-green-500' :
                                        totalHours >= 4 ? 'bg-yellow-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${Math.min((totalHours / 8) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-1">
                            {((totalHours / 8) * 100).toFixed(0)}% van 8u
                        </div>
                    </div>

                    {/* Entries List */}
                    {entries.length === 0 ? (
                        <div className="text-center py-3">
                            <p className="text-xs text-gray-500">
                                {isWeekend ? '🌅 Weekend' : '⏰ Geen uren'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {entries.slice(0, isExpanded ? entries.length : 2).map((entry: TimeEntry, index: number) => {
                                try {
                                    if (!entry.startTime || !entry.endTime) {
                                        return (
                                            <div key={index} className="text-xs text-error bg-red-50 p-2 rounded">
                                                Ongeldige entry
                                            </div>
                                        );
                                    }

                                    const start = dayjs(entry.startTime);
                                    const end = dayjs(entry.endTime);

                                    if (!start.isValid() || !end.isValid()) {
                                        return (
                                            <div key={index} className="text-xs text-error bg-red-50 p-2 rounded">
                                                Ongeldige tijd
                                            </div>
                                        );
                                    }

                                    const hours = calculateHours(entry);
                                    const canSelect = (entry.status === "concept" || !entry.status) && canEdit;
                                    const isSelected = entry.id ? selectedEntries.has(entry.id) : false;

                                    const getEntryStatusBg = () => {
                                        switch (entry.status) {
                                            case 'goedgekeurd': return 'bg-green-100 border-green-200';
                                            case 'afgekeurd': return 'bg-red-100 border-red-200';
                                            case 'ingeleverd': return 'bg-yellow-100 border-yellow-200';
                                            default: return isSelected ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200';
                                        }
                                    };

                                    return (
                                        <div
                                            key={entry.id || index}
                                            className={`p-3 rounded-lg border hover:shadow-sm ${getEntryStatusBg()}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    {canSelect && (
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-primary checkbox-sm"
                                                            checked={isSelected}
                                                            onChange={() => entry.id && handleSelectEntry(entry.id)}
                                                        />
                                                    )}
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {start.format("HH:mm")}-{end.format("HH:mm")}
                                                    </span>
                                                    <span className="text-xs bg-elmar-primary text-white px-2 py-0.5 rounded-full font-medium">
                                                        {formatHours(hours)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {entry.status === 'goedgekeurd' && <span className="text-xs">✅</span>}
                                                    {entry.status === 'afgekeurd' && <span className="text-xs">❌</span>}
                                                    {entry.status === 'ingeleverd' && <span className="text-xs">⏳</span>}

                                                    {canEdit && (
                                                        <button
                                                            onClick={() => handleEditEntry(entry)}
                                                            className="p-1 hover:bg-gray-200 rounded"
                                                            title="Bewerken"
                                                        >
                                                            <PencilIcon className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                                <BuildingOfficeIcon className="w-3 h-3" />
                                                <span className="truncate">
                                                    {entry.project?.projectGroup?.company?.name || 'Onbekend'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                <span className="w-2 h-2 bg-elmar-primary rounded-full"></span>
                                                <span className="truncate">
                                                    {entry.project?.name || 'Onbekend project'}
                                                </span>
                                            </div>

                                            {(entry.expenses || entry.travelCosts || entry.notes) && (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                    {(entry.expenses || entry.travelCosts) && (
                                                        <div className="flex items-center gap-1 text-xs text-green-600">
                                                            <CurrencyEuroIcon className="w-3 h-3" />
                                                            €{((entry.expenses || 0) + (entry.travelCosts || 0)).toFixed(2)}
                                                        </div>
                                                    )}
                                                    {entry.notes && (
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                            <DocumentTextIcon className="w-3 h-3" />
                                                            <span className="truncate">{entry.notes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                } catch (error) {
                                    console.warn("Error rendering entry:", entry, error);
                                    return (
                                        <div key={index} className="text-xs text-error bg-red-50 p-2 rounded">
                                            Fout bij laden
                                        </div>
                                    );
                                }
                            })}

                            {entries.length > 2 && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full text-xs text-elmar-primary hover:text-elmar-secondary py-1 font-medium"
                                >
                                    {isExpanded ? `▲ Toon minder` : `▼ Toon alle ${entries.length} entries`}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Add Button */}
                    {canEdit && (
                        <button
                            onClick={handleAddEntry}
                            className="btn btn-sm bg-blue-600 border-0 text-white w-full rounded-lg mt-3"
                        >
                            <PlusIcon className="w-4 h-4 mr-1" />
                            {entries.length === 0 ? 'Uren Toevoegen' : 'Nieuwe Entry'}
                        </button>
                    )}

                    {!canEdit && weekStatus !== "concept" && (
                        <div className="text-center mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                weekStatus === 'goedgekeurd' ? 'bg-green-100 text-green-800' :
                                    weekStatus === 'ingeleverd' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {weekStatus === 'goedgekeurd' ? 'Goedgekeurd' :
                                    weekStatus === 'ingeleverd' ? '⏳ Ingeleverd' : 'Afgekeurd'}
                            </span>
                        </div>
                    )}

                    {!canEdit && (
                        <div className="absolute top-2 right-2">
                            <LockClosedIcon className="w-4 h-4 text-gray-400" />
                        </div>
                    )}
                </div>
            </div>

            <TimeEntryModal
                isOpen={showModal}
                day={date}
                entry={editingEntry}
                onClose={handleCloseModal}
                onEntrySaved={handleCloseModal}
            />
        </>
    );
}

// Main WeekOverview Component
export default function WeekOverview() {
    const [currentWeek, setCurrentWeek] = useState(dayjs().startOf("isoWeek"));
    const [localEntries, setLocalEntries] = useState<TimeEntry[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null);
    const [weekStatus, setWeekStatus] = useState<string>("concept");
    const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());

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
            }

            setLocalEntries(safeData);

            // Determine week status
            const weekStart = currentWeek.startOf("day");
            const weekEnd = currentWeek.add(6, "day").endOf("day");

            const weekEntries = safeData.filter(entry => {
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

    // Handle entry selection
    const handleSelectEntry = (entryId: number, selected: boolean) => {
        const newSelected = new Set(selectedEntries);
        if (selected) {
            newSelected.add(entryId);
        } else {
            newSelected.delete(entryId);
        }
        setSelectedEntries(newSelected);
    };

    // Handle select all entries for the week
    const handleSelectAllWeek = () => {
        const weekStart = currentWeek.startOf("day");
        const weekEnd = currentWeek.add(6, "day").endOf("day");

        const conceptEntries = localEntries.filter(entry => {
            if (entry.status !== "concept" && entry.status) return false;
            try {
                const entryDate = dayjs(entry.startTime);
                return entryDate.isBetween(weekStart, weekEnd, "day", "[]");
            } catch {
                return false;
            }
        });

        if (selectedEntries.size === conceptEntries.length && conceptEntries.length > 0) {
            setSelectedEntries(new Set());
        } else {
            setSelectedEntries(new Set(conceptEntries.map(entry => entry.id).filter(id => id !== undefined) as number[]));
        }
    };

    // Save all concept entries for the week
    const handleSaveWeek = async () => {
        const weekStart = currentWeek.startOf("day");
        const weekEnd = currentWeek.add(6, "day").endOf("day");

        const conceptEntries = localEntries.filter(entry => {
            if (entry.status !== "concept" && entry.status) return false;
            try {
                const entryDate = dayjs(entry.startTime);
                return entryDate.isBetween(weekStart, weekEnd, "day", "[]");
            } catch {
                return false;
            }
        });

        if (conceptEntries.length === 0) {
            showToast("Geen concept uren gevonden om op te slaan", "error");
            return;
        }

        setIsSaving(true);
        try {
            for (const entry of conceptEntries) {
                if (entry.id) {
                    await updateTimeEntry(entry.id, {
                        ...entry,
                        status: "concept"
                    });
                }
            }

            await fetchFromDB();
            showToast(`${conceptEntries.length} urenregistratie(s) opgeslagen!`, "success");
        } catch (error) {
            console.error("Error saving entries:", error);
            showToast("Fout bij opslaan van uren", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Submit all concept entries for the week
    const handleSubmitWeek = async () => {
        const weekStart = currentWeek.startOf("day");
        const weekEnd = currentWeek.add(6, "day").endOf("day");

        const conceptEntries = localEntries.filter(entry => {
            if (entry.status !== "concept" && entry.status) return false;
            try {
                const entryDate = dayjs(entry.startTime);
                return entryDate.isBetween(weekStart, weekEnd, "day", "[]");
            } catch {
                return false;
            }
        });

        if (conceptEntries.length === 0) {
            showToast("Geen concept uren gevonden om in te leveren", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            for (const entry of conceptEntries) {
                if (entry.id) {
                    await updateTimeEntry(entry.id, {
                        ...entry,
                        status: "ingeleverd"
                    });
                }
            }

            await fetchFromDB();
            showToast(`${conceptEntries.length} urenregistratie(s) ingeleverd!`, "success");
        } catch (error) {
            console.error("Error submitting entries:", error);
            showToast("Fout bij inleveren van uren", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const showToast = (message: string, type: "success" | "error") => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const handlePrevWeek = () => setCurrentWeek((w) => w.subtract(1, "week"));
    const handleNextWeek = () => setCurrentWeek((w) => w.add(1, "week"));
    const handleToday = () => setCurrentWeek(dayjs().startOf("isoWeek"));

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

    // Get concept entries for this week
    const weekStart = currentWeek.startOf("day");
    const weekEnd = currentWeek.add(6, "day").endOf("day");
    const conceptEntries = localEntries.filter(entry => {
        if (entry.status !== "concept" && entry.status) return false;
        try {
            const entryDate = dayjs(entry.startTime);
            return entryDate.isBetween(weekStart, weekEnd, "day", "[]");
        } catch {
            return false;
        }
    });

    const canEdit = weekStatus === "concept";

    return (
        <div className="space-y-6">
            {/* Week Header */}
            <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-lg">
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
                                    {weekStatus === 'goedgekeurd' ? 'Goedgekeurd' :
                                        weekStatus === 'ingeleverd' ? '⏳ Ingeleverd' :
                                            'Afgekeurd'}
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

                {/* Week Navigation and Actions */}
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
                        {canEdit && conceptEntries.length > 0 && (
                            <>
                                <button
                                    className="btn bg-white/20 border-white/30 text-white hover:bg-white/30 rounded-xl"
                                    onClick={handleSaveWeek}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        <BookmarkIcon className="w-5 h-5" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {isSaving ? "Opslaan..." : `Opslaan (${conceptEntries.length})`}
                                    </span>
                                </button>

                                <button
                                    className="btn bg-green-500 border-green-500 text-white hover:bg-green-600 rounded-xl"
                                    onClick={handleSubmitWeek}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="loading loading-spinner loading-sm"></span>
                                    ) : (
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {isSubmitting ? "Inleveren..." : `Inleveren (${conceptEntries.length})`}
                                    </span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Compact Week Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {days.map((day, index) => {
                    const entries = getDayEntries(day);

                    return (
                        <DayEntry
                            key={day.format("YYYY-MM-DD")}
                            date={day}
                            entries={entries}
                            onUpdate={fetchFromDB}
                            weekStatus={weekStatus}
                            onShowToast={showToast}
                            onSelectEntry={handleSelectEntry}
                            selectedEntries={selectedEntries}
                        />
                    );
                })}
            </div>

            {/* Week Summary */}
            {totalHoursThisWeek > 0 && (
                <div className="card bg-white shadow-lg">
                    <div className="card-body p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ClockIcon className="w-6 h-6 text-elmar-primary" />
                            Week Samenvatting
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-100 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{formatHours(totalHoursThisWeek)}</div>
                                <div className="text-sm text-gray-600">Totaal uren</div>
                            </div>

                            <div className="bg-blue-100 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {days.filter(day => getDayHours(day) > 0).length}
                                </div>
                                <div className="text-sm text-gray-600">Werkdagen</div>
                            </div>

                            <div className="bg-blue-100 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {totalHoursThisWeek > 0 ? formatHours(totalHoursThisWeek / days.filter(day => getDayHours(day) > 0).length) : '0u'}
                                </div>
                                <div className="text-sm text-gray-600">Gemiddeld</div>
                            </div>

                            <div className="bg-blue-100 rounded-xl p-4 text-center">
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
                                    className={`h-3 rounded-full ${
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