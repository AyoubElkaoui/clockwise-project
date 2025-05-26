"use client";
import { useState, useEffect } from "react";
import { BellIcon, EnvelopeOpenIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

interface Activity {
    id: number;
    message: string;
    details?: string;
    type: string;
    timestamp: string;
    read: boolean;
    userId: number;
}

// Mock API functions - vervang door echte API calls
const getActivities = async (limit: number = 20, userId: number): Promise<Activity[]> => {
    // Simuleer API call
    try {
        const response = await fetch(`/api/activities?limit=${limit}&userId=${userId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn('API niet beschikbaar, gebruik mock data:', error);
    }

    // Fallback mock data
    const mockActivities: Activity[] = [
        {
            id: 1,
            message: "Uren goedgekeurd voor week 21",
            details: "Je werkuren van 40 uur zijn goedgekeurd door je manager",
            type: "time_entry",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min geleden
            read: false,
            userId: userId
        },
        {
            id: 2,
            message: "Vakantieaanvraag in behandeling",
            details: "Je vakantieaanvraag voor 15-19 juni is ontvangen en wordt behandeld",
            type: "vacation",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 uur geleden
            read: false,
            userId: userId
        },
        {
            id: 3,
            message: "Nieuwe project toegewezen",
            details: "Je bent toegevoegd aan project 'Website Redesign' voor Acme Corp",
            type: "project",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dag geleden
            read: true,
            userId: userId
        },
        {
            id: 4,
            message: "Uren voor week 20 goedgekeurd",
            details: "38.5 uur werkuren zijn goedgekeurd en verwerkt",
            type: "time_entry",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 dagen geleden
            read: true,
            userId: userId
        },
        {
            id: 5,
            message: "Vakantie goedgekeurd",
            details: "Je vakantieaanvraag voor 1-5 mei is goedgekeurd",
            type: "vacation",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week geleden
            read: true,
            userId: userId
        }
    ];

    return mockActivities;
};

const markActivityAsRead = async (activityId: number): Promise<void> => {
    try {
        const response = await fetch(`/api/activities/${activityId}/read`, {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Failed to mark as read');
        }
    } catch (error) {
        console.warn('API niet beschikbaar, simuleer mark as read:', error);
        // In real app, dit zou de echte API call zijn
    }
};

const markAllActivitiesAsRead = async (): Promise<void> => {
    try {
        const response = await fetch('/api/activities/mark-all-read', {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Failed to mark all as read');
        }
    } catch (error) {
        console.warn('API niet beschikbaar, simuleer mark all as read:', error);
        // In real app, dit zou de echte API call zijn
    }
};

const NotificationBell = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const userId = Number(localStorage.getItem("userId"));
            if (!userId) return;

            const data = await getActivities(20, userId);

            // Zorg dat het een array is
            let activitiesArray: Activity[] = [];
            if (Array.isArray(data)) {
                activitiesArray = data;
            }

            setActivities(activitiesArray);

            // Tel ongelezen notificaties
            let unreadCountNum = 0;
            for (const activity of activitiesArray) {
                if (activity && !activity.read) {
                    unreadCountNum++;
                }
            }
            setUnreadCount(unreadCountNum);

        } catch (error) {
            console.error("Error fetching notifications:", error);
            setActivities([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        // Ververs elke 30 seconden
        const interval = setInterval(fetchActivities, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (activityId: number) => {
        try {
            await markActivityAsRead(activityId);

            // Update lokale state
            const updatedActivities: Activity[] = [];
            for (const activity of activities) {
                if (activity.id === activityId) {
                    updatedActivities.push({ ...activity, read: true });
                } else {
                    updatedActivities.push(activity);
                }
            }

            setActivities(updatedActivities);
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking activity as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllActivitiesAsRead();

            // Update lokale state
            const updatedActivities: Activity[] = [];
            for (const activity of activities) {
                updatedActivities.push({ ...activity, read: true });
            }

            setActivities(updatedActivities);
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all activities as read:", error);
        }
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    // Filter activiteiten
    const filteredActivities: Activity[] = [];
    for (const activity of activities) {
        if (!activity) continue;

        if (activeTab === "unread" && activity.read) continue;
        if (activeTab === "read" && !activity.read) continue;

        filteredActivities.push(activity);
    }

    const formatTimestamp = (timestamp: string) => {
        try {
            if (!timestamp) return 'Onbekend';

            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Onbekend';

            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) {
                return 'Net nu';
            } else if (diffMins < 60) {
                return `${diffMins} min. geleden`;
            } else if (diffHours < 24) {
                return `${diffHours} uur geleden`;
            } else if (diffDays < 7) {
                return `${diffDays} dag${diffDays !== 1 ? 'en' : ''} geleden`;
            } else {
                return date.toLocaleDateString('nl-NL');
            }
        } catch (error) {
            return 'Onbekend';
        }
    };

    const getActivityIcon = (activity: Activity) => {
        try {
            const activityType = activity.type || "";

            if (activityType === "time_entry") {
                return (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">⏰</span>
                    </div>
                );
            } else if (activityType === "vacation") {
                return (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">🏖️</span>
                    </div>
                );
            } else if (activityType === "project") {
                return (
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 text-sm">📁</span>
                    </div>
                );
            }
            return (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm">📋</span>
                </div>
            );
        } catch (error) {
            return (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm">📋</span>
                </div>
            );
        }
    };

    return (
        <div className="relative">
            <button
                onClick={toggleDropdown}
                className="btn btn-ghost btn-circle relative"
            >
                <div className="indicator">
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="indicator-item badge badge-primary badge-sm animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
            </button>

            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-96 bg-base-100 shadow-xl rounded-lg overflow-hidden z-50 border border-gray-200">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <BellIcon className="w-5 h-5 text-blue-600" />
                                Notificaties
                            </h3>
                            <button
                                onClick={() => setShowDropdown(false)}
                                className="btn btn-ghost btn-sm btn-circle"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b bg-gray-50">
                            <button
                                className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'all'
                                        ? 'bg-blue-500 text-white border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                                onClick={() => setActiveTab('all')}
                            >
                                Alle ({activities.length})
                            </button>
                            <button
                                className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'unread'
                                        ? 'bg-blue-500 text-white border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                                onClick={() => setActiveTab('unread')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <EnvelopeIcon className="h-4 w-4" />
                                    <span>Ongelezen ({unreadCount})</span>
                                </div>
                            </button>
                            <button
                                className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'read'
                                        ? 'bg-blue-500 text-white border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                                onClick={() => setActiveTab('read')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <EnvelopeOpenIcon className="h-4 w-4" />
                                    <span>Gelezen ({activities.length - unreadCount})</span>
                                </div>
                            </button>
                        </div>

                        {/* Content */}
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="loading loading-spinner loading-md text-blue-600"></div>
                            </div>
                        ) : filteredActivities.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="text-4xl mb-2">🔔</div>
                                <div className="font-medium">Geen notificaties gevonden</div>
                                <div className="text-sm mt-1">
                                    {activeTab === 'unread' && 'Alle notificaties zijn gelezen'}
                                    {activeTab === 'read' && 'Geen gelezen notificaties'}
                                    {activeTab === 'all' && 'Er zijn nog geen notificaties'}
                                </div>
                            </div>
                        ) : (
                            <div className="max-h-96 overflow-y-auto">
                                {filteredActivities.map((activity, index) => (
                                    <div
                                        key={activity.id || index}
                                        className={`p-4 hover:bg-gray-50 flex gap-3 items-start cursor-pointer transition-all duration-200 border-b border-gray-100 ${
                                            !activity.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                        }`}
                                        onClick={() => !activity.read && handleMarkAsRead(activity.id)}
                                    >
                                        <div className="shrink-0 mt-1">
                                            {getActivityIcon(activity)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`font-medium line-clamp-2 ${!activity.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {activity.message || 'Geen bericht'}
                                                </span>
                                                {!activity.read && (
                                                    <span className="badge badge-primary badge-sm ml-2 shrink-0">nieuw</span>
                                                )}
                                            </div>
                                            {activity.details && (
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activity.details}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                <span>⏰</span>
                                                {formatTimestamp(activity.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="btn btn-sm btn-outline btn-primary w-full mb-2"
                                >
                                    Alles markeren als gelezen
                                </button>
                            )}
                            <button
                                onClick={fetchActivities}
                                className="btn btn-sm btn-ghost w-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                    '🔄'
                                )}
                                Vernieuwen
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;