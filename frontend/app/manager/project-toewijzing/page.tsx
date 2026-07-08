"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getProjects, getProjectGroups } from "@/lib/api";
import {
  getPostgresUsers,
  assignUserToProject,
  removeUserFromProject,
  getProjectUsers,
  updateUserProjectHours,
  type PostgresUser,
  type UserProject,
} from "@/lib/api/userProjectApi";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Search,
  UserPlus,
  Trash2,
  X,
  ChevronDown,
  FolderOpen,
  Users,
  CheckCircle2,
  Clock,
  Save,
} from "lucide-react";

interface Project {
  id?: number;
  gcId?: number;
  name?: string;
  gcCode?: string;
  description?: string;
  werkgrpGcId?: number;
}

interface ProjectGroupData {
  gcId: number;
  gcCode: string;
  description?: string;
}

export default function ManagerProjectToewijzingPage() {
  const [users, setUsers] = useState<PostgresUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroupData[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectSearch, setProjectSearch] = useState("");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const projectSearchRef = useRef<HTMLDivElement>(null);

  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<UserProject[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editingMaxHours, setEditingMaxHours] = useState<number | null>(null);
  const [maxHoursValue, setMaxHoursValue] = useState<string>("");

  const fetchInitialData = useCallback(async () => {
    try {
      const [usersData, projectsData, groupsData] = await Promise.all([
        getPostgresUsers(),
        getProjects(),
        getProjectGroups(),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setProjectGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch {
      showToast("Fout bij het ophalen van data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectSearchRef.current && !projectSearchRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const pid = getProjectId(selectedProject);
      if (pid > 0) {
        (async () => {
          try {
            const a = await getProjectUsers(pid);
            setProjectAssignments(Array.isArray(a) ? a : []);
          } catch { setProjectAssignments([]); }
        })();
      }
    } else {
      setProjectAssignments([]);
    }
  }, [selectedProject]);

  const getProjectId = (p: Project) => p.gcId || p.id || 0;

  const getProjectDisplayName = (p: Project) => {
    const code = p.gcCode || "";
    const name = p.name || p.description || "";
    if (code && name && code !== name) return `${code} - ${name}`;
    return name || code || `Project ${getProjectId(p)}`;
  };

  const getUserDisplayName = (u: PostgresUser) => {
    const full = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return full || u.username || `Gebruiker ${u.id}`;
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const groupNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const g of projectGroups) {
      map[g.gcId] = g.description || g.gcCode || `Groep ${g.gcId}`;
    }
    return map;
  }, [projectGroups]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (projectSearch.trim()) {
      const t = projectSearch.toLowerCase();
      filtered = projects.filter(p => {
        if (getProjectDisplayName(p).toLowerCase().includes(t)) return true;
        if ((p.gcCode || "").toLowerCase().includes(t)) return true;
        const gName = p.werkgrpGcId ? (groupNameMap[p.werkgrpGcId] || "") : "";
        if (gName.toLowerCase().includes(t)) return true;
        return false;
      });
    }
    return filtered;
  }, [projects, projectSearch, groupNameMap]);

  const groupedFilteredProjects = useMemo(() => {
    const groups: { groupId: number; groupName: string; projects: Project[] }[] = [];
    const groupMap = new Map<number, Project[]>();
    const ungrouped: Project[] = [];

    for (const p of filteredProjects) {
      const gid = p.werkgrpGcId;
      if (gid && gid > 0) {
        if (!groupMap.has(gid)) groupMap.set(gid, []);
        groupMap.get(gid)!.push(p);
      } else {
        ungrouped.push(p);
      }
    }

    const sortedGroupIds = Array.from(groupMap.keys()).sort((a, b) => {
      const nameA = groupNameMap[a] || "";
      const nameB = groupNameMap[b] || "";
      return nameA.localeCompare(nameB);
    });

    for (const gid of sortedGroupIds) {
      groups.push({
        groupId: gid,
        groupName: groupNameMap[gid] || `Groep ${gid}`,
        projects: groupMap.get(gid)!,
      });
    }

    if (ungrouped.length > 0) {
      groups.push({ groupId: 0, groupName: "Overig", projects: ungrouped });
    }

    return groups;
  }, [filteredProjects, groupNameMap]);

  const availableUsers = useMemo(() => {
    const assigned = new Set(projectAssignments.map(pa => pa.userId));
    let avail = users.filter(u => !assigned.has(u.id));
    if (searchUser.trim()) {
      const t = searchUser.toLowerCase();
      avail = avail.filter(u =>
        getUserDisplayName(u).toLowerCase().includes(t) ||
        (u.email || "").toLowerCase().includes(t) ||
        (u.username || "").toLowerCase().includes(t)
      );
    }
    return avail;
  }, [users, projectAssignments, searchUser]);

  const handleSelectProject = (p: Project) => {
    setSelectedProject(p);
    setProjectSearch(getProjectDisplayName(p));
    setProjectDropdownOpen(false);
    setSelectedUsers([]);
  };

  const handleClearProject = () => {
    setSelectedProject(null);
    setProjectSearch("");
    setSelectedUsers([]);
    setProjectAssignments([]);
  };

  const handleToggleUser = (id: number) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === availableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(availableUsers.map(u => u.id));
    }
  };

  const handleAssignUsers = async () => {
    if (!selectedProject || selectedUsers.length === 0) return;
    const managerId = Number(localStorage.getItem("userId")) || 0;
    const pid = getProjectId(selectedProject);
    setAssigning(true);
    try {
      for (const uid of selectedUsers) {
        await assignUserToProject(uid, pid, managerId);
      }
      const a = await getProjectUsers(pid);
      setProjectAssignments(Array.isArray(a) ? a : []);
      showToast(`${selectedUsers.length} medewerker(s) toegewezen`, "success");
      setSelectedUsers([]);
    } catch {
      showToast("Fout bij toewijzen", "error");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!selectedProject) return;
    if (!confirm("Medewerker verwijderen van dit project?")) return;
    const pid = getProjectId(selectedProject);
    try {
      await removeUserFromProject(userId, pid);
      const a = await getProjectUsers(pid);
      setProjectAssignments(Array.isArray(a) ? a : []);
      showToast("Medewerker verwijderd", "success");
    } catch {
      showToast("Fout bij verwijderen", "error");
    }
  };

  const handleEditMaxHours = (userId: number, currentMaxHours?: number) => {
    setEditingMaxHours(userId);
    setMaxHoursValue(currentMaxHours?.toString() || "");
  };

  const handleSaveMaxHours = async (userId: number) => {
    if (!selectedProject) return;
    const pid = getProjectId(selectedProject);
    try {
      const maxHours = maxHoursValue ? parseFloat(maxHoursValue) : null;
      await updateUserProjectHours(userId, pid, null, maxHours);
      const a = await getProjectUsers(pid);
      setProjectAssignments(Array.isArray(a) ? a : []);
      setEditingMaxHours(null);
      setMaxHoursValue("");
      showToast(maxHours ? `Max uren ingesteld op ${maxHours}` : "Max uren verwijderd", "success");
    } catch {
      showToast("Fout bij opslaan", "error");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Project Toewijzingen</h1>
          <p className="text-xs text-slate-500 mt-0.5">Wijs medewerkers toe aan projecten</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <FolderOpen className="w-3.5 h-3.5" />
            {projects.length} projecten
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <Users className="w-3.5 h-3.5" />
            {users.length} medewerkers
          </span>
        </div>
      </div>

      {/* Project zoeken */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Search className="w-3.5 h-3.5" />
          Project Selecteren
        </p>
        <div ref={projectSearchRef} className="relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Zoek op projectnaam of code..."
              className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectSearch}
              onChange={(e) => {
                setProjectSearch(e.target.value);
                setProjectDropdownOpen(true);
                if (!e.target.value) setSelectedProject(null);
              }}
              onFocus={() => setProjectDropdownOpen(true)}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {selectedProject && (
                <button
                  onClick={handleClearProject}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${projectDropdownOpen ? "rotate-180" : ""}`}
              />
            </div>
          </div>

          {projectDropdownOpen && !selectedProject && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                  Geen projecten gevonden
                </div>
              ) : (
                groupedFilteredProjects.map(group => (
                  <div key={group.groupId}>
                    <div className="sticky top-0 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 uppercase tracking-wider border-b border-slate-200 dark:border-slate-600">
                      {group.groupName}
                      <span className="ml-1.5 text-slate-400 font-normal normal-case">
                        ({group.projects.length})
                      </span>
                    </div>
                    {group.projects.slice(0, 30).map(project => {
                      const pid = getProjectId(project);
                      return (
                        <button
                          key={pid}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                          onClick={() => handleSelectProject(project)}
                        >
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {getProjectDisplayName(project)}
                          </span>
                        </button>
                      );
                    })}
                    {group.projects.length > 30 && (
                      <div className="px-4 py-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/50">
                        +{group.projects.length - 30} meer in deze groep
                      </div>
                    )}
                  </div>
                ))
              )}
              {filteredProjects.length > 200 && (
                <div className="px-4 py-2 text-xs text-center text-slate-500 bg-slate-50 dark:bg-slate-700">
                  Verfijn je zoekopdracht voor betere resultaten
                </div>
              )}
            </div>
          )}
        </div>

        {selectedProject && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {getProjectDisplayName(selectedProject)}
            </span>
            <button
              onClick={handleClearProject}
              className="ml-auto text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Wijzig
            </button>
          </div>
        )}
      </div>

      {/* Toewijzingen */}
      {selectedProject && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Huidige medewerkers */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Toegewezen ({projectAssignments.length})
              </p>
            </div>
            <div className="p-4">
              {projectAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen medewerkers</p>
                  <p className="text-xs text-slate-500 mt-1">Nog geen medewerkers toegewezen aan dit project</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {projectAssignments.map(assignment => {
                    const user = users.find(u => u.id === assignment.userId);
                    const name = assignment.userName ||
                      (user ? getUserDisplayName(user) : `Gebruiker ${assignment.userId}`);
                    const isEditing = editingMaxHours === assignment.userId;

                    return (
                      <div
                        key={assignment.id || assignment.userId}
                        className="py-2.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 group border border-slate-100 dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {getInitials(name)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {name}
                              </div>
                              {user?.email && (
                                <div className="text-xs text-slate-500 truncate">{user.email}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemove(assignment.userId)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">Max uren:</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="Geen limiet"
                                value={maxHoursValue}
                                onChange={(e) => setMaxHoursValue(e.target.value)}
                                className="w-20 h-6 text-xs px-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handleSaveMaxHours(assignment.userId)}
                                className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingMaxHours(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditMaxHours(assignment.userId, assignment.maxHours)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {assignment.maxHours
                                ? `${assignment.maxHours} uur`
                                : "Geen limiet (klik om in te stellen)"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Medewerkers toevoegen */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Toevoegen
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Zoek medewerker..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />
              </div>

              {availableUsers.length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{availableUsers.length} beschikbaar</span>
                  <button
                    onClick={handleSelectAll}
                    className="hover:text-slate-700 dark:hover:text-slate-300 underline"
                  >
                    {selectedUsers.length === availableUsers.length
                      ? "Deselecteer alles"
                      : "Selecteer alles"}
                  </button>
                </div>
              )}

              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-500">
                    {searchUser ? "Geen resultaten" : "Iedereen is al toegewezen"}
                  </div>
                ) : (
                  availableUsers.map(user => {
                    const selected = selectedUsers.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                          selected
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selected}
                          onChange={() => handleToggleUser(user.id)}
                        />
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(getUserDisplayName(user))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {getUserDisplayName(user)}
                          </div>
                          {user.email && (
                            <div className="text-xs text-slate-500 truncate">{user.email}</div>
                          )}
                        </div>
                        {user.role === "manager" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">
                            Manager
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              <button
                onClick={handleAssignUsers}
                disabled={selectedUsers.length === 0 || assigning}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {assigning ? "Bezig..." : `${selectedUsers.length} toewijzen`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder als geen project geselecteerd */}
      {!selectedProject && (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen project geselecteerd</p>
          <p className="text-sm text-slate-500 mt-1">
            Selecteer een project hierboven om medewerkers toe te wijzen
          </p>
        </div>
      )}
    </div>
  );
}
