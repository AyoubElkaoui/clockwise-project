// components/WeekOverview/WeekHeader.tsx
"use client";
import React from "react";
import { Dayjs } from "dayjs";
import { ArrowLeftIcon, ArrowRightIcon, HomeIcon } from "@heroicons/react/24/outline";

interface Props {
    currentWeek: Dayjs;
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onToday: () => void;
}

export default function WeekHeader({ currentWeek, onPrevWeek, onNextWeek, onToday }: Props) {
    const weekNummer = currentWeek.isoWeek();
    const maandNaam = currentWeek.format("MMMM");
    const jaar = currentWeek.format("YYYY");
    const startVanWeek = currentWeek;
    const eindVanWeek = currentWeek.add(6, "day");

    return (
        <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Kalenderoverzicht</h1>
            <p className="text-xl">
                {maandNaam} {jaar}
            </p>
            <p className="text-sm text-gray-600 mb-4">
                Week {weekNummer} ({startVanWeek.format("D MMM")} - {eindVanWeek.format("D MMM")})
            </p>
            <div className="flex gap-2">
                <button className="btn btn-outline btn-sm" onClick={onPrevWeek}>
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Vorige</span>
                </button>
                <button className="btn btn-outline btn-sm" onClick={onToday}>
                    <HomeIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Vandaag</span>
                </button>
                <button className="btn btn-outline btn-sm" onClick={onNextWeek}>
                    <ArrowRightIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Volgende</span>
                </button>
            </div>
        </div>
    );
}
