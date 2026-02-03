// frontend/components/NotificationBell.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import {
  BellIcon,
  EnvelopeOpenIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  isRead: boolean;
  createdAt: string;
}

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      
      if (!userId) {
        console.warn("NotificationBell: No userId found in localStorage");
        return;
      }

      console.log("NotificationBell: Fetching notifications for userId:", userId);
      
      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          'X-USER-ID': userId,
          'ngrok-skip-browser-warning': '1',
        },
      });

      if (!response.ok) {
        console.warn('NotificationBell: API returned', response.status);
        setNotifications([]);
        return;
      }

      const data: Notification[] = await response.json();
      console.log("NotificationBell: Received notifications:", data);
      
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
      console.log("NotificationBell: Unread count:", data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error("NotificationBell: Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'X-USER-ID': userId || '',
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'X-USER-ID': userId || '',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown((v) => !v);
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "unread") return !notification.isRead;
    if (activeTab === "read") return notification.isRead;
    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    try {
      if (!timestamp) return "Onbekend";

      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Onbekend";

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `${diffMins} min. geleden`;
      if (diffHours < 24) return `${diffHours} uur geleden`;
      if (diffDays < 7)
        return `${diffDays} dag${diffDays !== 1 ? "en" : ""} geleden`;
      return date.toLocaleDateString();
    } catch {
      return "Onbekend";
    }
  };

  const getNotificationIcon = (type: string) => {
    try {
      if (type === "timesheet_submitted" || type === "timesheet_approved" || type === "timesheet_rejected") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
        );
      }
      if (type === "project_assigned") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        );
      }
      if (type === "vacation_approved" || type === "vacation_rejected") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-purple-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
          </svg>
        );
      }
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
    } catch {
      return null;
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button onClick={toggleDropdown} className="btn btn-ghost btn-circle">
        <div className="indicator">
          <BellIcon className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="indicator-item badge badge-primary badge-sm">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-base-100 shadow-xl rounded-lg overflow-hidden z-50">
          <div className="flex justify-between items-center p-3 border-b">
            <h3 className="font-bold text-lg">Notificaties</h3>
            <button
              onClick={() => setShowDropdown(false)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              ✕
            </button>
          </div>

          <div className="flex border-b">
            <button
              className={`flex-1 py-2 px-4 text-center ${activeTab === "all" ? "bg-base-200 font-semibold" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              Alle ({notifications.length})
            </button>

            <button
              className={`flex-1 py-2 px-4 text-center ${activeTab === "unread" ? "bg-base-200 font-semibold" : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              <div className="flex items-center justify-center gap-1">
                <EnvelopeIcon className="h-4 w-4" />
                <span>Ongelezen ({unreadCount})</span>
              </div>
            </button>

            <button
              className={`flex-1 py-2 px-4 text-center ${activeTab === "read" ? "bg-base-200 font-semibold" : ""}`}
              onClick={() => setActiveTab("read")}
            >
              <div className="flex items-center justify-center gap-1">
                <EnvelopeOpenIcon className="h-4 w-4" />
                <span>Gelezen ({notifications.length - unreadCount})</span>
              </div>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-4">
              <div className="loading loading-spinner loading-md" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Geen notificaties gevonden
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-base-200 flex gap-3 items-start cursor-pointer ${!notification.isRead ? "bg-base-200" : ""}`}
                  onClick={() =>
                    !notification.isRead && handleMarkAsRead(notification.id)
                  }
                >
                  <div className="shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="font-medium line-clamp-2">
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="badge badge-primary badge-sm ml-1 shrink-0">
                          nieuw
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unreadCount > 0 && (
            <div className="p-3 border-t">
              <button
                onClick={handleMarkAllAsRead}
                className="btn btn-sm btn-outline w-full"
              >
                Alles markeren als gelezen
              </button>
            </div>
          )}

          <div className="p-3 border-t">
            <button
              onClick={fetchNotifications}
              className="btn btn-sm btn-outline w-full"
            >
              Vernieuwen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
