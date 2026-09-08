"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserPlus, Search, Pencil, UserX, UserCheck, Shield, RefreshCw } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import {
  AdminUser,
  getAdminUsers,
  updateAdminUser,
  getApiErrorMessage,
} from "@/lib/api/adminUsersApi";

dayjs.extend(relativeTime);
dayjs.locale("nl");

const roleLabel = (role: string) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    default:
      return "Medewerker";
  }
};

const roleVariant = (role: string): "danger" | "info" | "default" => {
  if (role === "admin") return "danger";
  if (role === "manager") return "info";
  return "default";
};

const fullName = (u: AdminUser) =>
  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "user" | "manager" | "admin">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [pendingToggle, setPendingToggle] = useState<AdminUser | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await getAdminUsers());
    } catch (err) {
      showToast(getApiErrorMessage(err, "Gebruikers konden niet worden geladen"), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        fullName(u).toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.username ?? "").toLowerCase().includes(q) ||
        String(u.medewGcId).includes(q);
      const matchesRole = filterRole === "all" || u.role === filterRole;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && u.isActive) ||
        (filterStatus === "inactive" && !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, filterRole, filterStatus]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      managers: users.filter((u) => u.role === "manager" && u.isActive).length,
      admins: users.filter((u) => u.role === "admin" && u.isActive).length,
    }),
    [users],
  );

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const target = pendingToggle;
    const nextActive = !target.isActive;
    setToggling(true);
    try {
      await updateAdminUser(target.medewGcId, { isActive: nextActive });
      setUsers((prev) =>
        prev.map((u) =>
          u.medewGcId === target.medewGcId
            ? { ...u, isActive: nextActive, rank: nextActive ? u.role : "inactive" }
            : u,
        ),
      );
      showToast(
        `${fullName(target)} is ${nextActive ? "geactiveerd" : "gedeactiveerd"}`,
        "success",
      );
      setPendingToggle(null);
    } catch (err) {
      showToast(
        getApiErrorMessage(
          err,
          nextActive ? "Activeren mislukt" : "Deactiveren mislukt",
        ),
        "error",
      );
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Gebruikers laden...</p>
        </div>
      </div>
    );
  }

  const selectClass =
    "h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100";

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Gebruikers"
        description="Accounts aanmaken, bewerken en (de)activeren"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={loadUsers}>
              <RefreshCw className="w-4 h-4" />
              Vernieuwen
            </Button>
            <Button size="sm" onClick={() => router.push("/admin/users/create")}>
              <UserPlus className="w-4 h-4" />
              Nieuwe gebruiker
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Totaal" value={stats.total} icon={Users} color="blue" subtitle="accounts" />
        <StatCard title="Actief" value={stats.active} icon={UserCheck} color="emerald" subtitle="kunnen inloggen" />
        <StatCard title="Managers" value={stats.managers} icon={Shield} color="indigo" subtitle="actief" />
        <StatCard title="Admins" value={stats.admins} icon={Shield} color="rose" subtitle="actief" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Zoek op naam, e-mail, gebruikersnaam of Atrium-nummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
              className={selectClass}
            >
              <option value="all">Alle rollen</option>
              <option value="user">Medewerker</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className={selectClass}
            >
              <option value="all">Actief en inactief</option>
              <option value="active">Alleen actief</option>
              <option value="inactive">Alleen inactief</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10" />}
              title={users.length === 0 ? "Nog geen gebruikers" : "Geen gebruikers gevonden"}
              description={
                users.length === 0
                  ? "Maak de eerste gebruiker aan op basis van een Atrium-medewerker."
                  : "Pas de zoekopdracht of filters aan."
              }
              action={
                users.length === 0
                  ? { label: "Nieuwe gebruiker", onClick: () => router.push("/admin/users/create") }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Naam</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Gebruikersnaam</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">E-mail</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Laatste login</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.medewGcId}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        u.isActive ? "" : "opacity-60"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-[9px] flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: "var(--accent-weak)", color: "var(--accent)" }}
                          >
                            {(u.firstName?.charAt(0) ?? "") + (u.lastName?.charAt(0) ?? "") || u.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{fullName(u)}</p>
                            <p className="text-xs text-slate-500">Atrium #{u.medewGcId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{u.username}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={roleVariant(u.role)} size="sm">{roleLabel(u.role)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isActive ? "success" : "outline"} size="sm">
                          {u.isActive ? "Actief" : "Inactief"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.lastLogin ? dayjs(u.lastLogin).fromNow() : "Nooit"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/admin/users/edit/${u.medewGcId}`)}
                            title="Bewerken"
                          >
                            <Pencil className="w-4 h-4" />
                            Bewerken
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingToggle(u)}
                            title={u.isActive ? "Deactiveren" : "Activeren"}
                            className={u.isActive ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"}
                          >
                            {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            {u.isActive ? "Deactiveren" : "Activeren"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pendingToggle !== null} onOpenChange={(open) => !open && !toggling && setPendingToggle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingToggle?.isActive ? "Gebruiker deactiveren" : "Gebruiker activeren"}
            </DialogTitle>
            <DialogDescription>
              {pendingToggle?.isActive
                ? `${pendingToggle ? fullName(pendingToggle) : ""} kan daarna niet meer inloggen. Uren en gegevens blijven bewaard; het account kan later weer worden geactiveerd.`
                : `${pendingToggle ? fullName(pendingToggle) : ""} kan daarna weer inloggen met de rol ${pendingToggle ? roleLabel(pendingToggle.role) : ""}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingToggle(null)} disabled={toggling}>
              Annuleren
            </Button>
            <Button
              variant={pendingToggle?.isActive ? "danger" : "success"}
              onClick={confirmToggle}
              isLoading={toggling}
            >
              {pendingToggle?.isActive ? "Deactiveren" : "Activeren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
