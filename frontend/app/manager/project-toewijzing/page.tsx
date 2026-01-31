"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getProjects, getProjectGroups } from "@/lib/api";
import {
  getPostgresUsers,
  assignUserToProject,
  removeUserFromProject,
  getProjectUsers,
  type PostgresUser,
  type UserProject,
} from "@/lib/api/userProjectApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  // Map group IDs to group names
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
        // Search in project name and code
        if (getProjectDisplayName(p).toLowerCase().includes(t)) return true;
        if ((p.gcCode || "").toLowerCase().includes(t)) return true;
        // Also search in group name
        const gName = p.werkgrpGcId ? (groupNameMap[p.werkgrpGcId] || "") : "";
        if (gName.toLowerCase().includes(t)) return true;
        return false;
      });
    }
    return filtered;
  }, [projects, projectSearch, groupNameMap]);

  // Group filtered projects by werkgrpGcId for grouped dropdown display
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

    // Sort groups by name
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Project Toewijzingen
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Wijs medewerkers toe aan projecten
          </p>
        </div>
        <div className="flex gap-3">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            {projects.length} projecten
          </Badge>
          <Badge variant="secondary" className="text-sm py-1 px-3">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            {users.length} medewerkers
          </Badge>
        </div>
      </div>

      {/* Project zoeken */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Project Selecteren
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={projectSearchRef} className="relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Zoek op projectnaam of code..."
                className="pl-9 pr-16"
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
                  <button onClick={handleClearProject} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${projectDropdownOpen ? "rotate-180" : ""}`} />
              </div>
            </div>

            {projectDropdownOpen && !selectedProject && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {filteredProjects.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center">
                    Geen projecten gevonden
                  </div>
                ) : (
                  groupedFilteredProjects.map(group => (
                    <div key={group.groupId}>
                      <div className="sticky top-0 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 uppercase tracking-wider border-b border-slate-200 dark:border-slate-600">
                        {group.groupName}
                        <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal normal-case">({group.projects.length})</span>
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
              <button onClick={handleClearProject} className="ml-auto text-xs text-slate-500 hover:text-slate-700 underline">
                Wijzig
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toewijzingen */}
      {selectedProject && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Huidige medewerkers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Toegewezen ({projectAssignments.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectAssignments.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Nog geen medewerkers toegewezen
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {projectAssignments.map(assignment => {
                    const user = users.find(u => u.id === assignment.userId);
                    const name = assignment.userName ||
                      (user ? getUserDisplayName(user) : `Gebruiker ${assignment.userId}`);
                    return (
                      <div
                        key={assignment.id || assignment.userId}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {getInitials(name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{name}</div>
                            {user?.email && (
                              <div className="text-xs text-slate-500 truncate">{user.email}</div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          onClick={() => handleRemove(assignment.userId)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medewerkers toevoegen */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Toevoegen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Zoekbalk */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Zoek medewerker..."
                    className="pl-9"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                  />
                </div>

                {/* Selecteer alles */}
                {availableUsers.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{availableUsers.length} beschikbaar</span>
                    <button onClick={handleSelectAll} className="hover:text-slate-700 underline">
                      {selectedUsers.length === availableUsers.length ? "Deselecteer alles" : "Selecteer alles"}
                    </button>
                  </div>
                )}

                {/* Lijst */}
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
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selected}
                            onChange={() => handleToggleUser(user.id)}
                          />
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Manager</Badge>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Toewijzen knop */}
                <Button
                  className="w-full"
                  onClick={handleAssignUsers}
                  disabled={selectedUsers.length === 0 || assigning}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {assigning ? "Bezig..." : `${selectedUsers.length} toewijzen`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Placeholder als geen project geselecteerd */}
      {!selectedProject && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              Selecteer een project hierboven om medewerkers toe te wijzen
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
