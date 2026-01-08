"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  FolderKanban,
  Building2,
  Clock,
  Users,
  TrendingUp,
  Calendar,
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
import { getProjectDetail } from "@/lib/api";

dayjs.extend(relativeTime);
dayjs.locale("nl");

interface ProjectDetail {
  id: number;
  name: string;
  status?: string;
  createdAt?: string;
  projectGroup?: {
    id: number;
    name: string;
    company?: {
      id: number;
      name: string;
    };
  };
  recentHours: number;
  activeUsers: Array<{
    id: number;
    fullName: string;
  }>;
  lastActivity?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetail | null>(null);

  const projectId = params.id as string;

  useEffect(() => {
    loadProjectDetail();
  }, [projectId]);

  const loadProjectDetail = async () => {
    try {
      const data = await getProjectDetail(parseInt(projectId));
      setProject(data);
    } catch (error) {
      console.error("Error loading project detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status || status === "active") {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          Actief
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">
        {status}
      </Badge>
    );
  };

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Project details laden...
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
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/projects")}
                className="bg-white/50 dark:bg-slate-800/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {project.name}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {project.projectGroup?.name} • {project.projectGroup?.company?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(project.status)}
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Bewerken
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Project Information */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-slate-600" />
              Project Informatie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Bedrijf
                    </p>
                    <p className="font-medium">
                      {project.projectGroup?.company?.name || "Onbekend"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Projectgroep
                    </p>
                    <p className="font-medium">
                      {project.projectGroup?.name || "Onbekend"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Aangemaakt op
                    </p>
                    <p className="font-medium">
                      {project.createdAt
                        ? dayjs(project.createdAt).format("DD MMMM YYYY")
                        : "Onbekend"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Laatste activiteit
                    </p>
                    <p className="font-medium">
                      {project.lastActivity
                        ? dayjs(project.lastActivity).fromNow()
                        : "Geen activiteit"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                Recente Uren (30 dagen)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {project.recentHours.toFixed(1)}h
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Totaal gewerkte uren
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                Actieve Gebruikers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {project.activeUsers.length}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Gebruikers met recente activiteit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Users */}
        <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              Actieve Gebruikers ({project.activeUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.activeUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Geen actieve gebruikers gevonden
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.activeUsers.map((user) => (
                  <Card key={user.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        {user.fullName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{user.fullName}</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => router.push(`/admin/employees/${user.id}`)}
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
