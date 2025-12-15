"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { ClockIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

export default function DaysTablePlaceholderRow({
  day,
  onRegisterClick,
}: {
  day: Dayjs;
  onRegisterClick: (day: Dayjs) => void;
}) {
  const { t } = useTranslation();
  return (
    <tr>
      <td className="font-semibold">{day.format("dddd")}</td>
      <td>{day.format("D MMM YYYY")}</td>
      <td colSpan={6}>
        <span className="text-sm text-gray-500">
          {t("week.noHoursRegistered")}
        </span>
      </td>
      <td></td>
      <td className="text-right">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onRegisterClick(day)}
        >
          <ClockIcon className="w-4 h-4 mr-1" />
          {t("week.register")}
        </button>
      </td>
    </tr>
  );
}
