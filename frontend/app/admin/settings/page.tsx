"use client";
import { useState, useEffect } from "react";
import { showToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
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

  // Notification settings (local only for now)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Security settings (from database)
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(false);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load from database
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

      // Load local settings
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
      // Save to database
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

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      // Save local settings
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
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t("admin.settings.title")}
        </h1>
        <p className="text-gray-600 dark:text-slate-400">
          {t("admin.settings.subtitle")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Security - 2FA Required */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Beveiliging - Tweestapsverificatie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="require2fa"
                checked={require2FA}
                onCheckedChange={(checked) => setRequire2FA(checked as boolean)}
              />
              <div className="space-y-1">
                <label
                  htmlFor="require2fa"
                  className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                >
                  2FA Verplicht voor alle gebruikers
                </label>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Wanneer ingeschakeld, moeten alle gebruikers tweestapsverificatie
                  instellen voordat ze kunnen inloggen.
                </p>
              </div>
            </div>

            {require2FA && (
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  <strong>Let op:</strong> Gebruikers zonder 2FA worden na het inloggen
                  doorgestuurd naar de 2FA setup pagina en kunnen pas verder als 2FA
                  is ingesteld.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="sessionTimeout"
                checked={sessionTimeout}
                onCheckedChange={(checked) =>
                  setSessionTimeout(checked as boolean)
                }
              />
              <div className="space-y-1">
                <label
                  htmlFor="sessionTimeout"
                  className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                >
                  Automatische sessie timeout (60 minuten)
                </label>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Log gebruikers automatisch uit na 60 minuten inactiviteit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              Notificaties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="emailNotifications"
                checked={emailNotifications}
                onCheckedChange={(checked) =>
                  setEmailNotifications(checked as boolean)
                }
              />
              <label
                htmlFor="emailNotifications"
                className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer"
              >
                Email notificaties voor nieuwe aanvragen
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="pushNotifications"
                checked={pushNotifications}
                onCheckedChange={(checked) =>
                  setPushNotifications(checked as boolean)
                }
              />
              <label
                htmlFor="pushNotifications"
                className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer"
              >
                Push notificaties inschakelen
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-600" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackup} variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Database Backup Maken
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving || saved} size="lg">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Opgeslagen!
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Instellingen Opslaan
              </>
            )}
          </Button>

          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">
              ✓ Instellingen zijn succesvol opgeslagen
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
