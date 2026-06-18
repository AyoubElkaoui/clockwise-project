"use client";
import { useState, useEffect, useMemo } from "react";
import { getUsers, deleteUser } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { User } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Phone,
  Shield,
  UserCheck,
  Building,
  ChevronDown,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.locale("nl");

export default function AdminUsersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      let safeData: User[] = [];
      if (Array.isArray(data)) {
        safeData = data;
      } else if (
        data &&
        typeof data === "object" &&
        Array.isArray(data.users)
      ) {
        safeData = data.users;
      } else if (data && typeof data === "object" && Array.isArray(data.data)) {
        safeData = data.data;
      }
      setUsers(safeData);
    } catch (error) {

      showToast(t("common.errorLoading"), "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = filterRole === "all" || user.rank === filterRole;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && user.rank !== "inactive") ||
        (filterStatus === "inactive" && user.rank === "inactive");

      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "email":
          aValue = a.email?.toLowerCase() || "";
          bValue = b.email?.toLowerCase() || "";
          break;
        case "role":
          aValue = a.rank || "";
          bValue = b.rank || "";
          break;
        case "created":
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, filterRole, filterStatus, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.rank !== "inactive").length;
    const admins = users.filter((u) => u.rank === "admin").length;
    const managers = users.filter((u) => u.rank === "manager").length;
    const employees = users.filter((u) => u.rank === "user" || !u.rank).length;

    return { total, active, admins, managers, employees };
  }, [users]);

  const handleSelectUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredAndSortedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredAndSortedUsers.map((u) => u.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedUsers.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const deletePromises = Array.from(selectedUsers).map((id) =>
        deleteUser(id),
      );
      await Promise.all(deletePromises);

      setUsers(users.filter((u) => !selectedUsers.has(u.id)));
      setSelectedUsers(new Set());
      setShowDeleteModal(false);

      showToast(
        `${selectedUsers.size} ${t("admin.users.bulkDeleted")}`,
        "success",
      );
    } catch (error) {
      showToast("Fout bij verwijderen gebruikers", "error");
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete.id);
      setUsers(users.filter((u) => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
      showToast(t("admin.users.deleted"), "success");
    } catch (error) {
      showToast(t("admin.users.errorDelete"), "error");
    }
  };

  const exportUsers = () => {
    const csvContent = [
      [
        t("common.name"),
        t("common.email"),
        t("common.role"),
        t("common.function"),
        t("common.status"),
        t("common.created"),
      ].join(","),
      ...filteredAndSortedUsers.map((user) =>
        [
          `"${user.firstName} ${user.lastName}"`,
          user.email || "",
          user.rank || "user",
          user.function || "",
          user.rank === "inactive" ? t("status.inactive") : t("status.active"),
          user.createdAt ? dayjs(user.createdAt).format("YYYY-MM-DD") : "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gebruikers-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <Shield className="w-3 h-3 mr-1" />
            {t("common.admin")}
          </Badge>
        );
      case "manager":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            <UserCheck className="w-3 h-3 mr-1" />
            {t("common.manager")}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Users className="w-3 h-3 mr-1" />
            {t("common.employee")}
          </Badge>
        );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t("admin.users.title")}
        description={t("admin.users.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={exportUsers}>
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">{t("admin.users.export")}</span>
            </Button>
            <Button onClick={() => router.push("/admin/users/create")}>
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">{t("admin.users.createUser")}</span>
            </Button>
          </>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          title={t("admin.dashboard.totalUsers")}
          value={stats.total}
          icon={Users}
          color="blue"
        />
        <StatCard
          title={t("admin.dashboard.activeUsers")}
          value={stats.active}
          icon={UserCheck}
          color="emerald"
        />
        <StatCard
          title={t("common.admins")}
          value={stats.admins}
          icon={Shield}
          color="rose"
        />
        <StatCard
          title={t("common.managers")}
          value={stats.managers}
          icon={UserCheck}
          color="amber"
        />
        <StatCard
          title={t("common.employees")}
          value={stats.employees}
          icon={Users}
          color="indigo"
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t("admin.users.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="all">{t("admin.users.allRoles")}</option>
                <option value="admin">{t("common.admin")}</option>
                <option value="manager">{t("common.manager")}</option>
                <option value="user">{t("common.employee")}</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="all">{t("admin.users.allStatuses")}</option>
                <option value="active">{t("status.active")}</option>
                <option value="inactive">{t("status.inactive")}</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="name">{t("admin.users.sortByName")}</option>
                <option value="email">{t("admin.users.sortByEmail")}</option>
                <option value="role">{t("admin.users.sortByRole")}</option>
                <option value="created">
                  {t("admin.users.sortByCreated")}
                </option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedUsers.size} {t("common.user")}
                  {selectedUsers.size !== 1 ? "s" : ""}{" "}
                  {t("admin.users.selected")}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  {t("admin.users.deselect")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t("admin.users.delete")}
                </Button>
              </div>
            </div>
          )}

          {/* Users Table */}
          {filteredAndSortedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{t("admin.users.noUsers")}</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery || filterRole !== "all" || filterStatus !== "all"
                  ? t("admin.users.tryFilters")
                  : t("common.noData")}
              </p>
            </div>
          ) : (
            <>
              {/* Select-all row */}
              <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-2">
                <Checkbox
                  checked={
                    selectedUsers.size === filteredAndSortedUsers.length &&
                    filteredAndSortedUsers.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                  {filteredAndSortedUsers.length} {t("common.user")}
                  {filteredAndSortedUsers.length !== 1 ? "s" : ""}
                </span>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                          <th className="px-4 py-3 text-left w-10"></th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.name")}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">{t("common.email")}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.role")}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">{t("common.function")}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredAndSortedUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={selectedUsers.has(user.id)}
                                onCheckedChange={() => handleSelectUser(user.id)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                </div>
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                  {user.firstName} {user.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {getRoleBadge(user.rank || "user")}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                              {user.function && (
                                <div className="flex items-center gap-1">
                                  <Building className="w-4 h-4" />
                                  <span>{user.function}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/admin/users/edit/${user.id}`)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteUser(user)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                {userToDelete
                  ? t("admin.users.deleteConfirm")
                  : t("admin.users.deleteBulkConfirm")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                {userToDelete
                  ? `${t("admin.users.deleteMessage")} ${userToDelete.firstName} ${userToDelete.lastName}?`
                  : `${t("admin.users.deleteMessage")} ${selectedUsers.size} ${t("common.user")}${selectedUsers.size !== 1 ? "s" : ""}?`}
                <br />
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {t("admin.users.deleteWarning")}
                </span>
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={userToDelete ? confirmDeleteUser : confirmBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("admin.users.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
