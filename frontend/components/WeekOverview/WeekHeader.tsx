"use client";
import React, {useEffect, useState} from "react";
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
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    useEffect(() => {
        // Haal usergegevens op uit localStorage
        const fName = localStorage.getItem("firstName");
        const lName = localStorage.getItem("lastName");
        if (fName) setFirstName(fName);
        if (lName) setLastName(lName);
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p className="mb-6 text-xl">
                Welkom, {firstName} {lastName}
            </p>
            <h2 className="text-2xl font-bold mb-1">Kalenderoverzicht</h2>
            <p className="text-lg font-semibold">
                {maandNaam} {jaar} — Week {weekNummer}
            </p>
            <p className="text-sm text-gray-500 mb-4">
                {startVanWeek.format("D MMM")} - {eindVanWeek.format("D MMM")}
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
