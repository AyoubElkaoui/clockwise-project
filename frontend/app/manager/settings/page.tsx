"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, Save, CheckCircle, Shield, Globe, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/components/ui/toast";
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";
import authUtils from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";
import i18n from "i18next";
import ManagerLayout from "@/components/ManagerLayout";

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

  // Load settings from localStorage
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
    <ManagerLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Instellingen
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            Manager voorkeuren en account beheer
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("settings.language")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Kies de taal van de applicatie
              </p>
              <div className="flex gap-3">
                <Button
                  variant={i18n.language === "nl" ? "default" : "outline"}
                  onClick={() => i18n.changeLanguage("nl")}
                >
                  Nederlands
                </Button>
                <Button
                  variant={i18n.language === "en" ? "default" : "outline"}
                  onClick={() => i18n.changeLanguage("en")}
                >
                  English
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                {t("settings.theme")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Wissel tussen lichte en donkere modus
              </p>
              <div className="flex gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="flex items-center gap-2"
                >
                  <Sun className="h-4 w-4" />
                  {t("settings.light")}
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="flex items-center gap-2"
                >
                  <Moon className="h-4 w-4" />
                  {t("settings.dark")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailOnRequests"
                    checked={emailOnRequests}
                    onCheckedChange={(checked) =>
                      setEmailOnRequests(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="emailOnRequests"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Email bij nieuwe aanvragen
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pushNotifications"
                    checked={pushNotifications}
                    onCheckedChange={(checked) =>
                      setPushNotifications(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="pushNotifications"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Push notificaties
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dailySummary"
                    checked={dailySummary}
                    onCheckedChange={(checked) =>
                      setDailySummary(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="dailySummary"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Dagelijkse samenvatting
                  </label>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving || saved}
                className="mt-4 w-full"
              >
                {saving ? (
                  "Opslaan..."
                ) : saved ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Opgeslagen!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Opslaan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 2FA Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Tweestapsverificatie (2FA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Extra beveiliging voor je manager account. Bij inloggen heb je
                  een tweede verificatiestap nodig.
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        Waarom 2FA?
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Als manager heb je toegang tot gevoelige teamgegevens.
                        2FA beschermt je account tegen ongeautoriseerde toegang.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push("/account/2fa")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  2FA Beheren
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Wachtwoord Wijzigen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Huidig Wachtwoord
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nieuw Wachtwoord
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Bevestig Nieuw Wachtwoord
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || passwordChanged}
                className="mt-4"
              >
                {changingPassword ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Wijzigen...
                  </>
                ) : passwordChanged ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Gewijzigd!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Wachtwoord Wijzigen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profiel Beheer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Bewerk je persoonlijke gegevens, contactinformatie en meer
              </p>
              <Button onClick={handleEditProfile} variant="outline">
                <User className="w-4 h-4 mr-2" />
                Naar Profiel Pagina
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ManagerLayout>
  );
}
