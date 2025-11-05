"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  UserCheck,
  ClipboardList,
} from "lucide-react";
import { getUsers, getTimeEntries, getVacationRequests } from "@/lib/api";
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

export default function ManagerDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data
      const [users, timeEntries, vacations] = await Promise.all([
        getUsers(),
        getTimeEntries(),
        getVacationRequests(),
      ]);

      // Filter team members (alleen werknemers, geen admins/managers)
      const team = users.filter((u: any) => u.rank === "werknemer");
      setTeamMembers(team);

      // Calculate statistics
      const pendingTimeEntries = timeEntries.filter((e: any) => e.status === "ingeleverd");
      const pendingVacations = vacations.filter((v: any) => v.status === "Pending");
      const approvedThisWeek = timeEntries.filter((e: any) => {
        const entryWeek = dayjs(e.date).isoWeek();
        const currentWeek = dayjs().isoWeek();
        return entryWeek === currentWeek && e.status === "goedgekeurd";
      }).length;
      const totalHoursThisWeek = timeEntries
        .filter((e: any) => {
          const entryWeek = dayjs(e.date).isoWeek();
          return entryWeek === dayjs().isoWeek();
        })
        .reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

      const newStats: StatCard[] = [
        {
          title: "Team Leden",
          value: team.length,
          icon: Users,
          gradient: "from-blue-500 to-cyan-500",
          change: `${users.length} totaal`,
        },
        {
          title: "Te Goedkeuren",
          value: pendingTimeEntries.length + pendingVacations.length,
          icon: AlertCircle,
          gradient: "from-orange-500 to-red-500",
          change: `${pendingTimeEntries.length} uren, ${pendingVacations.length} vakantie`,
        },
        {
          title: "Goedgekeurd (week)",
          value: approvedThisWeek,
          icon: CheckCircle2,
          gradient: "from-green-500 to-emerald-500",
          change: "Deze week",
        },
        {
          title: "Totaal Uren (week)",
          value: `${totalHoursThisWeek.toFixed(1)}u`,
          icon: Clock,
          gradient: "from-purple-500 to-pink-500",
          change: "Deze week",
        },
      ];

      setStats(newStats);

      // Recent submissions (laatste ingeleverde entries)
      const recent = [...timeEntries]
        .filter((e: any) => e.status === "ingeleverd")
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8);
      setRecentSubmissions(recent);

      // Pending approvals
      const pending = [
        ...pendingTimeEntries.map((e: any) => ({ ...e, type: "timeEntry" })),
        ...pendingVacations.map((v: any) => ({ ...v, type: "vacation" })),
      ].slice(0, 10);
      setPendingApprovals(pending);

    } catch (error) {
      console.error("Failed to load manager dashboard:", error);
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
      case "Pending":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Manager Dashboard
        </h1>
        <p className="text-gray-600">Team overzicht en goedkeuringen</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Main Content - Three Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Te Goedkeuren</h2>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-700 mb-2">Alles goedgekeurd! 🎉</p>
                <p className="text-gray-500">Je hebt geen openstaande goedkeuringen</p>
              </div>
            ) : (
              pendingApprovals.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl hover:shadow-md transition-all border border-orange-100"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {item.type === "timeEntry" ? (
                      <Clock className="w-6 h-6 text-orange-600" />
                    ) : (
                      <Calendar className="w-6 h-6 text-orange-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.type === "timeEntry"
                          ? `${item.hours}u geregistreerd`
                          : `Vakantie aanvraag`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.type === "timeEntry"
                          ? dayjs(item.date).format("DD MMM YYYY")
                          : `${dayjs(item.startDate).format("DD MMM")} - ${dayjs(
                              item.endDate
                            ).format("DD MMM")}`}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md hover:shadow-lg"
                      title="Goedkeuren"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md hover:shadow-lg"
                      title="Afkeuren"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Members List */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Team</h2>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {teamMembers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Geen team leden</p>
            ) : (
              teamMembers.map((member: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="mt-6 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Recente Inleveringen</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentSubmissions.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-8">Geen recente inleveringen</p>
          ) : (
            recentSubmissions.map((entry: any, index: number) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-all border border-purple-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <p className="font-bold text-gray-900">{entry.hours}u</p>
                </div>
                <p className="text-sm text-gray-600">{dayjs(entry.date).format("DD MMM YYYY")}</p>
                <span
                  className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
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

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all">
          <Users className="w-6 h-6 mb-2" />
          <p className="font-medium">Team Beheren</p>
        </button>
        <button className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all">
          <CheckCircle2 className="w-6 h-6 mb-2" />
          <p className="font-medium">Uren Goedkeuren</p>
        </button>
        <button className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all">
          <Calendar className="w-6 h-6 mb-2" />
          <p className="font-medium">Vakantie Goedkeuren</p>
        </button>
      </div>
    </div>
  );
}
