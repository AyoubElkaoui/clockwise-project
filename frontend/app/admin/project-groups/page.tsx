"use client";
import { useState, useEffect } from "react";
import {
  getCompanies,
  getProjectGroups,
  createProjectGroup,
} from "@/lib/api/companyApi";
import { showToast } from "@/components/ui/toast";
import { Company, ProjectGroup } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { Folder, AlertTriangle } from "lucide-react";

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
        // silent
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
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t("admin.projectGroups.title")}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t("admin.projectGroups.subtitle")}
        </p>
      </div>

      {/* Project Groups Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Folder className="w-5 h-5 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("admin.projectGroups.existingGroups")} ({projectGroups.length})
          </h2>
        </div>

        {projectGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("admin.projectGroups.noGroups")}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code / Naam</th>
              </tr>
            </thead>
            <tbody>
              {projectGroups.map((group) => (
                <tr key={group.GcId} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 tabular-nums">
                    {group.GcId}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                        <Folder className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {group.GcCode}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
