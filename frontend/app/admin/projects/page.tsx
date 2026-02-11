"use client";
import { useState, useEffect, useMemo } from "react";
import { getAllProjects, deleteProject } from "@/lib/api";
import { getCompanies } from "@/lib/api";
import { getProjectGroups } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { Project, Company, ProjectGroup } from "@/lib/types";
import {
  Briefcase,
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
      const [projectsData, companiesData] = await Promise.all([
        getAllProjects(),
        getCompanies(),
      ]);
      let safeProjects: Project[] = [];
      if (Array.isArray(projectsData)) {
        safeProjects = projectsData;
      } else if (
        projectsData &&
        typeof projectsData === "object" &&
        Array.isArray(projectsData.projects)
      ) {
        safeProjects = projectsData.projects;
      } else if (
        projectsData &&
        typeof projectsData === "object" &&
        Array.isArray(projectsData.data)
      ) {
        safeProjects = projectsData.data;
      }
      setProjects(safeProjects);

      let safeCompanies: Company[] = [];
      if (Array.isArray(companiesData)) {
        safeCompanies = companiesData;
      } else if (
        companiesData &&
        typeof companiesData === "object" &&
        Array.isArray(companiesData.companies)
      ) {
        safeCompanies = companiesData.companies;
      } else if (
        companiesData &&
        typeof companiesData === "object" &&
        Array.isArray(companiesData.data)
      ) {
        safeCompanies = companiesData.data;
      }
      setCompanies(safeCompanies);

      // Load project groups for all companies
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

    // Sort
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
    const active = projects.length; // Assume all projects are active
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
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {t("admin.projects.title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t("admin.projects.subtitle")}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportProjects}>
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">{t("admin.projects.export")}</span>
          </Button>
          <Button onClick={() => router.push("/admin/projects/create")}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">{t("admin.projects.createProject")}</span>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t("admin.dashboard.totalProjects")}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                  {t("admin.companies.company")}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {companies.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
                placeholder={t("admin.projects.search")}
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
                <option value="name">{t("admin.projects.sortByName")}</option>
                <option value="group">{t("admin.projects.sortByGroup")}</option>
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
          {selectedProjects.size > 0 && (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedProjects.size} {t("admin.projects.selected")}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedProjects(new Set())}
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

          {/* Projects Table */}
          <div className="space-y-4">
            {/* Table Header */}
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Checkbox
                checked={
                  selectedProjects.size === filteredAndSortedProjects.length &&
                  filteredAndSortedProjects.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                {filteredAndSortedProjects.length} {t("admin.projects.project")}
                {filteredAndSortedProjects.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Projects List */}
            {filteredAndSortedProjects.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    {t("admin.projects.noProjects")}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {searchQuery
                      ? t("admin.projects.tryFilters")
                      : t("admin.projects.noProjectsDesc")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedProjects.has(project.id)}
                          onCheckedChange={() =>
                            handleSelectProject(project.id)
                          }
                        />

                        {/* Project Logo/Avatar */}
                        <div className="w-12 h-12 rounded-lg bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white font-semibold">
                          {(project.name || "P").charAt(0).toUpperCase()}
                        </div>

                        {/* Project Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {project.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              <span>{project.companyName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Filter className="w-4 h-4" />
                              <span>{project.projectGroupName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/projects/${project.id}`)
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteProject(project)}
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
                {projectToDelete
                  ? t("admin.projects.deleteConfirm")
                  : t("admin.projects.deleteBulkConfirm")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                {projectToDelete
                  ? `${t("admin.projects.deleteMessage")} ${projectToDelete.name}?`
                  : `${t("admin.projects.deleteMessage")} ${selectedProjects.size} ${t("admin.projects.project")}${selectedProjects.size !== 1 ? "s" : ""}?`}
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
                    setProjectToDelete(null);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={
                    projectToDelete ? confirmDeleteProject : confirmBulkDelete
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
