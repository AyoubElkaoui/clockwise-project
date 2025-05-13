// components/Sidebar.tsx
"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import dayjs, { Dayjs } from "dayjs";
import MonthCalendar from "@/components/WeekOverview/MonthCalendar";
import NotificationFeed from "@/components/NotificationFeed";

interface SidebarProps {
    currentMonth: string | Dayjs;
    timeEntries: any[];
    className?: string;
}

export default function Sidebar({
                                    currentMonth,
                                    timeEntries,
                                    className = "",
                                }: SidebarProps) {
    const usedMonth = typeof currentMonth === 'string'
        ? dayjs(currentMonth)
        : (dayjs.isDayjs(currentMonth) ? currentMonth : dayjs().startOf("month"));

    // Gebruik state voor gebruikersgegevens
    const [userName, setUserName] = useState("Gebruiker");
    const [userInitials, setUserInitials] = useState("");

    // Haal gebruikersgegevens op na client-side rendering
    useEffect(() => {
        const firstName = localStorage.getItem('firstName') || '';
        const lastName = localStorage.getItem('lastName') || '';
        const fullName = `${firstName} ${lastName}`.trim();
        setUserName(fullName || "Gebruiker");
        setUserInitials(fullName.split(' ').map(n => n[0] || '').join(''));
    }, []);

    return (
        <aside className={`bg-base-300 text-base-content p-4 w-1/6 flex flex-col gap-4 h-[calc(100vh-64px)] overflow-y-auto border-r border-base-200`}>
            {/*<div>*/}
            {/*    <Link href="/dashboard" className="text-2xl font-bold tracking-wide">*/}
            {/*        Elmar Services*/}
            {/*    </Link>*/}
            {/*    <p className="text-sm mt-1 text-gray-600">*/}
            {/*        International Building Solutions*/}
            {/*    </p>*/}
            {/*</div>*/}

            <nav className="flex flex-col gap-2">
                <Link href="/dashboard" className="btn btn-ghost justify-start">
                    Dashboard
                </Link>
                <Link href="/overview" className="btn btn-ghost justify-start">
                    Uren Overzicht
                </Link>
                <Link href="/vacation" className="btn btn-ghost justify-start">
                    Vakantie
                </Link>
                <Link href="/profile" className="btn btn-ghost justify-start">
                    Mijn Account
                </Link>
            </nav>

            <div>
                <MonthCalendar
                    currentMonth={usedMonth}
                    timeEntries={timeEntries}
                    title="Urenoverzicht"
                />
            </div>

            <NotificationFeed limit={5} />


            <div className="mt-5 pt-6 border-t border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                        <div className="bg-neutral-focus text-neutral-content rounded-full w-12">
                            <span>{userInitials}</span>
                        </div>
                    </div>
                    <div>
                        <p className="font-semibold">{userName}</p>
                        <p className="text-sm text-gray-500">
                            {localStorage.getItem('userRank') === 'admin' ? 'Administrator' : 'Medewerker'}
                        </p>
                    </div>
                </div>

                {/* Uitlogknop toevoegen */}
                <button
                    className="btn btn-error btn-sm w-full mt-4"
                    onClick={() => {
                        localStorage.clear();
                        document.cookie = "userId=; path=/; max-age=0";
                        document.cookie = "userRank=; path=/; max-age=0";
                        window.location.href = "/login";
                    }}
                >
                    Uitloggen
                </button>
            </div>
        </aside>

    );
}