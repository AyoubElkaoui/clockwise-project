"use client";
import { useState, useEffect } from "react";
import { Clock, Plane, FileText, CheckCircle2, ChevronRight, Plus, BarChart2 } from "lucide-react";
import { getVacationRequests } from "@/lib/api";
import { getDrafts, getSubmitted } from "@/lib/api/workflowApi";
import { getCurrentPeriodId } from "@/lib/manager-api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/nl";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import authUtils from "@/lib/auth-utils";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.locale("nl");

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  goedgekeurd:  { label: "Goedgekeurd", color: "var(--c-green)",  bg: "var(--c-green-weak)"  },
  SUBMITTED:    { label: "Ingediend",   color: "var(--c-amber)",  bg: "var(--c-amber-weak)"  },
  ingeleverd:   { label: "Ingediend",   color: "var(--c-amber)",  bg: "var(--c-amber-weak)"  },
  afgekeurd:    { label: "Afgewezen",   color: "var(--c-red)",    bg: "var(--c-red-weak)"    },
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [stats, setStats] = useState({
    weekHours: 0,
    monthHours: 0,
    vacationDays: 0,
    pendingApprovals: 0,
    weekTarget: 40,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [upcomingVacation, setUpcomingVacation] = useState<any>(null);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) { router.push("/login"); return; }
      const userName = authUtils.getUserName();
      setFirstName(userName?.firstName || "Gebruiker");

      const urenperGcId = await getCurrentPeriodId();
      const [drafts, submitted] = await Promise.all([getDrafts(urenperGcId), getSubmitted(urenperGcId)]);
      const allEntries = [...drafts, ...submitted];

      const weekStart = dayjs().startOf("isoWeek");
      const weekEnd   = dayjs().endOf("isoWeek");
      const weekHours = allEntries
        .filter((e: any) => dayjs(e.datum).isBetween(weekStart, weekEnd, null, "[]"))
        .reduce((s: number, e: any) => s + (e.aantal || 0), 0);

      const monthStart = dayjs().startOf("month");
      const monthEnd   = dayjs().endOf("month");
      const monthHours = allEntries
        .filter((e: any) => dayjs(e.datum).isBetween(monthStart, monthEnd, null, "[]"))
        .reduce((s: number, e: any) => s + (e.aantal || 0), 0);

      const pending = allEntries.filter((e: any) => e.status === "SUBMITTED").length;
      const recent  = [...allEntries]
        .sort((a: any, b: any) => dayjs(b.datum).diff(dayjs(a.datum)))
        .slice(0, 6);
      setRecentEntries(recent);

      try {
        const vacations   = await getVacationRequests();
        const userVacations = vacations.filter((v: any) => v.userId === userId);
        const upcoming = userVacations
          .filter((v: any) => v.status === "goedgekeurd" && dayjs(v.startDate).isAfter(dayjs()))
          .sort((a: any, b: any) => dayjs(a.startDate).diff(dayjs(b.startDate)))[0];
        setUpcomingVacation(upcoming || null);
        const usedDays = userVacations
          .filter((v: any) => v.status === "goedgekeurd")
          .reduce((s: number, v: any) => s + dayjs(v.endDate).diff(dayjs(v.startDate), "day") + 1, 0);
        setStats({ weekHours: Math.round(weekHours * 10) / 10, monthHours: Math.round(monthHours * 10) / 10, vacationDays: 25 - usedDays, pendingApprovals: pending, weekTarget: 40 });
      } catch {
        setStats({ weekHours: Math.round(weekHours * 10) / 10, monthHours: Math.round(monthHours * 10) / 10, vacationDays: 25, pendingApprovals: pending, weekTarget: 40 });
      }
    } catch {
      showToast("Fout bij laden dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  const weekPct = Math.min(100, Math.round((stats.weekHours / stats.weekTarget) * 100));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}>
        <div style={{ width: 36, height: 36, border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  const approvedCount = recentEntries.filter((e: any) => e.status === "goedgekeurd").length;

  const statCards = [
    { label: "Uren deze week", value: `${stats.weekHours}u`, sub: `van ${stats.weekTarget}u target`, icon: Clock,        color: "var(--c-accent)",  bg: "var(--c-accent-weak)",  href: "/tijd-registratie" },
    { label: "Uren deze maand", value: `${stats.monthHours}u`, sub: "totaal geregistreerd",          icon: BarChart2,    color: "var(--c-green)",   bg: "var(--c-green-weak)",   href: "/uren-overzicht" },
    { label: "Vakantiedagen",   value: stats.vacationDays,     sub: "resterend dit jaar",             icon: Plane,        color: "#9b59b6",          bg: "#f3eaff",               href: "/vakantie" },
    { label: "Ingediend",       value: stats.pendingApprovals, sub: "wacht op beoordeling",           icon: FileText,     color: "var(--c-amber)",   bg: "var(--c-amber-weak)",   href: "/uren-overzicht" },
  ];

  const hour = dayjs().hour();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--c-muted)", marginBottom: 4 }}>
            {dayjs().format("dddd D MMMM YYYY")}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>
            {greeting}, {firstName} 👋
          </h1>
        </div>
        <button
          onClick={() => router.push("/tijd-registratie")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={15} />
          Uren registreren
        </button>
      </div>

      {/* Week progress */}
      <div style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>Voortgang deze week</span>
          <span style={{ fontSize: 13, color: "var(--c-muted)" }}>{stats.weekHours}u / {stats.weekTarget}u</span>
        </div>
        <div style={{ height: 6, background: "var(--c-border)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${weekPct}%`, background: weekPct >= 100 ? "var(--c-green)" : "var(--c-accent)", borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>
        <p style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 6, marginBottom: 0 }}>
          {weekPct >= 100 ? "Weekdoel bereikt 🎉" : `Nog ${stats.weekTarget - stats.weekHours}u te gaan`}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {statCards.map((s) => (
          <div
            key={s.label}
            onClick={() => router.push(s.href)}
            style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "16px 18px", cursor: "pointer", transition: "border-color 0.15s", display: "flex", flexDirection: "column", gap: 10 }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = s.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--c-border)")}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--c-muted)", fontWeight: 500 }}>{s.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={15} color={s.color} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: 26, fontWeight: 700, color: "var(--c-text)", margin: 0, lineHeight: 1.1 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "3px 0 0" }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

        {/* Recent entries */}
        <div style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--c-border)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", display: "flex", alignItems: "center", gap: 7 }}>
              <Clock size={14} color="var(--c-muted)" />
              Recente Tijdregistraties
            </span>
            <button
              onClick={() => router.push("/uren-overzicht")}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              Alles bekijken <ChevronRight size={13} />
            </button>
          </div>

          {recentEntries.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", textAlign: "center", gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--c-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={20} color="var(--c-muted)" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>Geen registraties</p>
              <p style={{ fontSize: 12, color: "var(--c-muted)", margin: 0 }}>Nog geen tijdregistraties in deze periode.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--c-panel-2)" }}>
                  {["Datum", "Project", "Status", "Uren"].map((h, i) => (
                    <th key={h} style={{ padding: "9px 18px", textAlign: i === 3 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry: any, idx: number) => {
                  const d = dayjs(entry.datum || entry.startTime || entry.date);
                  const meta = statusMeta[entry.status] || { label: "Concept", color: "var(--c-muted)", bg: "var(--c-hover)" };
                  return (
                    <tr
                      key={entry.id || idx}
                      onClick={() => router.push("/uren-overzicht")}
                      style={{ borderBottom: "1px solid var(--c-border)", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--c-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 18px", whiteSpace: "nowrap" }}>
                        <p style={{ fontSize: 11, color: "var(--c-muted)", margin: 0, textTransform: "uppercase" }}>{d.format("ddd")}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: 0 }}>{d.format("D MMM")}</p>
                      </td>
                      <td style={{ padding: "10px 18px", maxWidth: 200 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.werkDescription || entry.projectName || `Project ${entry.werkGcId || "?"}`}
                        </p>
                        <p style={{ fontSize: 12, color: "var(--c-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.omschrijving || entry.notes || "—"}
                        </p>
                      </td>
                      <td style={{ padding: "10px 18px" }}>
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 18px", textAlign: "right", fontWeight: 700, color: "var(--c-text)" }}>
                        {entry.aantal || entry.hours || 0}u
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Quick actions */}
          <div style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--c-border)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>Snelle Acties</span>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Uren registreren",   href: "/tijd-registratie", icon: Clock,       primary: true },
                { label: "Verlof aanvragen",    href: "/vakantie",         icon: Plane,       primary: false },
                { label: "Mijn uren overzicht", href: "/uren-overzicht",   icon: CheckCircle2, primary: false },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", justifyContent: "flex-start",
                    background: action.primary ? "var(--c-accent)" : "transparent",
                    color:      action.primary ? "#fff" : "var(--c-text)",
                    border:     action.primary ? "none" : "1px solid var(--c-border)",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => { if (!action.primary) e.currentTarget.style.background = "var(--c-hover)"; }}
                  onMouseLeave={e => { if (!action.primary) e.currentTarget.style.background = "transparent"; }}
                >
                  <action.icon size={15} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming vacation */}
          {upcomingVacation && (
            <div style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "14px 18px" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Volgende vakantie</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)", margin: "0 0 4px" }}>
                {dayjs(upcomingVacation.startDate).format("D MMM")} – {dayjs(upcomingVacation.endDate).format("D MMM YYYY")}
              </p>
              <p style={{ fontSize: 12, color: "var(--c-muted)", margin: 0 }}>
                {dayjs(upcomingVacation.startDate).diff(dayjs(), "day")} dagen te gaan
              </p>
            </div>
          )}

          {/* This week stat */}
          <div style={{ background: "var(--c-accent-weak)", border: "1px solid color-mix(in srgb, var(--c-accent) 20%, transparent)", borderRadius: 10, padding: "14px 18px" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--c-accent)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Goedgekeurd</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: "var(--c-accent)", margin: "0 0 2px" }}>{approvedCount}</p>
            <p style={{ fontSize: 12, color: "var(--c-accent)", opacity: 0.7, margin: 0 }}>registraties goedgekeurd</p>
          </div>
        </div>
      </div>

    </div>
  );
}
