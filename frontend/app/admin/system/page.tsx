"use client";

import { useState, useEffect } from "react";
import { Activity, Settings, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

import {
  getSystemHealth,
  getSystemConfig,
  updateSystemConfig,
} from "@/lib/api";

export default function SystemPage() {
  const [health, setHealth] = useState(null);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHealth();
    loadConfig();
  }, []);

  const loadHealth = async () => {
    try {
      const data = await getSystemHealth();
      setHealth(data);
    } catch (error) {
      
    }
  };

  const loadConfig = async () => {
    try {
      const data = await getSystemConfig();
      setConfig(data);
    } catch (error) {
      
    }
  };

  const handleUpdateConfig = async () => {
    setLoading(true);
    try {
      await updateSystemConfig(config);
      alert("Config bijgewerkt!");
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Systeem Status"
        description="Monitor systeemgezondheid en beheer configuratie"
        actions={
          <Button variant="outline" size="sm" onClick={loadHealth}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Vernieuwen
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Systeem Gezondheid
          </CardTitle>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className={`w-2.5 h-2.5 rounded-full ${(health as any).databaseStatus === "Healthy" ? "bg-emerald-500" : "bg-rose-500"}`} />
                <div>
                  <p className="text-xs text-slate-500">Database Status</p>
                  <p className="text-sm font-semibold">{(health as any).databaseStatus}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Activity className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-slate-500">Latency</p>
                  <p className="text-sm font-semibold tabular-nums">{(health as any).latencyMs} ms</p>
                </div>
              </div>
              {(health as any).lastError && (
                <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Laatste Fout</p>
                    <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{(health as any).lastError}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Klik op vernieuwen om de systeemstatus te laden...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            Systeem Configuratie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="space-y-1.5">
                <label htmlFor={key} className="text-sm font-medium text-slate-700 dark:text-slate-300">{key}</label>
                <Input
                  id={key}
                  value={value as string}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                />
              </div>
            ))}
            {Object.keys(config).length === 0 && (
              <p className="text-sm text-slate-500">Geen configuratie-items geladen.</p>
            )}
            <Button onClick={handleUpdateConfig} disabled={loading} className="mt-2">
              {loading ? "Bijwerken..." : "Configuratie Bijwerken"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
