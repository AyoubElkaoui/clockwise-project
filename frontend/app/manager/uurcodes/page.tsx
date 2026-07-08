"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { getAllUsers } from "@/lib/manager-api";
import axios from "axios";
import { ListChecks, Search, Users, Save, Briefcase, Plane, AlertTriangle, Clock } from "lucide-react";
import { showToast } from "@/components/ui/toast";

interface TaskCode  { id: number; code: string; description: string; shortName: string | null; isHistorical: boolean; }
interface Allocation { taskCode: string; taskDescription: string; annualBudget: number; used: number; }
interface TeamMember { medewGcId: number; firstName: string; lastName: string; rank: string; isActive: boolean; contractHours: number; }

function getCategoryInfo(code: string): { label: string; color: string; bg: string; Icon: React.ElementType } {
  if (code.startsWith("I"))                                                return { label: "Indirect", color: "var(--c-accent)",  bg: "var(--c-accent-weak)", Icon: Briefcase };
  if (code.startsWith("Z0") || code.startsWith("Z1") || code === "SLEEFTIJD") return { label: "Verlof",   color: "var(--c-green)",  bg: "var(--c-green-weak)", Icon: Plane };
  if (code.startsWith("Z2") || code.startsWith("Z3") || code.startsWith("Z4")) return { label: "Ziekte",  color: "var(--c-red)",    bg: "var(--c-red-weak)",   Icon: AlertTriangle };
  return { label: "Werk", color: "var(--c-amber)", bg: "var(--c-amber-weak)", Icon: Clock };
}

