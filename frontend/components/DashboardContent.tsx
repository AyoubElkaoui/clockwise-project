"use client";
import {JSX, useEffect, useState} from "react";
import WeekOverview from "@/components/WeekOverview/WeekOverview";
import { HomeIcon, ClockIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";

export default function DashboardContent(): JSX.Element {
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [userRank, setUserRank] = useState<string>("");

    useEffect(() => {
        const fName = localStorage.getItem("firstName") || "";
        const lName = localStorage.getItem("lastName") || "";
        const rank = localStorage.getItem("userRank") || "";

        setFirstName(fName);
        setLastName(lName);
        setUserRank(rank);
    }, []);

    const getRankBadge = (): JSX.Element => {
        switch (userRank) {
            case "admin":
                return <span className="badge badge-error">Administrator</span>;
            case "manager":
                return <span className="badge badge-warning">Manager</span>;
            default:
                return <span className="badge badge-primary">Medewerker</span>;
        }
    };

    const getWelcomeMessage = (): string => {
        const hour = new Date().getHours();
        if (hour < 12) return "Goedemorgen";
        if (hour < 18) return "Goedemiddag";
        return "Goedenavond";
    };

    return (
        <div className="space-y-8">
            {/* Enhanced Welcome Header */}
            <div className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <HomeIcon className="w-8 h-8" />
                            <h1 className="text-4xl font-bold">Dashboard</h1>
                        </div>
                        <p className="text-blue-100 text-xl mb-2">
                            {getWelcomeMessage()}, {firstName} {lastName}!
                        </p>
                        <div className="flex items-center gap-3">
                            <span className="text-blue-200">Welkom terug op je dashboard</span>
                            {getRankBadge()}
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                            <ClockIcon className="w-16 h-16 text-white opacity-80" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-xl">
                            <ClockIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Deze Week</p>
                            <p className="text-2xl font-bold text-gray-800">32.5 uur</p>
                            <p className="text-xs text-green-600 font-medium">+2.5 vs vorige week</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="bg-green-600 p-3 rounded-xl">
                            <CalendarDaysIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Deze Maand</p>
                            <p className="text-2xl font-bold text-gray-800">142 uur</p>
                            <p className="text-xs text-blue-600 font-medium">18 werkdagen</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-600 p-3 rounded-xl">
                            <HomeIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Vakantie</p>
                            <p className="text-2xl font-bold text-gray-800">18 dagen</p>
                            <p className="text-xs text-orange-600 font-medium">Over van 25</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <WeekOverview />
        </div>
    );
}