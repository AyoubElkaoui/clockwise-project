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
      console.error("Error loading users:", error);
      showToast("Fout bij laden gebruikers", "error");
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
        `${selectedUsers.size} gebruikers succesvol verwijderd`,
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
      showToast("Gebruiker succesvol verwijderd", "success");
    } catch (error) {
      showToast("Fout bij verwijderen gebruiker", "error");
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ["Naam", "Email", "Rol", "Functie", "Status", "Aangemaakt"].join(","),
      ...filteredAndSortedUsers.map((user) =>
        [
          `"${user.firstName} ${user.lastName}"`,
          user.email || "",
          user.rank || "user",
          user.function || "",
          user.rank === "inactive" ? "Inactief" : "Actief",
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
            Admin
          </Badge>
        );
      case "manager":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            <UserCheck className="w-3 h-3 mr-1" />
            Manager
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Users className="w-3 h-3 mr-1" />
            Medewerker
          </Badge>
        );
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
            Gebruikersbeheer
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Beheer alle gebruikers, rollen en rechten
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportUsers}>
            <Download className="w-4 h-4 mr-2" />
            Exporteren
          </Button>
          <Button onClick={() => router.push("/admin/users/create")}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nieuwe Gebruiker
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Totaal Gebruikers
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.total}
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
                  Actieve Gebruikers
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.active}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Administrators
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.admins}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Managers
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.managers}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Medewerkers
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.employees}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op naam of email..."
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
                <option value="all">Alle rollen</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">Medewerker</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="all">Alle status</option>
                <option value="active">Actief</option>
                <option value="inactive">Inactief</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="name">Sorteren op naam</option>
                <option value="email">Sorteren op email</option>
                <option value="role">Sorteren op rol</option>
                <option value="created">Sorteren op aangemaakt</option>
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
                  {selectedUsers.size} gebruiker
                  {selectedUsers.size !== 1 ? "s" : ""} geselecteerd
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  Deselecteren
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Verwijderen
                </Button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="space-y-4">
            {/* Table Header */}
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Checkbox
                checked={
                  selectedUsers.size === filteredAndSortedUsers.length &&
                  filteredAndSortedUsers.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                {filteredAndSortedUsers.length} gebruiker
                {filteredAndSortedUsers.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Users List */}
            {filteredAndSortedUsers.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Geen gebruikers gevonden
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {searchQuery ||
                    filterRole !== "all" ||
                    filterStatus !== "all"
                      ? "Probeer andere zoekcriteria"
                      : "Er zijn nog geen gebruikers toegevoegd"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedUsers.map((user) => (
                  <Card
                    key={user.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => handleSelectUser(user.id)}
                        />

                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {user.firstName?.charAt(0)}
                          {user.lastName?.charAt(0)}
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {user.firstName} {user.lastName}
                            </h3>
                            {getRoleBadge(user.rank || "user")}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              <span>{user.email}</span>
                            </div>
                            {user.function && (
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                <span>{user.function}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/users/edit/${user.id}`)
                            }
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
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
                  ? "Gebruiker verwijderen"
                  : "Gebruikers verwijderen"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                {userToDelete
                  ? `Weet je zeker dat je ${userToDelete.firstName} ${userToDelete.lastName} wilt verwijderen?`
                  : `Weet je zeker dat je ${selectedUsers.size} gebruiker${selectedUsers.size !== 1 ? "s" : ""} wilt verwijderen?`}
                <br />
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Deze actie kan niet ongedaan worden gemaakt.
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
                  Annuleren
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={userToDelete ? confirmDeleteUser : confirmBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Verwijderen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
