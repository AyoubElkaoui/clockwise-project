// components/VacationOverview/VacationEntryForm.tsx
"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isBetween from "dayjs/plugin/isBetween";
import { useRouter } from "next/navigation";
import { registerVacationRequest } from "@/lib/api";

// Voeg dayjs plugins toe
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

interface VacationBalance {
    totalHours: number;
    usedHours: number;
    remainingHours: number;
    year: number;
}

export default function VacationEntryForm() {
    const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState(dayjs().add(1, "day").format("YYYY-MM-DD"));
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vacationBalance, setVacationBalance] = useState<VacationBalance | null>(null);
    const [loadingBalance, setLoadingBalance] = useState(true);
    const router = useRouter();

    const dailyHours = 8; // standaard werkuren per dag

    useEffect(() => {
        // Haal vakantie balans op
        const fetchVacationBalance = async () => {
            try {
                const userId = Number(localStorage.getItem("userId")) || 0;
                const response = await fetch(`https://3df4-2a01-7c8-bb0b-19b-e916-96b-421e-1ad6.ngrok-free.app/api/vacation-requests/balance/${userId}`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setVacationBalance(data);
                } else {
                    console.error('Failed to fetch vacation balance');
                    // Fallback balans
                    setVacationBalance({
                        totalHours: 200,
                        usedHours: 0,
                        remainingHours: 200,
                        year: new Date().getFullYear()
                    });
                }
            } catch (error) {
                console.error('Error fetching vacation balance:', error);
                // Fallback balans
                setVacationBalance({
                    totalHours: 200,
                    usedHours: 0,
                    remainingHours: 200,
                    year: new Date().getFullYear()
                });
            } finally {
                setLoadingBalance(false);
            }
        };

        fetchVacationBalance();
    }, []);

    // Valideer datums
    useEffect(() => {
        if (dayjs(endDate).isBefore(dayjs(startDate))) {
            setEndDate(dayjs(startDate).add(1, 'day').format("YYYY-MM-DD"));
        }
    }, [startDate, endDate]);

    const calculateWorkdays = () => {
        const start = dayjs(startDate);
        const end = dayjs(endDate);

        let workDays = 0;
        let currentDay = start;

        while (currentDay.isSameOrBefore(end)) {
            // Tel alleen werkdagen (ma-vr)
            const dayOfWeek = currentDay.day();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = zondag, 6 = zaterdag
                workDays++;
            }
            currentDay = currentDay.add(1, 'day');
        }

        return workDays;
    };

    const calculateTotalDays = () => {
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        return end.diff(start, 'day') + 1; // Inclusief beide dagen
    };

    const workDays = calculateWorkdays();
    const totalDays = calculateTotalDays();
    const requestedHours = workDays * dailyHours;
    const canSubmit = vacationBalance ? requestedHours <= vacationBalance.remainingHours : false;

    const handleSubmit = async () => {
        if (!startDate || !endDate || !reason.trim()) {
            setError("Vul alle velden in.");
            return;
        }

        if (dayjs(startDate).isBefore(dayjs(), 'day')) {
            setError("Je kunt geen vakantie in het verleden aanvragen.");
            return;
        }

        if (!canSubmit) {
            setError(`Je hebt onvoldoende vakantie-uren. Je vraagt ${requestedHours} uur aan, maar hebt nog maar ${vacationBalance?.remainingHours || 0} uur over.`);
            return;
        }

        if (workDays === 0) {
            setError("De geselecteerde periode bevat geen werkdagen. Selecteer een periode met werkdagen.");
            return;
        }

        const vacationData = {
            userId: Number(localStorage.getItem("userId")) || 0,
            startDate,
            endDate,
            hours: requestedHours,
            reason,
            status: "pending",
        };

        setIsSubmitting(true);
        setError("");

        try {
            await registerVacationRequest(vacationData);
            router.push("/vacation");
        } catch (err: any) {
            console.error(err);
            if (err.response?.data) {
                setError(err.response.data);
            } else {
                setError("Fout bij het indienen van de vakantie-aanvraag");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingBalance) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-base-200">
                <div className="loading loading-spinner loading-lg"></div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200 p-4">
            <div className="card w-full max-w-2xl bg-base-100 shadow-xl p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="card-title text-3xl font-bold">🏖️ Vakantie Aanvragen</h1>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => router.push("/vacation")}
                    >
                        ← Terug
                    </button>
                </div>

                {/* Vakantie Balans */}
                {vacationBalance && (
                    <div className="card bg-gradient-to-r from-blue-50 to-green-50 p-6 mb-6 border border-blue-200">
                        <h3 className="font-bold mb-4 text-lg">💰 Jouw Vakantie Balans {vacationBalance.year}</h3>
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div>
                                <div className="text-2xl font-bold text-primary">{vacationBalance.totalHours}</div>
                                <div className="text-xs text-gray-600">Totaal uren</div>
                                <div className="text-xs text-gray-500">({vacationBalance.totalHours / 8} dagen)</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-warning">{vacationBalance.usedHours}</div>
                                <div className="text-xs text-gray-600">Gebruikt</div>
                                <div className="text-xs text-gray-500">({vacationBalance.usedHours / 8} dagen)</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-success">{vacationBalance.remainingHours}</div>
                                <div className="text-xs text-gray-600">Resterend</div>
                                <div className="text-xs text-gray-500">({vacationBalance.remainingHours / 8} dagen)</div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Gebruikt</span>
                                <span>{((vacationBalance.usedHours / vacationBalance.totalHours) * 100).toFixed(1)}%</span>
                            </div>
                            <progress
                                className="progress progress-warning w-full h-3"
                                value={vacationBalance.usedHours}
                                max={vacationBalance.totalHours}
                            ></progress>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Linker kolom - Datums */}
                    <div className="space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold">📅 Startdatum</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                min={dayjs().format("YYYY-MM-DD")} // Geen vakantie in het verleden
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold">📅 Einddatum</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate} // Einddatum moet na startdatum zijn
                            />
                        </div>
                    </div>

                    {/* Rechter kolom - Berekening */}
                    <div className="card bg-base-200 p-4">
                        <h4 className="font-bold mb-3">📊 Berekening</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Periode:</span>
                                <span className="font-medium">
                                    {dayjs(startDate).format('DD-MM')} t/m {dayjs(endDate).format('DD-MM')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Totale dagen:</span>
                                <span className="font-medium">{totalDays} dag{totalDays !== 1 ? 'en' : ''}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Werkdagen:</span>
                                <span className="font-medium">{workDays} dag{workDays !== 1 ? 'en' : ''}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Weekenddagen:</span>
                                <span className="font-medium">{totalDays - workDays} dag{(totalDays - workDays) !== 1 ? 'en' : ''}</span>
                            </div>
                            <hr className="my-2" />
                            <div className="flex justify-between text-lg">
                                <span className="font-bold">Uren benodigd:</span>
                                <span className="font-bold text-primary">{requestedHours} uur</span>
                            </div>
                            {vacationBalance && (
                                <div className="flex justify-between">
                                    <span>Resterend na aanvraag:</span>
                                    <span className={`font-bold ${canSubmit ? 'text-success' : 'text-error'}`}>
                                        {vacationBalance.remainingHours - requestedHours} uur
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reden */}
                <div className="form-control mt-6">
                    <label className="label">
                        <span className="label-text font-semibold">📝 Reden voor vakantie</span>
                    </label>
                    <textarea
                        className="textarea textarea-bordered w-full h-24"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Beschrijf kort de reden voor je vakantie (bijv. familiebezoek, zomervakantie, etc.)"
                        maxLength={500}
                    />
                    <label className="label">
                        <span className="label-text-alt">{reason.length}/500 karakters</span>
                    </label>
                </div>

                {/* Waarschuwingen */}
                {workDays === 0 && startDate && endDate && (
                    <div className="alert alert-warning mt-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.124 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span>De geselecteerde periode valt alleen in het weekend. Selecteer een periode met werkdagen.</span>
                    </div>
                )}

                {!canSubmit && requestedHours > 0 && vacationBalance && workDays > 0 && (
                    <div className="alert alert-error mt-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Je hebt niet genoeg vakantie-uren voor deze aanvraag!</span>
                    </div>
                )}

                {canSubmit && requestedHours > 0 && workDays > 0 && (
                    <div className="alert alert-success mt-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Perfect! Je kunt deze vakantie aanvragen.</span>
                    </div>
                )}

                {/* Submit button */}
                <div className="mt-6">
                    <button
                        className={`btn w-full ${canSubmit && workDays > 0 ? 'btn-primary' : 'btn-disabled'}`}
                        onClick={handleSubmit}
                        disabled={!canSubmit || workDays === 0 || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Aanvraag indienen...
                            </>
                        ) : (
                            <>
                                🏖️ Vakantie Aanvragen ({requestedHours} uur)
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="alert alert-error mt-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* Info box */}
                <div className="mt-6 p-4 bg-info bg-opacity-10 rounded-lg border border-info border-opacity-20">
                    <h4 className="font-bold text-info mb-2">ℹ️ Belangrijk om te weten:</h4>
                    <ul className="text-sm space-y-1 text-info-content">
                        <li>• Alleen werkdagen (maandag t/m vrijdag) tellen mee voor vakantie-uren</li>
                        <li>• Weekenddagen kosten geen vakantie-uren</li>
                        <li>• Je aanvraag moet goedgekeurd worden door je manager</li>
                        <li>• Je krijgt een notificatie zodra je aanvraag is behandeld</li>
                        <li>• Je hebt {vacationBalance?.totalHours || 200} vakantie-uren per jaar</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}