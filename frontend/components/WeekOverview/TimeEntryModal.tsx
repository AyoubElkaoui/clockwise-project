// components/WeekOverview/TimeEntryModal.tsx
"use client";
import React from "react";
import { Dayjs } from "dayjs";
import TimeEntryForm from "./TimeEntryForm";

interface Props {
    isOpen: boolean;
    day: Dayjs | null;
    onClose: () => void;
    onEntrySaved: () => void;
}

export default function TimeEntryModal({ isOpen, day, onClose, onEntrySaved }: Props) {
    if (!isOpen || !day) return null;
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-base-100 p-6 shadow-xl rounded w-full max-w-md">
                    <TimeEntryForm day={day} onClose={onClose} onEntrySaved={onEntrySaved} />
                </div>
            </div>
        </>
    );
}
