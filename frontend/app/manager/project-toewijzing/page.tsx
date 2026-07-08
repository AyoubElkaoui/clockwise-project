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

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10 };
  const inputStyle: React.CSSProperties = { height: 34, padding: "0 10px", fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Project Toewijzingen</h1>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>Wijs medewerkers toe aan projecten</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { icon: FolderOpen, label: `${projects.length} projecten` },
            { icon: Users,      label: `${users.length} medewerkers` },
          ].map(({ icon: Icon, label }) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500, background: "var(--c-hover)", color: "var(--c-text-2)" }}>
              <Icon size={13} /> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Project selecteren */}
      <div style={{ ...panelStyle, padding: "18px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <Search size={12} /> Project Selecteren
        </p>
        <div ref={projectSearchRef} style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Zoek op projectnaam of code..."
              value={projectSearch}
              onChange={(e) => {
                setProjectSearch(e.target.value);
                setProjectDropdownOpen(true);
                if (!e.target.value) setSelectedProject(null);
              }}
              onFocus={() => setProjectDropdownOpen(true)}
              style={{ ...inputStyle, paddingLeft: 34, paddingRight: 60 }}
            />
            <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 4 }}>
              {selectedProject && (
                <button
                  onClick={handleClearProject}
                  style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", display: "flex", alignItems: "center" }}
                >
                  <X size={14} />
                </button>
              )}
              <ChevronDown
                size={14}
                color="var(--c-muted)"
                style={{ transition: "transform 0.15s", transform: projectDropdownOpen ? "rotate(180deg)" : "none" }}
              />
            </div>
          </div>

          {projectDropdownOpen && !selectedProject && (
            <div style={{ position: "absolute", zIndex: 50, width: "100%", marginTop: 4, background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.12)", maxHeight: 320, overflowY: "auto" }}>
              {filteredProjects.length === 0 ? (
                <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--c-muted)", textAlign: "center" }}>
                  Geen projecten gevonden
                </div>
              ) : (
                groupedFilteredProjects.map(group => (
                  <div key={group.groupId}>
                    <div style={{ position: "sticky", top: 0, padding: "6px 14px", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--c-hover)", borderBottom: "1px solid var(--c-border)" }}>
                      {group.groupName}
                      <span style={{ marginLeft: 6, fontWeight: 400, textTransform: "none", opacity: 0.7 }}>({group.projects.length})</span>
                    </div>
                    {group.projects.slice(0, 30).map(project => (
                      <button
                        key={getProjectId(project)}
                        onClick={() => handleSelectProject(project)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: "var(--c-text)", background: "none", border: "none", borderBottom: "1px solid var(--c-border)", cursor: "pointer", fontFamily: "inherit" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--c-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <span style={{ fontWeight: 500 }}>{getProjectDisplayName(project)}</span>
                      </button>
                    ))}
                    {group.projects.length > 30 && (
                      <div style={{ padding: "6px 14px", fontSize: 12, color: "var(--c-muted)", background: "var(--c-hover)" }}>
                        +{group.projects.length - 30} meer in deze groep
                      </div>
                    )}
                  </div>
                ))
              )}
              {filteredProjects.length > 200 && (
                <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--c-muted)", textAlign: "center", background: "var(--c-hover)" }}>
                  Verfijn je zoekopdracht voor betere resultaten
                </div>
              )}
            </div>
          )}
        </div>

        {selectedProject && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <CheckCircle2 size={15} color="var(--c-green)" />
            <span style={{ fontWeight: 500, color: "var(--c-text)" }}>{getProjectDisplayName(selectedProject)}</span>
            <button
              onClick={handleClearProject}
              style={{ marginLeft: "auto", fontSize: 12, color: "var(--c-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Wijzig
            </button>
          </div>
        )}
      </div>

      {/* Toewijzingen */}
      {selectedProject && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Huidige medewerkers */}
          <div style={{ ...panelStyle, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--c-border)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", display: "flex", alignItems: "center", gap: 7 }}>
                <Users size={14} /> Toegewezen ({projectAssignments.length})
              </span>
            </div>
            <div style={{ padding: 16 }}>
              {projectAssignments.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Users size={20} color="var(--c-muted)" />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Geen medewerkers</p>
                  <p style={{ fontSize: 12, color: "var(--c-muted)", margin: 0 }}>Nog geen medewerkers toegewezen aan dit project</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
                  {projectAssignments.map(assignment => {
                    const user = users.find(u => u.id === assignment.userId);
                    const name = assignment.userName ||
                      (user ? getUserDisplayName(user) : `Gebruiker ${assignment.userId}`);
                    const isEditing = editingMaxHours === assignment.userId;

                    return (
                      <div
                        key={assignment.id || assignment.userId}
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--c-border)", position: "relative" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--c-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--c-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {getInitials(name)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                              {user?.email && <p style={{ fontSize: 11, color: "var(--c-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemove(assignment.userId)}
                            style={{ padding: 5, background: "none", border: "none", cursor: "pointer", color: "var(--c-red)", borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--c-red-weak)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                          <Clock size={12} color="var(--c-muted)" />
                          <span style={{ fontSize: 11, color: "var(--c-muted)" }}>Max uren:</span>
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="Geen limiet"
                                value={maxHoursValue}
                                onChange={(e) => setMaxHoursValue(e.target.value)}
                                style={{ width: 76, height: 24, padding: "0 8px", fontSize: 12, border: "1px solid var(--c-border)", borderRadius: 6, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit" }}
                              />
                              <button
                                onClick={() => handleSaveMaxHours(assignment.userId)}
                                style={{ padding: 4, background: "var(--c-accent)", border: "none", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center" }}
                              >
                                <Save size={11} color="#fff" />
                              </button>
                              <button
                                onClick={() => setEditingMaxHours(null)}
                                style={{ padding: 4, background: "none", border: "1px solid var(--c-border)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center" }}
                              >
                                <X size={11} color="var(--c-muted)" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditMaxHours(assignment.userId, assignment.maxHours)}
                              style={{ fontSize: 11, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit" }}
                            >
                              {assignment.maxHours ? `${assignment.maxHours} uur` : "Geen limiet (klik om in te stellen)"}
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
          <div style={{ ...panelStyle, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--c-border)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", display: "flex", alignItems: "center", gap: 7 }}>
                <UserPlus size={14} /> Toevoegen
              </span>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-muted)", pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder="Zoek medewerker..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 30 }}
                />
              </div>

              {availableUsers.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--c-muted)" }}>
                  <span>{availableUsers.length} beschikbaar</span>
                  <button
                    onClick={handleSelectAll}
                    style={{ fontSize: 12, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit" }}
                  >
                    {selectedUsers.length === availableUsers.length ? "Deselecteer alles" : "Selecteer alles"}
                  </button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
                {availableUsers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", fontSize: 13, color: "var(--c-muted)" }}>
                    {searchUser ? "Geen resultaten" : "Iedereen is al toegewezen"}
                  </div>
                ) : (
                  availableUsers.map(user => {
                    const selected = selectedUsers.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: selected ? "var(--c-accent-weak)" : "transparent" }}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--c-hover)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = selected ? "var(--c-accent-weak)" : "transparent"; }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleToggleUser(user.id)}
                          style={{ width: 14, height: 14, accentColor: "var(--c-accent)", cursor: "pointer", flexShrink: 0 }}
                        />
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--c-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(getUserDisplayName(user))}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getUserDisplayName(user)}</p>
                          {user.email && <p style={{ fontSize: 11, color: "var(--c-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>}
                        </div>
                        {user.role === "manager" && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--c-text-2)", border: "1px solid var(--c-border)", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>Manager</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              <button
                onClick={handleAssignUsers}
                disabled={selectedUsers.length === 0 || assigning}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "9px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: selectedUsers.length === 0 || assigning ? "not-allowed" : "pointer", opacity: selectedUsers.length === 0 || assigning ? 0.5 : 1 }}
              >
                <UserPlus size={14} />
                {assigning ? "Bezig..." : `${selectedUsers.length} toewijzen`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder als geen project geselecteerd */}
      {!selectedProject && (
        <div style={{ ...panelStyle, borderStyle: "dashed", padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FolderOpen size={24} color="var(--c-muted)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Geen project geselecteerd</p>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Selecteer een project hierboven om medewerkers toe te wijzen</p>
        </div>
      )}
    </div>
  );
}
