"use client";

import { useState } from "react";
import { Settings, Moon, Sun, Bell, Globe } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

export default function InstellingenPage() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleClearNotifications = async () => {
    setLoading(true);
    try {
      // Clear notification badge
      localStorage.removeItem("unreadNotifications");
      showToast("Notificaties gewist", "success");
      // Refresh page to update badge
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      showToast("Fout bij wissen notificaties", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Settings className="h-8 w-8 text-timr-orange dark:text-timr-orange" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t("settings.title")}
            </h1>
          </div>

          <div className="space-y-6">
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
                  Kies de taal van de applicatie. Deze instelling wordt direct toegepast.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant={i18n.language === "nl" ? "default" : "outline"}
                    onClick={() => i18n.changeLanguage("nl")}
                    className="flex items-center gap-2"
                  >
                    Nederlands
                  </Button>
                  <Button
                    variant={i18n.language === "en" ? "default" : "outline"}
                    onClick={() => i18n.changeLanguage("en")}
                    className="flex items-center gap-2"
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
                  Wissel tussen lichte en donkere modus. Je voorkeur wordt automatisch opgeslagen.
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

            {/* Notifications Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t("settings.notifications")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {t("settings.clearBadge")}
                </p>
                <Button
                  onClick={handleClearNotifications}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? t("settings.clearing") : t("settings.clearButton")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
