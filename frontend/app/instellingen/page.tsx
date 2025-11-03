"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, RefreshCw, Settings as SettingsIcon } from "lucide-react";

export default function InstellingenPage() {
  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="space-y-6 animate-fade-in max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Instellingen
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Pas je werkdag voorkeuren en applicatie instellingen aan
            </p>
          </div>

          {/* General Settings */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <CardTitle>Algemene Instellingen</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Standaard Werkuren per Dag
                  </label>
                  <input
                    type="range"
                    min="6"
                    max="12"
                    defaultValue="8"
                    className="range range-primary w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <span>6u</span>
                    <span>8u</span>
                    <span>10u</span>
                    <span>12u</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Begin van de Week
                  </label>
                  <select className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <option>Maandag</option>
                    <option>Zondag</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Tijd Format
                  </label>
                  <select className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <option>24-uurs</option>
                    <option>12-uurs (AM/PM)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Datum Format
                  </label>
                  <select className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <option>DD-MM-YYYY</option>
                    <option>MM-DD-YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Automation */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Tijd Automatisering</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Tijd Automatisch Afronden", desc: "Rond tijden af naar het dichtstbijzijnde interval" },
                  { label: "Beschrijving Verplicht", desc: "Verplicht een beschrijving bij elke tijdregistratie" },
                  { label: "Overwerk Toestaan", desc: "Sta toe om meer dan standaard uren te registreren" },
                  { label: "Pauze Herinneringen", desc: "Ontvang herinneringen om pauzes te nemen" },
                ].map((item) => (
                  <label key={item.label} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.desc}</p>
                    </div>
                    <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Data Beheer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Download className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Exporteren</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Download je gegevens</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Upload className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Importeren</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Upload bestaande data</p>
                  </div>
                </Button>
                <Button variant="danger" className="h-24 flex flex-col gap-2">
                  <RefreshCw className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">Resetten</p>
                    <p className="text-xs">Reset alle instellingen</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
