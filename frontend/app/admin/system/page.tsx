"use client";

import { useState, useEffect } from "react";
import { Activity, Settings, AlertCircle, RefreshCw } from "lucide-react";
import {
  getSystemHealth,
  getSystemConfig,
  updateSystemConfig,
} from "@/lib/api";

export default function SystemPage() {
  const [health, setHealth] = useState<any>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHealth();
    loadConfig();
  }, []);

  const loadHealth = async () => {
    try {
      const data = await getSystemHealth();
      setHealth(data);
    } catch {}
  };

  const loadConfig = async () => {
    try {
      const data = await getSystemConfig();
      setConfig(data);
    } catch {}
  };

  const handleUpdateConfig = async () => {
    setLoading(true);
    try {
      await updateSystemConfig(config);
      alert("Config bijgewerkt!");
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Systeem Status
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor systeemgezondheid en beheer configuratie
          </p>
        </div>
        <button
          onClick={loadHealth}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Vernieuwen
        </button>
      </div>

      {/* System Health */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" />
          Systeem Gezondheid
        </h2>
        {health ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  health.databaseStatus === "Healthy"
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              />
              <div>
                <p className="text-xs text-slate-500">Database Status</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {health.databaseStatus}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <Activity className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Latency</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {health.latencyMs} ms
                </p>
              </div>
            </div>
            {health.lastError && (
              <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Laatste Fout</p>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {health.lastError}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Klik op vernieuwen om de systeemstatus te laden...
          </p>
        )}
      </div>

      {/* System Config */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-500" />
          Systeem Configuratie
        </h2>
        <div className="space-y-4">
          {Object.entries(config).map(([key, value]) => (
            <div key={key} className="space-y-1.5">
              <label
                htmlFor={key}
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                {key}
              </label>
              <input
                id={key}
                value={value as string}
                onChange={(e) => handleConfigChange(key, e.target.value)}
                className="h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          {Object.keys(config).length === 0 && (
            <p className="text-sm text-slate-500">
              Geen configuratie-items geladen.
            </p>
          )}
          <button
            onClick={handleUpdateConfig}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors mt-2"
          >
            {loading ? "Bijwerken..." : "Configuratie Bijwerken"}
          </button>
        </div>
      </div>
    </div>
  );
}
