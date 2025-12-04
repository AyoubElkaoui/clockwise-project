"use client";

import { useState } from "react";
import { Settings, Moon, Sun, Bell } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { useTheme } from "next-themes";

export default function InstellingenPage() {
  const { theme, setTheme } = useTheme();
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
            <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Instellingen
            </h1>
          </div>

          <div className="space-y-6">
            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                  Thema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Licht
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Donker
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => setTheme("system")}
                  >
                    Systeem
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificaties Beheer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Wis de notificatie badge in de navigatiebar
                </p>
                <Button
                  onClick={handleClearNotifications}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? "Wissen..." : "Wis Notificatie Badge"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
