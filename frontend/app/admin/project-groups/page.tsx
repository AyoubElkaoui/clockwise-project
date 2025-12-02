"use client";
import { useState, useEffect } from "react";
import { getCompanies, getProjectGroups, createProjectGroup } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { Company, ProjectGroup } from "@/lib/types";
import {
    PlusIcon,
    BuildingOfficeIcon,
    FolderIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

export default function AdminProjectGroupsPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [projectGroupName, setProjectGroupName] = useState("");

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
    }, [selectedCompany]);

    const handleCreateProjectGroup = async () => {
        if (!selectedCompany || !projectGroupName.trim()) {
            setToastMessage("Vul alle velden in");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        try {
            await createProjectGroup({
                name: projectGroupName,
                companyId: selectedCompany
            });

            setToastMessage("Projectgroep succesvol aangemaakt!");
            setToastType("success");

            // Reset form
            setProjectGroupName("");

            // Reload project groups
            const data = await getProjectGroups(selectedCompany);
            setProjectGroups(data);

            setTimeout(() => setToastMessage(""), 3000);
        } catch (error) {
            setToastMessage("Fout bij aanmaken projectgroep");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    return (
        <AdminRoute>
            <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Projectgroepen Beheren
                        </h1>
                        <p className="text-gray-600 dark:text-slate-400 mt-2">
                            Maak en beheer projectgroepen per bedrijf
                        </p>
                    </div>
                </div>

                {/* Create New Project Group Card */}
                <div className="bg-blue-600 rounded-2xl shadow-xl p-8 text-white">
                    <div className="flex items-center mb-6">
                        <PlusIcon className="w-8 h-8 mr-3" />
                        <h2 className="text-2xl font-bold">Nieuwe Projectgroep Aanmaken</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block mb-2 text-sm font-medium">
                                <BuildingOfficeIcon className="w-5 h-5 inline mr-2" />
                                Bedrijf
                            </label>
                            <select
                                value={selectedCompany || ""}
                                onChange={(e) => setSelectedCompany(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <option value="" className="text-gray-900">Selecteer bedrijf...</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id} className="text-gray-900">
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium">
                                <FolderIcon className="w-5 h-5 inline mr-2" />
                                Projectgroep Naam
                            </label>
                            <input
                                type="text"
                                placeholder="Bijv. Marketing Projecten"
                                value={projectGroupName}
                                onChange={(e) => setProjectGroupName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleCreateProjectGroup}
                        className="w-full md:w-auto px-8 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 flex items-center justify-center gap-2 shadow-lg"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        Projectgroep Aanmaken
                    </button>
                </div>

                {/* Existing Project Groups */}
                {selectedCompany && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <FolderIcon className="w-6 h-6 text-purple-600" />
                            Bestaande Projectgroepen ({projectGroups.length})
                        </h3>
                        
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            </div>
                        ) : projectGroups.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                                <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Nog geen projectgroepen voor dit bedrijf</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {projectGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="bg-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-lg p-4 border border-purple-200 dark:border-slate-500"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-600 rounded-lg">
                                                <FolderIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white">
                                                    {group.name}
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-slate-300">
                                                    {group.projects?.length || 0} projecten
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {toastMessage && (
                    <ToastNotification
                        message={toastMessage}
                        type={toastType}
                        onClose={() => setToastMessage("")}
                    />
                )}
            </div>
        </AdminRoute>
    );
}
