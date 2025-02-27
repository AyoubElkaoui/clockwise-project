"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { TimeEntry } from "./WeekOverview";
import DaysTablePlaceholderRow from "./DaysTablePlaceholderRow";
import DaysTableEntryRow from "./DaysTableEntryRow";

interface Props {
    day: Dayjs;
    entry?: TimeEntry;
    localEntries: TimeEntry[];
    onRegisterClick: (day: Dayjs) => void;
    onUpdateLocalEntries: (updated: TimeEntry[]) => void;
}

/** DaysTableRow: beslist of we placeholder of entryRow tonen. */
export default function DaysTableRow({
                                         day,
                                         entry,
                                         localEntries,
                                         onRegisterClick,
                                         onUpdateLocalEntries,
                                     }: Props) {
    if (!entry) {
        return (
            <DaysTablePlaceholderRow
                day={day}
                onRegisterClick={onRegisterClick}
            />
        );
    } else {
        return (
            <DaysTableEntryRow
                day={day}
                entry={entry}
                allEntries={localEntries}
                onRegisterClick={() => onRegisterClick(day)}
                onUpdateLocalEntries={onUpdateLocalEntries}
            />
        );
    }
}
