"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { showToast } from "@/components/ui/toast";
import {
  getValidations,
  runValidations,
  getValidationsHistory,
} from "@/lib/api";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Info,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/nl";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  enabled: boolean;
}

interface ValidationResult {
  id: string;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  userId?: number;
  date?: string;
  details?: string;
}

interface ValidationHistory {
  id: number;
  runTimestamp: string;
  totalValidations: number;
  errorCount: number;
  warningCount: number;
  results?: ValidationResult[];
}

export default function ValidationsPage() {
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [history, setHistory] = useState<ValidationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Mock validation rules - in a real app, these would come from the backend
  const validationRules: ValidationRule[] = [
    {
      id: "excessive_hours",
      name: "Excessieve Uren",
      description:
        "Controleert of medewerkers niet meer dan 24 uur per dag registreren",
      severity: "error",
      enabled: true,
    },
    {
      id: "overlapping_entries",
      name: "Overlappende Registraties",
      description:
        "Detecteert overlappende tijdregistraties voor dezelfde medewerker",
      severity: "warning",
      enabled: true,
    },
    {
      id: "missing_break",
      name: "Ontbrekende Pauze",
      description: "Controleert of lange werkdagen (>8 uur) een pauze bevatten",
      severity: "warning",
      enabled: true,
    },
    {
      id: "future_entries",
      name: "Toekomstige Registraties",
      description: "Detecteert tijdregistraties die in de toekomst liggen",
      severity: "info",
      enabled: true,
    },
  ];

  useEffect(() => {
    loadValidations();
    loadHistory();
  }, []);

  const loadValidations = async () => {
    try {
      setLoading(true);
      const data = await getValidations();
      setValidations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load validations:", error);
      showToast("Fout bij laden validaties", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getValidationsHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load validation history:", error);
    }
  };

  const handleRunValidations = async () => {
    setRunning(true);
    try {
      const result = await runValidations();
      setLastRun(dayjs().toISOString());

      if (result && result.validations) {
        setValidations(result.validations);
      }

      await loadHistory(); // Refresh history

      const errorCount = result?.errorCount || 0;
      const warningCount = result?.warningCount || 0;

      if (errorCount > 0) {
        showToast(`${errorCount} fouten gevonden`, "error");
      } else if (warningCount > 0) {
        showToast(`${warningCount} waarschuwingen gevonden`, "warning");
      } else {
        showToast("Alle validaties geslaagd!", "success");
      }
    } catch (error) {
      console.error("Failed to run validations:", error);
      showToast("Fout bij uitvoeren validaties", "error");
    } finally {
      setRunning(false);
    }
  };

  const filteredValidations = validations.filter((validation) => {
    const matchesSearch =
      !searchQuery ||
      validation.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      validation.rule.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      severityFilter === "all" || validation.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "info":
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            Fout
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
            Waarschuwing
          </Badge>
        );
      case "info":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            Info
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
            {severity}
          </Badge>
        );
    }
  };

  const stats = {
    total: validations.length,
    errors: validations.filter((v) => v.severity === "error").length,
    warnings: validations.filter((v) => v.severity === "warning").length,
    info: validations.filter((v) => v.severity === "info").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Validaties
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Controleer de integriteit van tijdregistraties
          </p>
          {lastRun && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Laatste controle: {dayjs(lastRun).fromNow()}
            </p>
          )}
        </div>
        <Button onClick={handleRunValidations} disabled={running}>
          {running ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              Bezig...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Validaties Uitvoeren
            </>
          )}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Totaal
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.total}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Fouten
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.errors}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Waarschuwingen
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.warnings}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Info
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.info}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Validatie Regels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {validationRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getSeverityIcon(rule.severity)}
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      {rule.name}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {rule.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getSeverityBadge(rule.severity)}
                  <Badge
                    className={
                      rule.enabled
                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                        : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
                    }
                  >
                    {rule.enabled ? "Ingeschakeld" : "Uitgeschakeld"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Validations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Huidige Validaties ({filteredValidations.length})
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
              >
                <option value="all">Alle Ernst</option>
                <option value="error">Fouten</option>
                <option value="warning">Waarschuwingen</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Validaties laden...
              </p>
            </div>
          ) : filteredValidations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Geen validatieproblemen gevonden
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredValidations.map((validation) => (
                <Card key={validation.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(validation.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {validation.rule}
                        </h4>
                        {getSeverityBadge(validation.severity)}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 mb-2">
                        {validation.message}
                      </p>
                      {validation.details && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {validation.details}
                          </p>
                        </div>
                      )}
                      {validation.date && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Datum: {dayjs(validation.date).format("DD MMMM YYYY")}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation History */}
      <Card>
        <CardHeader>
          <CardTitle>Validatie Geschiedenis</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              Nog geen validaties uitgevoerd
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {dayjs(run.runTimestamp).format("DD MMMM YYYY HH:mm")}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {run.totalValidations} validaties • {run.errorCount}{" "}
                      fouten • {run.warningCount} waarschuwingen
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {run.errorCount > 0 && (
                      <Badge className="bg-red-50 text-red-700 border-red-200">
                        {run.errorCount} fouten
                      </Badge>
                    )}
                    {run.warningCount > 0 && (
                      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {run.warningCount} waarschuwingen
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
