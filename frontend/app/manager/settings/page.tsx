"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, Save, CheckCircle, Shield, Globe, Moon, Sun } from "lucide-react";
import { showToast } from "@/components/ui/toast";
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";
import authUtils from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";
import i18n from "i18next";

export default function ManagerSettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  // Notification settings
  const [emailOnRequests, setEmailOnRequests] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI State
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const settings = localStorage.getItem("managerSettings");
        if (settings) {
          const parsed = JSON.parse(settings);
          setEmailOnRequests(parsed.emailOnRequests ?? true);
          setPushNotifications(parsed.pushNotifications ?? true);
          setDailySummary(parsed.dailySummary ?? false);
        }
      } catch (error) {
        // Settings could not be loaded
      }
    };
    loadSettings();
  }, []);

  const handleSave = () => {
    setSaving(true);

    const settings = {
      emailOnRequests,
      pushNotifications,
      dailySummary,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem("managerSettings", JSON.stringify(settings));

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast("Nieuwe wachtwoorden komen niet overeen", "error");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showToast("Nieuw wachtwoord moet minimaal 6 karakters bevatten", "error");
      return;
    }

    setChangingPassword(true);
    try {
      const userId = authUtils.getUserId();
      if (!userId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const response = await fetch(
        `${API_URL}/users/${userId}/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      if (response.ok) {
        showToast("Wachtwoord succesvol gewijzigd", "success");
        setPasswordChanged(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordChanged(false), 3000);
      } else {
        const error = await response.text();
        showToast(`Fout bij wijzigen wachtwoord: ${error}`, "error");
      }
    } catch (error) {
      showToast("Fout bij wijzigen wachtwoord", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEditProfile = () => {
    router.push("/account");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Instellingen</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manager voorkeuren en account beheer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Settings */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("settings.language")}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Kies de taal van de applicatie</p>
          <div className="flex gap-2">
            <button
              onClick={() => i18n.changeLanguage("nl")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                i18n.language === "nl"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              Nederlands
            </button>
            <button
              onClick={() => i18n.changeLanguage("en")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                i18n.language === "en"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-slate-500" />
            ) : (
              <Sun className="w-4 h-4 text-slate-500" />
            )}
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("settings.theme")}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Wissel tussen lichte en donkere modus</p>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "light"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Sun className="w-4 h-4" />
              {t("settings.light")}
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                theme === "dark"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Moon className="w-4 h-4" />
              {t("settings.dark")}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notificaties</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Beheer je notificatievoorkeuren</p>
          <div className="space-y-3 mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="emailOnRequests"
                checked={emailOnRequests}
                onChange={(e) => setEmailOnRequests(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Email bij nieuwe aanvragen
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="pushNotifications"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Push notificaties
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="dailySummary"
                checked={dailySummary}
                onChange={(e) => setDailySummary(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Dagelijkse samenvatting
              </span>
            </label>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors"
          >
            {saving ? (
              "Opslaan..."
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Opgeslagen!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Opslaan
              </>
            )}
          </button>
        </div>

        {/* 2FA Security */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tweestapsverificatie (2FA)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Extra beveiliging voor je manager account. Bij inloggen heb je een tweede verificatiestap nodig.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Waarom 2FA?</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Als manager heb je toegang tot gevoelige teamgegevens. 2FA beschermt je account tegen ongeautoriseerde toegang.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push("/account/2fa")}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            2FA Beheren
          </button>
        </div>

        {/* Password Change */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Wachtwoord Wijzigen</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Wijzig je huidige wachtwoord</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Huidig Wachtwoord
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nieuw Wachtwoord
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Bevestig Nieuw Wachtwoord
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword || passwordChanged}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors"
          >
            {changingPassword ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Wijzigen...
              </>
            ) : passwordChanged ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Gewijzigd!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Wachtwoord Wijzigen
              </>
            )}
          </button>
        </div>

        {/* Profile */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Profiel Beheer</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Bewerk je persoonlijke gegevens, contactinformatie en meer
          </p>
          <button
            onClick={handleEditProfile}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <User className="w-4 h-4" />
            Naar Profiel Pagina
          </button>
        </div>
      </div>
    </div>
  );
}
