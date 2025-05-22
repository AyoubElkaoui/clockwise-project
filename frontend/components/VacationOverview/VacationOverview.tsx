// components/VacationOverview/VacationOverview.tsx
"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { getVacationRequests } from "@/lib/api";

export interface VacationRequest {
    id: number;
    userId: number;
    startDate: string;
    endDate: string;
    hours: number;
    reason?: string;
    status: string;
    user?: {
        id: number;
        fullName: string;
    };
}

interface VacationBalance {
    totalHours: number;
    usedHours: number;
    remainingHours: number;
    year: number;
}

export default function VacationOverview() {
    const [vacations, setVacations] = useState<VacationRequest[]>([]);
    const [vacationBalance, setVacationBalance] = useState<VacationBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError("");

            try {
                const userId = Number(localStorage.getItem("userId"));
                if (!userId) {
                    setError("Gebruiker niet gevonden");
                    return;
                }

                // Haal vakantie aanvragen op
                console.log('🏖️ Fetching vacation requests...');
                const vacationData = await getVacationRequests();
                console.log('Vacation data received:', vacationData);

                // Filter alleen de vakantie aanvragen van de huidige gebruiker
                const userVacations = Array.isArray(vacationData)
                    ? vacationData.filter((vac: VacationRequest) => vac.userId === userId)
                    : [];

                console.log('User vacations filtered:', userVacations);
                setVacations(userVacations);

                // Haal vakantie balans op
                console.log('💰 Fetching vacation balance...');
                const balanceResponse = await fetch(`https://3df4-2a01-7c8-bb0b-19b-e916-96b-421e-1ad6.ngrok-free.app/api/vacation-requests/balance/${userId}`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        'Content-Type': 'application/json'
                    }
                });

                if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json();
                    console.log('Balance data received:', balanceData);
                    setVacationBalance(balanceData);
                } else {
                    console.warn('Could not fetch vacation balance, using defaults');
                    // Fallback balans als API niet beschikbaar is
                    setVacationBalance({
                        totalHours: 200,
                        usedHours: userVacations.filter(v => v.status === 'approved').reduce((sum, v) => sum + v.hours, 0),
                        remainingHours: 200 - userVacations.filter(v => v.status === 'approved').reduce((sum, v) => sum + v.hours, 0),
                        year: new Date().getFullYear()
                    });
                }
            } catch (err) {
                console.error('Error fetching vacation data:', err);
                setError("Fout bij ophalen van vakantie-gegevens");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="loading loading-spinner loading-lg"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card bg-base-100 shadow-xl p-6">
                <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    // Sorteer vakantie aanvragen op datum (meest recente eerst)
    const sortedVacations = [...vacations].sort((a, b) =>
        dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf()
    );

    return (
        <div className="space-y-6">
            {/* Vakantie Balans Card */}
            {vacationBalance && (
                <div className="card bg-gradient-to-r from-blue-50 to-green-50 shadow-xl border border-blue-200">
                    <div className="card-body">
                        <h2 className="card-title text-2xl mb-4 flex items-center">
                            🏖️ Jouw Vakantie Balans {vacationBalance.year}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-primary mb-2">{vacationBalance.totalHours}</div>
                                <div className="text-sm text-gray-600">Totaal uren per jaar</div>
                                <div className="text-xs text-gray-500">({vacationBalance.totalHours / 8} dagen)</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-warning mb-2">{vacationBalance.usedHours}</div>
                                <div className="text-sm text-gray-600">Gebruikt</div>
                                <div className="text-xs text-gray-500">({(vacationBalance.usedHours / 8).toFixed(1)} dagen)</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-success mb-2">{vacationBalance.remainingHours}</div>
                                <div className="text-sm text-gray-600">Resterend</div>
                                <div className="text-xs text-gray-500">({(vacationBalance.remainingHours / 8).toFixed(1)} dagen)</div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span>Gebruikt van totaal</span>
                                <span>{((vacationBalance.usedHours / vacationBalance.totalHours) * 100).toFixed(1)}%</span>
                            </div>
                            <progress
                                className="progress progress-warning w-full h-4"
                                value={vacationBalance.usedHours}
                                max={vacationBalance.totalHours}
                            ></progress>
                        </div>

                        {/* Status indicator */}
                        <div className="mt-4">
                            {vacationBalance.remainingHours > 40 ? (
                                <div className="alert alert-success">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Je hebt nog voldoende vakantie-uren over!</span>
                                </div>
                            ) : vacationBalance.remainingHours > 0 ? (
                                <div className="alert alert-warning">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.124 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <span>Let op: je hebt nog maar {vacationBalance.remainingHours} uur ({(vacationBalance.remainingHours / 8).toFixed(1)} dagen) over</span>
                                </div>
                            ) : (
                                <div className="alert alert-error">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Je hebt al je vakantie-uren opgebruikt voor dit jaar</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Vakantie Overzicht Card */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="card-title text-2xl">📅 Mijn Vakantie Aanvragen</h2>
                        <div className="text-sm text-gray-500">
                            Totaal: {vacations.length} aanvra{vacations.length === 1 ? 'ag' : 'gen'}
                        </div>
                    </div>

                    {vacations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🏖️</div>
                            <h3 className="text-xl font-semibold mb-2">Nog geen vakantie aangevraagd</h3>
                            <p className="text-gray-500 mb-4">Tijd om die welverdiende vakantie te plannen!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table w-full table-zebra">
                                <thead>
                                <tr>
                                    <th>Periode</th>
                                    <th>Dagen</th>
                                    <th>Uren</th>
                                    <th>Reden</th>
                                    <th>Status</th>
                                    <th>Aangevraagd</th>
                                </tr>
                                </thead>
                                <tbody>
                                {sortedVacations.map((vac) => {
                                    const startDate = dayjs(vac.startDate);
                                    const endDate = dayjs(vac.endDate);
                                    const days = Math.ceil(vac.hours / 8);
                                    const isUpcoming = startDate.isAfter(dayjs());
                                    const isCurrent = dayjs().isBetween(startDate, endDate, 'day', '[]');

                                    return (
                                        <tr key={vac.id} className={isCurrent ? 'bg-blue-50' : ''}>
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {startDate.format("DD MMM YYYY")} - {endDate.format("DD MMM YYYY")}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {isUpcoming ? `Over ${startDate.diff(dayjs(), 'day')} dagen` :
                                                            isCurrent ? 'Nu met vakantie! 🌴' :
                                                                `${dayjs().diff(endDate, 'day')} dagen geleden`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="font-medium">{days}</span>
                                                <span className="text-xs text-gray-500 ml-1">
                                                    dag{days !== 1 ? 'en' : ''}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="font-medium">{vac.hours}</span>
                                                <span className="text-xs text-gray-500 ml-1">uur</span>
                                            </td>
                                            <td>
                                                <div className="max-w-xs">
                                                    {vac.reason ? (
                                                        <span className="text-sm">{vac.reason}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Geen reden opgegeven</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${
                                                    vac.status === 'pending' ? 'badge-warning' :
                                                        vac.status === 'approved' ? 'badge-success' :
                                                            vac.status === 'rejected' ? 'badge-error' :
                                                                'badge-ghost'
                                                }`}>
                                                    {vac.status === 'pending' ? '⏳ In behandeling' :
                                                        vac.status === 'approved' ? '✅ Goedgekeurd' :
                                                            vac.status === 'rejected' ? '❌ Afgewezen' :
                                                                vac.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="text-xs text-gray-500">
                                                    {dayjs(vac.startDate).format("DD-MM-YYYY")}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Statistieken */}
                    {vacations.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                            <h3 className="font-semibold mb-4">📊 Vakantie Statistieken</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="stat bg-base-200 rounded-lg p-4">
                                    <div className="stat-title text-xs">Goedgekeurd</div>
                                    <div className="stat-value text-lg text-success">
                                        {vacations.filter(v => v.status === 'approved').length}
                                    </div>
                                </div>
                                <div className="stat bg-base-200 rounded-lg p-4">
                                    <div className="stat-title text-xs">In behandeling</div>
                                    <div className="stat-value text-lg text-warning">
                                        {vacations.filter(v => v.status === 'pending').length}
                                    </div>
                                </div>
                                <div className="stat bg-base-200 rounded-lg p-4">
                                    <div className="stat-title text-xs">Afgewezen</div>
                                    <div className="stat-value text-lg text-error">
                                        {vacations.filter(v => v.status === 'rejected').length}
                                    </div>
                                </div>
                                <div className="stat bg-base-200 rounded-lg p-4">
                                    <div className="stat-title text-xs">Komende vakantie</div>
                                    <div className="stat-value text-lg text-info">
                                        {vacations.filter(v =>
                                            v.status === 'approved' &&
                                            dayjs(v.startDate).isAfter(dayjs())
                                        ).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}