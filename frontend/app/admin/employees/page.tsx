"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Users, Search, Eye, UserPlus, RefreshCw, UserCheck, UserX, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { getEmployees } from "@/lib/api";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface Employee {
  id: number;
  fullName: string;
  email: string;
  department?: string;
  role: string;
  isActive: boolean;
  lastActivity?: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, [search, department, activeOnly]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployees(search, department, activeOnly);
      setEmployees(data);
    } catch (error) {
      showToast("Fout bij laden medewerkers", "error");
    } finally {
      setLoading(false);
    }
  };

  const activeCount = employees.filter((e) => e.isActive).length;
  const inactiveCount = employees.filter((e) => !e.isActive).length;
  const departmentCount = new Set(
    employees.map((e) => e.department).filter(Boolean)
  ).size;

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <PageHeader
        title="Medewerkers"
        description="Overzicht van alle medewerkers uit Syntess"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadEmployees}>
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Vernieuwen</span>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/admin/employees/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nieuwe medewerker</span>
            </Button>
          </>
        }
      />

      {/* Stats rij */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Totaal"
          value={String(employees.length)}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Actief"
          value={String(activeCount)}
          icon={UserCheck}
          color="emerald"
        />
        <StatCard
          title="Inactief"
          value={String(inactiveCount)}
          icon={UserX}
          color="rose"
        />
        <StatCard
          title="Afdelingen"
          value={String(departmentCount)}
          icon={Building2}
          color="violet"
        />
      </div>

      {/* Medewerkers tabel */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Medewerkers ({employees.length})
            </CardTitle>

            {/* Filter balk */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Naam of email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="relative flex-1 min-w-[140px] max-w-xs">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Afdeling..."
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap">
                <Checkbox
                  id="activeOnly"
                  checked={activeOnly}
                  onCheckedChange={(checked) =>
                    setActiveOnly(checked as boolean)
                  }
                />
                Alleen actief
              </label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <LoadingSpinner className="w-6 h-6 mb-4 text-slate-400" />
              <p className="text-sm text-slate-500">Medewerkers laden...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Geen medewerkers
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Geen medewerkers gevonden met de huidige filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Medewerker
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                      Functie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                      Afdeling
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                      Laatste activiteit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {employee.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {employee.fullName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        {employee.role}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                        {employee.department || (
                          <span className="text-slate-400 italic">
                            Geen afdeling
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {employee.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Actief
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            Inactief
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                        {employee.lastActivity
                          ? dayjs(employee.lastActivity).fromNow()
                          : "Nooit"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/employees/${employee.id}`)
                            }
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
