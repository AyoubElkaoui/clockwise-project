"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Systeem Gezondheid</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={loadHealth}>Vernieuw Gezondheid</Button>
          <div className="mt-4">
            {health ? (
              <div className="space-y-2">
                <p>
                  <strong>Database Status:</strong> {health.databaseStatus}
                </p>
                <p>
                  <strong>Latency:</strong> {health.latencyMs} ms
                </p>
                <p>
                  <strong>Laatste Error:</strong> {health.lastError || "Geen"}
                </p>
                <p>
                  <strong>Timestamp:</strong> {health.timestamp}
                </p>
              </div>
            ) : (
              <p>Laden...</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Systeem Configuratie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(config).map(([key, value]) => (
              <div key={key}>
                <label htmlFor={key}>{key}</label>
                <Input
                  id={key}
                  value={value as string}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                />
              </div>
            ))}
            <Button onClick={handleUpdateConfig} disabled={loading}>
              {loading ? "Bijwerken..." : "Configuratie Bijwerken"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
