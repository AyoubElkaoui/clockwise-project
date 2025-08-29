"use client";
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isBetween from "dayjs/plugin/isBetween";
import { useRouter } from "next/navigation";
import {
    CalendarDaysIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ClockIcon,
    CurrencyEuroIcon
} from "@heroicons/react/24/outline";

// Import your API functions
import {
    createVacationRequest,
    getVacationBalanceForUser,
    calculateWorkingDays
} from "@/lib/api";

// Voeg dayjs plugins toe
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

interface VacationBalance {
    totalHours: number;
    usedHours: number;
    pendingHours: number;
    remainingHours: number;
    year: number;
    totalDays: number;
    usedDays: number;
    pendingDays: number;
    remainingDays: number;
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
        fetchVacationBalance();
    }, []);

    const fetchVacationBalance = async () => {
        setLoadingBalance(true);
        try {
            const userId = Number(localStorage.getItem("userId")) || 1;
            const data = await getVacationBalanceForUser(userId);
            setVacationBalance(data);
        } catch (apiError) {
            console.warn('API not available, using fallback balance:', apiError);
            // Fallback balans
            setVacationBalance({
                totalHours: 200,
                usedHours: 40,
                pendingHours: 0,
                remainingHours: 160,
                year: new Date().getFullYear(),
                totalDays: 25,
                usedDays: 5,
                pendingDays: 0,
                remainingDays: 20
            });
        } finally {
            setLoadingBalance(false);
        }
    };

    // Valideer datums
    useEffect(() => {
        if (dayjs(endDate).isBefore(dayjs(startDate))) {
            setEndDate(dayjs(startDate).add(1, 'day').format("YYYY-MM-DD"));
        }
    }, [startDate, endDate]);

    const calculateWorkdays = () => {
        return calculateWorkingDays(startDate, endDate);
    };

    const calculateTotalDays = () => {
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        return end.diff(start, 'day') + 1; // Inclusief beide dagen
    };

    const workDays = calculateWorkdays();
    const totalDays = calculateTotalDays();
    const requestedHours = workDays * dailyHours;

    // Belangrijk: Check tegen remainingHours (dit houdt al rekening met pending requests)
    const canSubmit = vacationBalance ? requestedHours <= vacationBalance.remainingHours : false;

    const handleSubmit = async () => {
        setError("");

        // Basis validaties
        if (!startDate || !endDate || !reason.trim()) {
            setError("Vul alle velden in.");
            return;
        }

        if (dayjs(startDate).isBefore(dayjs(), 'day')) {
            setError("Je kunt geen vakantie in het verleden aanvragen.");
            return;
        }

        if (workDays === 0) {
            setError("De geselecteerde periode bevat geen werkdagen. Selecteer een periode met werkdagen.");
            return;
        }

        // Balance validatie - dit is nu de belangrijkste check
        if (!vacationBalance) {
            setError("Vakantie balans kon niet worden geladen. Probeer het opnieuw.");
            return;
        }

        if (requestedHours > vacationBalance.remainingHours) {
            setError(`Je hebt onvoldoende vakantie-uren. Je vraagt ${requestedHours} uur aan, maar hebt nog maar ${vacationBalance.remainingHours} uur beschikbaar (inclusief pending aanvragen).`);
            return;
        }

        const vacationData = {
            userId: Number(localStorage.getItem("userId")) || 1,
            startDate,
            endDate,
            hours: requestedHours,
            reason: reason.trim(),
            status: "pending",
        };

        setIsSubmitting(true);

        try {
            const result = await createVacationRequest(vacationData);
            console.log('Vacation request result:', result);

            // Refresh balance na succesvol aanmaken
            await fetchVacationBalance();

            // Show success message and redirect
            alert(`Vakantieaanvraag succesvol ingediend!\n\nPeriode: ${dayjs(startDate).format('DD-MM-YYYY')} tot ${dayjs(endDate).format('DD-MM-YYYY')}\nWerkdagen: ${workDays}\nUren: ${requestedHours}\n\nStatus: In behandeling\nResterende uren: ${vacationBalance.remainingHours - requestedHours} uur`);
            router.push("/vacation");
        } catch (err: any) {
            console.error('Vacation request error:', err);

            // Handle different error types
            if (err.response?.data) {
                setError(err.response.data);
            } else if (err.message) {
                setError(err.message);
            } else {
                setError("Fout bij het indienen van de vakantie-aanvraag");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingBalance) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Vakantie balans laden...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
            </div>

            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-elmar text-white rounded-2xl p-8 shadow-elmar-card mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => router.push("/vacation")}
                                    className="btn btn-ghost text-white hover:bg-white/20 rounded-xl"
                                >
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                                <CalendarDaysIcon className="w-8 h-8" />
                                <h1 className="text-4xl font-bold">Vakantie Aanvragen</h1>
                            </div>
                            <p className="text-blue-100 text-lg">Plan je welverdiende vakantie</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="xl:col-span-2">
                        <div className="card bg-white/80 backdrop-blur-lg shadow-elmar-card border border-white/50 rounded-2xl overflow-hidden">
                            <div className="card-body p-8">
                                {/* Vakantie Balans - VERBETERD */}
                                {vacationBalance && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-8 border border-green-200">
                                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <CurrencyEuroIcon className="w-6 h-6 text-green-600" />
                                            Jouw Vakantie Balans {vacationBalance.year}
                                        </h3>
                                        <div className="grid grid-cols-4 gap-4 mb-6">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600 mb-2">{vacationBalance.totalHours}u</div>
                                                <div className="text-sm text-gray-600">Totaal</div>
                                                <div className="text-xs text-gray-500">({vacationBalance.totalDays} dagen)</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600 mb-2">{vacationBalance.usedHours}u</div>
                                                <div className="text-sm text-gray-600">Gebruikt</div>
                                                <div className="text-xs text-gray-500">({vacationBalance.usedDays} dagen)</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-orange-600 mb-2">{vacationBalance.pendingHours}u</div>
                                                <div className="text-sm text-gray-600">In behandeling</div>
                                                <div className="text-xs text-gray-500">({vacationBalance.pendingDays} dagen)</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-purple-600 mb-2">{vacationBalance.remainingHours}u</div>
                                                <div className="text-sm text-gray-600">Beschikbaar</div>
                                                <div className="text-xs text-gray-500">({vacationBalance.remainingDays} dagen)</div>
                                            </div>
                                        </div>

                                        {/* Progress bar - VERBETERD */}
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="font-semibold text-gray-700">Vakantie-uren status</span>
                                                <span className="font-semibold text-gray-700">
                                                    {(((vacationBalance.usedHours + vacationBalance.pendingHours) / vacationBalance.totalHours) * 100).toFixed(1)}% gebruikt/gereserveerd
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-4">
                                                <div className="flex h-4 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-green-500"
                                                        style={{ width: `${(vacationBalance.usedHours / vacationBalance.totalHours) * 100}%` }}
                                                        title={`Gebruikt: ${vacationBalance.usedHours}u`}
                                                    ></div>
                                                    <div
                                                        className="bg-orange-500"
                                                        style={{ width: `${(vacationBalance.pendingHours / vacationBalance.totalHours) * 100}%` }}
                                                        title={`In behandeling: ${vacationBalance.pendingHours}u`}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-xs mt-1">
                                                <span className="text-green-600">✅ Gebruikt ({vacationBalance.usedHours}u)</span>
                                                <span className="text-orange-600">⏳ In behandeling ({vacationBalance.pendingHours}u)</span>
                                                <span className="text-purple-600">🟢 Beschikbaar ({vacationBalance.remainingHours}u)</span>
                                            </div>
                                        </div>

                                        {/* Waarschuwing als weinig uren over */}
                                        {vacationBalance.remainingHours < 40 && (
                                            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                                                    <span className="text-yellow-800 font-medium">
                                                        Let op: Je hebt nog maar {vacationBalance.remainingHours} uur ({vacationBalance.remainingDays} dagen) beschikbaar.
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Date Selection */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <CalendarDaysIcon className="w-6 h-6 text-blue-600" />
                                        Selecteer Periode
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">📅 Startdatum</span>
                                            </label>
                                            <input
                                                type="date"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                min={dayjs().format("YYYY-MM-DD")}
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">📅 Einddatum</span>
                                            </label>
                                            <input
                                                type="date"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                min={startDate}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 mb-8 border border-purple-200">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <InformationCircleIcon className="w-6 h-6 text-purple-600" />
                                        Reden voor Vakantie
                                    </h3>

                                    <div className="form-control">
                                        <textarea
                                            className="textarea textarea-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl h-32"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Beschrijf kort de reden voor je vakantie (bijv. familiebezoek, zomervakantie, etc.)"
                                            maxLength={500}
                                        />
                                        <label className="label">
                                            <span className="label-text-alt text-gray-500">{reason.length}/500 karakters</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Error Messages */}
                                {error && (
                                    <div className="alert alert-error rounded-xl mb-6 animate-slide-up">
                                        <ExclamationTriangleIcon className="w-6 h-6" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Validation Messages - VERBETERD */}
                                {workDays === 0 && startDate && endDate && (
                                    <div className="alert alert-warning rounded-xl mb-6">
                                        <ExclamationTriangleIcon className="w-6 h-6" />
                                        <span>De geselecteerde periode valt alleen in het weekend. Selecteer een periode met werkdagen.</span>
                                    </div>
                                )}

                                {!canSubmit && requestedHours > 0 && vacationBalance && workDays > 0 && (
                                    <div className="alert alert-error rounded-xl mb-6">
                                        <ExclamationTriangleIcon className="w-6 h-6" />
                                        <div>
                                            <div className="font-bold">Onvoldoende vakantie-uren!</div>
                                            <div className="text-sm">
                                                Je vraagt {requestedHours} uur aan, maar hebt nog maar {vacationBalance.remainingHours} uur beschikbaar
                                                (inclusief {vacationBalance.pendingHours} uur in behandeling).
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {canSubmit && requestedHours > 0 && workDays > 0 && (
                                    <div className="alert alert-success rounded-xl mb-6">
                                        <CheckCircleIcon className="w-6 h-6" />
                                        <div>
                                            <div className="font-bold">Perfect! Je kunt deze vakantie aanvragen.</div>
                                            <div className="text-sm">
                                                Na goedkeuring heb je nog {vacationBalance?.remainingHours! - requestedHours} uur ({(vacationBalance?.remainingHours! - requestedHours) / 8} dagen) over.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    className={`btn w-full py-4 h-auto min-h-0 rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none ${
                                        canSubmit && workDays > 0
                                            ? 'bg-gradient-elmar border-0 text-white hover:shadow-elmar-hover'
                                            : 'btn-disabled'
                                    }`}
                                    onClick={handleSubmit}
                                    disabled={!canSubmit || workDays === 0 || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-2">
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Aanvraag indienen...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <CalendarDaysIcon className="w-6 h-6" />
                                            Vakantie Aanvragen ({requestedHours} uur)
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Calculation Preview */}
                    <div className="xl:col-span-1 space-y-6">
                        <div className="card bg-white/80 backdrop-blur-lg shadow-elmar-card border border-white/50 rounded-2xl">
                            <div className="card-body p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <ClockIcon className="w-6 h-6 text-elmar-primary" />
                                    Berekening
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                                        <span className="text-sm font-medium text-gray-700">Periode:</span>
                                        <span className="font-semibold text-gray-800">
                                            {dayjs(startDate).format('DD-MM')} t/m {dayjs(endDate).format('DD-MM')}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                                        <span className="text-sm font-medium text-gray-700">Totale dagen:</span>
                                        <span className="font-semibold text-gray-800">{totalDays} dag{totalDays !== 1 ? 'en' : ''}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
                                        <span className="text-sm font-medium text-gray-700">Werkdagen:</span>
                                        <span className="font-semibold text-gray-800">{workDays} dag{workDays !== 1 ? 'en' : ''}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                                        <span className="text-sm font-medium text-gray-700">Weekenddagen:</span>
                                        <span className="font-semibold text-gray-800">{totalDays - workDays} dag{(totalDays - workDays) !== 1 ? 'en' : ''}</span>
                                    </div>

                                    <hr className="my-4" />

                                    <div className="flex justify-between items-center p-4 bg-gradient-elmar text-white rounded-xl">
                                        <span className="font-bold">Uren benodigd:</span>
                                        <span className="text-xl font-bold">{requestedHours} uur</span>
                                    </div>

                                    {vacationBalance && (
                                        <>
                                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                                                <span className="text-sm font-medium text-gray-700">Huidige beschikbaar:</span>
                                                <span className="font-bold text-blue-600">{vacationBalance.remainingHours} uur</span>
                                            </div>

                                            <div className={`flex justify-between items-center p-3 rounded-xl ${
                                                canSubmit ? 'bg-green-50' : 'bg-red-50'
                                            }`}>
                                                <span className="text-sm font-medium text-gray-700">Na deze aanvraag:</span>
                                                <span className={`font-bold ${canSubmit ? 'text-green-600' : 'text-red-600'}`}>
                                                    {vacationBalance.remainingHours - requestedHours} uur
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="card bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl">
                            <div className="card-body p-6">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <InformationCircleIcon className="w-5 h-5 text-yellow-600" />
                                    Belangrijk om te weten
                                </h4>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>• <strong>Pending requests</strong> zijn al afgetrokken van je beschikbare uren</p>
                                    <p>• Je kunt niet meer uren aanvragen dan je beschikbaar hebt</p>
                                    <p>• Bij afwijzing krijg je de uren automatisch terug</p>
                                    <p>• Alleen werkdagen (ma-vr) tellen mee voor vakantie-uren</p>
                                    <p>• Je aanvraag moet goedgekeurd worden door je manager</p>
                                    <p>• Je krijgt een notificatie zodra je aanvraag is behandeld</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
