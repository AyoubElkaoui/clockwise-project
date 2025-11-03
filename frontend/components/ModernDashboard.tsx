"use client";

import React, { useEffect, useState } from "react";
import { StatCard } from "./ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Clock,
  Calendar,
  Plane,
  TrendingUp,
  Plus,
  ChevronRight,
} from "lucide-react";
import { formatDateShort, getWeekRange } from "@/lib/utils";

interface TimeEntry {
  id: number;
  projectName: string;
  date: string;
  hours: number;
  status: string;
  description: string;
}

function ModernDashboard() {
  const [firstName, setFirstName] = useState<string>("");
  const [stats, setStats] = useState({
    weekHours: 15.5,
    monthHours: 65,
    vacationDays: 12,
  });
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fName = localStorage.getItem("firstName") || "";
    setFirstName(fName);

    // TODO: Fetch real data from API
    setTimeout(() => {
      setRecentEntries([
        {
          id: 1,
          projectName: "Website Herontwerp",
          date: "2025-10-30",
          hours: 8,
          status: "In Ontwikkeling",
          description: "Nieuwe dashboard componenten geïmplementeerd",
        },
        {
          id: 2,
          projectName: "Mobiele App",
          date: "2025-10-29",
          hours: 7.5,
          status: "In Ontwikkeling",
          description: "Bug fixes en UI verbeteringen",
        },
        {
          id: 3,
          projectName: "API Ontwikkeling",
          date: "2025-10-28",
          hours: 6,
          status: "Voltooid",
          description: "Authenticatie endpoints ontwikkeling",
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
  };

  const weekRange = getWeekRange();
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekRange.start);
    day.setDate(weekRange.start.getDate() + i);
    weekDays.push(day);
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "voltooid":
      case "goedgekeurd":
        return "success";
      case "in ontwikkeling":
      case "in behandeling":
        return "info";
      case "afgewezen":
        return "danger";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {getGreeting()}, {firstName}! 👋
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Welkom terug op je dashboard. Hier is een overzicht van je week.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Gewone Uren Deze Week"
          value={`${stats.weekHours}u`}
          subtitle="van 40u deze week"
          icon={<Clock className="w-6 h-6" />}
          iconBgColor="bg-gradient-to-br from-blue-500 to-blue-600"
          trend={{ value: "+2.5u", isPositive: true }}
        />
        <StatCard
          title="Totaal Deze Maand"
          value={`${stats.monthHours}u`}
          subtitle="18 werkdagen"
          icon={<Calendar className="w-6 h-6" />}
          iconBgColor="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Vakantiedagen Resterend"
          value={`${stats.vacationDays} dagen`}
          subtitle="Over van 25 dagen"
          icon={<Plane className="w-6 h-6" />}
          iconBgColor="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Uren Invoeren */}
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Uren Invoeren</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Project
                </label>
                <select className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Selecteer project...</option>
                  <option>Website Herontwerp</option>
                  <option>Mobiele App</option>
                  <option>API Ontwikkeling</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Voortgang deze week
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.weekHours}u <span className="text-sm text-slate-600 dark:text-slate-400">/ 40u</span>
                  </p>
                </div>
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <TrendingUp className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Op schema</span>
                </div>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.weekHours / 40) * 100}%` }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Beschrijving
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Waar heb je vandaag aan gewerkt?"
                />
              </div>

              <Button className="w-full" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Uren Invoeren
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Week Overzicht */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Week Overzicht</span>
              <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                Huidige Week
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weekDays.map((day, index) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const dayHours = index < 3 ? Math.random() * 8 + 4 : 0;

                return (
                  <div
                    key={day.toISOString()}
                    className={`p-3 rounded-lg border transition-all ${
                      isToday
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${
                          isToday
                            ? "text-blue-900 dark:text-blue-100"
                            : "text-slate-900 dark:text-slate-100"
                        }`}>
                          {day.toLocaleDateString("nl-NL", { weekday: "short" })}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {formatDateShort(day)}
                        </p>
                      </div>
                      {dayHours > 0 ? (
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {dayHours.toFixed(1)}u
                          </p>
                          <Badge variant="success" size="sm">
                            Goedgekeurd
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500">
                          Geen uren
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tijd Registraties */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tijd Registraties</CardTitle>
            <Button variant="ghost" size="sm">
              Bekijk alles
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {entry.hours}u
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {entry.projectName}
                      </p>
                      <Badge variant={getStatusBadgeVariant(entry.status)} size="sm">
                        {entry.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {entry.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {formatDateShort(entry.date)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ModernDashboard;
