"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2, Loader2 } from "lucide-react";
import { getRelativeTime } from "@/lib/utils";
import { getActivities, markActivityAsRead, markAllActivitiesAsRead } from "@/lib/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface Activity {
  id: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificatiesPage() {
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const userId = Number(localStorage.getItem("userId"));
      const data = await getActivities(50, userId);
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllActivitiesAsRead();
      loadNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markActivityAsRead(id);
      loadNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Notificaties
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Je hebt {unreadCount} ongelezen notificatie{unreadCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Button variant="outline" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
              <Check className="w-4 h-4 mr-2" />
              Alles Markeren als Gelezen
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-4">
                <Bell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {loading ? "..." : notifications.length}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Totaal</p>
                </div>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-4">
                <Bell className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {loading ? "..." : unreadCount}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Ongelezen</p>
                </div>
              </div>
            </Card>
            <Card variant="elevated" padding="md">
              <div className="flex items-center gap-4">
                <Bell className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {loading ? "..." : readCount}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Gelezen</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Notifications List */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Alle Notificaties</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-slate-600">Laden...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Geen notificaties
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-all ${
                        !notification.isRead
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          !notification.isRead ? "bg-blue-500" : "bg-gray-400"
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {notification.type}
                            </p>
                            {!notification.isRead && (
                              <Badge variant="info" size="sm">
                                Nieuw
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">
                            {dayjs(notification.createdAt).fromNow()}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleMarkRead(notification.id)}
                            title="Markeer als gelezen"
                          >
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </Button>
                        )}
                      </div>
                    </div>
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
