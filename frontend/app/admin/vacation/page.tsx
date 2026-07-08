"use client";
import { useState, useEffect, useMemo } from "react";
import { API_URL } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Calendar, Search, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import dayjs from "dayjs";

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: "Goedgekeurd",    color: "var(--c-green)", bg: "var(--c-green-weak)" },
  pending:  { label: "In behandeling", color: "var(--c-amber)", bg: "var(--c-amber-weak)" },
  rejected: { label: "Afgekeurd",      color: "var(--c-red)",   bg: "var(--c-red-weak)"   },
};
function StatusBadge({ status }: { status: string }) {
  const m = statusMeta[status] || { label: status, color: "var(--c-muted)", bg: "var(--c-hover)" };
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color }}>{m.label}</span>;
}

export default function AdminVacationPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/vacation-requests`);
      if (!res.ok) throw new Error();
      setRequests(await res.json());
    } catch { showToast("Fout bij laden vakantieaanvragen", "error"); } finally { setLoading(false); }
  };

  const filteredRequests = useMemo(() => {
    let f = requests;
    if (filterStatus !== "all") f = f.filter((r) => r.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter((r) => r.user?.firstName?.toLowerCase().includes(q) || r.user?.lastName?.toLowerCase().includes(q));
    }
    return f.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [requests, filterStatus, searchQuery]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/vacation-requests/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved", managerComment: comment || undefined }),
      });
      if (!res.ok) throw new Error();
      showToast("Vakantie aanvraag goedgekeurd!", "success");
      setSelectedRequest(null); setComment(""); loadRequests();
    } catch { showToast("Fout bij goedkeuren", "error"); }
  };

  const handleReject = async (id: number) => {
    try {
      await fetch(`${API_URL}/vacation-requests/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", managerComment: comment || undefined }),
      });
      showToast("Vakantie aanvraag afgekeurd.", "success");
      setSelectedRequest(null); setComment(""); loadRequests();
    } catch {}
  };

  const pendingCount  = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10 };
  const btnPrimary = (color: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: color, color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Vakantie Aanvragen</h1>
        <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>{pendingCount} in behandeling</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {[
          { label: "In Behandeling", value: pendingCount,  color: "var(--c-amber)" },
          { label: "Goedgekeurd",    value: approvedCount, color: "var(--c-green)" },
          { label: "Afgekeurd",      value: rejectedCount, color: "var(--c-red)"   },
        ].map((s) => (
          <div key={s.label} style={{ ...panelStyle, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: "4px 0 0" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-muted)", pointerEvents: "none" }} />
          <input
            placeholder="Zoek op naam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ height: 34, width: "100%", paddingLeft: 32, paddingRight: 10, fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["pending", "approved", "rejected", "all"] as const).map((s) => {
            const labels = { pending: "In behandeling", approved: "Goedgekeurd", rejected: "Afgekeurd", all: "Alles" };
            const active = filterStatus === s;
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 13, fontWeight: active ? 600 : 400, background: active ? "var(--c-accent)" : "var(--c-hover)", color: active ? "#fff" : "var(--c-text-2)", border: "none", cursor: "pointer" }}>
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Requests */}
      {filteredRequests.length === 0 ? (
        <div style={{ ...panelStyle, padding: "56px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={20} color="var(--c-muted)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Geen aanvragen</p>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Er zijn geen vakantie aanvragen gevonden voor de huidige filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredRequests.map((req) => {
            const days = dayjs(req.endDate).diff(dayjs(req.startDate), "day") + 1;
            const isSelected = selectedRequest === req.id;
            return (
              <div key={req.id} style={{ ...panelStyle, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--c-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {req.user?.firstName?.charAt(0)}{req.user?.lastName?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{req.user?.firstName} {req.user?.lastName}</span>
                        <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{req.user?.function || "Werknemer"}</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--c-text-2)" }}>
                          <Calendar size={12} />
                          {dayjs(req.startDate).format("DD MMM YYYY")} – {dayjs(req.endDate).format("DD MMM YYYY")}
                        </span>
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--c-hover)", color: "var(--c-text-2)" }}>{days} dagen</span>
                      </div>
                      {req.reason && (
                        <div style={{ background: "var(--c-panel-2)", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                          <p style={{ fontSize: 11, color: "var(--c-muted)", margin: "0 0 3px" }}>Reden</p>
                          <p style={{ fontSize: 13, color: "var(--c-text)", margin: 0 }}>{req.reason}</p>
                        </div>
                      )}
                      {req.managerComment && (
                        <div style={{ background: "var(--c-accent-weak)", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                          <p style={{ fontSize: 11, color: "var(--c-accent)", margin: "0 0 3px" }}>Manager opmerking</p>
                          <p style={{ fontSize: 13, color: "var(--c-text)", margin: 0 }}>{req.managerComment}</p>
                        </div>
                      )}
                      {isSelected && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          <textarea
                            placeholder="Optionele opmerking..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handleApprove(req.id)} style={btnPrimary("var(--c-green)")}><CheckCircle size={13} /> Goedkeuren</button>
                            <button onClick={() => handleReject(req.id)} style={btnPrimary("var(--c-red)")}><XCircle size={13} /> Afkeuren</button>
                            <button onClick={() => { setSelectedRequest(null); setComment(""); }} style={{ padding: "7px 12px", background: "none", border: "1px solid var(--c-border)", borderRadius: 7, fontSize: 13, color: "var(--c-text-2)", cursor: "pointer" }}>Annuleren</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {req.status === "pending" && !isSelected && (
                    <button onClick={() => setSelectedRequest(req.id)} style={btnPrimary("var(--c-accent)")}>Behandelen</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
