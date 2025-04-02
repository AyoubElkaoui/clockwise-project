"use client";
import React from "react";

interface Notification {
    id: number;
    date: string;    // "YYYY-MM-DD" of "10-03-2025"
    message: string; // De beschrijving
}

export default function NotificationFeed({ notifications }: { notifications: Notification[] }) {
    return (
        <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
                <h2 className="text-lg font-bold mb-2">Activiteiten</h2>
                {notifications.length === 0 ? (
                    <p className="text-gray-500">Geen recente activiteiten</p>
                ) : (
                    <ul className="space-y-2">
                        {notifications.map((notif) => (
                            <li key={notif.id} className="p-2 bg-base-200 rounded">
                                <span className="font-semibold">{notif.date}:</span> {notif.message}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
