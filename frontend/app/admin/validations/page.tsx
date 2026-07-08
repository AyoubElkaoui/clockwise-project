"use client";

import { useState, useEffect } from "react";
import { showToast } from "@/components/ui/toast";
import {
  getValidations,
  runValidations,
  getValidationsHistory,
} from "@/lib/api";
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
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
      description:
        "Controleert of lange werkdagen (>8 uur) een pauze bevatten",
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
    } catch {
      showToast("Fout bij laden validaties", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getValidationsHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleRunValidations = async () => {
    setRunning(true);
    try {
      const result = await runValidations();
      setLastRun(dayjs().toISOString());
      if (result && result.validations) {
        setValidations(result.validations);
      }
      await loadHistory();
      const errorCount = result?.errorCount || 0;
      const warningCount = result?.warningCount || 0;
      if (errorCount > 0) {
        showToast(`${errorCount} fouten gevonden`, "error");
      } else if (warningCount > 0) {
        showToast(`${warningCount} waarschuwingen gevonden`, "warning");
      } else {
        showToast("Alle validaties geslaagd!", "success");
      }
    } catch {
      showToast("Fout bij uitvoeren validaties", "error");
    } finally {
      setRunning(false);
    }
  };

  const filteredValidations = validations.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.rule.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity =
      severityFilter === "all" || v.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "info":
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            Fout
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            Waarschuwing
          </span>
        );
      case "info":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            Info
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
            {severity}
          </span>
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Validaties
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Controleer de integriteit van tijdregistraties
            {lastRun && ` · Laatste controle: ${dayjs(lastRun).fromNow()}`}
          </p>
        </div>
        <button
          onClick={handleRunValidations}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {running ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              Bezig...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Validaties Uitvoeren
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            Totaal
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            Fouten
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.errors}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            Waarschuwingen
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.warnings}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            Info
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats.info}
          </p>
        </div>
      </div>

      {/* Validation Rules */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Validatie Regels
        </h2>
        <div className="space-y-1">
          {validationRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                {getSeverityIcon(rule.severity)}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {rule.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rule.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getSeverityBadge(rule.severity)}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    rule.enabled
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {rule.enabled ? "Ingeschakeld" : "Uitgeschakeld"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Validations */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Huidige Validaties ({filteredValidations.length})
          </h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle Ernst</option>
              <option value="error">Fouten</option>
              <option value="warning">Waarschuwingen</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mb-4" />
              <p className="text-sm text-slate-500">Validaties laden...</p>
            </div>
          ) : filteredValidations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
              <p className="text-sm text-slate-500">
                Geen validatieproblemen gevonden
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredValidations.map((validation) => (
                <div
                  key={validation.id}
                  className="flex items-start gap-3 p-4 border border-slate-100 dark:border-slate-700 rounded-lg"
                >
                  {getSeverityIcon(validation.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {validation.rule}
                      </span>
                      {getSeverityBadge(validation.severity)}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {validation.message}
                    </p>
                    {validation.details && (
                      <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {validation.details}
                        </p>
                      </div>
                    )}
                    {validation.date && (
                      <p className="text-xs text-slate-500 mt-2">
                        Datum: {dayjs(validation.date).format("DD MMMM YYYY")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Validation History */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Validatie Geschiedenis
          </h2>
        </div>
        <div className="p-6">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nog geen validaties uitgevoerd
            </p>
          ) : (
            <div className="space-y-1">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {dayjs(run.runTimestamp).format("DD MMMM YYYY HH:mm")}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {run.totalValidations} validaties · {run.errorCount}{" "}
                      fouten · {run.warningCount} waarschuwingen
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {run.errorCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        {run.errorCount} fouten
                      </span>
                    )}
                    {run.warningCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        {run.warningCount} waarschuwingen
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
