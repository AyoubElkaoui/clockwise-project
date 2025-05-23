// Fixed TimeEntryModal - corrected interface to accept date instead of day
"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { TimeEntry } from "@/lib/types";
import TimeEntryForm from "./TimeEntryForm";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
    date: Dayjs;  // Changed from 'day' to 'date' to match your usage
    entry?: TimeEntry | null;  // Made optional and nullable for editing
    onClose: () => void;
}

export default function TimeEntryModal({ date, entry, onClose }: Props) {
    if (!date) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-elmar-lg border border-white/50 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="bg-gradient-elmar text-white p-6 relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>

                        <div className="relative flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">
                                    {entry ? "✏️ Uren Bewerken" : "🕐 Uren Registreren"}
                                </h2>
                                <p className="text-blue-100">
                                    {date.format("dddd, DD MMMM YYYY")}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="btn btn-ghost btn-circle text-white hover:bg-white/20 transition-all duration-200"
                                title="Sluiten"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <TimeEntryForm
                            day={date}  // TimeEntryForm expects 'day' prop
                            existingEntry={entry}  // Pass existing entry for editing
                            onClose={onClose}
                            onEntrySaved={onClose}  // Close modal when saved
                        />
                    </div>
                </div>
            </div>
        </>
    );
}