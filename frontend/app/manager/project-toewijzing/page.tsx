"use client";
import { useState, useEffect, useCallback } from "react";
import {
  getUsers,
  getProjects,
  assignUserToProject,
  removeUserFromProject,
  getUserProjects,
  getProjectUsers,
} from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import {
  UserPlusIcon,
  UsersIcon,
  FolderIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullName?: string;
}

interface Project {
  id?: number;
  gcId?: number;
  name?: string;
  gcCode?: string;
  description?: string;
}

interface ProjectAssignment {
  id: number;
  userId: number;
  projectId: number;
  userName?: string;
  assignedDate?: string;
}

export default function ManagerProjectToewijzingPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // State voor project selectie en medewerker toewijzing
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [searchUser, setSearchUser] = useState("");

  const fetchInitialData = useCallback(async () => {
    try {
      const [usersData, projectsData] = await Promise.all([
        getUsers(),
        getProjects(), // Haal alle projecten op
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      showToast("Fout bij het ophalen van data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Laad medewerkers voor het geselecteerde project
  useEffect(() => {
    if (selectedProject) {
      const loadProjectAssignments = async () => {
        try {
          const assignments = await getProjectUsers(selectedProject);
          setProjectAssignments(Array.isArray(assignments) ? assignments : []);
        } catch {
          setProjectAssignments([]);
        }
      };
      loadProjectAssignments();
    } else {
      setProjectAssignments([]);
    }
  }, [selectedProject]);

  const getProjectId = (project: Project): number => {
    return project.gcId || project.id || 0;
  };

  const getProjectDisplayName = (project: Project): string => {
    return project.name || project.description || project.gcCode || `Project ${getProjectId(project)}`;
  };

  const getUserDisplayName = (user: User): string => {
    return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Gebruiker ${user.id}`;
  };

  // Filter gebruikers die nog niet zijn toegewezen
  const availableUsers = users.filter(
    (user) => !projectAssignments.some((pa) => pa.userId === user.id)
  );

  // Filter op zoekterm
  const filteredAvailableUsers = availableUsers.filter((user) => {
    const name = getUserDisplayName(user).toLowerCase();
    return name.includes(searchUser.toLowerCase());
  });

  const handleToggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssignUsers = async () => {
    if (!selectedProject || selectedUsers.length === 0) {
      showToast("Selecteer een project en minimaal één medewerker", "error");
      return;
    }

    const managerUserId = Number(localStorage.getItem("userId")) || 0;

    try {
      // Wijs alle geselecteerde gebruikers toe
      for (const userId of selectedUsers) {
        await assignUserToProject(userId, selectedProject, managerUserId);
      }

      // Ververs de toewijzingen
      const assignments = await getProjectUsers(selectedProject);
      setProjectAssignments(Array.isArray(assignments) ? assignments : []);

      showToast(`${selectedUsers.length} medewerker(s) succesvol toegewezen!`, "success");
      setSelectedUsers([]);
    } catch (error) {
      showToast("Fout bij toewijzen van medewerkers", "error");
    }
  };

  const handleRemoveAssignment = async (userId: number) => {
    if (!selectedProject) return;
    if (!confirm("Weet je zeker dat je deze medewerker wilt verwijderen van dit project?")) return;

    try {
      await removeUserFromProject(userId, selectedProject);

      // Ververs de toewijzingen
      const assignments = await getProjectUsers(selectedProject);
      setProjectAssignments(Array.isArray(assignments) ? assignments : []);

      showToast("Medewerker verwijderd van project", "success");
    } catch (error) {
      showToast("Fout bij verwijderen", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-blue-600 mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <UserPlusIcon className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Project Toewijzingen</h1>
        </div>
        <p className="text-blue-100 text-lg">
          Selecteer eerst een project, daarna kun je medewerkers toewijzen
        </p>
      </div>

      {/* Stap 1: Selecteer Project */}
      <div className="card bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 rounded-2xl">
        <div className="card-body p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
            Selecteer een Project
          </h2>

          <select
            className="select select-bordered w-full rounded-xl dark:bg-slate-800 dark:border-slate-600 text-lg"
            value={selectedProject ?? ""}
            onChange={(e) => {
              setSelectedProject(e.target.value ? Number(e.target.value) : null);
              setSelectedUsers([]);
            }}
          >
            <option value="">-- Kies een project --</option>
            {projects.map((project) => (
              <option key={getProjectId(project)} value={getProjectId(project)}>
                {getProjectDisplayName(project)}
              </option>
            ))}
          </select>

          {projects.length === 0 && (
            <p className="text-amber-600 mt-2">
              ⚠️ Geen projecten gevonden. Controleer de backend verbinding.
            </p>
          )}
        </div>
      </div>

      {/* Stap 2: Toewijzingen beheren (alleen zichtbaar als project geselecteerd) */}
      {selectedProject && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Huidige toewijzingen */}
          <div className="card bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="card-body p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                Huidige Medewerkers ({projectAssignments.length})
              </h2>

              {projectAssignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Geen medewerkers toegewezen aan dit project</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {projectAssignments.map((assignment) => {
                    const user = users.find((u) => u.id === assignment.userId);
                    const displayName = assignment.userName || (user ? getUserDisplayName(user) : `Gebruiker ${assignment.userId}`);

                    return (
                      <div
                        key={assignment.id || assignment.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center">
                              <span className="text-sm font-bold">
                                {displayName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            {displayName}
                          </span>
                        </div>
                        <button
                          className="btn btn-sm btn-error btn-outline rounded-lg"
                          onClick={() => handleRemoveAssignment(assignment.userId)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Medewerkers toevoegen */}
          <div className="card bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="card-body p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
                Medewerkers Toevoegen
              </h2>

              {/* Zoekbalk */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek medewerker..."
                  className="input input-bordered w-full pl-10 rounded-xl dark:bg-slate-800 dark:border-slate-600"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />
              </div>

              {/* Lijst met beschikbare medewerkers */}
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {filteredAvailableUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    {searchUser ? "Geen resultaten" : "Alle medewerkers zijn al toegewezen"}
                  </p>
                ) : (
                  filteredAvailableUsers.map((user) => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedUsers.includes(user.id)
                          ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500"
                          : "bg-gray-50 dark:bg-slate-800 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleToggleUser(user.id)}
                      />
                      <div className="avatar placeholder">
                        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center">
                          <span className="text-xs font-bold">
                            {getUserDisplayName(user).split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {getUserDisplayName(user)}
                      </span>
                    </label>
                  ))
                )}
              </div>

              {/* Toewijzen button */}
              <button
                className="btn bg-blue-600 border-0 text-white rounded-xl w-full hover:bg-blue-700 disabled:opacity-50"
                onClick={handleAssignUsers}
                disabled={selectedUsers.length === 0}
              >
                <UserPlusIcon className="w-5 h-5 mr-2" />
                {selectedUsers.length} Medewerker(s) Toewijzen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info als geen project geselecteerd */}
      {!selectedProject && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <div className="card-body p-6 text-center">
            <FolderIcon className="w-16 h-16 mx-auto text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              Selecteer eerst een project
            </h3>
            <p className="text-blue-600 dark:text-blue-300">
              Kies hierboven een project om te zien welke medewerkers er toegang toe hebben en om nieuwe medewerkers toe te wijzen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
