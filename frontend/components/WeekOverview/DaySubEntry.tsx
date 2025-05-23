"use client";
import { useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { TimeEntry } from "@/lib/types";
import TimeEntryModal from "./TimeEntryModal";
import {
    ClockIcon,
    PlusIcon,
    PencilIcon,
    BuildingOfficeIcon,
    CurrencyEuroIcon,
    DocumentTextIcon,
    LockClosedIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon
} from "@heroicons/react/24/outline";

interface DayEntryProps {
    date: Dayjs;
    entries: TimeEntry[];
    onUpdate: () => void;
    weekStatus: string;
}

export default function DayEntry({ date, entries, onUpdate, weekStatus }: DayEntryProps) {
    const [showModal, setShowModal] = useState<boolean>(false);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    const isToday = date.isSame(dayjs(), "day");
    const isWeekend = date.day() === 0 || date.day() === 6;
    const canEdit = weekStatus === "concept";

    // Calculate total hours for the day
    const totalHours = entries.reduce((total, entry) => {
        if (!entry.startTime || !entry.endTime) return total;

        try {
            const start = dayjs(entry.startTime);
            const end = dayjs(entry.endTime);
            const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
            return total + (diffMin > 0 ? diffMin / 60 : 0);
        } catch (error) {
            console.warn("Error calculating hours for entry:", entry, error);
            return total;
        }
    }, 0);

    const totalExpenses = entries.reduce((total, entry) => {
        return total + (entry.expenses || 0) + (entry.travelCosts || 0);
    }, 0);

    // Format hours properly (in 0.25 increments)
    const formatHours = (hours: number): string => {
        const rounded = Math.round(hours * 4) / 4; // Round to nearest quarter
        return rounded.toFixed(2).replace('.00', '').replace('.25', '¼').replace('.50', '½').replace('.75', '¾');
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

    const getDayDisplayName = (): string => {
        const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
        return dayNames[date.day()];
    };

    const getStatusColor = (): string => {
        if (totalHours === 0) return "border-gray-200 bg-gradient-to-r from-gray-50 to-white";
        if (totalHours >= 8) return "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50";
        if (totalHours >= 4) return "border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50";
        return "border-orange-200 bg-gradient-to-r from-orange-50 to-red-50";
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

    return (
        <>
            <div className={`
                relative overflow-hidden rounded-xl border-2 transition-all duration-200 hover:shadow-md
                ${isToday ? 'ring-1 ring-elmar-primary ring-opacity-30' : ''}
                ${getStatusColor()}
            `}>
                {/* Compact Header */}
                <div className="p-4">
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
                                {formatHours(totalHours)}u
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
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                    totalHours >= 8 ? 'bg-green-500' :
                                        totalHours >= 4 ? 'bg-yellow-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${Math.min((totalHours / 8) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Compact Entries List */}
                    {entries.length === 0 ? (
                        <div className="text-center py-3">
                            <p className="text-xs text-gray-500">
                                {isWeekend ? '🌅 Weekend' : '⏰ Geen uren'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Show first entry always, rest only if expanded */}
                            {entries.slice(0, isExpanded ? entries.length : 1).map((entry: TimeEntry, index: number) => {
                                try {
                                    if (!entry.startTime || !entry.endTime) {
                                        return (
                                            <div key={index} className="text-xs text-error bg-red-50 p-2 rounded">
                                                ⚠️ Ongeldige entry
                                            </div>
                                        );
                                    }

                                    const start = dayjs(entry.startTime);
                                    const end = dayjs(entry.endTime);

                                    if (!start.isValid() || !end.isValid()) {
                                        return (
                                            <div key={index} className="text-xs text-error bg-red-50 p-2 rounded">
                                                ⚠️ Ongeldige tijd
                                            </div>
                                        );
                                    }

                                    const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
                                    const hours = diffMin > 0 ? (diffMin / 60) : 0;

                                    const getEntryStatusBg = () => {
                                        switch (entry.status) {
                                            case 'goedgekeurd': return 'bg-green-100 border-green-200';
                                            case 'afgekeurd': return 'bg-red-100 border-red-200';
                                            case 'ingeleverd': return 'bg-yellow-100 border-yellow-200';
                                            default: return 'bg-white border-gray-200';
                                        }
                                    };

                                    return (
                                        <div
                                            key={entry.id || index}
                                            className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${getEntryStatusBg()}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {start.format("HH:mm")}-{end.format("HH:mm")}
                                                    </span>
                                                    <span className="text-xs bg-elmar-primary text-white px-2 py-0.5 rounded-full">
                                                        {formatHours(hours)}u
                                                    </span>
                                                </div>

                                                {/* Status & Edit */}
                                                <div className="flex items-center gap-1">
                                                    {entry.status === 'goedgekeurd' && <span className="text-xs text-green-600">✅</span>}
                                                    {entry.status === 'afgekeurd' && <span className="text-xs text-red-600">❌</span>}
                                                    {entry.status === 'ingeleverd' && <span className="text-xs text-yellow-600">⏳</span>}

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

                                            {/* Project info - compact */}
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

                                            {/* Additional info - only if space */}
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
                                            ⚠️ Fout bij laden
                                        </div>
                                    );
                                }
                            })}

                            {/* Show more/less button */}
                            {entries.length > 1 && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full text-xs text-elmar-primary hover:text-elmar-secondary py-1"
                                >
                                    {isExpanded ? `▲ Inklappen (${entries.length} entries)` : `▼ Toon alle ${entries.length} entries`}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Add Button */}
                    {canEdit && (
                        <button
                            onClick={handleAddEntry}
                            className="btn btn-sm bg-gradient-elmar border-0 text-white w-full rounded-lg hover:scale-105 transition-all duration-200 mt-3"
                        >
                            <PlusIcon className="w-4 h-4 mr-1" />
                            {entries.length === 0 ? 'Uren Toevoegen' : 'Entry +'}
                        </button>
                    )}

                    {/* Status indicator voor non-editable */}
                    {!canEdit && weekStatus !== "concept" && (
                        <div className="text-center mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                                weekStatus === 'goedgekeurd' ? 'bg-green-100 text-green-800' :
                                    weekStatus === 'ingeleverd' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {weekStatus === 'goedgekeurd' ? '✅ Goedgekeurd' :
                                    weekStatus === 'ingeleverd' ? '⏳ Ingeleverd' : '❌ Afgekeurd'}
                            </span>
                        </div>
                    )}

                    {/* Lock indicator */}
                    {!canEdit && (
                        <div className="absolute top-2 right-2">
                            <LockClosedIcon className="w-4 h-4 text-gray-400" />
                        </div>
                    )}
                </div>
            </div>

            {/* Time Entry Modal */}
            {showModal && (
                <TimeEntryModal
                    date={date}
                    entry={editingEntry}
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
}