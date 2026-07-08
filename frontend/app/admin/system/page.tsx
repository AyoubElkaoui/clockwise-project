"use client";

import { useState, useEffect } from "react";
import { Activity, Settings, AlertCircle, RefreshCw } from "lucide-react";
import { getSystemHealth, getSystemConfig, updateSystemConfig } from "@/lib/api";

export default function SystemPage() {
  const [health, setHealth] = useState<any>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadHealth(); loadConfig(); }, []);

  const loadHealth = async () => {
    try { setHealth(await getSystemHealth()); } catch {}
  };
  const loadConfig = async () => {
    try { setConfig(await getSystemConfig()); } catch {}
  };
  const handleUpdateConfig = async () => {
    setLoading(true);
    try { await updateSystemConfig(config); alert("Config bijgewerkt!"); } catch {} finally { setLoading(false); }
  };

  const panelStyle: React.CSSProperties = { background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "20px 22px" };
  const inputStyle: React.CSSProperties = { height: 34, width: "100%", padding: "0 10px", fontSize: 13, border: "1px solid var(--c-border)", borderRadius: 7, background: "var(--c-panel)", color: "var(--c-text)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>Systeem Status</h1>
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: "3px 0 0" }}>Monitor systeemgezondheid en beheer configuratie</p>
        </div>
        <button
          onClick={loadHealth}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "none", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}
        >
          <RefreshCw size={14} /> Vernieuwen
        </button>
      </div>

      {/* Health */}
      <div style={panelStyle}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={14} color="var(--c-muted)" /> Systeem Gezondheid
        </p>
        {health ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--c-panel-2)", borderRadius: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: health.databaseStatus === "Healthy" ? "var(--c-green)" : "var(--c-red)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, color: "var(--c-muted)", margin: 0 }}>Database Status</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "2px 0 0" }}>{health.databaseStatus}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--c-panel-2)", borderRadius: 8 }}>
              <Activity size={14} color="var(--c-accent)" />
              <div>
                <p style={{ fontSize: 11, color: "var(--c-muted)", margin: 0 }}>Latency</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "2px 0 0", fontVariantNumeric: "tabular-nums" }}>{health.latencyMs} ms</p>
              </div>
            </div>
            {health.lastError && (
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--c-red-weak)", borderRadius: 8 }}>
                <AlertCircle size={14} color="var(--c-red)" />
                <div>
                  <p style={{ fontSize: 11, color: "var(--c-muted)", margin: 0 }}>Laatste Fout</p>
                  <p style={{ fontSize: 13, color: "var(--c-red)", margin: "2px 0 0" }}>{health.lastError}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Klik op vernieuwen om de systeemstatus te laden...</p>
        )}
      </div>

      {/* Config */}
      <div style={panelStyle}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <Settings size={14} color="var(--c-muted)" /> Systeem Configuratie
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(config).map(([key, value]) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 5 }}>{key}</label>
              <input id={key} value={value as string} onChange={(e) => setConfig({ ...config, [key]: e.target.value })} style={inputStyle} />
            </div>
          ))}
          {Object.keys(config).length === 0 && (
            <p style={{ fontSize: 13, color: "var(--c-muted)", margin: 0 }}>Geen configuratie-items geladen.</p>
          )}
          <button
            onClick={handleUpdateConfig}
            disabled={loading}
            style={{ alignSelf: "flex-start", padding: "8px 16px", background: "var(--c-accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 4 }}
          >
            {loading ? "Bijwerken..." : "Configuratie Bijwerken"}
          </button>
        </div>
      </div>
    </div>
  );
}
