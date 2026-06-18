"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2, Loader2, Users, User } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import { API_URL } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

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

export default function ManagerNotificatiesPage() {
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<string>("manager");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const userId = authUtils.getUserId();
      if (!userId) {
        showToast("Gebruiker niet ingelogd", "error");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          "X-USER-ID": userId.toString(),
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
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
      
      setNotifications(Array.isArray(mappedData) ? mappedData : []);
    } catch (error) {
      showToast("Kon notificaties niet laden", "error");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      const userId = authUtils.getUserId();
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          "X-USER-ID": userId?.toString() || "",
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      showToast("Gemarkeerd als gelezen", "success");
    } catch (error) {
      showToast("Fout bij markeren", "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const userId = authUtils.getUserId();
      
      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: "PUT",
        headers: {
          "X-USER-ID": userId?.toString() || "",
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      showToast("Alle notificaties gemarkeerd als gelezen", "success");
    } catch (error) {
      showToast("Fout bij markeren", "error");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "workflow":
        return "📝";
      case "approval":
        return "✅";
      case "rejection":
        return "❌";
      case "vacation":
        return "🏖️";
      case "system":
        return "⚙️";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "workflow":
        return "text-amber-600 dark:text-amber-600";
      case "approval":
        return "text-green-600 dark:text-green-400";
      case "rejection":
        return "text-red-600 dark:text-red-400";
      case "vacation":
        return "text-blue-600 dark:text-blue-600";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Notificaties"
        description={`Team notificaties en updates${unreadCount > 0 ? ` • ${unreadCount} ongelezen` : ""}`}
        actions={
          <>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Users className="w-4 h-4" />
              <span>Team overzicht</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <Check className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Alles Gelezen</span>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <StatCard
          title="Totaal"
          value={loading ? "..." : notifications.length}
          icon={Bell}
          color="amber"
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
            Team Notificaties
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center pt-8 py-12">
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
              <p className="text-sm text-slate-500 mt-1">Er zijn nog geen team notificaties</p>
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
                              {notification.user && (
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
  );
}
