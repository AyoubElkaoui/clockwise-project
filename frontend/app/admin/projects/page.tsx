"use client";
import { useState, useEffect } from "react";
import { getCompanies, getProjectGroups, createProject } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { Company, ProjectGroup } from "@/lib/types";

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
        } catch (error) {
            console.error("Error creating project:", error);
            setToastMessage("Fout bij aanmaken project");
            setToastType("error");
        }

        setTimeout(() => setToastMessage(""), 3000);
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-8">Projectbeheer</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Formulier voor nieuw project */}
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title mb-4">Nieuw Project Aanmaken</h2>

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text">Bedrijf</span>
                                </label>
                                <select
                                    className="select select-bordered"
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
                            </div>

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text">Projectgroep</span>
                                </label>
                                <select
                                    className="select select-bordered"
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
                            </div>

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text">Projectnaam</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="Voer een projectnaam in"
                                />
                            </div>

                            <div className="card-actions justify-end">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateProject}
                                    disabled={!selectedProjectGroup || !projectName.trim()}
                                >
                                    Project Aanmaken
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Hier zou je een lijst van projecten kunnen toevoegen */}
                </div>

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}