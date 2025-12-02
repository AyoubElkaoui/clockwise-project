"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { TimeEntry } from "@/lib/types";
import TimeEntryForm from "./TimeEntryForm";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
    isOpen: boolean;
    day: Dayjs | null;
    entry?: TimeEntry | null;
    onClose: () => void;
    onEntrySaved: () => void;
}

export default function TimeEntryModal({ isOpen, day, entry, onClose, onEntrySaved }: Props) {
    if (!isOpen || !day) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-md-lg border border-white/50 w-full max-w-2xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-600 text-white p-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>

                        <div className="relative flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">
                                    {entry ? "✏️ Uren Bewerken" : "🕐 Uren Registreren"}
                                </h2>
                                <p className="text-blue-100">
                                    {day.format("dddd, DD MMMM YYYY")}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="btn btn-ghost btn-circle text-white hover:bg-white/20"
                                title="Sluiten"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <TimeEntryForm
                            day={day}
                            existingEntry={entry}
                            onClose={onClose}
                            onEntrySaved={onEntrySaved}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}