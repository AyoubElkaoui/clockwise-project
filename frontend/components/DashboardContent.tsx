"use client";
import { useEffect, useState } from "react";
import WeekOverview from "@/components/WeekOverview/WeekOverview";

export default function DashboardContent() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    useEffect(() => {
        const fName = localStorage.getItem("firstName") || "";
        const lName = localStorage.getItem("lastName") || "";
        setFirstName(fName);
        setLastName(lName);
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p className="mb-6 text-xl">
                Welkom, {firstName} {lastName}
            </p>
            <WeekOverview />
        </div>
    );
}
