// Fix voor UserProjects component (vervolg)

"use client";
import { useState, useEffect, useCallback } from "react";
import { getUsers, getCompanies, getProjectGroups, getProjects,
    assignUserToProject, removeUserFromProject, getUserProjects} from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { User, Company, ProjectGroup, Project, UserProject } from "@/lib/types";

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
            console.error("Error fetching data:", error);
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
                    console.error("Error fetching project groups:", error);
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
                    console.error("Error fetching projects:", error);
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
            console.error("Error assigning user to project:", error);

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
            console.error("Error removing user from project:", error);
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

    // Hulpfunctie om bedrijfsnaam te vinden
    const getCompanyName = (project?: Project) => {
        if (!project || !project.projectGroup || !project.projectGroup.company) {
            return "Onbekend bedrijf";
        }
        return project.projectGroup.company.name;
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-8">Project Toewijzingen</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Formulier voor toewijzen van gebruiker aan project */}
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title mb-4">Nieuwe Toewijzing</h2>

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text">Gebruiker</span>
                                </label>
                                <select
                                    className="select select-bordered"
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
                                    {companies.map((company) => (
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
                                    {projectGroups.map((group) => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text">Project</span>
                                </label>
                                <select
                                    className="select select-bordered"
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

                            <div className="card-actions justify-end">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAssignUserToProject}
                                    disabled={!selectedUser || !selectedProject}
                                >
                                    Toewijzen
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters voor bestaande koppelingen */}
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title mb-4">Filter Toewijzingen</h2>

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text">Filter op Gebruiker</span>
                                </label>
                                <select
                                    className="select select-bordered"
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

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text">Filter op Project</span>
                                </label>
                                <select
                                    className="select select-bordered"
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

                            <div className="card-actions justify-end">
                                <button
                                    className="btn btn-ghost"
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
                <div className="card bg-base-100 shadow-xl mt-8">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Bestaande Toewijzingen</h2>

                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                <tr>
                                    <th>Gebruiker</th>
                                    <th>Project</th>
                                    <th>Bedrijf</th>
                                    <th>Toegewezen op</th>
                                    <th>Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredUserProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center">Geen toewijzingen gevonden</td>
                                    </tr>
                                ) : (
                                    filteredUserProjects.map((up) => (
                                        <tr key={up.id}>
                                            <td>{getUserName(up.userId)}</td>
                                            <td>{up.project ? getProjectName(up.project) : `Project ${up.projectId}`}</td>
                                            <td>{up.project && up.project.projectGroup && up.project.projectGroup.company ?
                                                up.project.projectGroup.company.name : "Onbekend bedrijf"}</td>
                                            <td>{new Date(up.assignedDate).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-error"
                                                    onClick={() => handleRemoveUserFromProject(up.userId, up.projectId)}
                                                >
                                                    Verwijderen
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
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