"use client";

import { useState, useEffect } from "react";
import { Settings, Bell, Lock, Palette, Globe } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface UserSettings {
  emailNotifications: boolean;
  browserNotifications: boolean;
  dailyReminders: boolean;
  weeklyReports: boolean;
  vacationReminders: boolean;
  language: string;
  timezone: string;
}

export default function InstellingenPage() {
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    browserNotifications: true,
    dailyReminders: true,
    weeklyReports: true,
    vacationReminders: true,
    language: "nl",
    timezone: "Europe/Amsterdam",
  });
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("userSettings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem("userSettings", JSON.stringify(settings));
      
      addToast("Instellingen opgeslagen!", "success");
    } catch (error) {
      console.error("Failed to save settings:", error);
      addToast("Opslaan mislukt", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof UserSettings) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        [key]: !prev[key],
      };
      // Auto-save to localStorage
      localStorage.setItem("userSettings", JSON.stringify(newSettings));
      addToast("Voorkeur opgeslagen", "success");
      return newSettings;
    });
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <Settings className="w-8 h-8" />
                Instellingen
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Beheer je voorkeuren en notificaties
              </p>
            </div>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Opslaan..." : "Wijzigingen Opslaan"}
            </Button>
          </div>

          {/* Notifications Settings */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificatie Voorkeuren
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { key: "emailNotifications", label: "E-mail Notificaties", description: "Ontvang updates via e-mail" },
                  { key: "browserNotifications", label: "Browser Notificaties", description: "Toon desktop meldingen" },
                  { key: "dailyReminders", label: "Dagelijkse Herinneringen", description: "Dagelijkse herinnering om uren in te voeren" },
                  { key: "weeklyReports", label: "Wekelijkse Rapporten", description: "Ontvang elk weekend een overzicht" },
                  { key: "vacationReminders", label: "Vakantie Herinneringen", description: "Herinnering bij vakantie goedkeuringen" },
                ].map(({ key, label, description }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                        {label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {description}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings[key as keyof UserSettings] as boolean}
                      onChange={() => handleToggle(key as keyof UserSettings)}
                      className="toggle toggle-primary"
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Language & Region */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Taal & Regio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Taal
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => {
                      const newSettings = { ...settings, language: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem("userSettings", JSON.stringify(newSettings));
                      addToast("Taal gewijzigd", "success");
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  >
                    <option value="nl">Nederlands</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tijdzone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => {
                      const newSettings = { ...settings, timezone: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem("userSettings", JSON.stringify(newSettings));
                      addToast("Tijdzone gewijzigd", "success");
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  >
                    <option value="Europe/Amsterdam">Europe/Amsterdam (CET)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Beveiliging
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Beveiligingsinstellingen zoals wachtwoord wijzigen kun je vinden op je{" "}
                <a href="/account" className="text-blue-600 hover:underline">
                  Account pagina
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ModernLayout>
    </ProtectedRoute>
  );
}
