"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Loader2, User, FileText, CheckCircle, XCircle, CalendarDays, Settings } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface Activity {
  id: number;
  userId: number;
  type: string;
  action: string;
  message: string;
  details: string;
  read: boolean;
  timestamp: string;
  user?: { id: number; firstName: string; lastName: string };
}

function getIcon(type: string) {
  const t = type.toLowerCase();
  if (t === "workflow")   return <FileText   size={15} color="var(--c-amber)" />;
  if (t === "approval")  return <CheckCircle size={15} color="var(--c-green)" />;
  if (t === "rejection") return <XCircle     size={15} color="var(--c-red)"   />;
  if (t === "vacation")  return <CalendarDays size={15} color="var(--c-accent)" />;
  if (t === "system")    return <Settings    size={15} color="var(--c-muted)" />;
  return <Bell size={15} color="var(--c-muted)" />;
}

function getTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t === "workflow")   return "var(--c-amber)";
  if (t === "approval")  return "var(--c-green)";
  if (t === "rejection") return "var(--c-red)";
  if (t === "vacation")  return "var(--c-accent)";
  return "var(--c-muted)";
}

export default function ManagerNotificatiesPage() {
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount   = notifications.filter((n) => n.read).length;

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) { showToast("Gebruiker niet ingelogd", "error"); setLoading(false); return; }
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { "X-USER-ID": userId.toString(), "ngrok-skip-browser-warning": "1" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setNotifications(Array.isArray(data)
        ? data.map((n: any) => ({ id: n.id, userId, type: n.type, action: n.type, message: n.message, details: n.title || "", read: n.isRead, timestamp: n.createdAt }))
        : []);
    } catch {
      showToast("Kon notificaties niet laden", "error");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      const userId = authUtils.getUserId();
      const res = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: { "X-USER-ID": userId?.toString() || "", "ngrok-skip-browser-warning": "1" },
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      showToast("Gemarkeerd als gelezen", "success");
    } catch { showToast("Fout bij markeren", "error"); }
  };

  const handleMarkAllRead = async () => {
    try {
      const userId = authUtils.getUserId();
      const res = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: "PUT",
        headers: { "X-USER-ID": userId?.toString() || "", "ngrok-skip-browser-warning": "1" },
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast("Alle notificaties gemarkeerd als gelezen", "success");
    } catch { showToast("Fout bij markeren", "error"); }
  };

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Notificaties</h1>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>
            Team notificaties en updates{unreadCount > 0 ? ` · ${unreadCount} ongelezen` : ""}
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: unreadCount === 0 ? "not-allowed" : "pointer", opacity: unreadCount === 0 ? 0.4 : 1 }}
        >
          <Check size={14} /> Alles gelezen
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {[
          { label: "Totaal",    value: notifications.length },
          { label: "Ongelezen", value: unreadCount, color: "var(--c-amber)" },
          { label: "Gelezen",   value: readCount,   color: "var(--c-green)" },
        ].map((s) => (
          <div key={s.label} style={{ ...panelStyle, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: s.color || "var(--c-text)", margin: "4px 0 0" }}>{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ ...panelStyle, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", gap: 7 }}>
          <Bell size={14} color="var(--c-muted)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>Team Notificaties</span>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "56px 0" }}>
            <Loader2 size={20} color="var(--c-muted)" style={{ animation: "spin 0.7s linear infinite" }} />
            <span style={{ fontSize: 13, color: "var(--c-muted)" }}>Laden...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", textAlign: "center", gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={22} color="var(--c-muted)" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Geen notificaties</p>
            <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Er zijn nog geen team notificaties</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, idx) => (
              <div
                key={n.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px",
                  borderBottom: idx < notifications.length - 1 ? "1px solid var(--c-border)" : "none",
                  background: !n.read ? "color-mix(in srgb, var(--c-amber) 5%, transparent)" : "transparent",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {getIcon(n.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>
                          {n.details || n.message}
                        </span>
                        {!n.read && (
                          <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "var(--c-accent-weak)", color: "var(--c-accent)" }}>
                            Nieuw
                          </span>
                        )}
                      </div>
                      {n.details && n.message !== n.details && (
                        <p style={{ fontSize: 12, color: "var(--c-text-2)", margin: "0 0 4px" }}>{n.message}</p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--c-muted)" }}>
                        <span>{dayjs(n.timestamp).fromNow()}</span>
                        {n.user && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <User size={11} /> {n.user.firstName} {n.user.lastName}
                          </span>
                        )}
                        <span style={{ color: getTypeColor(n.type), textTransform: "capitalize" }}>
                          {n.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid var(--c-border)", borderRadius: 7, background: "none", fontSize: 12, color: "var(--c-text-2)", cursor: "pointer", flexShrink: 0 }}
                      >
                        <Check size={12} /> Gelezen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
