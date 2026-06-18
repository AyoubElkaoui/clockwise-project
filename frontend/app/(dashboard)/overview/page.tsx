"use client";
import React, {useState, useEffect, useCallback, JSX} from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { getTimeEntries } from "@/lib/api";
import { TimeEntry } from "@/lib/types";
import { useTranslation } from "react-i18next";
import {
    ClockIcon,
    CalendarDaysIcon,
    CurrencyEuroIcon,
    ChartBarIcon,
    FunnelIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon
} from "@heroicons/react/24/outline";
import { Clock, Calendar, DollarSign, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
dayjs.extend(isBetween);

const PAGE_SIZE = 10;

export default function UrenOverzicht(): JSX.Element {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
  const [startDate, setStartDate] = useState<string>(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState<string>(
    dayjs().endOf("month").format("YYYY-MM-DD"),
  );
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const safeToFixed = (value: any, decimals: number = 2): string => {
    if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
      return value.toFixed(decimals);
    }
    return "0." + "0".repeat(decimals);
  };

  const filterData = useCallback(() => {
    try {
      const start = dayjs(startDate).startOf("day");
      const end = dayjs(endDate).endOf("day");

      let result: TimeEntry[] = [];
      for (const entry of entries) {
        try {
          // FILTER: Only show approved entries
          if (entry.status !== "goedgekeurd") {
            continue;
          }

          const entryDate = dayjs(entry.startTime);
          if (entryDate.isBetween(start, end, "day", "[]")) {
            result.push(entry);
          }
        } catch (error) {
          
        }
      }

      if (selectedProject) {
        const temp: TimeEntry[] = [];
        for (const entry of result) {
          if (entry.project?.name === selectedProject) {
            temp.push(entry);
          }
        }
        result = temp;
      }

      if (selectedCompany) {
        const temp: TimeEntry[] = [];
        for (const entry of result) {
          if (entry.project?.projectGroup?.company?.name === selectedCompany) {
            temp.push(entry);
          }
        }
        result = temp;
      }

      if (searchTerm) {
        const temp: TimeEntry[] = [];
        const searchLower = searchTerm.toLowerCase();
        for (const entry of result) {
          const projectName = entry.project?.name?.toLowerCase() || "";
          const companyName =
            entry.project?.projectGroup?.company?.name?.toLowerCase() || "";
          const notes = entry.notes?.toLowerCase() || "";

          if (
            projectName.includes(searchLower) ||
            companyName.includes(searchLower) ||
            notes.includes(searchLower)
          ) {
            temp.push(entry);
          }
        }
        result = temp;
      }

      setFilteredEntries(result);
      setCurrentPage(1);
    } catch (error) {
      
      setFilteredEntries([]);
    }
  }, [
    entries,
    startDate,
    endDate,
    selectedProject,
    selectedCompany,
    searchTerm,
  ]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const data = await getTimeEntries();
        let safeData: TimeEntry[] = [];
        if (Array.isArray(data)) {
          safeData = data;
        }
        setEntries(safeData);
      } catch (error) {
        
        setEntries([]);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    try {
      const projectsSet = new Set<string>();
      const companiesSet = new Set<string>();

      for (const entry of entries) {
        try {
          // Only get options from approved entries
          if (
            entry &&
            entry.status === "goedgekeurd" &&
            entry.project &&
            entry.project.name
          ) {
            projectsSet.add(entry.project.name);
          }
          const compName = entry?.project?.projectGroup?.company?.name;
          if (entry && entry.status === "goedgekeurd" && compName) {
            companiesSet.add(compName);
          }
        } catch (error) {
          
        }
      }

      setProjectOptions(Array.from(projectsSet));
      setCompanyOptions(Array.from(companiesSet));
    } catch (error) {
      
      setProjectOptions([]);
      setCompanyOptions([]);
    }
  }, [entries]);

  useEffect(() => {
    filterData();
  }, [
    entries,
    startDate,
    endDate,
    selectedProject,
    selectedCompany,
    searchTerm,
    filterData,
  ]);

  // Calculate statistics - ONLY for approved entries
  let totalHours = 0;
  let totalDays = 0;
  let totalExpenses = 0;
  let totalDistance = 0;
  const daysWithHours = new Set<string>();

  for (const entry of filteredEntries) {
    try {
      if (
        !entry ||
        !entry.startTime ||
        !entry.endTime ||
        entry.status !== "goedgekeurd"
      )
        continue;
      const start = dayjs(entry.startTime);
      const end = dayjs(entry.endTime);
      const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
      if (diffMin > 0) {
        totalHours += diffMin / 60;
        daysWithHours.add(start.format("YYYY-MM-DD"));
      }
      totalExpenses += entry.expenses || 0;
      totalDistance += entry.distanceKm || 0;
    } catch (error) {
      
    }
  }
  totalDays = daysWithHours.size;

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const pageEntries = filteredEntries.slice(
    pageStartIndex,
    pageStartIndex + PAGE_SIZE,
  );

  function goToPage(page: number): void {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  }

  const resetFilters = (): void => {
    setStartDate(dayjs().startOf("month").format("YYYY-MM-DD"));
    setEndDate(dayjs().endOf("month").format("YYYY-MM-DD"));
    setSelectedProject("");
    setSelectedCompany("");
    setSearchTerm("");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t("overview.title")}
        description={t("overview.subtitle")}
        actions={
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Exporteren
          </button>
        }
      />

      {/* Statistics Cards - ONLY APPROVED HOURS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("overview.approved")}
          value={`${safeToFixed(totalHours)}u`}
          subtitle={t("overview.totalHoursLabel") || "Goedgekeurde uren"}
          icon={Clock}
          color="emerald"
        />
        <StatCard
          title={t("overview.totalDays")}
          value={totalDays}
          subtitle={t("overview.daysWorked") || "Gewerkte dagen"}
          icon={Calendar}
          color="violet"
        />
        <StatCard
          title={t("overview.expenses")}
          value={`€${safeToFixed(totalExpenses)}`}
          subtitle={t("overview.totalExpenses") || "Totale kosten"}
          icon={DollarSign}
          color="amber"
        />
        <StatCard
          title={t("overview.distance")}
          value={`${safeToFixed(totalDistance, 0)} km`}
          subtitle={t("overview.totalDistance") || "Totale afstand"}
          icon={MapPin}
          color="indigo"
        />
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-blue-600" />
            {t("overview.filters")}
            <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
              {t("overview.onlyApproved")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("overview.startDate")}
              </label>
              <input
                type="date"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("overview.endDate") || "Einddatum"}
              </label>
              <input
                type="date"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Bedrijf
              </label>
              <select
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                <option value="">{t("overview.allCompanies")}</option>
                {companyOptions.map((comp, index) => (
                  <option key={comp || index} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Project
              </label>
              <select
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">{t("overview.allProjects")}</option>
                {projectOptions.map((proj, index) => (
                  <option key={proj || index} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Zoek op project, bedrijf of notities..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredEntries.length}</span> goedgekeurde entries van{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{entries.filter((e) => e.status === "goedgekeurd").length}</span> totaal
            </p>
            <button
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <EyeIcon className="w-4 h-4 text-blue-600" />
            {t("overview.approved")}registraties
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: Card layout */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
            {pageEntries.map((entry, index) => {
              try {
                const start = dayjs(entry.startTime);
                const end = dayjs(entry.endTime);
                const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
                const hours = diffMin > 0 ? diffMin / 60 : 0;

                return (
                  <div key={entry.id || index} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                        {start.format("DD-MM-YYYY")}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
                        {safeToFixed(hours)} uur
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {start.format("HH:mm")} - {end.format("HH:mm")}
                    </div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                      {entry.project?.name || "Onbekend project"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {entry.project?.projectGroup?.company?.name || "Onbekend bedrijf"}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-slate-400 italic mt-1 truncate">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                );
              } catch {
                return (
                  <div key={index} className="p-4 text-center text-rose-500 text-sm">
                    Error loading entry
                  </div>
                );
              }
            })}

            {pageEntries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <CheckCircleIcon className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen goedgekeurde uren gevonden</p>
                <p className="text-sm text-slate-500 mt-1">Probeer je filters aan te passen</p>
              </div>
            )}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("overview.date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("overview.startTime")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("overview.endTime")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{t("overview.hours")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Bedrijf</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Notities</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {pageEntries.map((entry, index) => {
                  try {
                    const start = dayjs(entry.startTime);
                    const end = dayjs(entry.endTime);
                    const diffMin = end.diff(start, "minute") - (entry.breakMinutes || 0);
                    const hours = diffMin > 0 ? diffMin / 60 : 0;

                    return (
                      <tr
                        key={entry.id || index}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {start.format("DD-MM-YYYY")}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{start.format("HH:mm")}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{end.format("HH:mm")}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
                            {safeToFixed(hours)} uur
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {entry.project?.projectGroup?.company?.name || "Onbekend bedrijf"}
                        </td>
                        <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">
                          {entry.project?.name || "Onbekend project"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 italic">
                          {entry.notes || "Geen notities"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
                            Goedgekeurd
                          </span>
                        </td>
                      </tr>
                    );
                  } catch {
                    return (
                      <tr key={index}>
                        <td colSpan={8} className="px-4 py-3 text-center text-rose-500">
                          Error loading entry
                        </td>
                      </tr>
                    );
                  }
                })}

                {pageEntries.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                          <CheckCircleIcon className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen goedgekeurde uren gevonden</p>
                        <p className="text-sm text-slate-500 mt-1">Probeer je filters aan te passen of wacht tot uren zijn goedgekeurd</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex justify-center items-center gap-2">
                <button
                  className="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t("overview.previous")}
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        className={`w-8 h-8 text-sm font-medium rounded-lg transition ${
                          pageNum === currentPage
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t("overview.next")}
                </button>
              </div>

              <p className="text-center mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t("overview.page")} <span className="font-semibold">{currentPage}</span> van{" "}
                <span className="font-semibold">{totalPages}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
