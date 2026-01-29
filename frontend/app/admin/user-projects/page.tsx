"use client";
import { useState, useEffect, useCallback } from "react";
import { getUsers, getCompanies, getProjectGroups, getProjects,
    assignUserToProject, removeUserFromProject, getUserProjects} from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { User, Company, ProjectGroup, Project, UserProject } from "@/lib/types";
import {
    UserPlusIcon,
    FunnelIcon,
    UsersIcon,
    BuildingOfficeIcon,
    FolderIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

export default function AdminUserProjectsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // State voor het toewijzen van een gebruiker aan een project
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(null);
    const [selectedProject, setSelectedProject] = useState<number | null>(null);

    // State voor overzicht van alle koppelingen
    const [userProjects, setUserProjects] = useState<UserProject[]>([]);
    const [filteredUserProjects, setFilteredUserProjects] = useState<UserProject[]>([]);
    const [filterUser, setFilterUser] = useState<number | null>(null);
    const [filterProject, setFilterProject] = useState<number | null>(null);

    // Toast notification
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    const fetchInitialData = useCallback(async () => {
        try {
            const [usersData, companiesData, userProjectsData] = await Promise.all([
                getUsers(),
                getCompanies(),
                getUserProjects(0) // 0 haalt alle koppelingen op
            ]);

            setUsers(usersData);
            setCompanies(companiesData);
            setUserProjects(userProjectsData);
            setFilteredUserProjects(userProjectsData);
        } catch (error) {
            
            setToastMessage("Fout bij het ophalen van data");
            setToastType("error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (selectedCompany) {
            const fetchProjectGroups = async () => {
                try {
                    const data = await getProjectGroups(selectedCompany);
                    setProjectGroups(data);
                } catch (error) {
                    
                }
            };

            fetchProjectGroups();
        } else {
            setProjectGroups([]);
        }

        setSelectedProjectGroup(null);
        setSelectedProject(null);
    }, [selectedCompany]);

    useEffect(() => {
        if (selectedProjectGroup) {
            const fetchProjects = async () => {
                try {
                    const data = await getProjects(selectedProjectGroup);
                    setProjects(data);
                } catch (error) {
                    
                }
            };

            fetchProjects();
        } else {
            setProjects([]);
        }

        setSelectedProject(null);
    }, [selectedProjectGroup]);

    // Filter de koppelingen op basis van geselecteerde gebruiker en/of project
    useEffect(() => {
        let filtered = [...userProjects];

        if (filterUser) {
            filtered = filtered.filter(up => up.userId === filterUser);
        }

        if (filterProject) {
            filtered = filtered.filter(up => up.projectId === filterProject);
        }

        setFilteredUserProjects(filtered);
    }, [userProjects, filterUser, filterProject]);

    const handleAssignUserToProject = async () => {
        if (!selectedUser || !selectedProject) {
            setToastMessage("Selecteer een gebruiker en een project");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        try {
            // Haal de adminUserId op uit localStorage
            const adminUserId = Number(localStorage.getItem("userId")) || 0;

            await assignUserToProject(selectedUser, selectedProject, adminUserId);

            // Ververs de lijst met koppelingen
            const updatedUserProjects = await getUserProjects(0);
            setUserProjects(updatedUserProjects);

            setToastMessage("Gebruiker succesvol toegewezen aan project!");
            setToastType("success");

            // Reset selecties
            setSelectedUser(null);
            setSelectedCompany(null);
            setSelectedProjectGroup(null);
            setSelectedProject(null);
        } catch (error) {
            

            // Toon de foutmelding van de server, als die er is
            const errorMessage = error instanceof Error ? error.message : "Fout bij toewijzen gebruiker aan project";

            // Controleer specifiek op het geval dat de gebruiker al is toegewezen
            if (errorMessage.includes("al gekoppeld") || errorMessage.includes("already assigned")) {
                setToastMessage("Deze gebruiker is al toegewezen aan dit project");
            } else {
                setToastMessage(errorMessage);
            }

            setToastType("error");
        }

        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleRemoveUserFromProject = async (userId: number, projectId: number) => {
        try {
            await removeUserFromProject(userId, projectId);

            // Ververs de lijst met koppelingen
            const updatedUserProjects = await getUserProjects(0);
            setUserProjects(updatedUserProjects);

            setToastMessage("Gebruiker succesvol verwijderd van project!");
            setToastType("success");
        } catch (error) {
            
            setToastMessage("Fout bij verwijderen gebruiker van project");
            setToastType("error");
        }

        setTimeout(() => setToastMessage(""), 3000);
    };

    // Hulpfunctie om gebruikersnaam te vinden
    const getUserName = (userId: number) => {
        // Probeer eerst de user property van het userProject object
        const userProject = userProjects.find(up => up.userId === userId);
        if (userProject?.user?.fullName) {
            return userProject.user.fullName;
        }

        // Als dat niet lukt, zoek in de users lijst
        const user = users.find(u => u.id === userId);
        return user ? `${user.firstName} ${user.lastName}` : "Onbekende gebruiker";
    };

    // Hulpfunctie om projectnaam te vinden
    const getProjectName = (project?: Project) => {
        if (!project) {
            return "Onbekend project";
        }
        return project.name;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-blue-100">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Project toewijzingen laden...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="container mx-auto p-6 space-y-8">
                {/* Header Section */}
                <div className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <UserPlusIcon className="w-8 h-8" />
                        <h1 className="text-4xl font-bold">Project Toewijzingen</h1>
                    </div>
                    <p className="text-blue-100 text-lg">Beheer welke medewerkers toegang hebben tot welke projecten</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Formulier voor toewijzen van gebruiker aan project */}
                    <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
                        <div className="card-body p-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <UserPlusIcon className="w-6 h-6 text-elmar-primary" />
                                Nieuwe Toewijzing
                            </h2>

                            <div className="space-y-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                                            <UsersIcon className="w-4 h-4" />
                                            Gebruiker
                                        </span>
                                    </label>
                                    <select
                                        className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                        value={selectedUser ?? ""}
                                        onChange={(e) => setSelectedUser(e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <option value="">Selecteer een gebruiker</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.firstName} {user.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

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
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
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
                                        {projectGroups.map((group) => (
                                            <option key={group.id} value={group.id}>
                                                {group.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                                            <FolderIcon className="w-4 h-4" />
                                            Project
                                        </span>
                                    </label>
                                    <select
                                        className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                        value={selectedProject ?? ""}
                                        onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : null)}
                                        disabled={!selectedProjectGroup}
                                    >
                                        <option value="">Selecteer een project</option>
                                        {projects.map((project) => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    className="btn bg-blue-600 border-0 text-white rounded-xl w-full hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                                    onClick={handleAssignUserToProject}
                                    disabled={!selectedUser || !selectedProject}
                                >
                                    <UserPlusIcon className="w-5 h-5 mr-2" />
                                    Gebruiker Toewijzen
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters voor bestaande koppelingen */}
                    <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
                        <div className="card-body p-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <FunnelIcon className="w-6 h-6 text-elmar-primary" />
                                Filter Toewijzingen
                            </h2>

                            <div className="space-y-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Filter op Gebruiker</span>
                                    </label>
                                    <select
                                        className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                        value={filterUser ?? ""}
                                        onChange={(e) => setFilterUser(e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <option value="">Alle gebruikers</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.firstName} {user.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold text-gray-700">Filter op Project</span>
                                    </label>
                                    <select
                                        className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                        value={filterProject ?? ""}
                                        onChange={(e) => setFilterProject(e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <option value="">Alle projecten</option>
                                        {userProjects
                                            .filter(up => up.project)
                                            .filter((up, index, self) =>
                                                index === self.findIndex(p => p.project && p.project.id === up.project?.id)
                                            )
                                            .map((up) => (
                                                <option key={up.project?.id} value={up.project?.id}>
                                                    {getProjectName(up.project)}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="bg-blue-100 rounded-xl p-4 border border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-800">Totaal Toewijzingen</p>
                                            <p className="text-sm text-gray-600">{filteredUserProjects.length} van {userProjects.length}</p>
                                        </div>
                                        <MagnifyingGlassIcon className="w-8 h-8 text-blue-500" />
                                    </div>
                                </div>

                                <button
                                    className="btn btn-outline btn-primary rounded-xl w-full"
                                    onClick={() => {
                                        setFilterUser(null);
                                        setFilterProject(null);
                                    }}
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabel met alle user-project koppelingen */}
                <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
                    <div className="card-body p-0">
                        <div className="bg-slate-50 dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <CheckCircleIcon className="w-6 h-6 text-elmar-primary" />
                                Bestaande Toewijzingen
                            </h2>
                            <p className="text-gray-600 mt-1">Overzicht van alle actieve project toewijzingen</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-gray-700 font-semibold">👤 Gebruiker</th>
                                    <th className="text-gray-700 font-semibold">📁 Project</th>
                                    <th className="text-gray-700 font-semibold">🏢 Bedrijf</th>
                                    <th className="text-gray-700 font-semibold">Datum Toegewezen op</th>
                                    <th className="text-gray-700 font-semibold">Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredUserProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <ExclamationTriangleIcon className="w-16 h-16 text-gray-300" />
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-600">Geen toewijzingen gevonden</h3>
                                                    <p className="text-gray-500">Probeer je filters aan te passen of voeg een nieuwe toewijzing toe</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUserProjects.map((up, index) => (
                                        <tr key={up.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center">
                                                            <span className="text-sm font-bold">
                                                                {getUserName(up.userId).split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{getUserName(up.userId)}</div>
                                                        <div className="text-sm text-gray-500">ID: {up.userId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                                    <span className="font-medium text-gray-800">
                                                        {up.project ? getProjectName(up.project) : `Project ${up.projectId}`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                                                    <span className="text-gray-700">
                                                        {up.project && up.project.projectGroup && up.project.projectGroup.company
                                                            ? up.project.projectGroup.company.name
                                                            : "Onbekend bedrijf"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="text-gray-600">
                                                    {new Date(up.assignedDate).toLocaleDateString('nl-NL', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-error rounded-xl"
                                                    onClick={() => handleRemoveUserFromProject(up.userId, up.projectId)}
                                                >
                                                    <TrashIcon className="w-4 h-4 mr-1" />
                                                    Verwijderen
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer met statistieken */}
                        {filteredUserProjects.length > 0 && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Toont <span className="font-semibold">{filteredUserProjects.length}</span> van <span className="font-semibold">{userProjects.length}</span> toewijzingen
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                            <span className="text-gray-600">Actief</span>
                                        </div>
                                        <div className="text-gray-600">
                                            {users.length} gebruikers • {companies.length} bedrijven
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}
