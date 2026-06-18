"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Users, Search, Filter, Eye, UserPlus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
        Actief
      </Badge>
    ) : (
      <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">
        Inactief
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Medewerkers laden...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Medewerkers"
        description="Overzicht van alle medewerkers uit Syntess"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={loadEmployees}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Vernieuwen</span>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/admin")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Zoeken</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Naam of email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Afdeling</label>
              <Input
                placeholder="Afdeling..."
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="active"
                  checked={activeOnly}
                  onCheckedChange={(checked) =>
                    setActiveOnly(checked as boolean)
                  }
                />
                <label htmlFor="active" className="text-sm text-slate-600 dark:text-slate-400">
                  Alleen actieve medewerkers
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            Medewerkers ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Geen medewerkers</p>
              <p className="text-sm text-slate-500 mt-1">Geen medewerkers gevonden met de huidige filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Medewerker</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Afdeling</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Laatste activiteit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {employee.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{employee.fullName}</p>
                            <p className="text-xs text-slate-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                        {employee.department || "Geen afdeling"} &bull; {employee.role}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(employee.isActive)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">
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
                            <Eye className="w-4 h-4 mr-2" />
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
