"use client";

import { useState, useEffect } from "react";
import { showToast } from "@/components/ui/toast";
import { getValidations, runValidations, getValidationsHistory } from "@/lib/api";
import { AlertTriangle, CheckCircle, RefreshCw, Search, AlertCircle, Info } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface ValidationRule    { id: string; name: string; description: string; severity: "error" | "warning" | "info"; enabled: boolean; }
interface ValidationResult  { id: string; rule: string; severity: "error" | "warning" | "info"; message: string; userId?: number; date?: string; details?: string; }
interface ValidationHistory { id: number; runTimestamp: string; totalValidations: number; errorCount: number; warningCount: number; results?: ValidationResult[]; }

const severityMeta: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  error:   { label: "Fout",          color: "var(--c-red)",    bg: "var(--c-red-weak)",   Icon: AlertTriangle },
  warning: { label: "Waarschuwing",  color: "var(--c-amber)",  bg: "var(--c-amber-weak)", Icon: AlertCircle   },
  info:    { label: "Info",          color: "var(--c-accent)", bg: "var(--c-accent-weak)", Icon: Info          },
};
function SeverityBadge({ severity }: { severity: string }) {
  const m = severityMeta[severity] || { label: severity, color: "var(--c-muted)", bg: "var(--c-hover)", Icon: Info };
  return <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color }}>{m.label}</span>;
}
function SeverityIcon({ severity }: { severity: string }) {
  const m = severityMeta[severity];
  if (!m) return null;
  return <m.Icon size={15} color={m.color} />;
}

const validationRules: ValidationRule[] = [
  { id: "excessive_hours",    name: "Excessieve Uren",           description: "Controleert of medewerkers niet meer dan 24 uur per dag registreren", severity: "error",   enabled: true },
  { id: "overlapping_entries",name: "Overlappende Registraties", description: "Detecteert overlappende tijdregistraties voor dezelfde medewerker",    severity: "warning", enabled: true },
  { id: "missing_break",      name: "Ontbrekende Pauze",         description: "Controleert of lange werkdagen (>8 uur) een pauze bevatten",           severity: "warning", enabled: true },
  { id: "future_entries",     name: "Toekomstige Registraties",  description: "Detecteert tijdregistraties die in de toekomst liggen",                severity: "info",    enabled: true },
];

