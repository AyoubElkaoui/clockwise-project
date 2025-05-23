"use client";
import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/nl";
import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
import { safeToFixed, safeArray } from "@/lib/type-safe-utils";

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

    const weeks: { isoWeekNumber: number; days: Dayjs[] }[] = [];
    let day = startOfCalendar.clone();
    while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar, "day")) {
        const isoWeekNumber = day.isoWeek();
        const daysOfWeek = Array.from({length: 7}, (_, i) => day.clone().add(i, "day"));
        weeks.push({isoWeekNumber, days: daysOfWeek});
        day = day.add(1, "week");
    }

    function getHoursForDay(d: Dayjs): number {
        try {
            const dayStr = d.format("YYYY-MM-DD");
            const entriesArray = safeArray<TimeEntry>(timeEntries);

            const entries: TimeEntry[] = [];
            for (const te of entriesArray) {
                try {
                    if (te && te.startTime && te.startTime.startsWith(dayStr)) {
                        entries.push(te);
                    }
                } catch (error) {
                    console.warn('Error filtering time entry:', te, error);
                }
            }

            let totalMinutes = 0;
            for (const e of entries) {
                try {
                    if (e && e.startTime && e.endTime) {
                        const start = dayjs(e.startTime);
                        const end = dayjs(e.endTime);
                        const breakMin = typeof e.breakMinutes === 'number' ? e.breakMinutes : 0;
                        const diff = end.diff(start, "minute") - breakMin;
                        if (diff > 0) totalMinutes += diff;
                    }
                } catch (error) {
                    console.warn('Error calculating time for entry:', e, error);
                }
            }

            const hours = totalMinutes / 60;
            // Round to nearest quarter hour
            return Math.round(hours * 4) / 4;
        } catch (error) {
            console.warn('Error in getHoursForDay:', error);
            return 0;
        }
    }

    function isInCurrentMonth(d: Dayjs) {
        try {
            return d.isSame(currentMonth, "month");
        } catch (error) {
            return false;
        }
    }

    function formatHours(hours: number): string {
        if (hours === 0) return "";

        const wholeHours = Math.floor(hours);
        const fraction = hours - wholeHours;

        if (fraction === 0) return `${wholeHours}u`;
        else if (fraction === 0.25) return `${wholeHours}¼`;
        else if (fraction === 0.5) return `${wholeHours}½`;
        else if (fraction === 0.75) return `${wholeHours}¾`;
        else return `${hours.toFixed(2)}u`;
    }

    const colTotal = Array(7).fill(0);
    let monthTotal = 0;

    const tableRows = weeks.map((week) => {
        let rowSum = 0;
        const dayCells = week.days.map((d, idx) => {
            try {
                const hours = getHoursForDay(d);
                rowSum += hours;
                colTotal[idx] += hours;
                monthTotal += hours;

                const isToday = d.isSame(dayjs(), 'day');
                const isInMonth = isInCurrentMonth(d);
                const hasHours = hours > 0;

                let cellClass = "border-2 text-center w-12 h-12 text-xs font-medium transition-all duration-200 hover:scale-105 ";

                if (isToday) {
                    cellClass += "bg-gradient-elmar text-white border-elmar-primary shadow-lg ";
                } else if (hasHours && isInMonth) {
                    if (hours >= 8) {
                        cellClass += "bg-gradient-to-br from-green-100 to-green-200 text-green-800 border-green-300 ";
                    } else if (hours >= 4) {
                        cellClass += "bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300 ";
                    } else {
                        cellClass += "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-blue-300 ";
                    }
                } else if (isInMonth) {
                    cellClass += "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 ";
                } else {
                    cellClass += "bg-gray-50 text-gray-400 border-gray-100 ";
                }

                return (
                    <td key={idx} className={cellClass}>
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className={`text-xs ${isToday ? 'font-bold' : ''}`}>
                                {d.format("D")}
                            </div>
                            {hasHours && (
                                <div className={`text-xs leading-none ${isToday ? 'text-blue-100' : ''}`}>
                                    {formatHours(hours)}
                                </div>
                            )}
                        </div>
                    </td>
                );
            } catch (error) {
                console.warn('Error rendering day cell:', d, error);
                return (
                    <td key={idx} className="border-2 text-center w-12 h-12 bg-white text-gray-400">
                        <div className="flex items-center justify-center h-full text-xs">
                            -
                        </div>
                    </td>
                );
            }
        });

        return (
            <tr key={week.isoWeekNumber} className="text-center">
                <td className="border-2 font-bold w-10 h-12 text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700">
                    <div className="flex items-center justify-center h-full">
                        {week.isoWeekNumber}
                    </div>
                </td>
                {dayCells}
                <td className="border-2 w-12 h-12 text-center font-bold text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800">
                    <div className="flex items-center justify-center h-full">
                        {rowSum > 0 ? formatHours(rowSum) : ""}
                    </div>
                </td>
            </tr>
        );
    });

    const totalRow = (
        <tr className="text-center font-bold bg-gradient-to-r from-indigo-100 to-purple-200">
            <td className="border-2 w-10 h-10 text-xs text-indigo-800">
                <div className="flex items-center justify-center h-full">
                    Totaal
                </div>
            </td>
            {colTotal.map((sum, i) => (
                <td key={i} className="border-2 w-12 h-10 text-xs text-indigo-800">
                    <div className="flex items-center justify-center h-full">
                        {sum > 0 ? formatHours(sum) : ""}
                    </div>
                </td>
            ))}
            <td className="border-2 w-12 h-10 font-bold text-xs text-indigo-800">
                <div className="flex items-center justify-center h-full">
                    {monthTotal > 0 ? formatHours(monthTotal) : ""}
                </div>
            </td>
        </tr>
    );

    return (
        <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
            <div className="card-body p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-elmar p-3 rounded-xl shadow-lg">
                        <CalendarIcon className="w-6 h-6 text-white"/>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {title}
                        </h2>
                        <p className="text-gray-600">
                            {monthName} {year}
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <ClockIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-gray-700">Totaal</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatHours(monthTotal) || "0u"}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Dagen</div>
                        <div className="text-2xl font-bold text-green-600">
                            {colTotal.filter(sum => sum > 0).length}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Gemiddeld</div>
                        <div className="text-2xl font-bold text-purple-600">
                            {monthTotal > 0 ? formatHours(monthTotal / colTotal.filter(sum => sum > 0).length) : "0u"}
                        </div>
                    </div>
                </div>

                {/* Calendar Table */}
                <div className="overflow-hidden rounded-xl border-2 border-gray-200">
                    <table className="table-auto border-collapse w-full">
                        <thead>
                        <tr className="text-center bg-gradient-elmar text-white">
                            <th className="border-2 border-blue-400 w-10 h-10 text-xs font-bold">Wk</th>
                            <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">Ma</th>
                            <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">Di</th>
                            <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">Wo</th>
                            <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">Do</th>
                            <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">Vr</th>
                            <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">Za</th>
                            <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">Zo</th>
                            <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">Totaal</th>
                        </tr>
                        </thead>
                        <tbody>
                        {tableRows}
                        {totalRow}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm">📊 Legenda</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-br from-green-100 to-green-200 border border-green-300 rounded"></div>
                            <span className="text-gray-600">8+ uur</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300 rounded"></div>
                            <span className="text-gray-600">4-8 uur</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 rounded"></div>
                            <span className="text-gray-600">1-4 uur</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-elmar rounded"></div>
                            <span className="text-gray-600">Vandaag</span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                {monthTotal > 0 && (
                    <div className="mt-4 text-center">
                        <div className="text-sm text-gray-600">
                            💡 Dit is gemiddeld <span className="font-semibold text-elmar-primary">
                                {(monthTotal / 4).toFixed(1)} uur per week
                            </span> deze maand
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}