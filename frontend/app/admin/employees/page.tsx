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
            <div className="-mx-6 -mb-6">
              <div className="hidden md:grid gap-3 px-6 py-3 border-t" style={{ gridTemplateColumns: "1.8fr 1.3fr 1fr .9fr 60px", borderColor: "var(--border)", background: "var(--panel-2)", font: "600 11px 'Geist'", letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)" }}>
                <span>Naam</span><span>Rol</span><span>Afdeling</span><span>Status</span><span></span>
              </div>
              {employees.map((employee) => {
                const active = employee.isActive;
                return (
                  <div key={employee.id} className="grid gap-3 items-center px-6 py-3 border-t" style={{ gridTemplateColumns: "1.8fr 1.3fr 1fr .9fr 60px", borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex-none flex items-center justify-center rounded-[9px]" style={{ width: 34, height: 34, background: "var(--accent-weak)", color: "var(--accent)", font: "700 11.5px 'Geist'" }}>{employee.fullName.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="truncate" style={{ font: "600 13.5px 'Geist'", color: "var(--text)" }}>{employee.fullName}</div>
                        <div className="truncate" style={{ font: "500 11.5px 'Geist Mono', monospace", color: "var(--muted)" }}>{employee.email}</div>
                      </div>
                    </div>
                    <div><span className="inline-flex px-2.5 py-[3px] rounded-full" style={{ font: "600 11.5px 'Geist'", background: "var(--accent-weak)", color: "var(--accent)" }}>{employee.role}</span></div>
                    <span style={{ font: "500 13px 'Geist'", color: "var(--text-2)" }}>{employee.department || "—"}</span>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full" style={{ font: "600 11.5px 'Geist'", background: active ? "var(--green-weak)" : "var(--panel-2)", color: active ? "var(--green)" : "var(--muted)" }}>
                        <span className="rounded-full" style={{ width: 6, height: 6, background: active ? "var(--green)" : "var(--muted)" }} />{active ? "Actief" : "Inactief"}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => router.push(`/admin/employees/${employee.id}`)}
                        title="Bewerken"
                        className="flex items-center justify-center rounded-lg"
                        style={{ width: 32, height: 32, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--muted)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover)"; e.currentTarget.style.color = "var(--text)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--panel)"; e.currentTarget.style.color = "var(--muted)"; }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
