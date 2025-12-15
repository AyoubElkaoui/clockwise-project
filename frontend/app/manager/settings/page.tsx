"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, Save, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/components/ui/toast";
import { getUserId } from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";

export default function ManagerSettingsPage() {
  const router = useRouter();

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
        console.error("Error loading settings:", error);
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
      const userId = getUserId();
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
      console.error("Error changing password:", error);
      showToast("Fout bij wijzigen wachtwoord", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEditProfile = () => {
    router.push("/account");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Instellingen
        </h1>
        <p className="text-gray-600 dark:text-slate-400">Manager voorkeuren</p>
      </div>

      <div className="space-y-6">
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
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Wachtwoord Wijzigen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Huidig Wachtwoord</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nieuw Wachtwoord</label>
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
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || passwordChanged}
                className="w-full"
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
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profiel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleEditProfile} variant="outline">
              <User className="w-4 h-4 mr-2" />
              Bewerk Profiel
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving || saved}>
            {saving ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Opslaan...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Opgeslagen!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Wijzigingen Opslaan
              </>
            )}
          </Button>

          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">
              ✓ Voorkeuren succesvol opgeslagen
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
