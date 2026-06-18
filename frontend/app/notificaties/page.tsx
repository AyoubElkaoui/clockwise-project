"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2, Loader2, Users, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";

dayjs.extend(relativeTime);
dayjs.locale("nl");

async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const bodyText = await response.text();
    throw new Error(`Expected JSON response but got ${contentType || 'unknown'}: ${bodyText.substring(0, 100)}`);
  }
  return response.json();
}

interface Activity {
  id: number;
  userId: number;
  type: string;
  action: string;
  message: string;
  details: string;
  read: boolean;
  timestamp: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export default function NotificatiesPage() {
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<string>("");

  useEffect(() => {
    const rank = localStorage.getItem("userRank") || "";
    setUserRank(rank);
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const userId = authUtils.getUserId();
      
      console.log("=== LOAD NOTIFICATIONS DEBUG ===");
      console.log("userId from localStorage:", userId);
      console.log("localStorage.userId:", localStorage.getItem('userId'));
      console.log("localStorage.medewGcId:", localStorage.getItem('medewGcId'));
      
      if (!userId) {
        console.error("No userId found!");
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      const url = `${API_URL}/notifications`;
      console.log("Fetching notifications from:", url);
      console.log("X-USER-ID header will be:", userId.toString());
      
      const response = await fetch(url, {
        headers: {
          "X-USER-ID": userId.toString(),
          "ngrok-skip-browser-warning": "1",
        },
      });
      
      console.log("Notifications response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch notifications:", errorText);
        showToast("Fout bij laden notificaties", "error");
        setNotifications([]);
        return;
      }

      const data = await safeJsonParse(response);
      console.log("Loaded notifications:", data);
      console.log("=== END LOAD NOTIFICATIONS DEBUG ===");
      
      // Map notifications to Activity format for compatibility
      const mappedData = data.map((n: any) => ({
        id: n.id,
        userId: userId,
        type: n.type,
        action: n.type,
        message: n.message,
        details: n.title || "",
        read: n.isRead,
        timestamp: n.createdAt,
      }));
      
      setNotifications(mappedData);
    } catch (error) {
      console.error("Error loading notifications:", error);
      showToast("Fout bij laden notificaties", "error");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) return;

      const response = await fetch(
        `${API_URL}/notifications/mark-all-read`,
        {
          method: "POST",
          headers: {
            "X-USER-ID": userId.toString(),
            "ngrok-skip-browser-warning": "1",
          },
        },
      );

      if (response.ok) {
        showToast("Alle notificaties gemarkeerd als gelezen", "success");
        loadNotifications();
      } else {
        showToast("Fout bij markeren als gelezen", "error");
      }
    } catch (error) {
      showToast("Fout bij markeren als gelezen", "error");
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) return;

      const response = await fetch(
        `${API_URL}/notifications/${id}/read`,
        {
          method: "POST",
          headers: {
            "X-USER-ID": userId.toString(),
            "ngrok-skip-browser-warning": "1",
          },
        },
      );

      if (response.ok) {
        loadNotifications();
      } else {
        showToast("Fout bij markeren als gelezen", "error");
      }
    } catch (error) {
      showToast("Fout bij markeren als gelezen", "error");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "time_entry":
        return "⏰";
      case "vacation":
        return "🏖️";
      case "project":
        return "📁";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "time_entry":
        return "text-amber-600 dark:text-amber-600";
      case "vacation":
        return "text-green-600 dark:text-green-400";
      case "project":
        return "text-blue-600 dark:text-blue-600";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6 animate-fadeIn">
          <PageHeader
            title="Notificaties"
            description={
              (userRank === "manager" ? "Team notificaties en updates" :
               userRank === "admin" ? "Alle systeem notificaties" :
               "Jouw persoonlijke notificaties") +
              (unreadCount > 0 ? ` • ${unreadCount} ongelezen` : "")
            }
            actions={
              <Button
                variant="secondary"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                Alles Gelezen
              </Button>
            }
          />

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
            <StatCard
              title="Totaal"
              value={loading ? "..." : notifications.length}
              icon={Bell}
              color="blue"
            />
            <StatCard
              title="Ongelezen"
              value={loading ? "..." : unreadCount}
              icon={Bell}
              color="amber"
            />
            <StatCard
              title="Gelezen"
              value={loading ? "..." : readCount}
              icon={Check}
              color="emerald"
            />
          </div>

          {/* Notifications List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {userRank === "manager" && "Team Notificaties"}
                {userRank === "admin" && "Systeem Notificaties"}
                {userRank === "user" && "Mijn Notificaties"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                  <span className="ml-2 text-slate-600 dark:text-slate-400">
                    Notificaties laden...
                  </span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                    <Bell className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen notificaties</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {userRank === "manager" && "Er zijn nog geen team notificaties"}
                    {userRank === "admin" && "Er zijn nog geen systeem notificaties"}
                    {userRank === "user" && "Je hebt nog geen notificaties ontvangen"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`transition-all duration-200 hover:shadow-md ${
                        !notification.read
                          ? "bg-amber-50/30 dark:bg-amber-50/10 border-amber-400 dark:border-amber-400"
                          : "bg-slate-50/50 dark:bg-slate-800/50"
                      }`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <span className="text-lg">
                                {getNotificationIcon(notification.type)}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                    {notification.message}
                                  </h4>
                                  {!notification.read && (
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      Nieuw
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                  {notification.details}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                  <span>
                                    {dayjs(notification.timestamp).fromNow()}
                                  </span>
                                  {notification.user && userRank !== "user" && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {notification.user.firstName}{" "}
                                      {notification.user.lastName}
                                    </span>
                                  )}
                                  <span
                                    className={`capitalize ${getNotificationColor(notification.type)}`}
                                  >
                                    {notification.type.replace("_", " ")}
                                  </span>
                                </div>
                              </div>

                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleMarkRead(notification.id)
                                  }
                                  className="flex-shrink-0 ml-2 md:ml-4"
                                >
                                  <Check className="w-4 h-4 md:mr-1" />
                                  <span className="hidden md:inline">Markeren als gelezen</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
