"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllUsers, getAllWorkflowEntries, getCurrentPeriodId } from "@/lib/manager-api";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import authUtils from "@/lib/auth-utils";
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  Mail,
  Phone,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Briefcase,
  Edit,
  Power,
  PowerOff,
  Save,
  X,
  Search,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.locale("nl");

export default function ManagerTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<any>({});
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    rank: "user",
    contractHours: 40,
    vacationDays: 25,
  });

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const managerId = authUtils.getUserId();
      const userRole = authUtils.getRole();
      
      if (!managerId) {
        showToast("Gebruiker niet ingelogd", "error");
        return;
      }

      // Only managers can view team page
      if (userRole !== 'manager') {
        showToast("Geen toegang tot deze pagina", "error");
        router.push('/tijd-registratie');
        return;
      }

      // Load all users - managers see all team members
      const users = await getAllUsers();
      
      // Show all users to manager (no filtering by managerId since it doesn't exist in DB)
      const team = users;

      // Load workflow entries for stats
      const currentPeriodId = await getCurrentPeriodId();
      const workflowResponse = await getAllWorkflowEntries(currentPeriodId);
      const entries = workflowResponse.entries.map((e: any) => ({
        userId: e.medewGcId,
        date: e.datum,
        hours: e.aantal,
        status: e.status,
      }));

      // Calculate stats for each team member
      const teamWithStats = team.map((member) => {
        const memberEntries = entries.filter(
          (e: any) => e.userId === member.medewGcId,
        );

        // Current week
        const weekStart = dayjs().startOf("isoWeek");
        const weekEnd = dayjs().endOf("isoWeek");
        const weekEntries = memberEntries.filter((e: any) => {
          const date = dayjs(e.date);
          return date.isAfter(weekStart) && date.isBefore(weekEnd);
        });

        // Last week
        const lastWeekStart = dayjs().subtract(1, "week").startOf("isoWeek");
        const lastWeekEnd = dayjs().subtract(1, "week").endOf("isoWeek");
        const lastWeekEntries = memberEntries.filter((e: any) => {
          const date = dayjs(e.date);
          return date.isAfter(lastWeekStart) && date.isBefore(lastWeekEnd);
        });

        const weekHours = weekEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
        const lastWeekHours = lastWeekEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

        const approvedEntries = memberEntries.filter(
          (e: any) => e.status === "APPROVED",
        ).length;
        const pendingEntries = memberEntries.filter(
          (e: any) => e.status === "SUBMITTED",
        ).length;
        const totalEntries = memberEntries.length;

        const lastActivity =
          memberEntries.length > 0
            ? dayjs(
                Math.max(
                  ...memberEntries.map((e: any) =>
                    new Date(e.date).getTime(),
                  ),
                ),
              )
            : null;

        return {
          ...member,
          stats: {
            weekHours,
            lastWeekHours,
            approvedEntries,
            pendingEntries,
            totalEntries,
            lastActivity,
            utilization:
              weekHours > 0 ? Math.min((weekHours / 40) * 100, 100) : 0, // Assuming 40 hours/week target
          },
        };
      });

      setTeamMembers(teamWithStats);

      // Calculate overall team stats
      const totalMembers = team.length;
      const activeMembers = teamWithStats.filter(
        (m: any) => m.stats.weekHours > 0,
      ).length;
      const totalWeekHours = teamWithStats.reduce(
        (sum: number, m: any) => sum + m.stats.weekHours,
        0,
      );
      const avgHoursPerMember =
        totalMembers > 0 ? totalWeekHours / totalMembers : 0;
      const totalPending = teamWithStats.reduce(
        (sum: number, m: any) => sum + m.stats.pendingEntries,
        0,
      );

      setTeamStats({
        totalMembers,
        activeMembers,
        totalWeekHours,
        avgHoursPerMember,
        totalPending,
      });
    } catch (error) {
      showToast("Fout bij laden team data", "error");
    } finally {
      setLoading(false);
    }
  };

  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0)
      return { icon: null, color: "text-slate-500", change: "Nieuw" };
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return {
        icon: ArrowUpRight,
        color: "text-emerald-600",
        change: `+${change.toFixed(1)}%`,
      };
    } else if (change < 0) {
      return {
        icon: ArrowDownRight,
        color: "text-red-600",
        change: `${change.toFixed(1)}%`,
      };
    }
    return { icon: null, color: "text-slate-500", change: "0%" };
  };

  const getActivityStatus = (lastActivity: any) => {
    if (!lastActivity || !dayjs(lastActivity).isValid())
      return {
        status: "Inactief",
        color: "text-slate-500",
        bg: "bg-slate-100",
      };

    const daysSince = dayjs().diff(dayjs(lastActivity), "day");
    if (daysSince === 0)
      return {
        status: "Actief vandaag",
        color: "text-emerald-600",
        bg: "bg-emerald-100",
      };
    if (daysSince <= 3)
      return {
        status: "Recent actief",
        color: "text-blue-600",
        bg: "bg-blue-100",
      };
    if (daysSince <= 7)
      return {
        status: "Deze week",
        color: "text-amber-600",
        bg: "bg-amber-100",
      };

    return {
      status: `${daysSince} dagen geleden`,
      color: "text-red-600",
      bg: "bg-red-100",
    };
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setEditFormData({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      phone: member.phone || "",
      rank: member.rank || "user",
      isActive: member.rank !== "inactive",
      contractHours: member.contractHours || 40,
      vacationDays: member.vacationDays || 25,
      usedVacationDays: member.usedVacationDays || 0,
    });
  };

  const handleToggleActive = async (member: any) => {
    const newStatus = member.rank === "inactive" ? "user" : "inactive";
    try {
      await axios.put(`${API_URL}/users/${member.medewGcId}`, {
        rank: newStatus,
        isActive: newStatus !== "inactive",
      });
      showToast(
        `${member.firstName} ${member.lastName} is nu ${newStatus === "inactive" ? "inactief" : "actief"}`,
        "success"
      );
      loadTeamData();
    } catch (error) {
      showToast("Fout bij wijzigen status", "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;

    setSaving(true);
    try {
      const rank = editFormData.isActive ? editFormData.rank : "inactive";
      const updatedData = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        phone: editFormData.phone,
        rank: rank,
        isActive: rank !== "inactive",
        contractHours: editFormData.contractHours,
        vacationDays: editFormData.vacationDays,
        usedVacationDays: editFormData.usedVacationDays,
      };

      await axios.put(`${API_URL}/users/${editingMember.medewGcId}`, updatedData);

      showToast("Teamlid bijgewerkt", "success");
      setEditingMember(null);
      loadTeamData();
    } catch (error) {
      showToast("Fout bij opslaan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberData.firstName || !newMemberData.lastName || !newMemberData.email) {
      showToast("Vul alle verplichte velden in", "error");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API_URL}/users`, {
        ...newMemberData,
        managerId: authUtils.getUserId(),
      });

      showToast("Nieuw teamlid toegevoegd", "success");
      setShowAddMember(false);
      setNewMemberData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        rank: "user",
        contractHours: 40,
        vacationDays: 25,
      });
      loadTeamData();
    } catch (error) {
      showToast("Fout bij toevoegen", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Filter teamleden based op zoek/filter criteria
  const filteredTeamMembers = teamMembers.filter((member) => {
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = 
        member.firstName?.toLowerCase().includes(query) ||
        member.lastName?.toLowerCase().includes(query);
      const matchEmail = member.email?.toLowerCase().includes(query);
      const matchPhone = member.phone?.toLowerCase().includes(query);
      
      if (!matchName && !matchEmail && !matchPhone) {
        return false;
      }
    }
    
    // Role filter
    if (roleFilter !== "all") {
      if (member.rank !== roleFilter) {
        return false;
      }
    }
    
    // Status filter
    if (statusFilter === "active" && member.rank === "inactive") {
      return false;
    }
    if (statusFilter === "inactive" && member.rank !== "inactive") {
      return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Mijn Team"
        description="Overzicht van alle teamleden en hun prestaties"
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>
              <Users className="w-4 h-4 mr-2" />
              Nieuw Teamlid
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Teamleden" value={teamStats.totalMembers ?? 0} subtitle={`${teamStats.activeMembers ?? 0} actief deze week`} icon={Users} color="blue" />
        <StatCard title="Totaal Uren" value={`${teamStats.totalWeekHours?.toFixed(1) ?? "0.0"}u`} subtitle="Deze week" icon={Clock} color="emerald" />
        <StatCard title="Gemiddeld" value={`${teamStats.avgHoursPerMember?.toFixed(1) ?? "0.0"}u`} subtitle="Per teamlid" icon={Target} color="indigo" />
        <StatCard title="Te Behandelen" value={teamStats.totalPending ?? 0} subtitle="Uren registraties" icon={Activity} color="amber" />
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Zoek op naam, email of telefoon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">Alle rollen</option>
                <option value="user">Gebruiker</option>
                <option value="manager">Manager</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">Alle statussen</option>
                <option value="active">Actief</option>
                <option value="inactive">Inactief</option>
              </select>
            </div>
          </div>
          {(searchQuery || roleFilter !== "all" || statusFilter !== "all") && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>{filteredTeamMembers.length} van {teamMembers.length} teamleden</span>
              {(searchQuery || roleFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Wis filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTeamMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen teamleden gevonden</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                  ? "Pas de filters aan om meer resultaten te zien"
                  : "Er zijn nog geen teamleden aan jou toegewezen"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Medewerker</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Contact</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Uren/week</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Benutting</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredTeamMembers.map((member) => {
                    const trend = getTrendIndicator(member.stats.weekHours, member.stats.lastWeekHours);
                    const activity = getActivityStatus(member.stats.lastActivity);
                    return (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{member.firstName} {member.lastName}</p>
                              <p className="text-xs text-slate-500 capitalize">{member.rank === "manager" ? "Manager" : "Medewerker"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs">
                              <Mail className="w-3 h-3" />{member.email}
                            </div>
                            {member.phone && (
                              <div className="flex items-center gap-1 text-slate-500 text-xs">
                                <Phone className="w-3 h-3" />{member.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div>
                            <p className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">{member.stats.weekHours.toFixed(1)}u</p>
                            <p className={`text-xs font-medium ${trend.color}`}>{trend.change}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.stats.utilization.toFixed(0)}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(member.stats.utilization, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${activity.bg} ${activity.color}`}>
                            {activity.status}
                          </span>
                          {member.stats.pendingEntries > 0 && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              {member.stats.pendingEntries}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => router.push(`/manager/hours?userId=${member.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors" title="Uren bekijken">
                              <Briefcase className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEditMember(member)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors" title="Bewerken">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleToggleActive(member)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title={member.rank === "inactive" ? "Activeren" : "Deactiveren"}>
                              {member.rank === "inactive"
                                ? <Power className="w-4 h-4 text-emerald-600" />
                                : <PowerOff className="w-4 h-4 text-rose-500" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Teamlid Beheren</DialogTitle>
            <DialogDescription>
              Volledig beheer van {editingMember?.firstName} {editingMember?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Persoonlijke gegevens */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Persoonlijke Gegevens</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Voornaam
                  </label>
                  <Input
                    value={editFormData.firstName || ""}
                    onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Achternaam
                  </label>
                  <Input
                    value={editFormData.lastName || ""}
                    onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={editFormData.email || ""}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Telefoon
                  </label>
                  <Input
                    value={editFormData.phone || ""}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Contract gegevens */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Contract Gegevens</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Contract Uren / Week
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={editFormData.contractHours || 40}
                    onChange={(e) => setEditFormData({...editFormData, contractHours: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Rol
                  </label>
                  <select
                    value={editFormData.rank || "user"}
                    onChange={(e) => setEditFormData({...editFormData, rank: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="user">Medewerker</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vakantie gegevens */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Vakantiedagen</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Totaal / Jaar
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={editFormData.vacationDays || 25}
                    onChange={(e) => setEditFormData({...editFormData, vacationDays: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Opgenomen
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={editFormData.usedVacationDays || 0}
                    onChange={(e) => setEditFormData({...editFormData, usedVacationDays: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Resterend
                  </label>
                  <div className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium">
                    {(editFormData.vacationDays || 25) - (editFormData.usedVacationDays || 0)} dagen
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Status</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({...editFormData, isActive: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Medewerker is actief
                  </label>
                </div>
                {!editFormData.isActive && (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    Inactief
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              <X className="w-4 h-4 mr-2" />
              Annuleren
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nieuw Teamlid Toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een nieuwe medewerker toe aan je team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Persoonlijke gegevens */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Voornaam *
                </label>
                <Input
                  value={newMemberData.firstName}
                  onChange={(e) => setNewMemberData({...newMemberData, firstName: e.target.value})}
                  placeholder="Jan"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Achternaam *
                </label>
                <Input
                  value={newMemberData.lastName}
                  onChange={(e) => setNewMemberData({...newMemberData, lastName: e.target.value})}
                  placeholder="Jansen"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Email *
                </label>
                <Input
                  type="email"
                  value={newMemberData.email}
                  onChange={(e) => setNewMemberData({...newMemberData, email: e.target.value})}
                  placeholder="jan.jansen@bedrijf.nl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Telefoon
                </label>
                <Input
                  value={newMemberData.phone}
                  onChange={(e) => setNewMemberData({...newMemberData, phone: e.target.value})}
                  placeholder="06-12345678"
                />
              </div>
            </div>

            {/* Contract gegevens */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Contract Gegevens</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Contract Uren
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={newMemberData.contractHours}
                    onChange={(e) => setNewMemberData({...newMemberData, contractHours: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Vakantiedagen
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={newMemberData.vacationDays}
                    onChange={(e) => setNewMemberData({...newMemberData, vacationDays: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Rol
                  </label>
                  <select
                    value={newMemberData.rank}
                    onChange={(e) => setNewMemberData({...newMemberData, rank: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="user">Medewerker</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>
              <X className="w-4 h-4 mr-2" />
              Annuleren
            </Button>
            <Button onClick={handleAddMember} disabled={saving}>
              <Users className="w-4 h-4 mr-2" />
              {saving ? "Toevoegen..." : "Toevoegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
