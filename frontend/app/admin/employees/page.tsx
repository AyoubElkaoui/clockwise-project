"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Users, Search, Filter, Eye, UserPlus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Medewerkers
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Overzicht van alle medewerkers uit Syntess
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadEmployees}
                className="bg-white/50 dark:bg-slate-800/50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Vernieuwen
              </Button>
              <Button
                onClick={() => router.push("/admin")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Terug naar Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Zoeken</label>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Afdeling</label>
                <Input
                  placeholder="Afdeling..."
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={activeOnly}
                    onCheckedChange={(checked) =>
                      setActiveOnly(checked as boolean)
                    }
                  />
                  <label htmlFor="active" className="text-sm">
                    Alleen actieve medewerkers
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              Medewerkers ({employees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Geen medewerkers gevonden
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {employees.map((employee) => (
                  <Card key={employee.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {employee.fullName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium">{employee.fullName}</h3>
                          <p className="text-sm text-slate-600">
                            {employee.email}
                          </p>
                          <p className="text-sm text-slate-500">
                            {employee.department || "Geen afdeling"} •{" "}
                            {employee.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(employee.isActive)}
                        <span className="text-sm text-slate-500">
                          {employee.lastActivity
                            ? dayjs(employee.lastActivity).fromNow()
                            : "Nooit"}
                        </span>
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
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
