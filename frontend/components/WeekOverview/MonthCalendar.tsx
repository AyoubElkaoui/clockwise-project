"use client";
import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/nl";
import { CalendarIcon } from "@heroicons/react/24/outline";

interface TimeEntry {
    startTime: string;
    endTime: string;
    breakMinutes: number;
    status?: string;
}

interface MonthlyOverviewProps {
    currentMonth: Dayjs;
    timeEntries: TimeEntry[];
    title?: string;
}

dayjs.extend(isoWeek);
dayjs.locale("nl");

export default function MonthCalendar({
                                          currentMonth,
                                          timeEntries,
                                          title = "Urenoverzicht",
                                      }: MonthlyOverviewProps) {
    const monthName = currentMonth.format("MMMM");
    const year = currentMonth.format("YYYY");

    const startOfMonth = currentMonth.startOf("month");
    const endOfMonth = currentMonth.endOf("month");
    const startOfCalendar = startOfMonth.startOf("isoWeek");
    const endOfCalendar = endOfMonth.endOf("isoWeek");

    // Bouw weken-array
    const weeks: { isoWeekNumber: number; days: Dayjs[] }[] = [];
    let day = startOfCalendar.clone();
    while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar, "day")) {
        const isoWeekNumber = day.isoWeek();
        const daysOfWeek = Array.from({length: 7}, (_, i) => day.clone().add(i, "day"));
        weeks.push({isoWeekNumber, days: daysOfWeek});
        day = day.add(1, "week");
    }

    // Helper om uren per dag te berekenen
    function getHoursForDay(d: Dayjs): number {
        const dayStr = d.format("YYYY-MM-DD");
        const entries = timeEntries.filter((te) => te.startTime.startsWith(dayStr));
        let totalMinutes = 0;
        for (const e of entries) {
            const start = dayjs(e.startTime);
            const end = dayjs(e.endTime);
            const diff = end.diff(start, "minute") - e.breakMinutes;
            if (diff > 0) totalMinutes += diff;
        }
        return totalMinutes / 60;
    }

    function isInCurrentMonth(d: Dayjs) {
        return d.isSame(currentMonth, "month");
    }

    const colTotal = Array(7).fill(0);
    let monthTotal = 0;

    const tableRows = weeks.map((week) => {
        let rowSum = 0;
        const dayCells = week.days.map((d, idx) => {
            const hours = getHoursForDay(d);
            rowSum += hours;
            colTotal[idx] += hours;
            monthTotal += hours;
            const bgColor = hours > 0 ? "bg-blue-100" : "bg-base-100";
            const textColor = isInCurrentMonth(d) ? "text-black" : "text-gray-400";
            return (
                <td key={idx} className={`border text-center w-10 h-10 ${bgColor} ${textColor}`}>
                    {hours > 0 ? hours.toFixed(1) : ""}
                </td>
            );
        });

        return (
            <tr key={week.isoWeekNumber} className="text-center">
                <td className="border font-semibold w-10 h-10 text-sm">{week.isoWeekNumber}</td>
                {dayCells}
                <td className="border w-10 h-10 text-center font-bold text-sm">{rowSum > 0 ? rowSum.toFixed(1) : ""}</td>
            </tr>
        );
    });

    const totalRow = (
        <tr className="text-center font-semibold">
            <td className="border w-10 h-10 text-sm">Totaal</td>
            {colTotal.map((sum, i) => (
                <td key={i} className="border w-10 h-10 text-sm">{sum > 0 ? sum.toFixed(1) : ""}</td>
            ))}
            <td className="border w-10 h-10 font-bold text-sm">{monthTotal > 0 ? monthTotal.toFixed(1) : ""}</td>
        </tr>
    );

    return (
        <div className="max-w-sm">
            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-4">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-primary"/>
                        <h2 className="text-md font-bold">
                            {title} {monthName} {year}
                        </h2>
                    </div>
                    <div className="mt-4 overflow-hidden">
                        <table className="table-auto border-collapse w-full">
                            <thead>
                            <tr className="text-center bg-base-200">
                                <th className="border w-12 h-12 text-sm">Wk</th>
                                <th className="border w-12 h-12 text-sm">ma</th>
                                <th className="border w-12 h-12 text-sm">di</th>
                                <th className="border w-12 h-12 text-sm">wo</th>
                                <th className="border w-12 h-12 text-sm">do</th>
                                <th className="border w-12 h-12 text-sm">vr</th>
                                <th className="border w-12 h-12 text-sm">za</th>
                                <th className="border w-12 h-12 text-sm">zo</th>
                                <th className="border w-12 h-12 text-sm">Totaal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {tableRows}
                            {totalRow}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}