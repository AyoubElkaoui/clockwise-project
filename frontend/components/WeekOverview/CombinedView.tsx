"use client";
import React from "react";
import { Dayjs } from "dayjs";
import DaysTable from "./DaysTable";
import MonthCalendar from "./MonthCalendar";
import { TimeEntry } from "./WeekOverview";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const currentMonth = currentWeek.startOf("month");

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Tabel (2/3 breedte op large screens) */}
      <div className="w-full lg:w-2/3">
        <DaysTable
          currentWeek={currentWeek}
          localEntries={timeEntries}
          onRegisterClick={onClickRegister}
          onUpdateLocalEntries={onUpdateLocalEntries}
        />
      </div>

      {/* Maandkalender (1/3 breedte op large screens) */}
      <div className="w-full lg:w-1/3">
        <MonthCalendar
          currentMonth={currentMonth}
          timeEntries={timeEntries}
          title={t("nav.overview")}
        />
      </div>
    </div>
  );
}
