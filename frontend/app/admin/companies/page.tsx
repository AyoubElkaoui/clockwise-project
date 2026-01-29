"use client";
import { useState, useEffect, useMemo } from "react";
import { getCompanies, deleteCompany } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { Company } from "@/lib/types";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Users,
  Briefcase,
  ChevronDown,
  Download,
  AlertTriangle,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { useTranslation } from "react-i18next";

dayjs.extend(relativeTime);
dayjs.locale("nl");

export default function AdminCompaniesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(
    new Set(),
  );
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      let safeData: Company[] = [];
      if (Array.isArray(data)) {
        safeData = data;
      } else if (
        data &&
        typeof data === "object" &&
        Array.isArray(data.companies)
      ) {
        safeData = data.companies;
      } else if (data && typeof data === "object" && Array.isArray(data.data)) {
        safeData = data.data;
      }
      setCompanies(safeData);
    } catch (error) {
      
      showToast(t("common.errorLoading"), "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCompanies = useMemo(() => {
    let filtered = companies.filter((company) => {
      const matchesSearch =
        !searchQuery ||
        company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "email":
          aValue = a.email?.toLowerCase() || "";
          bValue = b.email?.toLowerCase() || "";
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
  }, [companies, searchQuery, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.active !== false).length;
    return { total, active };
  }, [companies]);

  const handleSelectCompany = (companyId: number) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
    } else {
      newSelected.add(companyId);
    }
    setSelectedCompanies(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCompanies.size === filteredAndSortedCompanies.length) {
      setSelectedCompanies(new Set());
    } else {
      setSelectedCompanies(
        new Set(filteredAndSortedCompanies.map((c) => c.id)),
      );
    }
  };

  const handleBulkDelete = () => {
    if (selectedCompanies.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const deletePromises = Array.from(selectedCompanies).map((id) =>
        deleteCompany(id),
      );
      await Promise.all(deletePromises);

      setCompanies(companies.filter((c) => !selectedCompanies.has(c.id)));
      setSelectedCompanies(new Set());
      setShowDeleteModal(false);

      showToast(
        `${selectedCompanies.size} ${t("admin.companies.bulkDeleted")}`,
        "success",
      );
    } catch (error) {
      showToast(t("admin.companies.errorDelete"), "error");
    }
  };

  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteModal(true);
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      await deleteCompany(companyToDelete.id);
      setCompanies(companies.filter((c) => c.id !== companyToDelete.id));
      setShowDeleteModal(false);
      setCompanyToDelete(null);
      showToast(t("admin.companies.deleted"), "success");
    } catch (error) {
      showToast(t("admin.companies.errorDelete"), "error");
    }
  };

  const exportCompanies = () => {
    const csvContent = [
      [
        t("common.name"),
        t("common.email"),
        t("common.phone"),
        t("common.address"),
        t("common.status"),
        t("common.created"),
      ].join(","),
      ...filteredAndSortedCompanies.map((company) =>
        [
          `"${company.name || ""}"`,
          company.email || "",
          company.phone || "",
          `"${company.address || ""}"`,
          company.active !== false ? t("status.active") : t("status.inactive"),
          company.createdAt
            ? dayjs(company.createdAt).format("YYYY-MM-DD")
            : "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bedrijven-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
            {t("admin.companies.title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t("admin.companies.subtitle")}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportCompanies}>
            <Download className="w-4 h-4 mr-2" />
            {t("admin.users.export")}
          </Button>
          <Button onClick={() => router.push("/admin/companies/create")}>
            <Plus className="w-4 h-4 mr-2" />
            {t("admin.companies.createCompany")}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t("admin.dashboard.totalUsers")}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t("admin.dashboard.activeUsers")}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.active}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t("admin.dashboard.totalProjects")}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {companies.reduce((sum, c) => sum + (c.projectCount || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
                placeholder={t("admin.companies.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="name">{t("admin.companies.sortByName")}</option>
                <option value="email">
                  {t("admin.companies.sortByEmail")}
                </option>
                <option value="created">
                  {t("admin.companies.sortByCreated")}
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
          {selectedCompanies.size > 0 && (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedCompanies.size} {t("admin.companies.selected")}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCompanies(new Set())}
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

          {/* Companies Table */}
          <div className="space-y-4">
            {/* Table Header */}
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Checkbox
                checked={
                  selectedCompanies.size ===
                    filteredAndSortedCompanies.length &&
                  filteredAndSortedCompanies.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                {filteredAndSortedCompanies.length}{" "}
                {t("admin.companies.company")}
                {filteredAndSortedCompanies.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Companies List */}
            {filteredAndSortedCompanies.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    {t("admin.companies.noCompanies")}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {searchQuery
                      ? t("admin.companies.tryFilters")
                      : t("admin.companies.noCompaniesDesc")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedCompanies.map((company) => (
                  <Card
                    key={company.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedCompanies.has(company.id)}
                          onCheckedChange={() =>
                            handleSelectCompany(company.id)
                          }
                        />

                        {/* Company Logo/Avatar */}
                        <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold">
                          {(company.name || "C").charAt(0).toUpperCase()}
                        </div>

                        {/* Company Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {company.name}
                            </h3>
                            <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              {company.active !== false
                                ? t("status.active")
                                : t("status.inactive")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            {company.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                <span>{company.email}</span>
                              </div>
                            )}
                            {company.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                <span>{company.phone}</span>
                              </div>
                            )}
                            {company.address && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{company.address}</span>
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
                              router.push(`/admin/companies/edit/${company.id}`)
                            }
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteCompany(company)}
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
                {companyToDelete
                  ? t("admin.companies.deleteConfirm")
                  : t("admin.companies.deleteBulkConfirm")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                {companyToDelete
                  ? `${t("admin.companies.deleteMessage")} ${companyToDelete.name}?`
                  : `${t("admin.companies.deleteMessage")} ${selectedCompanies.size} ${t("admin.companies.company")}${selectedCompanies.size !== 1 ? "s" : ""}?`}
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
                    setCompanyToDelete(null);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={
                    companyToDelete ? confirmDeleteCompany : confirmBulkDelete
                  }
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
