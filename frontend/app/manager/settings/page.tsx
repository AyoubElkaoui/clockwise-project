"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, Save, CheckCircle, Shield, Globe, Moon, Sun } from "lucide-react";
import { showToast } from "@/components/ui/toast";
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";
import authUtils from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";
import i18n from "i18next";

export default function ManagerSettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const [emailOnRequests, setEmailOnRequests] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("managerSettings");
      if (s) {
        const p = JSON.parse(s);
        setEmailOnRequests(p.emailOnRequests ?? true);
        setPushNotifications(p.pushNotifications ?? true);
        setDailySummary(p.dailySummary ?? false);
      }
    } catch {}
  }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem("managerSettings", JSON.stringify({ emailOnRequests, pushNotifications, dailySummary, lastUpdated: new Date().toISOString() }));
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000); }, 500);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { showToast("Nieuwe wachtwoorden komen niet overeen", "error"); return; }
    if (!newPassword || newPassword.length < 6) { showToast("Nieuw wachtwoord moet minimaal 6 karakters bevatten", "error"); return; }
    setChangingPassword(true);
    try {
      const userId = authUtils.getUserId();
      if (!userId) { showToast("Gebruiker niet ingelogd", "error"); return; }
      const res = await fetch(`${API_URL}/users/${userId}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        showToast("Wachtwoord succesvol gewijzigd", "success");
        setPasswordChanged(true);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setTimeout(() => setPasswordChanged(false), 3000);
      } else {
        showToast(`Fout bij wijzigen: ${await res.text()}`, "error");
      }
    } catch { showToast("Fout bij wijzigen wachtwoord", "error"); } finally { setChangingPassword(false); }
  };

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "20px" };
  const inputStyle: React.CSSProperties = { height: 34, width: "100%", padding: "0 10px", fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 5 };

  const ToggleBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, fontSize: 13, fontWeight: active ? 600 : 400, background: active ? "var(--c-accent)" : "transparent", color: active ? "#fff" : "var(--c-text-2)", border: `1px solid ${active ? "var(--c-accent)" : "var(--c-border)"}`, cursor: "pointer" }}
    >
      {children}
    </button>
  );

  const SectionTitle = ({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) => (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon size={14} color="var(--c-muted)" /> {title}
      </p>
      <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "3px 0 0" }}>{sub}</p>
    </div>
  );

  const CheckRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 0" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 15, height: 15, accentColor: "var(--c-accent)", cursor: "pointer" }} />
      <span style={{ fontSize: 13, color: "var(--c-text)" }}>{label}</span>
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Instellingen</h1>
        <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>Manager voorkeuren en account beheer</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Language */}
        <div style={panelStyle}>
          <SectionTitle icon={Globe} title={t("settings.language")} sub="Kies de taal van de applicatie" />
          <div style={{ display: "flex", gap: 8 }}>
            <ToggleBtn active={i18n.language === "nl"} onClick={() => i18n.changeLanguage("nl")}>Nederlands</ToggleBtn>
            <ToggleBtn active={i18n.language === "en"} onClick={() => i18n.changeLanguage("en")}>English</ToggleBtn>
          </div>
        </div>

        {/* Theme */}
        <div style={panelStyle}>
          <SectionTitle icon={theme === "dark" ? Moon : Sun} title={t("settings.theme")} sub="Wissel tussen lichte en donkere modus" />
          <div style={{ display: "flex", gap: 8 }}>
            <ToggleBtn active={theme === "light"} onClick={() => setTheme("light")}><Sun size={13} /> {t("settings.light")}</ToggleBtn>
            <ToggleBtn active={theme === "dark"}  onClick={() => setTheme("dark")} ><Moon size={13} /> {t("settings.dark")}</ToggleBtn>
          </div>
        </div>

        {/* Notifications */}
        <div style={panelStyle}>
          <SectionTitle icon={Bell} title="Notificaties" sub="Beheer je notificatievoorkeuren" />
          <div style={{ marginBottom: 14 }}>
            <CheckRow label="Email bij nieuwe aanvragen" checked={emailOnRequests} onChange={setEmailOnRequests} />
            <CheckRow label="Push notificaties"          checked={pushNotifications} onChange={setPushNotifications} />
            <CheckRow label="Dagelijkse samenvatting"   checked={dailySummary}     onChange={setDailySummary} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", padding: "9px 16px", background: saved ? "var(--c-green)" : "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving || saved ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Opslaan..." : saved ? <><CheckCircle size={14} /> Opgeslagen!</> : <><Save size={14} /> Opslaan</>}
          </button>
        </div>

        {/* 2FA */}
        <div style={panelStyle}>
          <SectionTitle icon={Shield} title="Tweestapsverificatie (2FA)" sub="Extra beveiliging voor je manager account" />
          <div style={{ background: "var(--c-accent-weak)", border: "1px solid color-mix(in srgb, var(--c-accent) 20%, transparent)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-accent)", margin: "0 0 4px" }}>Waarom 2FA?</p>
            <p style={{ fontSize: 12, color: "var(--c-text-2)", margin: 0 }}>
              Als manager heb je toegang tot gevoelige teamgegevens. 2FA beschermt je account.
            </p>
          </div>
          <button
            onClick={() => router.push("/account/2fa")}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "9px 16px", background: "none", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}
          >
            <Shield size={14} /> 2FA Beheren
          </button>
        </div>

        {/* Password */}
        <div style={{ ...panelStyle, gridColumn: "1 / -1" }}>
          <SectionTitle icon={User} title="Wachtwoord Wijzigen" sub="Wijzig je huidige wachtwoord" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
            {[
              { label: "Huidig Wachtwoord",        val: currentPassword, set: setCurrentPassword },
              { label: "Nieuw Wachtwoord",          val: newPassword,     set: setNewPassword },
              { label: "Bevestig Nieuw Wachtwoord", val: confirmPassword,  set: setConfirmPassword },
            ].map((f) => (
              <div key={f.label}>
                <label style={labelStyle}>{f.label}</label>
                <input type="password" value={f.val} onChange={(e) => f.set(e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword || passwordChanged}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: passwordChanged ? "var(--c-green)" : "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: changingPassword || passwordChanged ? "not-allowed" : "pointer", opacity: changingPassword ? 0.7 : 1 }}
          >
            {changingPassword ? "Wijzigen..." : passwordChanged ? <><CheckCircle size={14} /> Gewijzigd!</> : <><Save size={14} /> Wachtwoord Wijzigen</>}
          </button>
        </div>

        {/* Profile */}
        <div style={{ ...panelStyle, gridColumn: "1 / -1" }}>
          <SectionTitle icon={User} title="Profiel Beheer" sub="Bewerk je persoonlijke gegevens, contactinformatie en meer" />
          <button
            onClick={() => router.push("/account")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "none", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}
          >
            <User size={14} /> Naar Profiel Pagina
          </button>
        </div>
      </div>
    </div>
  );
}
