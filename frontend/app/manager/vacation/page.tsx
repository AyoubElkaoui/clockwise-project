"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getAllUsers, getAllVacationRequests, updateVacationRequestStatus } from "@/lib/manager-api";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import { CheckCircle, XCircle, Search, AlertCircle, Calendar } from "lucide-react";
import dayjs from "dayjs";

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  approved:  { label: "Goedgekeurd",   color: "var(--c-green)", bg: "var(--c-green-weak)" },
  submitted: { label: "In afwachting", color: "var(--c-amber)", bg: "var(--c-amber-weak)" },
  pending:   { label: "In afwachting", color: "var(--c-amber)", bg: "var(--c-amber-weak)" },
  rejected:  { label: "Afgekeurd",     color: "var(--c-red)",   bg: "var(--c-red-weak)"   },
};

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status?.toLowerCase()] || { label: status, color: "var(--c-muted)", bg: "var(--c-hover)" };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

export default function ManagerVacationPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [filteredUser, setFilteredUser] = useState<any>(null);

  const filterRequests = () => {
    let filtered = requests;
    if (filterStatus !== "all") {
      if (filterStatus === "pending") {
        filtered = filtered.filter((r) => ["pending", "submitted"].includes(r.status?.toLowerCase()));
      } else {
        filtered = filtered.filter((r) => r.status?.toLowerCase() === filterStatus);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.userFirstName?.toLowerCase().includes(q) || r.userLastName?.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
    setFilteredRequests(filtered);
  };

  useEffect(() => {
    if (searchParams.get("userId")) setFilterStatus("all");
    loadRequests();
  }, []);
  useEffect(() => { filterRequests(); }, [requests, searchQuery, filterStatus]);

  const loadRequests = async () => {
    try {
      const managerId = authUtils.getUserId();
      if (!managerId) { showToast("Gebruiker niet ingelogd", "error"); return; }
      const userId = searchParams.get("userId");
      const [users, allRequests] = await Promise.all([getAllUsers(), getAllVacationRequests()]);
      const team = users.filter((u: any) => u.managerId === managerId);
      const teamIds = team.map((u: any) => u.id || u.medewGcId);
      let teamRequests;
      if (userId) {
        const user = team.find((u: any) => u.id === Number(userId) || u.medewGcId === Number(userId));
        if (user) { setFilteredUser(user); teamRequests = allRequests.filter((r: any) => r.userId === Number(userId)); }
        else { showToast("Gebruiker niet gevonden in team", "error"); teamRequests = []; }
      } else {
        teamRequests = allRequests.filter((r: any) => teamIds.includes(r.userId));
      }
      setRequests(teamRequests);
    } catch { showToast("Fout bij laden vakantieaanvragen", "error"); } finally { setLoading(false); }
  };

  const handleApprove = async (id: number) => {
    try {
      await updateVacationRequestStatus(id, "approved", comment);
      showToast("Vakantie goedgekeurd! Werknemer ontvangt een notificatie.", "success");
      setSelectedRequest(null); setComment(""); loadRequests();
    } catch { showToast("Fout bij goedkeuren", "error"); }
  };

  const handleReject = async (id: number) => {
    try {
      await updateVacationRequestStatus(id, "rejected", comment);
      showToast("Vakantie afgekeurd. Werknemer ontvangt een notificatie.", "success");
      setSelectedRequest(null); setComment(""); loadRequests();
    } catch { showToast("Fout bij afkeuren", "error"); }
  };

  const pendingCount = requests.filter((r) => ["pending", "submitted"].includes(r.status?.toLowerCase())).length;

  const btnPrimary = (color: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: color, color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
  });
  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10 };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>
          {filteredUser ? `Vakantie — ${filteredUser.firstName} ${filteredUser.lastName}` : "Vakantie Verzoeken"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>
          {pendingCount} verzoeken wachten op goedkeuring
        </p>
      </div>

      {/* Filters */}
      <div style={{ ...panelStyle, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--c-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Zoek op naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: 34, width: "100%", paddingLeft: 32, paddingRight: 10, fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["pending", "approved", "rejected", "all"] as const).map((s) => {
              const labels = { pending: "In afwachting", approved: "Goedgekeurd", rejected: "Afgekeurd", all: "Alles" };
              const active = filterStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{ padding: "6px 12px", borderRadius: 7, fontSize: 13, fontWeight: active ? 600 : 400, background: active ? "var(--c-accent)" : "var(--c-hover)", color: active ? "#fff" : "var(--c-text-2)", border: "none", cursor: "pointer" }}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Request list */}
      {filteredRequests.length === 0 ? (
        <div style={{ ...panelStyle, padding: "56px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={22} color="var(--c-muted)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Geen verzoeken</p>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Geen vakantie verzoeken gevonden voor de geselecteerde filters</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredRequests.map((req) => {
            const isPending = ["pending", "submitted"].includes(req.status?.toLowerCase());
            const isSelected = selectedRequest?.id === req.id;
            const days = dayjs(req.endDate).diff(dayjs(req.startDate), "day") + 1;
            const initials = `${req.userFirstName?.charAt(0) || ""}${req.userLastName?.charAt(0) || ""}`;
            return (
              <div key={req.id} style={{ ...panelStyle, padding: "18px 20px" }}>
                {/* Name + status */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--c-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{req.userFirstName} {req.userLastName}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "2px 0 0" }}>{req.user?.function || "Medewerker"}</p>
                  </div>
                </div>

                {/* Date grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, background: "var(--c-panel-2)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                  {[
                    { label: "Start datum",  value: dayjs(req.startDate).format("DD MMM YYYY") },
                    { label: "Eind datum",   value: dayjs(req.endDate).format("DD MMM YYYY") },
                    { label: "Aantal dagen", value: `${days} dagen`, accent: true },
                  ].map((f) => (
                    <div key={f.label}>
                      <p style={{ fontSize: 11, color: "var(--c-muted)", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={10} /> {f.label}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: f.accent ? "var(--c-accent)" : "var(--c-text)", margin: "3px 0 0" }}>{f.value}</p>
                    </div>
                  ))}
                </div>

                {req.reason && (
                  <div style={{ background: "var(--c-panel-2)", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                    <p style={{ fontSize: 11, color: "var(--c-muted)", margin: "0 0 4px" }}>Reden:</p>
                    <p style={{ fontSize: 13, color: "var(--c-text)", margin: 0 }}>{req.reason}</p>
                  </div>
                )}

                {req.managerComment && (
                  <div style={{ background: "var(--c-accent-weak)", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                    <p style={{ fontSize: 11, color: "var(--c-accent)", margin: "0 0 4px" }}>Manager Opmerking:</p>
                    <p style={{ fontSize: 13, color: "var(--c-text)", margin: 0 }}>{req.managerComment}</p>
                  </div>
                )}

                {isPending && (
                  isSelected ? (
                    <div style={{ background: "var(--c-panel-2)", borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <textarea
                        placeholder="Voeg een opmerking toe (optioneel)..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleApprove(req.id)} style={btnPrimary("var(--c-green)")}>
                          <CheckCircle size={14} /> Goedkeuren
                        </button>
                        <button onClick={() => handleReject(req.id)} style={btnPrimary("var(--c-red)")}>
                          <XCircle size={14} /> Afkeuren
                        </button>
                        <button onClick={() => { setSelectedRequest(null); setComment(""); }} style={{ padding: "7px 14px", background: "none", border: "1px solid var(--c-border)", borderRadius: 7, fontSize: 13, color: "var(--c-text-2)", cursor: "pointer" }}>
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setSelectedRequest(req)} style={btnPrimary("var(--c-accent)")}>
                      Behandelen
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
