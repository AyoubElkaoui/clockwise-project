// components/Sidebar.tsx
"use client";
import React from "react";
import Link from "next/link";
import dayjs, { Dayjs } from "dayjs";
import MonthCalendar from "@/components/WeekOverview/MonthCalendar";
import NotificationFeed from "@/components/NotificationFeed";

interface SidebarProps {
    currentMonth: Dayjs;
    timeEntries: any[]; // Omdat je geen types gebruikt, gewoon any[]
    notifications?: any[];
}

export default function Sidebar({
                                    currentMonth,
                                    timeEntries,
                                    notifications = [],
                                }: SidebarProps) {
    const usedMonth = currentMonth && dayjs.isDayjs(currentMonth)
        ? currentMonth
        : dayjs().startOf("month");

    return (
        <aside className="bg-base-300 text-base-content p-6 w-100 flex flex-col gap-6">
            <div>
                <Link href="/dashboard" className="text-2xl font-bold tracking-wide">
                    Elmar Services
                </Link>
                <p className="text-sm mt-1 text-gray-600">
                    International Building Solutions
                </p>
            </div>

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

            <NotificationFeed notifications={notifications} />
        </aside>
    );
}