export default function ValidationsPage() {
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [history, setHistory] = useState<ValidationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => { loadValidations(); loadHistory(); }, []);

  const loadValidations = async () => {
    setLoading(true);
    try { const d = await getValidations(); setValidations(Array.isArray(d) ? d : []); } catch { showToast("Fout bij laden validaties", "error"); } finally { setLoading(false); }
  };
  const loadHistory = async () => {
    try { const d = await getValidationsHistory(); setHistory(Array.isArray(d) ? d : []); } catch {}
  };

  const handleRunValidations = async () => {
    setRunning(true);
    try {
      const result = await runValidations();
      setLastRun(dayjs().toISOString());
      if (result?.validations) setValidations(result.validations);
      await loadHistory();
      const errors = result?.errorCount || 0, warnings = result?.warningCount || 0;
      if (errors > 0) showToast(`${errors} fouten gevonden`, "error");
      else if (warnings > 0) showToast(`${warnings} waarschuwingen gevonden`, "warning");
      else showToast("Alle validaties geslaagd!", "success");
    } catch { showToast("Fout bij uitvoeren validaties", "error"); } finally { setRunning(false); }
  };

  const filteredValidations = validations.filter((v) => {
    const ms = !searchQuery || v.message.toLowerCase().includes(searchQuery.toLowerCase()) || v.rule.toLowerCase().includes(searchQuery.toLowerCase());
    const mv = severityFilter === "all" || v.severity === severityFilter;
    return ms && mv;
  });

  const stats = {
    total:    validations.length,
    errors:   validations.filter((v) => v.severity === "error").length,
    warnings: validations.filter((v) => v.severity === "warning").length,
    info:     validations.filter((v) => v.severity === "info").length,
  };

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10 };
  const inputStyle: React.CSSProperties = { height: 34, padding: "0 10px", fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Validaties</h1>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>
            Controleer de integriteit van tijdregistraties{lastRun ? ` · Laatste controle: ${dayjs(lastRun).fromNow()}` : ""}
          </p>
        </div>
        <button
          onClick={handleRunValidations}
          disabled={running}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.7 : 1 }}
        >
          {running ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Bezig...</> : <><RefreshCw size={14} /> Validaties Uitvoeren</>}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {[
          { label: "Totaal",         value: stats.total,    color: "var(--c-text)"  },
          { label: "Fouten",         value: stats.errors,   color: "var(--c-red)"   },
          { label: "Waarschuwingen", value: stats.warnings, color: "var(--c-amber)" },
          { label: "Info",           value: stats.info,     color: "var(--c-accent)"},
        ].map((s) => (
          <div key={s.label} style={{ ...panelStyle, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: "4px 0 0" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div style={{ ...panelStyle, padding: "18px 20px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "0 0 12px" }}>Validatie Regels</p>
        {validationRules.map((rule, idx) => {
          const m = severityMeta[rule.severity] || severityMeta.info;
          return (
            <div key={rule.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: idx < validationRules.length - 1 ? "1px solid var(--c-border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <m.Icon size={15} color={m.color} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", margin: 0 }}>{rule.name}</p>
                  <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "2px 0 0" }}>{rule.description}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <SeverityBadge severity={rule.severity} />
                <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: rule.enabled ? "var(--c-green-weak)" : "var(--c-hover)", color: rule.enabled ? "var(--c-green)" : "var(--c-muted)" }}>
                  {rule.enabled ? "Ingeschakeld" : "Uitgeschakeld"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current validations */}
      <div style={{ ...panelStyle, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--c-border)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>Huidige Validaties ({filteredValidations.length})</span>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--c-muted)", pointerEvents: "none" }} />
              <input placeholder="Zoeken..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...inputStyle, paddingLeft: 26, width: 180 }} />
            </div>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={inputStyle}>
              <option value="all">Alle Ernst</option>
              <option value="error">Fouten</option>
              <option value="warning">Waarschuwingen</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
        <div style={{ padding: "16px 18px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
              <div style={{ width: 28, height: 28, border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Validaties laden...</p>
            </div>
          ) : filteredValidations.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10 }}>
              <CheckCircle size={32} color="var(--c-green)" />
              <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Geen validatieproblemen gevonden</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredValidations.map((v) => (
                <div key={v.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", border: "1px solid var(--c-border)", borderRadius: 8 }}>
                  <SeverityIcon severity={v.severity} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{v.rule}</span>
                      <SeverityBadge severity={v.severity} />
                    </div>
                    <p style={{ fontSize: 13, color: "var(--c-text-2)", margin: 0 }}>{v.message}</p>
                    {v.details && (
                      <div style={{ marginTop: 8, background: "var(--c-panel-2)", borderRadius: 7, padding: "8px 12px" }}>
                        <p style={{ fontSize: 12, color: "var(--c-muted)", margin: 0 }}>{v.details}</p>
                      </div>
                    )}
                    {v.date && <p style={{ fontSize: 11, color: "var(--c-muted)", margin: "6px 0 0" }}>Datum: {dayjs(v.date).format("DD MMMM YYYY")}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div style={{ ...panelStyle, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--c-border)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>Validatie Geschiedenis</span>
        </div>
        <div style={{ padding: "16px 18px" }}>
          {history.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Nog geen validaties uitgevoerd</p>
          ) : (
            history.map((run, idx) => (
              <div key={run.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: idx < history.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", margin: 0 }}>{dayjs(run.runTimestamp).format("DD MMMM YYYY HH:mm")}</p>
                  <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "2px 0 0" }}>{run.totalValidations} validaties · {run.errorCount} fouten · {run.warningCount} waarschuwingen</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {run.errorCount > 0 && <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: "var(--c-red-weak)", color: "var(--c-red)" }}>{run.errorCount} fouten</span>}
                  {run.warningCount > 0 && <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: "var(--c-amber-weak)", color: "var(--c-amber)" }}>{run.warningCount} waarschuwingen</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
