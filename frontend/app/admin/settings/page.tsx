"use client";
import { useState, useEffect } from "react";
import { showToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Settings,
  Bell,
  Shield,
  Database,
  Save,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminSettingsPage() {
  const { t } = useTranslation();

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Security settings
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(false);

  // UI State
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const settings = localStorage.getItem("adminSettings");
        if (settings) {
          const parsed = JSON.parse(settings);
          setEmailNotifications(parsed.emailNotifications ?? true);
          setPushNotifications(parsed.pushNotifications ?? true);
          setRequire2FA(parsed.require2FA ?? false);
          setSessionTimeout(parsed.sessionTimeout ?? false);
        }
      } catch (error) {
        
      }
    };
    loadSettings();
  }, []);

  const handleSave = () => {
    setSaving(true);

    const settings = {
      emailNotifications,
      pushNotifications,
      require2FA,
      sessionTimeout,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem("adminSettings", JSON.stringify(settings));

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  const handleBackup = () => {
    showToast(t("admin.settings.backup"), "info");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t("admin.settings.title")}
        </h1>
        <p className="text-gray-600 dark:text-slate-400">
          {t("admin.settings.subtitle")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.settings.notifications")}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={emailNotifications}
                onCheckedChange={(checked) =>
                  setEmailNotifications(checked as boolean)
                }
              />
              <label className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                {t("admin.settings.emailNotifications")}
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={pushNotifications}
                onCheckedChange={(checked) =>
                  setPushNotifications(checked as boolean)
                }
              />
              <label className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                {t("admin.settings.pushNotifications")}
              </label>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.settings.security")}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={require2FA}
                onCheckedChange={(checked) => setRequire2FA(checked as boolean)}
              />
              <label className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                {t("admin.settings.require2FA")}
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={sessionTimeout}
                onCheckedChange={(checked) =>
                  setSessionTimeout(checked as boolean)
                }
              />
              <label className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                {t("admin.settings.sessionTimeout")}
              </label>
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.settings.database")}
            </h3>
          </div>
          <Button onClick={handleBackup} variant="outline">
            <Database className="w-4 h-4 mr-2" />
            {t("admin.settings.backup")}
          </Button>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving || saved}>
            {saving ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                {t("admin.settings.saving")}
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                {t("admin.settings.saved")}
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {t("admin.settings.save")}
              </>
            )}
          </Button>

          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">
              ✓ {t("admin.settings.successMessage")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
