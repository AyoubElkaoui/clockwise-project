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

      const response = await fetch(`${API_URL}/activities/${userId}`, {
        headers: {
          "X-MEDEW-GC-ID": userId.toString(),
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
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
      const response = await fetch(`${API_URL}/activities/${id}/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MEDEW-GC-ID": userId?.toString() || "",
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
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

      await Promise.all(
        unreadIds.map((id) =>
          fetch(`${API_URL}/activities/${id}/read`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-MEDEW-GC-ID": userId?.toString() || "",
              "ngrok-skip-browser-warning": "1",
            },
          })
        )
      );

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
        return "text-timr-orange dark:text-timr-orange";
      case "approval":
        return "text-green-600 dark:text-green-400";
      case "rejection":
        return "text-red-600 dark:text-red-400";
      case "vacation":
        return "text-timr-blue dark:text-timr-blue";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Notificaties
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Team notificaties en updates
            {unreadCount > 0 && ` • ${unreadCount} ongelezen`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Users className="w-4 h-4" />
            <span>Team overzicht</span>
          </div>
          <Button
            variant="secondary"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <Check className="w-4 h-4 mr-2" />
            Alles Gelezen
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-timr-orange">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Totaal
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {loading ? "..." : notifications.length}
                </p>
              </div>
              <Bell className="w-8 h-8 text-timr-orange dark:text-timr-orange" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-timr-orange">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Ongelezen
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {loading ? "..." : unreadCount}
                </p>
              </div>
              <Bell className="w-8 h-8 text-timr-orange dark:text-timr-orange" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Gelezen
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {loading ? "..." : readCount}
                </p>
              </div>
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Team Notificaties
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-timr-orange" />
              <span className="ml-2 text-slate-600 dark:text-slate-400">
                Notificaties laden...
              </span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Geen notificaties
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Er zijn nog geen team notificaties
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all duration-200 hover:shadow-md ${
                    !notification.read
                      ? "bg-timr-orange-light/30 dark:bg-timr-orange-light/10 border-timr-orange dark:border-timr-orange"
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
                              className="flex-shrink-0 ml-4"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Markeren als gelezen
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
