"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { TimeEntry } from "@/lib/types";
import { useTranslation } from "react-i18next";

interface Props {
  currentWeek: Dayjs;
  localEntries: TimeEntry[];
  onRegisterClick: (day: Dayjs) => void;
  onUpdateLocalEntries: (updatedEntries: TimeEntry[]) => void;
}

export default function DaysTable({
  currentWeek,
  localEntries,
  onRegisterClick,
  onUpdateLocalEntries,
}: Props) {
  const { t } = useTranslation();

  // 7 dagen
  const days = Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));

  // per dag => alle entries
  return (
    <div className="bg-base-100 shadow-lg rounded-lg">
      <table className="table w-full">
        <thead>
          <tr className="bg-base-200">
            <th>{t("week.day")}</th>
            <th>{t("week.date")}</th>
            <th>{t("week.input")}</th>
            <th className="text-right">{t("week.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const dayStr = day.format("YYYY-MM-DD");
            const entriesForDay = localEntries.filter(
              (e) =>
                e.localStatus !== "deleted" && e.startTime.startsWith(dayStr),
            );

            // Bepaal totale uren
            let totalHours = 0;
            entriesForDay.forEach((entry) => {
              const start = day.startOf("day");
              const end = day.endOf("day");
              const diffMin = end.diff(start, "minute") - entry.breakMinutes;
              if (diffMin > 0) totalHours += diffMin / 60;
            });

            return (
              <tr key={dayStr}>
                <td className="font-semibold">{day.format("dddd")}</td>
                <td>{day.format("D MMM YYYY")}</td>
                <td>
                  {entriesForDay.length === 0 ? (
                    <span className="text-gray-500 text-sm">
                      {t("week.noHoursRegistered")}
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {entriesForDay.map((entry) => (
                        <div
                          key={entry.id}
                          className="border rounded p-2 bg-base-200 flex flex-col gap-1"
                        >
                          <div className="text-sm font-semibold">
                            {day.format("HH:mm")} - {day.format("HH:mm")} |{" "}
                            {t("week.breakLabel")} {entry.breakMinutes} min
                          </div>
                          <div className="text-xs text-gray-600 flex gap-2 flex-wrap">
                            <span>
                              {t("week.km")} {entry.distanceKm ?? 0}
                            </span>
                            <span>
                              {t("week.travel")} €{entry.travelCosts ?? 0}
                            </span>
                            <span>
                              {t("week.expenses")} €{entry.expenses ?? 0}
                            </span>
                          </div>
                          <div className="text-xs italic">
                            {entry.notes || t("week.noNotes")}
                          </div>
                          {/* Voorbeeld van knoppen: */}
                          <div className="flex gap-2 mt-1">
                            <button
                              className="btn btn-xs btn-outline btn-error"
                              onClick={() => handleDelete(entry.id!)}
                            >
                              {t("common.delete")}
                            </button>
                            <button
                              className="btn btn-xs btn-outline"
                              onClick={() => handleEdit(entry)}
                            >
                              {t("common.edit")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="text-right">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onRegisterClick(day)}
                  >
                    {t("week.register")}
                  </button>
                  {/* Totaal daguren (optioneel) */}
                  {entriesForDay.length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      {t("week.total")} {totalHours.toFixed(2)}{" "}
                      {t("week.hoursUnit")}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Voorbeeld: implementaties van handleDelete/handleEdit
  function handleDelete(entryId: number) {
    const updated = localEntries.map((e) =>
      e.id === entryId ? { ...e, localStatus: "deleted" as const } : e,
    );
    onUpdateLocalEntries(updated);
  }

  function handleEdit(entry: TimeEntry) {
    // Nu gebruiken we de entry parameter door deze te loggen
    
    alert("Bewerken van entry nog niet geïmplementeerd in dit voorbeeld!");
  }
}
