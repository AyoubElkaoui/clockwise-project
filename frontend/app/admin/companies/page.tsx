"use client";
import { useState, useEffect, useMemo } from "react";
import { getCompanies, deleteCompany } from "@/lib/api";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import { Company } from "@/lib/types";
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
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
      const data: any = await getCompanies();
      let safeData: Company[] = [];
      if (Array.isArray(data)) {
        safeData = data;
      } else if (data && typeof data === "object" && Array.isArray(data.companies)) {
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("admin.companies.title")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("admin.companies.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCompanies}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{t("admin.users.export")}</span>
          </button>
          <button
            onClick={() => router.push("/admin/companies/create")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">{t("admin.companies.createCompany")}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            {t("admin.dashboard.totalUsers").toUpperCase()}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            {t("admin.dashboard.activeUsers").toUpperCase()}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.active}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            {t("admin.dashboard.totalProjects").toUpperCase()}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {companies.reduce((sum, c) => sum + (c.projectCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("admin.companies.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full pl-9 pr-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">{t("admin.companies.sortByName")}</option>
            <option value="email">{t("admin.companies.sortByEmail")}</option>
            <option value="created">{t("admin.companies.sortByCreated")}</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="h-9 w-9 flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCompanies.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedCompanies.size} {t("admin.companies.selected")}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCompanies(new Set())}
              className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              {t("admin.users.deselect")}
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("admin.users.delete")}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filteredAndSortedCompanies.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("admin.companies.noCompanies")}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery
              ? t("admin.companies.tryFilters")
              : t("admin.companies.noCompaniesDesc")}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedCompanies.size === filteredAndSortedCompanies.length &&
                      filteredAndSortedCompanies.length > 0
                    }
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("common.name")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  {t("common.email")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  {t("common.phone")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("common.status")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCompanies.has(company.id)}
                      onChange={() => handleSelectCompany(company.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(company.name || "C").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {company.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                    {company.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                    {company.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        company.active !== false
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {company.active !== false
                        ? t("status.active")
                        : t("status.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          router.push(`/admin/companies/edit/${company.id}`)
                        }
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Bewerken"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-md">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-semibold text-red-600">
                {companyToDelete
                  ? t("admin.companies.deleteConfirm")
                  : t("admin.companies.deleteBulkConfirm")}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {companyToDelete
                  ? `${t("admin.companies.deleteMessage")} ${companyToDelete.name}?`
                  : `${t("admin.companies.deleteMessage")} ${selectedCompanies.size} ${t("admin.companies.company")}${selectedCompanies.size !== 1 ? "s" : ""}?`}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {t("admin.users.deleteWarning")}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCompanyToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={companyToDelete ? confirmDeleteCompany : confirmBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("admin.users.delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
