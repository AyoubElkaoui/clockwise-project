"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  Building2,
  FolderKanban,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Briefcase,
} from "lucide-react";
import { getUsers, getTimeEntries, getCompanies, getAllProjects, getVacationRequests } from "@/lib/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

interface StatCard {
  title: string;
  value: string | number;
  icon: any;
  gradient: string;
  change?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data
      const [users, timeEntries, companies, projects, vacations] = await Promise.all([
        getUsers(),
        getTimeEntries(),
        getCompanies(),
        getAllProjects(),
        getVacationRequests(),
      ]);

      // Calculate statistics
      const totalHours = timeEntries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);
      const thisWeekEntries = timeEntries.filter((e: any) => {
        const entryWeek = dayjs(e.date).isoWeek();
        const currentWeek = dayjs().isoWeek();
        return entryWeek === currentWeek;
      });
      const thisWeekHours = thisWeekEntries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

      const pendingTimeEntries = timeEntries.filter((e: any) => e.status === "ingeleverd");
      const pendingVacations = vacations.filter((v: any) => v.status === "Pending");
      const approvedThisMonth = timeEntries.filter((e: any) => {
        const isThisMonth = dayjs(e.date).month() === dayjs().month();
        return isThisMonth && e.status === "goedgekeurd";
      }).length;

      const newStats: StatCard[] = [
        {
          title: "Totaal Gebruikers",
          value: users.length,
          icon: Users,
          gradient: "from-blue-500 to-cyan-500",
          change: `${users.filter((u: any) => u.rank === "admin").length} admins`,
        },
        {
          title: "Totaal Uren",
          value: `${totalHours.toFixed(1)}u`,
          icon: Clock,
          gradient: "from-purple-500 to-pink-500",
          change: `${thisWeekHours.toFixed(1)}u deze week`,
        },
        {
          title: "Bedrijven",
          value: companies.length,
          icon: Building2,
          gradient: "from-orange-500 to-red-500",
          change: `${projects.length} projecten`,
        },
        {
          title: "Te Goedkeuren",
          value: pendingTimeEntries.length + pendingVacations.length,
          icon: AlertCircle,
          gradient: "from-yellow-500 to-orange-500",
          change: `${pendingTimeEntries.length} uren, ${pendingVacations.length} vakantie`,
        },
        {
          title: "Goedgekeurd (maand)",
          value: approvedThisMonth,
          icon: CheckCircle2,
          gradient: "from-green-500 to-emerald-500",
          change: "Deze maand",
        },
        {
          title: "Projecten Actief",
          value: projects.length,
          icon: FolderKanban,
          gradient: "from-indigo-500 to-purple-500",
          change: `${companies.length} bedrijven`,
        },
      ];

      setStats(newStats);

      // Recent activity (laatste 10 entries)
      const sortedEntries = [...timeEntries]
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      setRecentActivity(sortedEntries);

      // Pending approvals
      const pending = [
        ...pendingTimeEntries.map((e: any) => ({ ...e, type: "timeEntry" })),
        ...pendingVacations.map((v: any) => ({ ...v, type: "vacation" })),
      ].slice(0, 8);
      setPendingApprovals(pending);

    } catch (error) {
      console.error("Failed to load admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return "text-green-600 bg-green-100";
      case "afgekeurd":
        return "text-red-600 bg-red-100";
      case "ingeleverd":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">Volledig overzicht van het systeem</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              {stat.change && (
                <span className="text-xs text-gray-500">{stat.change}</span>
              )}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Recente Activiteit</h2>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Geen recente activiteit</p>
            ) : (
              recentActivity.map((entry: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {entry.hours}u geregistreerd
                      </p>
                      <p className="text-sm text-gray-500">
                        {dayjs(entry.date).format("DD MMM YYYY")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      entry.status
                    )}`}
                  >
                    {entry.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Te Goedkeuren</h2>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-500">Alles goedgekeurd! 🎉</p>
              </div>
            ) : (
              pendingApprovals.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl hover:shadow-md transition-all border border-orange-100"
                >
                  <div className="flex items-center gap-3">
                    {item.type === "timeEntry" ? (
                      <Clock className="w-5 h-5 text-orange-600" />
                    ) : (
                      <Calendar className="w-5 h-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.type === "timeEntry"
                          ? `${item.hours}u - Uren`
                          : `Vakantie`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.type === "timeEntry"
                          ? dayjs(item.date).format("DD MMM YYYY")
                          : `${dayjs(item.startDate).format("DD MMM")} - ${dayjs(
                              item.endDate
                            ).format("DD MMM")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all">
          <Users className="w-6 h-6 mb-2" />
          <p className="font-medium">Gebruikers Beheren</p>
        </button>
        <button className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all">
          <Building2 className="w-6 h-6 mb-2" />
          <p className="font-medium">Bedrijven</p>
        </button>
        <button className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all">
          <FolderKanban className="w-6 h-6 mb-2" />
          <p className="font-medium">Projecten</p>
        </button>
        <button className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all">
          <Briefcase className="w-6 h-6 mb-2" />
          <p className="font-medium">Rapporten</p>
        </button>
      </div>
    </div>
  );
}
