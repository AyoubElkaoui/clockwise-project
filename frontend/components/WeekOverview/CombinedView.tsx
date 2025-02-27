"use client";
import React from "react";
import { Dayjs } from "dayjs";
import DaysTable from "./DaysTable";
import MonthCalendar from "./MonthCalendar";
import { TimeEntry } from "./WeekOverview";

interface CombinedViewProps {
    currentWeek: Dayjs;
    timeEntries: TimeEntry[];
    onClickRegister: (day: Dayjs) => void;
    onUpdateLocalEntries: (updated: TimeEntry[]) => void;
}

export default function CombinedView({
                                         currentWeek,
                                         timeEntries,
                                         onClickRegister,
                                         onUpdateLocalEntries,
                                     }: CombinedViewProps) {
    const currentMonth = currentWeek.startOf("month");

    return (
        <div className="flex flex-col md:flex-row gap-4 justify-center">
            {/* Linker kolom: DaysTable */}
            <div className="w-full md:w-3/4">
                <DaysTable
                    currentWeek={currentWeek}
                    localEntries={timeEntries}
                    onRegisterClick={onClickRegister}
                    onUpdateLocalEntries={onUpdateLocalEntries}
                />
            </div>

            {/* Rechter kolom: MonthCalendar */}
            <div className="w-full md:w-1/4">
                <MonthCalendar
                    currentMonth={currentMonth}
                    timeEntries={timeEntries}
                    title="Urenoverzicht"
                />
            </div>
        </div>
    );
}
