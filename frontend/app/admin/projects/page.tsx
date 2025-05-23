"use client";
import { useState, useEffect } from "react";
import { getCompanies, getProjectGroups, createProject } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { Company, ProjectGroup } from "@/lib/types";
import {
    PlusIcon,
    BuildingOfficeIcon,
    FolderIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    LightBulbIcon
} from "@heroicons/react/24/outline";

export default function AdminProjectsPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(null);
    const [projectName, setProjectName] = useState("");

    // Toast
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const companiesData = await getCompanies();
                setCompanies(companiesData);
            } catch (error) {
                console.error("Error fetching companies:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (selectedCompany) {
            const fetchProjectGroups = async () => {
                try {
                    const data = await getProjectGroups(selectedCompany);
                    setProjectGroups(data);
                } catch (error) {
                    console.error("Error fetching project groups:", error);
                }
            };

            fetchProjectGroups();
        } else {
            setProjectGroups([]);
        }

        setSelectedProjectGroup(null);
    }, [selectedCompany]);

    const handleCreateProject = async () => {
        if (!selectedProjectGroup || !projectName.trim()) {
            setToastMessage("Vul alle velden in");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        try {
            await createProject({
                name: projectName,
                projectGroupId: selectedProjectGroup
            });

            setToastMessage("Project succesvol aangemaakt!");
            setToastType("success");

            // Reset form
            setProjectName("");
            setSelectedCompany(null);
            setSelectedProjectGroup(null);
        } catch (error) {
            console.error("Error creating project:", error);
            setToastMessage("Fout bij aanmaken project");
            setToastType("error");
        }

        setTimeout(() => setToastMessage(""), 3000);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Projectbeheer laden...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="container mx-auto p-6 space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="bg-gradient-elmar text-white rounded-2xl p-8 shadow-elmar-card">
                    <div className="flex items-center gap-3 mb-4">
                        <FolderIcon className="w-8 h-8" />
                        <h1 className="text-4xl font-bold">Projectbeheer</h1>
                    </div>
                    <p className="text-blue-100 text-lg">Maak nieuwe projecten aan en beheer de projectstructuur</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Formulier voor nieuw project */}
                    <div className="xl:col-span-2">
                        <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
                            <div className="card-body p-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <PlusIcon className="w-6 h-6 text-elmar-primary" />
                                    Nieuw Project Aanmaken
                                </h2>

                                <div className="space-y-6">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                                                <BuildingOfficeIcon className="w-4 h-4" />
                                                Bedrijf
                                            </span>
                                        </label>
                                        <select
                                            className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={selectedCompany ?? ""}
                                            onChange={(e) => setSelectedCompany(e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">Selecteer een bedrijf</option>
                                            {companies.map((company: Company) => (
                                                <option key={company.id} value={company.id}>
                                                    {company.name}
                                                </option>
                                            ))}
                                        </select>
                                        <label className="label">
                                            <span className="label-text-alt text-gray-500">Kies het bedrijf waarvoor dit project is</span>
                                        </label>
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700">Projectgroep</span>
                                        </label>
                                        <select
                                            className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={selectedProjectGroup ?? ""}
                                            onChange={(e) => setSelectedProjectGroup(e.target.value ? Number(e.target.value) : null)}
                                            disabled={!selectedCompany}
                                        >
                                            <option value="">Selecteer een projectgroep</option>
                                            {projectGroups.map((group: ProjectGroup) => (
                                                <option key={group.id} value={group.id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                        </select>
                                        <label className="label">
                                            <span className="label-text-alt text-gray-500">
                                                {!selectedCompany ? "Selecteer eerst een bedrijf" : "Kies de projectgroep"}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                                                <FolderIcon className="w-4 h-4" />
                                                Projectnaam
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            placeholder="Voer een duidelijke projectnaam in"
                                            maxLength={100}
                                        />
                                        <label className="label">
                                            <span className="label-text-alt text-gray-500">
                                                {projectName.length}/100 karakters
                                            </span>
                                        </label>
                                    </div>

                                    {/* Preview */}
                                    {selectedCompany && selectedProjectGroup && projectName.trim() && (
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                            <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                                <CheckCircleIcon className="w-5 h-5" />
                                                Preview
                                            </h4>
                                            <div className="text-sm text-green-700">
                                                <p><strong>Bedrijf:</strong> {companies.find(c => c.id === selectedCompany)?.name}</p>
                                                <p><strong>Projectgroep:</strong> {projectGroups.find(pg => pg.id === selectedProjectGroup)?.name}</p>
                                                <p><strong>Project:</strong> {projectName}</p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        className="btn bg-gradient-elmar border-0 text-white rounded-xl w-full hover:scale-105 hover:shadow-elmar-hover transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                                        onClick={handleCreateProject}
                                        disabled={!selectedProjectGroup || !projectName.trim()}
                                    >
                                        <PlusIcon className="w-5 h-5 mr-2" />
                                        Project Aanmaken
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar met info en tips */}
                    <div className="xl:col-span-1 space-y-6">
                        {/* Project Statistics */}
                        <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
                            <div className="card-body p-6">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FolderIcon className="w-5 h-5 text-elmar-primary" />
                                    Statistieken
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                                        <span className="text-sm font-medium text-gray-700">Bedrijven</span>
                                        <span className="badge badge-primary">{companies.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                                        <span className="text-sm font-medium text-gray-700">Projectgroepen</span>
                                        <span className="badge badge-secondary">{projectGroups.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tips & Info */}
                        <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl overflow-hidden">
                            <div className="card-body p-6">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <LightBulbIcon className="w-5 h-5 text-yellow-600" />
                                    Tips & Richtlijnen
                                </h3>
                                <div className="space-y-3 text-sm text-gray-700">
                                    <div className="flex items-start gap-2">
                                        <span className="text-yellow-600 mt-1">💡</span>
                                        <span>Gebruik duidelijke en herkenbare projectnamen</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-yellow-600 mt-1">📋</span>
                                        <span>Projecten worden automatisch gekoppeld aan de geselecteerde projectgroep</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-yellow-600 mt-1">👥</span>
                                        <span>Na aanmaken kun je gebruikers toewijzen via Project Toewijzingen</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-yellow-600 mt-1">⚙️</span>
                                        <span>Projecten kunnen later via de database worden bewerkt</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
                            <div className="card-body p-6">
                                <h3 className="font-bold text-gray-800 mb-4">Snelle Acties</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => window.location.href = "/admin/user-projects"}
                                        className="btn btn-outline btn-primary rounded-xl w-full justify-start hover:scale-105 transition-all duration-200"
                                    >
                                        <FolderIcon className="w-4 h-4 mr-2" />
                                        Project Toewijzingen
                                    </button>
                                    <button
                                        onClick={() => window.location.href = "/admin/users"}
                                        className="btn btn-outline btn-secondary rounded-xl w-full justify-start hover:scale-105 transition-all duration-200"
                                    >
                                        <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                                        Gebruikers Beheren
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}