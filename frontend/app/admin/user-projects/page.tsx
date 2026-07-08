"use client";
import { useState, useEffect, useCallback } from "react";
import {
    getUsers, getCompanies, getProjectGroups, getProjects,
    assignUserToProject, removeUserFromProject, getUserProjects,
} from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { User, Company, ProjectGroup, Project, UserProject } from "@/lib/types";
import { Loader2, UserPlus, Filter, Users, Building2, Folder, Trash2, Search, CheckCircle, AlertTriangle } from "lucide-react";

const selectClass = "h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

export default function AdminUserProjectsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(null);
    const [selectedProject, setSelectedProject] = useState<number | null>(null);

    const [userProjects, setUserProjects] = useState<UserProject[]>([]);
    const [filteredUserProjects, setFilteredUserProjects] = useState<UserProject[]>([]);
    const [filterUser, setFilterUser] = useState<number | null>(null);
    const [filterProject, setFilterProject] = useState<number | null>(null);

    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    const fetchInitialData = useCallback(async () => {
        try {
            const [usersData, companiesData, userProjectsData] = await Promise.all([
                getUsers(),
                getCompanies(),
                getUserProjects(0),
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
                } catch (error) {}
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
                } catch (error) {}
            };
            fetchProjects();
        } else {
            setProjects([]);
        }
        setSelectedProject(null);
    }, [selectedProjectGroup]);

    useEffect(() => {
        let filtered = [...userProjects];
        if (filterUser) filtered = filtered.filter(up => up.userId === filterUser);
        if (filterProject) filtered = filtered.filter(up => up.projectId === filterProject);
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
            const adminUserId = Number(localStorage.getItem("userId")) || 0;
            await assignUserToProject(selectedUser, selectedProject, adminUserId);
            const updatedUserProjects = await getUserProjects(0);
            setUserProjects(updatedUserProjects);
            setToastMessage("Gebruiker succesvol toegewezen aan project!");
            setToastType("success");
            setSelectedUser(null);
            setSelectedCompany(null);
            setSelectedProjectGroup(null);
            setSelectedProject(null);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Fout bij toewijzen gebruiker aan project";
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

    const getUserName = (userId: number) => {
        const userProject = userProjects.find(up => up.userId === userId);
        if (userProject?.user?.fullName) return userProject.user.fullName;
        const user = users.find(u => u.id === userId);
        return user ? `${user.firstName} ${user.lastName}` : "Onbekende gebruiker";
    };

    const getProjectName = (project?: Project) => {
        if (!project) return "Onbekend project";
        return project.name;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project Toewijzingen</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Beheer welke medewerkers toegang hebben tot welke projecten</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Nieuwe Toewijzing */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <UserPlus className="w-5 h-5 text-blue-600" />
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nieuwe Toewijzing</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    <Users className="w-3.5 h-3.5" />
                                    Gebruiker
                                </label>
                                <select
                                    className={selectClass}
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

                            <div>
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    <Building2 className="w-3.5 h-3.5" />
                                    Bedrijf
                                </label>
                                <select
                                    className={selectClass}
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

                            <div>
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    Projectgroep
                                </label>
                                <select
                                    className={selectClass}
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

                            <div>
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    <Folder className="w-3.5 h-3.5" />
                                    Project
                                </label>
                                <select
                                    className={selectClass}
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
                                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleAssignUserToProject}
                                disabled={!selectedUser || !selectedProject}
                            >
                                <UserPlus className="w-4 h-4" />
                                Gebruiker Toewijzen
                            </button>
                        </div>
                    </div>

                    {/* Filter Toewijzingen */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter className="w-5 h-5 text-blue-600" />
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filter Toewijzingen</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    Filter op Gebruiker
                                </label>
                                <select
                                    className={selectClass}
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

                            <div>
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    Filter op Project
                                </label>
                                <select
                                    className={selectClass}
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

                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Totaal Toewijzingen</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{filteredUserProjects.length} van {userProjects.length}</p>
                                    </div>
                                    <Search className="w-6 h-6 text-slate-400" />
                                </div>
                            </div>

                            <button
                                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium rounded-md transition-colors"
                                onClick={() => { setFilterUser(null); setFilterProject(null); }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bestaande Toewijzingen */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bestaande Toewijzingen</h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Overzicht van alle actieve project toewijzingen</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gebruiker</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedrijf</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Datum Toegewezen</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acties</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUserProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertTriangle className="w-10 h-10 text-slate-300" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Geen toewijzingen gevonden</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Probeer je filters aan te passen of voeg een nieuwe toewijzing toe</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUserProjects.map((up) => (
                                    <tr key={up.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                    {getUserName(up.userId).split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-slate-100">{getUserName(up.userId)}</div>
                                                    <div className="text-xs text-slate-500">ID: {up.userId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                                                <span className="font-medium">
                                                    {up.project ? getProjectName(up.project) : `Project ${up.projectId}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                <span>
                                                    {up.project?.projectGroup?.company
                                                        ? up.project.projectGroup.company.name
                                                        : "Onbekend bedrijf"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {new Date(up.assignedDate).toLocaleDateString("nl-NL", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors"
                                                onClick={() => handleRemoveUserFromProject(up.userId, up.projectId)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Verwijderen
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    {filteredUserProjects.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500">
                                    Toont <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredUserProjects.length}</span> van <span className="font-semibold text-slate-700 dark:text-slate-300">{userProjects.length}</span> toewijzingen
                                </p>
                                <p className="text-xs text-slate-500">
                                    {users.length} gebruikers &bull; {companies.length} bedrijven
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}
