"use client";
import { useState } from "react";
import { BarChart3, Users, Clock, Building2, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { showToast } from "@/components/ui/toast";
import { getUsers, getCompanies, getTimeEntries } from "@/lib/api";
import dayjs from "dayjs";

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState<string | null>(null);

  const downloadCSV = (content: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const generateUsersReport = async () => {
    setGenerating("users");
    try {
      const users = await getUsers();
      const csv = [["ID","Voornaam","Achternaam","Email","Functie","Rol","Status","Aangemaakt"].join(","),
        ...users.map((u: any) => [u.id, `"${u.firstName||""}"`, `"${u.lastName||""}"`, u.email||"", `"${u.function||""}"`, u.rank||"", u.active!==false?"Actief":"Inactief", u.createdAt?dayjs(u.createdAt).format("YYYY-MM-DD"):""].join(","))].join("\n");
      downloadCSV(csv, `gebruikers-rapport-${dayjs().format("YYYY-MM-DD")}.csv`);
      showToast(t("admin.reports.usersGenerated"), "success");
    } catch { showToast(t("admin.reports.generateError"), "error"); } finally { setGenerating(null); }
  };

  const generateHoursReport = async () => {
    setGenerating("hours");
    try {
      const entries = await getTimeEntries();
      const csv = [["ID","Gebruiker","Project","Bedrijf","Datum","Start","Eind","Uren","Pauze","Status","Notities"].join(","),
        ...entries.map((e: any) => [e.id, `"${e.user?.firstName} ${e.user?.lastName}"`, `"${e.project?.name||""}"`, `"${e.project?.projectGroup?.company?.name||""}"`, dayjs(e.startTime).format("YYYY-MM-DD"), dayjs(e.startTime).format("HH:mm"), dayjs(e.endTime).format("HH:mm"), ((dayjs(e.endTime).diff(dayjs(e.startTime),"minute")-(e.breakMinutes||0))/60).toFixed(2), e.breakMinutes||0, e.status||"", `"${e.notes||""}"`].join(","))].join("\n");
      downloadCSV(csv, `uren-rapport-${dayjs().format("YYYY-MM-DD")}.csv`);
      showToast(t("admin.reports.hoursGenerated"), "success");
    } catch { showToast(t("admin.reports.generateError"), "error"); } finally { setGenerating(null); }
  };

  const generateCompaniesReport = async () => {
    setGenerating("companies");
    try {
      const companies = await getCompanies();
      const csv = [["ID","Naam","Email","Telefoon","Adres","Status","Aangemaakt"].join(","),
        ...companies.map((c: any) => [c.id, `"${c.name||""}"`, c.email||"", c.phone||"", `"${c.address||""}"`, c.active!==false?"Actief":"Inactief", c.createdAt?dayjs(c.createdAt).format("YYYY-MM-DD"):""].join(","))].join("\n");
      downloadCSV(csv, `bedrijven-rapport-${dayjs().format("YYYY-MM-DD")}.csv`);
      showToast(t("admin.reports.companiesGenerated"), "success");
    } catch { showToast(t("admin.reports.generateError"), "error"); } finally { setGenerating(null); }
  };

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "20px" };

  const reports = [
    { key: "users",     icon: Users,     color: "var(--c-accent)",  bg: "var(--c-accent-weak)", label: t("admin.reports.users"),     desc: t("admin.reports.usersDesc"),     fn: generateUsersReport },
    { key: "hours",     icon: Clock,     color: "var(--c-muted)",   bg: "var(--c-hover)",       label: t("admin.reports.hours"),     desc: t("admin.reports.hoursDesc"),     fn: generateHoursReport },
    { key: "companies", icon: Building2, color: "var(--c-green)",   bg: "var(--c-green-weak)",  label: t("admin.reports.companies"), desc: t("admin.reports.companiesDesc"), fn: generateCompaniesReport },
  ];

  const DownloadBtn = ({ reportKey, fn }: { reportKey: string; fn: () => Promise<void> }) => (
    <button
      onClick={fn}
      disabled={generating === reportKey}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: generating === reportKey ? "not-allowed" : "pointer", opacity: generating === reportKey ? 0.7 : 1 }}
    >
      {generating === reportKey
        ? <><Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> {t("admin.reports.generating")}</>
        : <><Download size={14} /> {t("admin.reports.download")}</>}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>{t("admin.reports.title")}</h1>
        <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>{t("admin.reports.subtitle")}</p>
      </div>

      {/* Report cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {reports.map((r) => (
          <div key={r.key} style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <r.icon size={18} color={r.color} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{r.label}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "0 0 14px" }}>{r.desc}</p>
            <DownloadBtn reportKey={r.key} fn={r.fn} />
          </div>
        ))}
      </div>

      {/* Advanced */}
      <div style={panelStyle}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <BarChart3 size={14} color="var(--c-muted)" /> {t("admin.reports.advanced")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[{ key: "monthly", label: t("admin.reports.monthly"), desc: t("admin.reports.monthlyDesc") }, { key: "yearly", label: t("admin.reports.yearly"), desc: t("admin.reports.yearlyDesc") }].map((r) => (
            <div key={r.key} style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "14px 16px" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "0 0 4px" }}>{r.label}</p>
              <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "0 0 12px" }}>{r.desc}</p>
              <button
                onClick={() => showToast(t("admin.reports.comingSoon"), "info")}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px solid var(--c-border)", borderRadius: 7, background: "none", fontSize: 12, color: "var(--c-text-2)", cursor: "pointer" }}
              >
                <Download size={13} /> {t("common.download")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
