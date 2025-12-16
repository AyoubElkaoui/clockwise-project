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
        const data = await getProjectGroups();
        setProjectGroups(data);
      } catch (error) {
        console.error("Error fetching project groups:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create not supported in new backend
  const handleCreateProjectGroup = async () => {
    showToast("Create not supported", "error");
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

      {/* Create not supported */}

      {/* Existing Project Groups */}
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
                  key={group.GcId}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                        <Folder className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {group.GcCode}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          ID: {group.GcId}
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
    </div>
  );
}
