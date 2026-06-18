"use client";
import { JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getCompanies,
  getProjectGroups,
  getProjects,
  registerTimeEntry,
} from "@/lib/api";
import { Company, ProjectGroup, Project } from "@/lib/types";
import {
  ClockIcon,
  BuildingOfficeIcon,
  FolderIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterTime(): JSX.Element {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [selectedProjectGroup, setSelectedProjectGroup] = useState<
    number | null
  >(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [breakMinutes, setBreakMinutes] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [travelCosts, setTravelCosts] = useState<number>(0);
  const [expenses, setExpenses] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    getCompanies().then(setCompanies).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCompany !== null) {
      getProjectGroups(selectedCompany)
        .then(setProjectGroups)
        .catch(() => {});
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedProjectGroup !== null) {
      getProjects(selectedProjectGroup).then(setProjects).catch(() => {});
    }
  }, [selectedProjectGroup]);

  const calculateHours = (): number => {
    if (!startTime || !endTime) return 0;

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffMin = diffMs / (1000 * 60) - breakMinutes;

    return Math.max(0, diffMin / 60);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedProject) {
      setMessage(t("register.selectProject"));
      setIsSuccess(false);
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (!startTime || !endTime) {
      setMessage(t("register.fillTimes"));
      setIsSuccess(false);
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const userId = Number(localStorage.getItem("userId"));
    if (!userId) {
      setMessage(t("register.userNotFound"));
      setIsLoading(false);
      return;
    }

    const data = {
      userId,
      projectId: selectedProject,
      startTime: `2000-01-01T${startTime}:00`,
      endTime: `2000-01-01T${endTime}:00`,
      breakMinutes,
      distanceKm,
      travelCosts,
      expenses,
      notes,
    };

    try {
      await registerTimeEntry(data);
      setMessage(t("register.hoursSaved"));
      setIsSuccess(true);

      // Reset form
      setSelectedCompany(null);
      setSelectedProjectGroup(null);
      setSelectedProject(null);
      setStartTime("");
      setEndTime("");
      setBreakMinutes(0);
      setDistanceKm(0);
      setTravelCosts(0);
      setExpenses(0);
      setNotes("");
    } catch (error) {
      
      setMessage(t("register.saveError"));
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const totalHours = calculateHours();

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t("hours.title")}
        description={t("register.subtitle")}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8">
        {/* Main Form */}
        <div className="xl:col-span-2 space-y-4">
          {/* Project Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-blue-600" />
                {t("register.projectSelection")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    {t("register.company")}
                  </label>
                  <select
                    value={selectedCompany ?? ""}
                    onChange={(e) => setSelectedCompany(Number(e.target.value))}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">{t("register.selectCompany")}</option>
                    {companies.map((comp: Company) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCompany && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("register.projectGroup")}
                    </label>
                    <select
                      value={selectedProjectGroup ?? ""}
                      onChange={(e) => setSelectedProjectGroup(Number(e.target.value))}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">{t("register.selectProjectGroup")}</option>
                      {projectGroups.map((pg: ProjectGroup) => (
                        <option key={pg.id} value={pg.id}>
                          {pg.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedProjectGroup && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("register.project")}
                    </label>
                    <select
                      value={selectedProject ?? ""}
                      onChange={(e) => setSelectedProject(Number(e.target.value))}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">{t("register.selectProject")}</option>
                      {projects.map((p: Project) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Time Registration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                {t("register.timeRegistration")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("register.startTime")}
                  </label>
                  <input
                    type="time"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("register.endTime")}
                  </label>
                  <input
                    type="time"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("register.breakMinutes")}
                  </label>
                  <input
                    type="number"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CurrencyEuroIcon className="w-4 h-4 text-blue-600" />
                {t("register.additionalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("register.distanceKm")}
                  </label>
                  <input
                    type="number"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("register.travelCosts")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={travelCosts}
                    onChange={(e) => setTravelCosts(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("register.expenses")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={expenses}
                    onChange={(e) => setExpenses(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  {t("register.notes")}
                </label>
                <textarea
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none h-24"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("register.notesPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
                isSuccess
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
              }`}
            >
              <span>{message}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedProject || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("register.saving")}
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                {t("register.saveHours")}
              </>
            )}
          </button>
        </div>

        {/* Summary Sidebar */}
        <div className="xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t("register.summaryTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t("register.totalHours")}:
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {totalHours.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t("register.totalCosts")}:
                  </span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    €{(travelCosts + expenses).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t("register.distance")}:
                  </span>
                  <span className="text-xl font-bold text-violet-600 dark:text-violet-400">
                    {distanceKm} km
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t("register.tips")}
                </h4>
                <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <p>• {t("register.tip1")}</p>
                  <p>• {t("register.tip2")}</p>
                  <p>• {t("register.tip3")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
