"use client";
import { useState, useEffect } from "react";
import { showToast } from "@/components/ui/toast";
import {
  Bell,
  Shield,
  Database,
  Save,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_URL } from "@/lib/api";

export default function AdminSettingsPage() {
  const { t } = useTranslation();

  // Notification settings (local only)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Security settings (from database)
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(false);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await fetch(`${API_URL}/system-settings`, {
        headers: {
          "X-USER-ID": userId || "",
          "ngrok-skip-browser-warning": "1",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRequire2FA(data.require_2fa === "true");
        setSessionTimeout(data.session_timeout_minutes !== "0");
      }
      const localSettings = localStorage.getItem("adminSettings");
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        setEmailNotifications(parsed.emailNotifications ?? true);
        setPushNotifications(parsed.pushNotifications ?? true);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = localStorage.getItem("userId");
      const response = await fetch(`${API_URL}/system-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-USER-ID": userId || "",
          "ngrok-skip-browser-warning": "1",
        },
        body: JSON.stringify({
          require_2fa: require2FA.toString(),
          session_timeout_minutes: sessionTimeout ? "60" : "0",
        }),
      });
      if (!response.ok) throw new Error("Failed to save settings");
      const localSettings = {
        emailNotifications,
        pushNotifications,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem("adminSettings", JSON.stringify(localSettings));
      setSaved(true);
      showToast("Instellingen opgeslagen!", "success");
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast("Fout bij opslaan instellingen", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = () => {
    showToast("Database backup gestart...", "info");
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t("admin.settings.title")}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t("admin.settings.subtitle")}
        </p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Security */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Beveiliging
          </h2>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="require2fa"
              checked={require2FA}
              onChange={(e) => setRequire2FA(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                2FA Verplicht voor alle gebruikers
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Wanneer ingeschakeld, moeten alle gebruikers
                tweestapsverificatie instellen voordat ze kunnen inloggen.
              </p>
            </div>
          </label>

          {require2FA && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Let op:</strong> Gebruikers zonder 2FA worden na het
                inloggen doorgestuurd naar de 2FA setup pagina en kunnen pas
                verder als 2FA is ingesteld.
              </p>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="sessionTimeout"
              checked={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Automatische sessie timeout (60 minuten)
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Log gebruikers automatisch uit na 60 minuten inactiviteit.
              </p>
            </div>
          </label>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            Notificaties
          </h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="emailNotifications"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Email notificaties voor nieuwe aanvragen
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="pushNotifications"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Push notificaties inschakelen
            </span>
          </label>
        </div>

        {/* Database */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            Database
          </h2>
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Database className="w-4 h-4" />
            Database Backup Maken
          </button>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opslaan...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Opgeslagen!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Instellingen Opslaan
              </>
            )}
          </button>
          {saved && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Instellingen zijn succesvol opgeslagen
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
