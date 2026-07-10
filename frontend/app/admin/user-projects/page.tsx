"use client";
import { useState, useEffect, useCallback } from "react";
import { getUsers, getCompanies, getProjectGroups, getProjects,
    assignUserToProject, removeUserFromProject, getUserProjects} from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { User, Company, ProjectGroup, Project, UserProject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Loader2 } from "lucide-react";
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

const selectClass = "w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed";

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
            <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Project toewijzingen laden...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="space-y-6 p-6">
                <PageHeader
                    title="Project Toewijzingen"
                    description="Beheer welke medewerkers toegang hebben tot welke projecten"
                />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Formulier voor toewijzen van gebruiker aan project */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <UserPlusIcon className="w-5 h-5 text-blue-600" />
                                Nieuwe Toewijzing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                    <UsersIcon className="w-4 h-4" />
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                    <BuildingOfficeIcon className="w-4 h-4" />
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                    <FolderIcon className="w-4 h-4" />
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

                            <Button
                                className="w-full"
                                onClick={handleAssignUserToProject}
                                disabled={!selectedUser || !selectedProject}
                            >
                                <UserPlusIcon className="w-4 h-4 mr-2" />
                                Gebruiker Toewijzen
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Filters voor bestaande koppelingen */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FunnelIcon className="w-5 h-5 text-blue-600" />
                                Filter Toewijzingen
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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

                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Totaal Toewijzingen</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">{filteredUserProjects.length} van {userProjects.length}</p>
                                    </div>
                                    <MagnifyingGlassIcon className="w-7 h-7 text-blue-500" />
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setFilterUser(null);
                                    setFilterProject(null);
                                }}
                            >
                                Reset Filters
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabel met alle user-project koppelingen */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                            Bestaande Toewijzingen
                        </CardTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Overzicht van alle actieve project toewijzingen</p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Gebruiker</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Project</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Bedrijf</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Datum Toegewezen</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Acties</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {filteredUserProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <ExclamationTriangleIcon className="w-12 h-12 text-slate-300" />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Geen toewijzingen gevonden</p>
                                                    <p className="text-xs text-slate-500">Probeer je filters aan te passen of voeg een nieuwe toewijzing toe</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUserProjects.map((up) => (
                                        <tr key={up.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {getUserName(up.userId).split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-slate-100">{getUserName(up.userId)}</div>
                                                        <div className="text-xs text-slate-500">ID: {up.userId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                                        {up.project ? getProjectName(up.project) : `Project ${up.projectId}`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <BuildingOfficeIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {up.project && up.project.projectGroup && up.project.projectGroup.company
                                                            ? up.project.projectGroup.company.name
                                                            : "Onbekend bedrijf"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                {new Date(up.assignedDate).toLocaleDateString('nl-NL', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRemoveUserFromProject(up.userId, up.projectId)}
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5 mr-1" />
                                                    Verwijderen
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer met statistieken */}
                        {filteredUserProjects.length > 0 && (
                            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Toont <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredUserProjects.length}</span> van <span className="font-semibold text-slate-700 dark:text-slate-300">{userProjects.length}</span> toewijzingen
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {users.length} gebruikers • {companies.length} bedrijven
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}
