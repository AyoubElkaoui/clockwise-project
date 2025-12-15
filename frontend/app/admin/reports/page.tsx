"use client";
import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Building2,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { getUsers } from "@/lib/api";
import { getCompanies } from "@/lib/api";
import { getTimeEntries } from "@/lib/api";
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
    } catch (error) {
      console.error("Error generating users report:", error);
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
    } catch (error) {
      console.error("Error generating hours report:", error);
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
    } catch (error) {
      console.error("Error generating companies report:", error);
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {t("admin.reports.title")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {t("admin.reports.subtitle")}
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {t("admin.reports.users")}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t("admin.reports.usersDesc")}
            </p>
            <Button
              className="w-full"
              onClick={() => handleGenerateReport(t("admin.reports.users"))}
              disabled={generating === "users"}
            >
              {generating === "users" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("admin.reports.generating")}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t("admin.reports.download")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {t("admin.reports.hours")}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t("admin.reports.hoursDesc")}
            </p>
            <Button
              className="w-full"
              onClick={() => handleGenerateReport(t("admin.reports.hours"))}
              disabled={generating === "hours"}
            >
              {generating === "hours" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("admin.reports.generating")}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t("admin.reports.download")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {t("admin.reports.companies")}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t("admin.reports.companiesDesc")}
            </p>
            <Button
              className="w-full"
              onClick={() => handleGenerateReport(t("admin.reports.companies"))}
              disabled={generating === "companies"}
            >
              {generating === "companies" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("admin.reports.generating")}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t("admin.reports.download")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Report Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-600" />
            {t("admin.reports.advanced")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {t("admin.reports.monthly")}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {t("admin.reports.monthlyDesc")}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => showToast(t("admin.reports.comingSoon"), "info")}
              >
                <Download className="w-4 h-4 mr-2" />
                {t("common.download")}
              </Button>
            </div>

            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {t("admin.reports.yearly")}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {t("admin.reports.yearlyDesc")}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => showToast(t("admin.reports.comingSoon"), "info")}
              >
                <Download className="w-4 h-4 mr-2" />
                {t("common.download")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
