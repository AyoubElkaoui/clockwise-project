"use client";
import { useState } from "react";
import {
  BarChart3,
  Users,
  Clock,
  Building2,
  Download,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { showToast } from "@/components/ui/toast";
import { getUsers, getCompanies, getTimeEntries } from "@/lib/api";
import dayjs from "dayjs";

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState<string | null>(null);

  const generateUsersReport = async () => {
    setGenerating("users");
    try {
      const users = await getUsers();
      const csvContent = [
        [
          "ID",
          "Voornaam",
          "Achternaam",
          "Email",
          "Functie",
          "Rol",
          "Status",
          "Aangemaakt",
        ].join(","),
        ...users.map((user: any) =>
          [
            user.id,
            `"${user.firstName || ""}"`,
            `"${user.lastName || ""}"`,
            user.email || "",
            `"${user.function || ""}"`,
            user.rank || "",
            user.active !== false ? "Actief" : "Inactief",
            user.createdAt ? dayjs(user.createdAt).format("YYYY-MM-DD") : "",
          ].join(","),
        ),
      ].join("\n");
      downloadCSV(
        csvContent,
        `gebruikers-rapport-${dayjs().format("YYYY-MM-DD")}.csv`,
      );
      showToast(t("admin.reports.usersGenerated"), "success");
    } catch {
      showToast(t("admin.reports.generateError"), "error");
    } finally {
      setGenerating(null);
    }
  };

  const generateHoursReport = async () => {
    setGenerating("hours");
    try {
      const entries = await getTimeEntries();
      const csvContent = [
        [
          "ID",
          "Gebruiker",
          "Project",
          "Bedrijf",
          "Datum",
          "Start",
          "Eind",
          "Uren",
          "Pauze",
          "Status",
          "Notities",
        ].join(","),
        ...entries.map((entry: any) =>
          [
            entry.id,
            `"${entry.user?.firstName} ${entry.user?.lastName}"`,
            `"${entry.project?.name || ""}"`,
            `"${entry.project?.projectGroup?.company?.name || ""}"`,
            dayjs(entry.startTime).format("YYYY-MM-DD"),
            dayjs(entry.startTime).format("HH:mm"),
            dayjs(entry.endTime).format("HH:mm"),
            (
              (dayjs(entry.endTime).diff(dayjs(entry.startTime), "minute") -
                (entry.breakMinutes || 0)) /
              60
            ).toFixed(2),
            entry.breakMinutes || 0,
            entry.status || "",
            `"${entry.notes || ""}"`,
          ].join(","),
        ),
      ].join("\n");
      downloadCSV(
        csvContent,
        `uren-rapport-${dayjs().format("YYYY-MM-DD")}.csv`,
      );
      showToast(t("admin.reports.hoursGenerated"), "success");
    } catch {
      showToast(t("admin.reports.generateError"), "error");
    } finally {
      setGenerating(null);
    }
  };

  const generateCompaniesReport = async () => {
    setGenerating("companies");
    try {
      const companies = await getCompanies();
      const csvContent = [
        [
          "ID",
          "Naam",
          "Email",
          "Telefoon",
          "Adres",
          "Status",
          "Aangemaakt",
        ].join(","),
        ...companies.map((company: any) =>
          [
            company.id,
            `"${company.name || ""}"`,
            company.email || "",
            company.phone || "",
            `"${company.address || ""}"`,
            company.active !== false ? "Actief" : "Inactief",
            company.createdAt
              ? dayjs(company.createdAt).format("YYYY-MM-DD")
              : "",
          ].join(","),
        ),
      ].join("\n");
      downloadCSV(
        csvContent,
        `bedrijven-rapport-${dayjs().format("YYYY-MM-DD")}.csv`,
      );
      showToast(t("admin.reports.companiesGenerated"), "success");
    } catch {
      showToast(t("admin.reports.generateError"), "error");
    } finally {
      setGenerating(null);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async (reportType: string) => {
    switch (reportType) {
      case t("admin.reports.users"):
        await generateUsersReport();
        break;
      case t("admin.reports.hours"):
        await generateHoursReport();
        break;
      case t("admin.reports.companies"):
        await generateCompaniesReport();
        break;
      default:
        showToast(t("admin.reports.unknownReport"), "error");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t("admin.reports.title")}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t("admin.reports.subtitle")}
        </p>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Users Report */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("admin.reports.users")}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {t("admin.reports.usersDesc")}
          </p>
          <button
            onClick={() => handleGenerateReport(t("admin.reports.users"))}
            disabled={generating === "users"}
            className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {generating === "users" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("admin.reports.generating")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t("admin.reports.download")}
              </>
            )}
          </button>
        </div>

        {/* Hours Report */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("admin.reports.hours")}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {t("admin.reports.hoursDesc")}
          </p>
          <button
            onClick={() => handleGenerateReport(t("admin.reports.hours"))}
            disabled={generating === "hours"}
            className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {generating === "hours" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("admin.reports.generating")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t("admin.reports.download")}
              </>
            )}
          </button>
        </div>

        {/* Companies Report */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("admin.reports.companies")}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {t("admin.reports.companiesDesc")}
          </p>
          <button
            onClick={() => handleGenerateReport(t("admin.reports.companies"))}
            disabled={generating === "companies"}
            className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {generating === "companies" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("admin.reports.generating")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t("admin.reports.download")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Reports */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          {t("admin.reports.advanced")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {t("admin.reports.monthly")}
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              {t("admin.reports.monthlyDesc")}
            </p>
            <button
              onClick={() => showToast(t("admin.reports.comingSoon"), "info")}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {t("common.download")}
            </button>
          </div>
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {t("admin.reports.yearly")}
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              {t("admin.reports.yearlyDesc")}
            </p>
            <button
              onClick={() => showToast(t("admin.reports.comingSoon"), "info")}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {t("common.download")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