export default function UurcodesPage() {
  const [tasks, setTasks] = useState<TaskCode[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`, { headers: { "ngrok-skip-browser-warning": "1" } }),
        getAllUsers(),
      ]);
      setTasks((tasksRes.data.tasks || []).filter((t: TaskCode) => t.code.startsWith("I") || t.code.startsWith("Z") || t.code === "SLEEFTIJD"));
      setTeamMembers((usersRes || []).filter((u: any) => u.rank !== "inactive" && u.isActive !== false));
    } catch { showToast("Fout bij laden gegevens", "error"); } finally { setLoading(false); }
  };

  const loadAllocations = async (member: TeamMember) => {
    try {
      const res = await axios.get(`${API_URL}/users/${member.medewGcId}/hour-allocations`, { headers: { "ngrok-skip-browser-warning": "1" } });
      setAllocations(res.data || []);
      setHasChanges(false);
    } catch { setAllocations([]); }
  };

  const handleSelectMember = (member: TeamMember) => {
    if (hasChanges && !confirm("Je hebt onopgeslagen wijzigingen. Wil je doorgaan?")) return;
    setSelectedMember(member);
    loadAllocations(member);
  };

  const getAllocation = (code: string) => allocations.find((a) => a.taskCode === code);

  const updateBudget = (taskCode: string, taskDescription: string, value: number) => {
    setHasChanges(true);
    setAllocations((prev) => {
      const idx = prev.findIndex((a) => a.taskCode === taskCode);
      if (idx >= 0) { const u = [...prev]; u[idx] = { ...u[idx], annualBudget: value }; return u; }
      return [...prev, { taskCode, taskDescription, annualBudget: value, used: 0 }];
    });
  };

  const handleSave = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      await axios.put(`${API_URL}/users/${selectedMember.medewGcId}/hour-allocations`, {
        year: new Date().getFullYear(),
        allocations: allocations.map((a) => ({ taskCode: a.taskCode, taskDescription: a.taskDescription, annualBudget: a.annualBudget, used: a.used || 0 })),
      });
      showToast(`Opgeslagen voor ${selectedMember.firstName} ${selectedMember.lastName}`, "success");
      setHasChanges(false);
    } catch { showToast("Fout bij opslaan", "error"); } finally { setSaving(false); }
  };

  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return task.code.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
  });

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10 };
  const thStyle: React.CSSProperties = { padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border)", background: "var(--c-panel-2)" };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Uurcode Toewijzingen</h1>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>Stel per medewerker het jaarlijks budget in per uurcode</p>
        </div>
        {selectedMember && hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            <Save size={14} /> {saving ? "Opslaan..." : "Opslaan"}
          </button>
        )}
      </div>

      {/* Member selection */}
      <div style={{ ...panelStyle, padding: "16px 18px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 5 }}>
          <Users size={12} /> Selecteer medewerker
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {teamMembers.map((m) => {
            const active = selectedMember?.medewGcId === m.medewGcId;
            return (
              <button
                key={m.medewGcId}
                onClick={() => handleSelectMember(m)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: `1px solid ${active ? "var(--c-accent)" : "var(--c-border)"}`, background: active ? "var(--c-accent-weak)" : "transparent", color: active ? "var(--c-accent)" : "var(--c-text)", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer" }}
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: active ? "var(--c-accent)" : "var(--c-hover)", color: active ? "#fff" : "var(--c-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {m.firstName?.charAt(0)}{m.lastName?.charAt(0)}
                </div>
                {m.firstName} {m.lastName}
              </button>
            );
          })}
          {teamMembers.length === 0 && <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Geen teamleden gevonden</p>}
        </div>
      </div>

      {selectedMember ? (
        <>
          {/* Search */}
          <div style={{ position: "relative", maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Zoek uurcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: 34, width: "100%", paddingLeft: 32, paddingRight: 10, fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {/* Table */}
          <div style={{ ...panelStyle, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", gap: 8 }}>
              <ListChecks size={14} color="var(--c-muted)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>
                {selectedMember.firstName} {selectedMember.lastName}
              </span>
              <span style={{ fontSize: 12, color: "var(--c-muted)" }}>({selectedMember.contractHours || 40} uur/week)</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 80 }}>Code</th>
                    <th style={thStyle}>Omschrijving</th>
                    <th style={thStyle}>Categorie</th>
                    <th style={{ ...thStyle, textAlign: "center", width: 90 }}>Budget</th>
                    <th style={{ ...thStyle, textAlign: "center", width: 70 }}>Gebruikt</th>
                    <th style={{ ...thStyle, textAlign: "center", width: 70 }}>Rest</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const alloc = getAllocation(task.code);
                    const budget = alloc?.annualBudget ?? 0;
                    const used = alloc?.used ?? 0;
                    const remaining = budget - used;
                    const cat = getCategoryInfo(task.code);
                    const remainColor = remaining < 0 ? "var(--c-red)" : remaining <= budget * 0.1 ? "var(--c-amber)" : "var(--c-green)";
                    return (
                      <tr
                        key={task.id}
                        style={{ borderBottom: "1px solid var(--c-border)", opacity: budget > 0 ? 1 : 0.55 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--c-hover)"; e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = budget > 0 ? "1" : "0.55"; }}
                      >
                        <td style={{ padding: "9px 14px" }}>
                          <code style={{ padding: "2px 6px", borderRadius: 5, background: "var(--c-hover)", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{task.code}</code>
                        </td>
                        <td style={{ padding: "9px 14px", color: "var(--c-text)" }}>{task.description}</td>
                        <td style={{ padding: "9px 14px" }}>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: cat.bg, color: cat.color }}>
                            {cat.label}
                          </span>
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "center" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={budget || ""}
                            placeholder="0"
                            onChange={(e) => updateBudget(task.code, task.description, parseFloat(e.target.value) || 0)}
                            style={{ width: 60, height: 28, textAlign: "center", fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 6, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit" }}
                          />
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "center", color: "var(--c-muted)", fontVariantNumeric: "tabular-nums" }}>{used > 0 ? used : "–"}</td>
                        <td style={{ padding: "9px 14px", textAlign: "center" }}>
                          {budget > 0 ? (
                            <span style={{ fontSize: 13, fontWeight: 700, color: remainColor, fontVariantNumeric: "tabular-nums" }}>{remaining}</span>
                          ) : (
                            <span style={{ color: "var(--c-border)" }}>–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 18px", borderTop: "1px solid var(--c-border)", background: "var(--c-panel-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--c-muted)" }}>
                {allocations.filter((a) => a.annualBudget > 0).length} van {tasks.length} uurcodes ingesteld
              </span>
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  <Save size={12} /> {saving ? "Opslaan..." : "Wijzigingen opslaan"}
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={{ ...panelStyle, padding: "56px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={22} color="var(--c-muted)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Selecteer een medewerker</p>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Kies hierboven een teamlid om hun uurcode budgetten in te stellen</p>
        </div>
      )}
    </div>
  );
}
