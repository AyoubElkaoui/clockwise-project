"use client";
import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/nl";
import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
import { safeToFixed, safeArray } from "@/lib/type-safe-utils";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
    const daysOfWeek = Array.from({ length: 7 }, (_, i) =>
      day.clone().add(i, "day"),
    );
    weeks.push({ isoWeekNumber, days: daysOfWeek });
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
          
        }
      }

      let totalMinutes = 0;
      for (const e of entries) {
        try {
          if (e && e.startTime && e.endTime) {
            const start = dayjs(e.startTime);
            const end = dayjs(e.endTime);
            const breakMin =
              typeof e.breakMinutes === "number" ? e.breakMinutes : 0;
            const diff = end.diff(start, "minute") - breakMin;
            if (diff > 0) totalMinutes += diff;
          }
        } catch (error) {
          
        }
      }

      const hours = totalMinutes / 60;
      // Round to nearest quarter hour
      return Math.round(hours * 4) / 4;
    } catch (error) {
      
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

        const isToday = d.isSame(dayjs(), "day");
        const isInMonth = isInCurrentMonth(d);
        const hasHours = hours > 0;

        let cellClass = "border-2 text-center w-12 h-12 text-xs font-medium ";

        if (isToday) {
          cellClass += "bg-blue-600 text-white border-elmar-primary shadow-lg ";
        } else if (hasHours && isInMonth) {
          if (hours >= 8) {
            cellClass += "bg-blue-100 text-green-800 border-green-300 ";
          } else if (hours >= 4) {
            cellClass += "bg-blue-100 text-yellow-800 border-yellow-300 ";
          } else {
            cellClass += "bg-blue-100 text-blue-800 border-blue-300 ";
          }
        } else if (isInMonth) {
          cellClass +=
            "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 ";
        } else {
          cellClass += "bg-gray-50 text-gray-400 border-gray-100 ";
        }

        return (
          <td key={idx} className={cellClass}>
            <div className="flex flex-col items-center justify-center h-full">
              <div className={`text-xs ${isToday ? "font-bold" : ""}`}>
                {d.format("D")}
              </div>
              {hasHours && (
                <div
                  className={`text-xs leading-none ${isToday ? "text-blue-100" : ""}`}
                >
                  {formatHours(hours)}
                </div>
              )}
            </div>
          </td>
        );
      } catch (error) {
        
        return (
          <td
            key={idx}
            className="border-2 text-center w-12 h-12 bg-white text-gray-400"
          >
            <div className="flex items-center justify-center h-full text-xs">
              -
            </div>
          </td>
        );
      }
    });

    return (
      <tr key={week.isoWeekNumber} className="text-center">
        <td className="border-2 font-bold w-10 h-12 text-xs bg-blue-100 text-gray-700">
          <div className="flex items-center justify-center h-full">
            {week.isoWeekNumber}
          </div>
        </td>
        {dayCells}
        <td className="border-2 w-12 h-12 text-center font-bold text-xs bg-blue-100 text-blue-800">
          <div className="flex items-center justify-center h-full">
            {rowSum > 0 ? formatHours(rowSum) : ""}
          </div>
        </td>
      </tr>
    );
  });

  const totalRow = (
    <tr className="text-center font-bold bg-blue-100">
      <td className="border-2 w-10 h-10 text-xs text-timr-blue">
        <div className="flex items-center justify-center h-full">
          {t("week.total")}
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
    <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
      <div className="card-body p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <p className="text-gray-600">
              {monthName} {year}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">
                {t("week.total")}
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatHours(monthTotal) || "0u"}
            </div>
          </div>

          <div className="bg-blue-100 rounded-xl p-4 border border-green-200">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              {t("week.days")}
            </div>
            <div className="text-2xl font-bold text-green-600">
              {colTotal.filter((sum) => sum > 0).length}
            </div>
          </div>

          <div className="bg-blue-100 rounded-xl p-4 border border-purple-200">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              {t("week.average")}
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {monthTotal > 0
                ? formatHours(
                    monthTotal / colTotal.filter((sum) => sum > 0).length,
                  )
                : "0u"}
            </div>
          </div>
        </div>

        {/* Calendar Table */}
        <div className="overflow-hidden rounded-xl border-2 border-gray-200">
          <table className="table-auto border-collapse w-full">
            <thead>
              <tr className="text-center bg-blue-600 text-white">
                <th className="border-2 border-blue-400 w-10 h-10 text-xs font-bold">
                  {t("week.weekAbbr")}
                </th>
                <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">
                  {t("week.monday")}
                </th>
                <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">
                  {t("week.tuesday")}
                </th>
                <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">
                  {t("week.wednesday")}
                </th>
                <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">
                  {t("week.thursday")}
                </th>
                <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">
                  {t("week.friday")}
                </th>
                <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">
                  {t("week.saturday")}
                </th>
                <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">
                  {t("week.sunday")}
                </th>
                <th className="border-2 border-blue-400 w-12 h-10 text-xs font-bold">
                  {t("week.total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows}
              {totalRow}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-blue-100 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 text-sm">
            {t("week.legend")}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-green-300 rounded"></div>
              <span className="text-gray-600">{t("week.8PlusHours")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-yellow-300 rounded"></div>
              <span className="text-gray-600">{t("week.4To8Hours")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-gray-600">{t("week.1To4Hours")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-gray-600">{t("week.today")}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {monthTotal > 0 && (
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              {t("week.averagePerWeek", { hours: (monthTotal / 4).toFixed(1) })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
