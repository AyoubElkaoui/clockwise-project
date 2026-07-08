"use client";
import { useState, useEffect } from "react";
import { showToast } from "@/components/ui/toast";
import { Bell, Shield, Database, Save, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_URL } from "@/lib/api";

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const res = await fetch(`${API_URL}/system-settings`, { headers: { "X-USER-ID": userId || "", "ngrok-skip-browser-warning": "1" } });
      if (res.ok) {
        const data = await res.json();
        setRequire2FA(data.require_2fa === "true");
        setSessionTimeout(data.session_timeout_minutes !== "0");
      }
      const local = localStorage.getItem("adminSettings");
      if (local) { const p = JSON.parse(local); setEmailNotifications(p.emailNotifications ?? true); setPushNotifications(p.pushNotifications ?? true); }
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = localStorage.getItem("userId");
      const res = await fetch(`${API_URL}/system-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-USER-ID": userId || "", "ngrok-skip-browser-warning": "1" },
        body: JSON.stringify({ require_2fa: require2FA.toString(), session_timeout_minutes: sessionTimeout ? "60" : "0" }),
      });
      if (!res.ok) throw new Error();
      localStorage.setItem("adminSettings", JSON.stringify({ emailNotifications, pushNotifications, lastUpdated: new Date().toISOString() }));
      setSaved(true); showToast("Instellingen opgeslagen!", "success");
      setTimeout(() => setSaved(false), 3000);
    } catch { showToast("Fout bij opslaan instellingen", "error"); } finally { setSaving(false); }
  };

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "20px 22px" };
  const SectionTitle = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 7 }}>
      <Icon size={14} color="var(--c-muted)" /> {title}
    </p>
  );
  const CheckRow = ({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "8px 0" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 15, height: 15, marginTop: 2, accentColor: "var(--c-accent)", cursor: "pointer", flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)" }}>{label}</span>
        {sub && <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "2px 0 0" }}>{sub}</p>}
      </div>
    </label>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
        <Loader2 size={28} color="var(--c-accent)" style={{ animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 800 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>{t("admin.settings.title")}</h1>
        <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>{t("admin.settings.subtitle")}</p>
      </div>

      {/* Security */}
      <div style={panelStyle}>
        <SectionTitle icon={Shield} title="Beveiliging" />
        <CheckRow
          label="2FA Verplicht voor alle gebruikers"
          sub="Wanneer ingeschakeld, moeten alle gebruikers tweestapsverificatie instellen voordat ze kunnen inloggen."
          checked={require2FA}
          onChange={setRequire2FA}
        />
        {require2FA && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--c-accent-weak)", border: "1px solid color-mix(in srgb, var(--c-accent) 20%, transparent)", borderRadius: 8, padding: "10px 14px", margin: "8px 0" }}>
            <AlertTriangle size={14} color="var(--c-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "var(--c-text)", margin: 0 }}>
              <strong>Let op:</strong> Gebruikers zonder 2FA worden na inloggen doorgestuurd naar de 2FA setup pagina.
            </p>
          </div>
        )}
        <CheckRow
          label="Automatische sessie timeout (60 minuten)"
          sub="Log gebruikers automatisch uit na 60 minuten inactiviteit."
          checked={sessionTimeout}
          onChange={setSessionTimeout}
        />
      </div>

      {/* Notifications */}
      <div style={panelStyle}>
        <SectionTitle icon={Bell} title="Notificaties" />
        <CheckRow label="Email notificaties voor nieuwe aanvragen" checked={emailNotifications} onChange={setEmailNotifications} />
        <CheckRow label="Push notificaties inschakelen" checked={pushNotifications} onChange={setPushNotifications} />
      </div>

      {/* Database */}
      <div style={panelStyle}>
        <SectionTitle icon={Database} title="Database" />
        <button
          onClick={() => showToast("Database backup gestart...", "info")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "none", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}
        >
          <Database size={14} /> Database Backup Maken
        </button>
      </div>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: saved ? "var(--c-green)" : "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving || saved ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <><Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> Opslaan...</> : saved ? <><CheckCircle size={14} /> Opgeslagen!</> : <><Save size={14} /> Instellingen Opslaan</>}
        </button>
        {saved && <span style={{ fontSize: 12, color: "var(--c-green)" }}>Instellingen zijn succesvol opgeslagen</span>}
      </div>
    </div>
  );
}
