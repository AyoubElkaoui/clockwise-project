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
          console.warn("Date filtering error for entry:", entry, error);
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
      console.error("Filter data error:", error);
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
        console.error("Fout bij ophalen van time entries:", error);
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
          console.warn("Error processing entry for options:", entry, error);
        }
      }

      setProjectOptions(Array.from(projectsSet));
      setCompanyOptions(Array.from(companiesSet));
    } catch (error) {
      console.error("Error setting options:", error);
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
      console.warn("Error calculating stats for entry:", entry, error);
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircleIcon className="w-8 h-8" />
          <h1 className="text-4xl font-bold">{t("overview.title")}</h1>
        </div>
        <p className="text-blue-100 text-lg">
          {t("overview.subtitle")}
        </p>
      </div>

      {/* Statistics Cards - ONLY APPROVED HOURS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-success text-white rounded-xl p-6 shadow-lg hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">
                {t("overview.approved")}
              </p>
              <p className="text-3xl font-bold">{safeToFixed(totalHours)}</p>
            </div>
            <ClockIcon className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-purple-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">
                {t("overview.totalDays")}
              </p>
              <p className="text-3xl font-bold">{totalDays}</p>
            </div>
            <CalendarDaysIcon className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-warning text-white rounded-xl p-6 shadow-lg hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">{t("overview.expenses")}</p>
              <p className="text-3xl font-bold">
                €{safeToFixed(totalExpenses)}
              </p>
            </div>
            <CurrencyEuroIcon className="w-12 h-12 text-yellow-200" />
          </div>
        </div>

        <div className="bg-blue-600 text-white rounded-xl p-6 shadow-lg hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">
                {t("overview.distance")}
              </p>
              <p className="text-3xl font-bold">
                {safeToFixed(totalDistance, 0)}
              </p>
            </div>
            <ChartBarIcon className="w-12 h-12 text-indigo-200" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
        <div className="card-body p-8">
          <div className="flex items-center gap-3 mb-6">
            <FunnelIcon className="w-6 h-6 text-elmar-primary" />
            <h2 className="text-2xl font-bold text-gray-800">
              {t("overview.filters")}
            </h2>
            <span className="badge badge-success">
              {t("overview.onlyApproved")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700">
                  {t("overview.date")} {t("overview.startDate")}
                </span>
              </label>
              <input
                type="date"
                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700">
                  Datum Einddatum
                </span>
              </label>
              <input
                type="date"
                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700">
                  🏢 Bedrijf
                </span>
              </label>
              <select
                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
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

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700">
                  📁 Project
                </span>
              </label>
              <select
                className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
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
          <div className="form-control mt-6">
            <label className="label">
              <span className="label-text font-semibold text-gray-700">
                Zoeken
              </span>
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek op project, bedrijf of notities..."
                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{filteredEntries.length}</span>{" "}
              goedgekeurde entries van{" "}
              <span className="font-semibold">
                {entries.filter((e) => e.status === "goedgekeurd").length}
              </span>{" "}
              totaal
            </div>
            <button
              className="btn btn-outline btn-primary rounded-xl"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="card bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
        <div className="card-body p-0">
          <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EyeIcon className="w-6 h-6 text-elmar-primary" />
                <h2 className="text-2xl font-bold text-gray-800">
                  {t("overview.approved")}registraties
                </h2>
              </div>
              <button className="btn btn-primary rounded-xl">
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                Exporteren
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-gray-700 font-semibold">{t("overview.date")}</th>
                  <th className="text-gray-700 font-semibold">{t("overview.startTime")}</th>
                  <th className="text-gray-700 font-semibold">{t("overview.endTime")}</th>
                  <th className="text-gray-700 font-semibold">{t("overview.hours")}</th>
                  <th className="text-gray-700 font-semibold">🏢 Bedrijf</th>
                  <th className="text-gray-700 font-semibold">📁 Project</th>
                  <th className="text-gray-700 font-semibold">Notities</th>
                  <th className="text-gray-700 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageEntries.map((entry, index) => {
                  try {
                    const start = dayjs(entry.startTime);
                    const end = dayjs(entry.endTime);
                    const diffMin =
                      end.diff(start, "minute") - (entry.breakMinutes || 0);
                    const hours = diffMin > 0 ? diffMin / 60 : 0;

                    return (
                      <tr
                        key={entry.id || index}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="font-medium">
                          {start.format("DD-MM-YYYY")}
                        </td>
                        <td>{start.format("HH:mm")}</td>
                        <td>{end.format("HH:mm")}</td>
                        <td>
                          <span className="badge badge-success badge-lg font-semibold">
                            {safeToFixed(hours)} uur
                          </span>
                        </td>
                        <td className="font-medium text-gray-800">
                          {entry.project?.projectGroup?.company?.name ||
                            "Onbekend bedrijf"}
                        </td>
                        <td className="font-medium text-elmar-primary">
                          {entry.project?.name || "Onbekend project"}
                        </td>
                        <td className="text-gray-600 italic">
                          {entry.notes || "Geen notities"}
                        </td>
                        <td>
                          <span className="badge badge-success">
                            Goedgekeurd
                          </span>
                        </td>
                      </tr>
                    );
                  } catch (error) {
                    console.warn("Error rendering entry:", entry, error);
                    return (
                      <tr key={index}>
                        <td colSpan={8} className="text-center text-error">
                          Error loading entry
                        </td>
                      </tr>
                    );
                  }
                })}

                {pageEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-6xl">[OK]</div>
                        <div className="text-xl font-semibold text-gray-600">
                          Geen goedgekeurde uren gevonden
                        </div>
                        <div className="text-gray-500">
                          Probeer je filters aan te passen of wacht tot uren
                          zijn goedgekeurd
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Enhanced {t("overview.page")}tion */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <div className="flex justify-center items-center gap-4">
                <button
                  className="btn btn-outline btn-primary rounded-xl disabled:opacity-50"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t("overview.previous")}
                </button>

                <div className="flex items-center gap-2">
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
                        className={`btn btn-sm rounded-lg ${
                          pageNum === currentPage
                            ? "btn-primary"
                            : "btn-ghost hover:btn-outline"
                        }`}
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="btn btn-outline btn-primary rounded-xl disabled:opacity-50"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t("overview.next")}
                </button>
              </div>

              <div className="text-center mt-3 text-sm text-gray-600">
                {t("overview.page")} <span className="font-semibold">{currentPage}</span> van{" "}
                <span className="font-semibold">{totalPages}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
