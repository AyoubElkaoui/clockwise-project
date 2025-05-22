"use client";
import WeekOverview from "@/components/WeekOverview/WeekOverview";
import {JSX} from "react";

export default function Dashboard(): JSX.Element {
    return (
        <div className="animate-fade-in">
            <WeekOverview />
        </div>
    );
}