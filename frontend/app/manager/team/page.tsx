"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllUsers, getAllWorkflowEntries } from "@/lib/manager-api";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      console.log("All users loaded:", users);
      
      // Show all users to manager (no filtering by managerId since it doesn't exist in DB)
      const team = users;
      console.log("Team members:", team);

      // Load workflow entries for stats
      const workflowResponse = await getAllWorkflowEntries(100426);
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
                    new Date(e.startTime).getTime(),
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
    if (!lastActivity)
      return {
        status: "Inactief",
        color: "text-slate-500",
        bg: "bg-slate-100",
      };

    const daysSince = dayjs().diff(lastActivity, "day");
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
    });
  };

  const handleToggleActive = async (member: any) => {
    const newStatus = member.rank === "inactive" ? "user" : "inactive";
    try {
      await axios.put(`/api/users/${member.medewGcId}`, {
        ...member,
        rank: newStatus,
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
      const updatedData = {
        ...editingMember,
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        phone: editFormData.phone,
        rank: editFormData.isActive ? editFormData.rank : "inactive",
      };

      await axios.put(`/api/users/${editingMember.medewGcId}`, updatedData);
      
      showToast("Teamlid bijgewerkt", "success");
      setEditingMember(null);
      loadTeamData();
    } catch (error) {
      showToast("Fout bij opslaan", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Mijn Team
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Overzicht van alle teamleden en hun prestaties
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Team E-mail
          </Button>
          <Button>
            <UserCheck className="w-4 h-4 mr-2" />
            Team Rapport
          </Button>
        </div>
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Teamleden
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {teamStats.totalMembers}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {teamStats.activeMembers} actief deze week
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Totaal Uren
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {teamStats.totalWeekHours?.toFixed(1)}u
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Deze week
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Gemiddeld
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {teamStats.avgHoursPerMember?.toFixed(1)}u
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Per teamlid
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Te Behandelen
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {teamStats.totalPending}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Uren registraties
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teamMembers.map((member) => {
          const trend = getTrendIndicator(
            member.stats.weekHours,
            member.stats.lastWeekHours,
          );
          const activity = getActivityStatus(member.stats.lastActivity);

          return (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                      {member.firstName?.charAt(0)}
                      {member.lastName?.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {member.firstName} {member.lastName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`${activity.bg} ${activity.color} border-0 text-xs`}
                        >
                          {activity.status}
                        </Badge>
                        {member.stats.pendingEntries > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 text-xs">
                            {member.stats.pendingEntries} pending
                          </Badge>
                        )}
                        {member.rank === "inactive" && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-xs">
                            Inactief
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditMember(member)}
                      title="Teamlid bewerken"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleToggleActive(member)}
                      title={member.rank === "inactive" ? "Activeren" : "Deactiveren"}
                    >
                      {member.rank === "inactive" ? (
                        <Power className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-red-600" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hours Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {member.stats.weekHours.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Uren deze week
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {trend.icon && (
                        <trend.icon className={`w-3 h-3 ${trend.color}`} />
                      )}
                      <span className={`text-xs ${trend.color}`}>
                        {trend.change}
                      </span>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {member.stats.utilization.toFixed(0)}%
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Benutting
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <span>{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      router.push(`/manager/hours?userId=${member.id}`)
                    }
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Projecten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      router.push(`/manager/vacation?userId=${member.id}`)
                    }
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Vakantie
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      router.push(`/manager/hours?userId=${member.id}`)
                    }
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {teamMembers.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Geen teamleden gevonden
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Er zijn nog geen teamleden aan jou toegewezen.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Teamlid Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de gegevens van {editingMember?.firstName} {editingMember?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <input
                type="checkbox"
                id="isActive"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({...editFormData, isActive: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Actief
              </label>
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
    </div>
  );
}
