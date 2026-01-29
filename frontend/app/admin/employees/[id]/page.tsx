"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  Eye,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";
import { getEmployeeDetail, getEmployeeHours } from "@/lib/api";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface EmployeeDetail {
  id: number;
  fullName: string;
  email: string;
  department?: string;
  role: string;
  isActive: boolean;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  hireDate?: string;
  lastActivity?: string;
  hoursThisMonth: number;
  avgHoursPerDay: number;
}

interface TimeEntry {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  breakMinutes: number;
  project: string;
  status: string;
  notes?: string;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [period, setPeriod] = useState("month");

  const employeeId = params.id as string;

  useEffect(() => {
    loadEmployeeDetail();
    loadTimeEntries();
  }, [employeeId, period]);

  const loadEmployeeDetail = async () => {
    try {
      const data = await getEmployeeDetail(parseInt(employeeId));
      setEmployee(data);
    } catch (error) {
      
    }
  };

  const loadTimeEntries = async () => {
    try {
      const data = await getEmployeeHours(parseInt(employeeId), period);
      setTimeEntries(data);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            Goedgekeurd
          </Badge>
        );
      case "ingeleverd":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            Ingeleverd
          </Badge>
        );
      case "opgeslagen":
        return (
          <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">
            Opgeslagen
          </Badge>
        );
      case "afgekeurd":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            Afgekeurd
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">
            {status}
          </Badge>
        );
    }
  };

  if (loading || !employee) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Medewerker details laden...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/employees")}
                className="bg-white/50 dark:bg-slate-800/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                  {employee.fullName}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {employee.role} • {employee.department || "Geen afdeling"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  employee.isActive
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                }
              >
                {employee.isActive ? "Actief" : "Inactief"}
              </Badge>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Bewerken
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Personal Information */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-600" />
              Persoonlijke Informatie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Email
                    </p>
                    <p className="font-medium">{employee.email}</p>
                  </div>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Telefoon
                      </p>
                      <p className="font-medium">{employee.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      In dienst sinds
                    </p>
                    <p className="font-medium">
                      {employee.hireDate
                        ? dayjs(employee.hireDate).format("DD MMMM YYYY")
                        : "Onbekend"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {(employee.address || employee.city || employee.postalCode) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Adres
                      </p>
                      <p className="font-medium">
                        {[employee.address, employee.postalCode, employee.city]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Laatste activiteit
                    </p>
                    <p className="font-medium">
                      {employee.lastActivity
                        ? dayjs(employee.lastActivity).fromNow()
                        : "Nooit"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hours Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                Uren Deze Maand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {employee.hoursThisMonth.toFixed(1)}h
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Totaal gewerkte uren
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-600" />
                Gemiddeld Per Dag
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {employee.avgHoursPerDay.toFixed(1)}h
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Op werkdagen
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                Tijdregistraties
              </CardTitle>
              <div className="flex gap-2">
                {["week", "month", "year"].map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriod(p)}
                  >
                    {p === "week" ? "Week" : p === "month" ? "Maand" : "Jaar"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timeEntries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Geen tijdregistraties gevonden
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {timeEntries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="font-medium">
                            {dayjs(entry.date).format("DD MMMM YYYY")}
                          </div>
                          {getStatusBadge(entry.status)}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                          <div>
                            {dayjs(entry.startTime).format("HH:mm")} -{" "}
                            {dayjs(entry.endTime).format("HH:mm")} (
                            {entry.hours.toFixed(1)}h)
                            {entry.breakMinutes > 0 && (
                              <span> - {entry.breakMinutes}min pauze</span>
                            )}
                          </div>
                          <div>Project: {entry.project}</div>
                          {entry.notes && <div>Notities: {entry.notes}</div>}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                      </Button>
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
