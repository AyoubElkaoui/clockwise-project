"use client";
import {JSX, useEffect, useState} from "react";
import { getCompanies, getProjectGroups, getProjects, registerTimeEntry } from "@/lib/api";
import { Company, ProjectGroup, Project } from "@/lib/types";
import {
    ClockIcon,
    BuildingOfficeIcon,
    FolderIcon,
    CalendarDaysIcon,
    CurrencyEuroIcon,
    DocumentTextIcon,
    CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function RegisterTime(): JSX.Element {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(null);
    const [selectedProject, setSelectedProject] = useState<number | null>(null);

    const [startTime, setStartTime] = useState<string>("");
    const [endTime, setEndTime] = useState<string>("");
    const [breakMinutes, setBreakMinutes] = useState<number>(0);
    const [distanceKm, setDistanceKm] = useState<number>(0);
    const [travelCosts, setTravelCosts] = useState<number>(0);
    const [expenses, setExpenses] = useState<number>(0);
    const [notes, setNotes] = useState<string>("");

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [isSuccess, setIsSuccess] = useState<boolean>(false);

    useEffect(() => {
        getCompanies().then(setCompanies).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedCompany !== null) {
            getProjectGroups(selectedCompany).then(setProjectGroups).catch(console.error);
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (selectedProjectGroup !== null) {
            getProjects(selectedProjectGroup).then(setProjects).catch(console.error);
        }
    }, [selectedProjectGroup]);

    const calculateHours = (): number => {
        if (!startTime || !endTime) return 0;

        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const diffMs = end.getTime() - start.getTime();
        const diffMin = diffMs / (1000 * 60) - breakMinutes;

        return Math.max(0, diffMin / 60);
    };

    const handleSubmit = async (): Promise<void> => {
        if (!selectedProject) {
            setMessage("Selecteer een project");
            setIsSuccess(false);
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        if (!startTime || !endTime) {
            setMessage("Vul start- en eindtijd in");
            setIsSuccess(false);
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        setIsLoading(true);
        setMessage("");

        const userId = Number(localStorage.getItem("userId"));
        if (!userId) {
            setMessage("Gebruiker niet gevonden. Log opnieuw in.");
            setIsLoading(false);
            return;
        }

        const data = {
            userId,
            projectId: selectedProject,
            startTime: `2000-01-01T${startTime}:00`,
            endTime: `2000-01-01T${endTime}:00`,
            breakMinutes,
            distanceKm,
            travelCosts,
            expenses,
            notes,
        };

        try {
            await registerTimeEntry(data);
            setMessage("Uren succesvol opgeslagen!");
            setIsSuccess(true);

            // Reset form
            setSelectedCompany(null);
            setSelectedProjectGroup(null);
            setSelectedProject(null);
            setStartTime("");
            setEndTime("");
            setBreakMinutes(0);
            setDistanceKm(0);
            setTravelCosts(0);
            setExpenses(0);
            setNotes("");
        } catch (error) {
            console.error(error);
            setMessage("Fout bij opslaan van uren");
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(""), 5000);
        }
    };

    const totalHours = calculateHours();

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header Section */}
            <div className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <ClockIcon className="w-8 h-8" />
                    <h1 className="text-4xl font-bold">Uren Registreren</h1>
                </div>
                <p className="text-blue-100 text-lg">Registreer je werkuren voor vandaag</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="xl:col-span-2">
                    <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
                        <div className="card-body p-8">
                            {/* Project Selection */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <FolderIcon className="w-6 h-6" />
                                    Project Selectie
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                                                <BuildingOfficeIcon className="w-4 h-4" />
                                                Bedrijf
                                            </span>
                                        </label>
                                        <select
                                            value={selectedCompany ?? ""}
                                            onChange={(e) => setSelectedCompany(Number(e.target.value))}
                                            className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                        >
                                            <option value="">Selecteer een bedrijf</option>
                                            {companies.map((comp: Company) => (
                                                <option key={comp.id} value={comp.id}>
                                                    {comp.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedCompany && (
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Projectgroep</span>
                                            </label>
                                            <select
                                                value={selectedProjectGroup ?? ""}
                                                onChange={(e) => setSelectedProjectGroup(Number(e.target.value))}
                                                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            >
                                                <option value="">Selecteer een projectgroep</option>
                                                {projectGroups.map((pg: ProjectGroup) => (
                                                    <option key={pg.id} value={pg.id}>
                                                        {pg.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {selectedProjectGroup && (
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Project</span>
                                            </label>
                                            <select
                                                value={selectedProject ?? ""}
                                                onChange={(e) => setSelectedProject(Number(e.target.value))}
                                                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            >
                                                <option value="">Selecteer een project</option>
                                                {projects.map((p: Project) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Time Registration */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <CalendarDaysIcon className="w-6 h-6" />
                                    Tijd Registratie
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700">Tijd Starttijd</span>
                                        </label>
                                        <input
                                            type="time"
                                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700">Tijd Eindtijd</span>
                                        </label>
                                        <input
                                            type="time"
                                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700">☕ Pauze (min)</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={breakMinutes}
                                            onChange={(e) => setBreakMinutes(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <CurrencyEuroIcon className="w-6 h-6" />
                                    Aanvullende Gegevens
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700">🚗 Afstand (km)</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={distanceKm}
                                            onChange={(e) => setDistanceKm(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700">💰 Reiskosten (€)</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={travelCosts}
                                            onChange={(e) => setTravelCosts(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700">🧾 Onkosten (€)</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={expenses}
                                            onChange={(e) => setExpenses(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                                            <DocumentTextIcon className="w-4 h-4" />
                                            Opmerkingen
                                        </span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl h-24"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Eventuele opmerkingen over je werkdag..."
                                    />
                                </div>
                            </div>

                            {/* Message */}
                            {message && (
                                <div className={`alert ${isSuccess ? 'alert-success' : 'alert-error'} rounded-xl mb-6 animate-slide-up`}>
                                    <span>{message}</span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedProject || isLoading}
                                className="btn bg-blue-600 border-0 text-white rounded-xl w-full py-4 h-auto min-h-0 hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Opslaan...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-6 h-6" />
                                        Uren Opslaan
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Sidebar */}
                <div className="xl:col-span-1">
                    <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden sticky top-6">
                        <div className="card-body p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Overzicht</h3>

                            <div className="space-y-4">
                                <div className="bg-blue-100 rounded-xl p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-600">Totaal Uren:</span>
                                        <span className="text-2xl font-bold text-elmar-primary">
                                            {totalHours.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-blue-100 rounded-xl p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-600">Totaal Kosten:</span>
                                        <span className="text-xl font-bold text-green-600">
                                            €{(travelCosts + expenses).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-blue-100 rounded-xl p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-600">Afstand:</span>
                                        <span className="text-xl font-bold text-purple-600">
                                            {distanceKm} km
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="font-semibold text-gray-700 mb-3">Tips</h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p>• Vergeet niet je pauzetijd in te vullen</p>
                                    <p>• Reiskosten kunnen je netto loon verhogen</p>
                                    <p>• Bewaar bonnetjes voor onkosten</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}