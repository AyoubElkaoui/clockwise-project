"use client";
import { useState, useEffect } from "react";
import {
  getCompanies,
  getProjectGroups,
  createProjectGroup,
} from "@/lib/api/companyApi";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { Company, ProjectGroup } from "@/lib/types";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Building2,
  Folder,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminProjectGroupsPage() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [projectGroupName, setProjectGroupName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companiesData = await getCompanies();
        setCompanies(companiesData);
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      const fetchProjectGroups = async () => {
        try {
          const data = await getProjectGroups(selectedCompany);
          setProjectGroups(data);
        } catch (error) {
          console.error("Error fetching project groups:", error);
        }
      };

      fetchProjectGroups();
    } else {
      setProjectGroups([]);
    }
  }, [selectedCompany]);

  const handleCreateProjectGroup = async () => {
    if (!selectedCompany || !projectGroupName.trim()) {
      showToast(t("admin.projectGroups.fillAllFields"), "error");
      return;
    }

    try {
      await createProjectGroup({
        name: projectGroupName,
        companyId: selectedCompany,
      });

      showToast(t("admin.projectGroups.created"), "success");

      // Reset form
      setProjectGroupName("");

      // Reload project groups
      const data = await getProjectGroups(selectedCompany);
      setProjectGroups(data);
    } catch (error) {
      showToast(t("admin.projectGroups.createError"), "error");
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {t("admin.projectGroups.title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t("admin.projectGroups.subtitle")}
          </p>
        </div>
      </div>

      {/* Create New Project Group */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t("admin.projectGroups.createTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-medium">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t("admin.companies.company")}
              </label>
              <select
                value={selectedCompany || ""}
                onChange={(e) =>
                  setSelectedCompany(Number(e.target.value) || null)
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">
                  {t("admin.projectGroups.selectCompany")}
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                <Folder className="w-4 h-4 inline mr-2" />
                {t("admin.projectGroups.groupName")}
              </label>
              <Input
                placeholder={t("admin.projectGroups.namePlaceholder")}
                value={projectGroupName}
                onChange={(e) => setProjectGroupName(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleCreateProjectGroup}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {t("admin.projectGroups.createGroup")}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Project Groups */}
      {selectedCompany && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              {t("admin.projectGroups.existingGroups")} ({projectGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t("admin.projectGroups.noGroups")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectGroups.map((group) => (
                  <Card
                    key={group.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                          <Folder className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                            {group.name}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {group.projects?.length || 0}{" "}
                            {t("admin.projects.project").toLowerCase()}
                            {group.projects?.length !== 1 ? "en" : ""}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
