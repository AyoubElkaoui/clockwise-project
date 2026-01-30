"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getProjects } from "@/lib/api";
import {
  getPostgresUsers,
  assignUserToProject,
  removeUserFromProject,
  getProjectUsers,
  type PostgresUser,
  type UserProject,
} from "@/lib/api/userProjectApi";
import { showToast } from "@/components/ui/toast";
import {
  UserPlusIcon,
  FolderIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface Project {
  id?: number;
  gcId?: number;
  name?: string;
  gcCode?: string;
  description?: string;
}

export default function ManagerProjectToewijzingPage() {
  const [users, setUsers] = useState<PostgresUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Project search state
  const [projectSearch, setProjectSearch] = useState("");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const projectSearchRef = useRef<HTMLDivElement>(null);

  // User assignment state
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<UserProject[]>([]);
  const [searchUser, setSearchUser] = useState("");

  const fetchInitialData = useCallback(async () => {
    try {
      const [usersData, projectsData] = await Promise.all([
        getPostgresUsers(),
        getProjects(),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch {
      showToast("Fout bij het ophalen van data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Close project dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        projectSearchRef.current &&
        !projectSearchRef.current.contains(event.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load assignments when project is selected
  useEffect(() => {
    if (selectedProject) {
      const projectId = getProjectId(selectedProject);
      if (projectId > 0) {
        const loadAssignments = async () => {
          try {
            const assignments = await getProjectUsers(projectId);
            setProjectAssignments(Array.isArray(assignments) ? assignments : []);
          } catch {
            setProjectAssignments([]);
          }
        };
        loadAssignments();
      }
    } else {
      setProjectAssignments([]);
    }
  }, [selectedProject]);

  const getProjectId = (project: Project): number => {
    return project.gcId || project.id || 0;
  };

  const getProjectDisplayName = (project: Project): string => {
    const code = project.gcCode || "";
    const name = project.name || project.description || "";
    if (code && name && code !== name) return `${code} - ${name}`;
    return name || code || `Project ${getProjectId(project)}`;
  };

  const getUserDisplayName = (user: PostgresUser): string => {
    const first = user.firstName || "";
    const last = user.lastName || "";
    const full = `${first} ${last}`.trim();
    return full || user.username || `Gebruiker ${user.id}`;
  };

  // Filter projects by search term
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const term = projectSearch.toLowerCase();
    return projects.filter((p) => {
      const display = getProjectDisplayName(p).toLowerCase();
      const code = (p.gcCode || "").toLowerCase();
      return display.includes(term) || code.includes(term);
    });
  }, [projects, projectSearch]);

  // Filter available users (not already assigned) by search term
  const availableUsers = useMemo(() => {
    const assignedUserIds = new Set(projectAssignments.map((pa) => pa.userId));
    let available = users.filter((user) => !assignedUserIds.has(user.id));

    if (searchUser.trim()) {
      const term = searchUser.toLowerCase();
      available = available.filter((user) => {
        const name = getUserDisplayName(user).toLowerCase();
        const email = (user.email || "").toLowerCase();
        const username = (user.username || "").toLowerCase();
        return name.includes(term) || email.includes(term) || username.includes(term);
      });
    }

    return available;
  }, [users, projectAssignments, searchUser]);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setProjectSearch(getProjectDisplayName(project));
    setProjectDropdownOpen(false);
    setSelectedUsers([]);
  };

  const handleClearProject = () => {
    setSelectedProject(null);
    setProjectSearch("");
    setSelectedUsers([]);
    setProjectAssignments([]);
  };

  const handleToggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssignUsers = async () => {
    if (!selectedProject || selectedUsers.length === 0) {
      showToast("Selecteer een project en minimaal een medewerker", "error");
      return;
    }

    const managerUserId = Number(localStorage.getItem("userId")) || 0;
    const projectId = getProjectId(selectedProject);

    try {
      for (const userId of selectedUsers) {
        await assignUserToProject(userId, projectId, managerUserId);
      }

      // Refresh assignments
      const assignments = await getProjectUsers(projectId);
      setProjectAssignments(Array.isArray(assignments) ? assignments : []);

      showToast(`${selectedUsers.length} medewerker(s) toegewezen`, "success");
      setSelectedUsers([]);
    } catch {
      showToast("Fout bij toewijzen van medewerkers", "error");
    }
  };

  const handleRemoveAssignment = async (userId: number) => {
    if (!selectedProject) return;
    if (!confirm("Weet je zeker dat je deze medewerker wilt verwijderen van dit project?"))
      return;

    const projectId = getProjectId(selectedProject);

    try {
      await removeUserFromProject(userId, projectId);

      const assignments = await getProjectUsers(projectId);
      setProjectAssignments(Array.isArray(assignments) ? assignments : []);

      showToast("Medewerker verwijderd van project", "success");
    } catch {
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
          Zoek een project en wijs medewerkers toe
        </p>
        <div className="flex gap-4 mt-3 text-blue-200 text-sm">
          <span>{projects.length} projecten</span>
          <span>{users.length} medewerkers</span>
        </div>
      </div>

      {/* Stap 1: Zoek en selecteer project */}
      <div className="card bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 rounded-2xl">
        <div className="card-body p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              1
            </span>
            Zoek een Project
          </h2>

          {/* Searchable project input */}
          <div ref={projectSearchRef} className="relative">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Typ om een project te zoeken (naam of code)..."
                className="input input-bordered w-full pl-10 pr-20 rounded-xl dark:bg-slate-800 dark:border-slate-600 text-lg"
                value={projectSearch}
                onChange={(e) => {
                  setProjectSearch(e.target.value);
                  setProjectDropdownOpen(true);
                  if (!e.target.value) {
                    setSelectedProject(null);
                  }
                }}
                onFocus={() => setProjectDropdownOpen(true)}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {selectedProject && (
                  <button
                    onClick={handleClearProject}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
                <ChevronDownIcon
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    projectDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {/* Project dropdown */}
            {projectDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                {filteredProjects.length === 0 ? (
                  <div className="px-4 py-3 text-gray-500 text-center">
                    Geen projecten gevonden voor &ldquo;{projectSearch}&rdquo;
                  </div>
                ) : (
                  filteredProjects.slice(0, 50).map((project) => {
                    const pid = getProjectId(project);
                    const isSelected = selectedProject && getProjectId(selectedProject) === pid;
                    return (
                      <button
                        key={pid}
                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "text-gray-800 dark:text-gray-100"
                        }`}
                        onClick={() => handleSelectProject(project)}
                      >
                        <div className="font-medium">
                          {getProjectDisplayName(project)}
                        </div>
                        {project.gcCode && project.name && project.gcCode !== project.name && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Code: {project.gcCode}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
                {filteredProjects.length > 50 && (
                  <div className="px-4 py-2 text-center text-sm text-gray-500 bg-gray-50 dark:bg-slate-700">
                    {filteredProjects.length - 50} meer resultaten - verfijn je zoekopdracht
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedProject && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-blue-800 dark:text-blue-200 font-medium">
                Geselecteerd: {getProjectDisplayName(selectedProject)}
              </span>
            </div>
          )}

          {projects.length === 0 && (
            <p className="text-amber-600 mt-2">
              Geen projecten gevonden. Controleer de backend verbinding.
            </p>
          )}
        </div>
      </div>

      {/* Stap 2: Toewijzingen beheren */}
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
                    const displayName =
                      assignment.userName ||
                      (user ? getUserDisplayName(user) : `Gebruiker ${assignment.userId}`);

                    return (
                      <div
                        key={assignment.id || assignment.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {displayName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-800 dark:text-gray-100">
                              {displayName}
                            </span>
                            {user?.email && (
                              <div className="text-xs text-gray-500">
                                {user.email}
                              </div>
                            )}
                          </div>
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
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                Medewerkers Toevoegen
              </h2>

              {/* Zoekbalk */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek medewerker (naam, email, username)..."
                  className="input input-bordered w-full pl-10 rounded-xl dark:bg-slate-800 dark:border-slate-600"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />
              </div>

              {/* Lijst met beschikbare medewerkers */}
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {availableUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    {searchUser
                      ? "Geen resultaten"
                      : "Alle medewerkers zijn al toegewezen"}
                  </p>
                ) : (
                  availableUsers.map((user) => (
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
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold">
                          {getUserDisplayName(user)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 dark:text-gray-100 truncate">
                          {getUserDisplayName(user)}
                        </div>
                        {user.email && (
                          <div className="text-xs text-gray-500 truncate">
                            {user.email}
                          </div>
                        )}
                      </div>
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
              Zoek en selecteer een project
            </h3>
            <p className="text-blue-600 dark:text-blue-300">
              Gebruik de zoekbalk hierboven om een project te vinden en medewerkers toe te wijzen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
