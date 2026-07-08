"use client";
import { useState, useEffect, useMemo } from "react";
import { getAllProjects, deleteProject } from "@/lib/api";
import { getCompanies } from "@/lib/api";
import { getProjectGroups } from "@/lib/api";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import { Project, Company, ProjectGroup } from "@/lib/types";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  Building2,
  ChevronDown,
  Download,
  AlertTriangle,
  Eye,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { useTranslation } from "react-i18next";

dayjs.extend(relativeTime);
dayjs.locale("nl");

export default function AdminProjectsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(
    new Set(),
  );
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, companiesData]: [any, any] = await Promise.all([
        getAllProjects(),
        getCompanies(),
      ]);
      let safeProjects: Project[] = [];
      if (Array.isArray(projectsData)) {
        safeProjects = projectsData;
      } else if (projectsData && typeof projectsData === "object" && Array.isArray(projectsData.projects)) {
        safeProjects = projectsData.projects;
      } else if (projectsData && typeof projectsData === "object" && Array.isArray(projectsData.data)) {
        safeProjects = projectsData.data;
      }
      setProjects(safeProjects);

      let safeCompanies: Company[] = [];
      if (Array.isArray(companiesData)) {
        safeCompanies = companiesData;
      } else if (companiesData && typeof companiesData === "object" && Array.isArray(companiesData.companies)) {
        safeCompanies = companiesData.companies;
      } else if (companiesData && typeof companiesData === "object" && Array.isArray(companiesData.data)) {
        safeCompanies = companiesData.data;
      }
      setCompanies(safeCompanies);

      const groupsPromises = safeCompanies.map((company) =>
        getProjectGroups(company.id),
      );
      const groupsArrays = await Promise.all(groupsPromises);
      const allGroups = groupsArrays.flat();
      setProjectGroups(allGroups);
    } catch (error) {
      showToast(t("common.errorLoading"), "error");
    } finally {
      setLoading(false);
    }
  };

  const enrichedProjects = useMemo(() => {
    return projects.map((project) => {
      const group = projectGroups.find((g) => g.id === project.projectGroupId);
      const company = group
        ? companies.find((c) => c.id === group.companyId)
        : null;
      return {
        ...project,
        projectGroupName: group?.name || "Onbekend",
        companyName: company?.name || "Onbekend",
      };
    });
  }, [projects, projectGroups, companies]);

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = enrichedProjects.filter((project) => {
      const matchesSearch =
        !searchQuery ||
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.projectGroupName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        project.companyName?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "group":
          aValue = a.projectGroupName?.toLowerCase() || "";
          bValue = b.projectGroupName?.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [enrichedProjects, searchQuery, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.length;
    return { total, active };
  }, [projects]);

  const handleSelectProject = (projectId: number) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === filteredAndSortedProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredAndSortedProjects.map((p) => p.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedProjects.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const deletePromises = Array.from(selectedProjects).map((id) =>
        deleteProject(id),
      );
      await Promise.all(deletePromises);

      setProjects(projects.filter((p) => !selectedProjects.has(p.id)));
      setSelectedProjects(new Set());
      setShowDeleteModal(false);

      showToast(
        `${selectedProjects.size} ${t("admin.projects.bulkDeleted")}`,
        "success",
      );
    } catch (error) {
      showToast(t("admin.projects.errorDelete"), "error");
    }
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      setProjects(projects.filter((p) => p.id !== projectToDelete.id));
      setShowDeleteModal(false);
      setProjectToDelete(null);
      showToast(t("admin.projects.deleted"), "success");
    } catch (error) {
      showToast(t("admin.projects.errorDelete"), "error");
    }
  };

  const exportProjects = () => {
    const csvContent = [
      [
        t("common.name"),
        t("admin.companies.company"),
        t("admin.projects.group"),
      ].join(","),
      ...filteredAndSortedProjects.map((project) =>
        [
          `"${project.name || ""}"`,
          `"${project.companyName || ""}"`,
          `"${project.projectGroupName || ""}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `projecten-${dayjs().format("YYYY-MM-DD")}.csv`;
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
            {t("admin.projects.title")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("admin.projects.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportProjects}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{t("admin.projects.export")}</span>
          </button>
          <button
            onClick={() => router.push("/admin/projects/create")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">{t("admin.projects.createProject")}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            {t("admin.dashboard.totalProjects").toUpperCase()}
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
            {t("admin.companies.company").toUpperCase()}S
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {companies.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("admin.projects.search")}
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
            <option value="name">{t("admin.projects.sortByName")}</option>
            <option value="group">{t("admin.projects.sortByGroup")}</option>
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
      {selectedProjects.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedProjects.size} {t("admin.projects.selected")}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedProjects(new Set())}
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
      {filteredAndSortedProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <Briefcase className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("admin.projects.noProjects")}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery
              ? t("admin.projects.tryFilters")
              : t("admin.projects.noProjectsDesc")}
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
                      selectedProjects.size === filteredAndSortedProjects.length &&
                      filteredAndSortedProjects.length > 0
                    }
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("common.name")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  {t("admin.companies.company")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  {t("admin.projects.group")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProjects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(project.id)}
                      onChange={() => handleSelectProject(project.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(project.name || "P").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {project.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{project.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span>{project.projectGroupName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          router.push(`/admin/projects/${project.id}`)
                        }
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Bekijken"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project)}
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
                {projectToDelete
                  ? t("admin.projects.deleteConfirm")
                  : t("admin.projects.deleteBulkConfirm")}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {projectToDelete
                  ? `${t("admin.projects.deleteMessage")} ${projectToDelete.name}?`
                  : `${t("admin.projects.deleteMessage")} ${selectedProjects.size} ${t("admin.projects.project")}${selectedProjects.size !== 1 ? "s" : ""}?`}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {t("admin.users.deleteWarning")}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProjectToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={projectToDelete ? confirmDeleteProject : confirmBulkDelete}
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
