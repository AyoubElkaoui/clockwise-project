"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Save,
  Send,
  Trash2,
  Calendar,
  Copy,
  Clipboard,
  Car,
  Ticket,
  Euro,
  FileText,
  Wrench,
  Ruler,
  Moon,
  Clock,
  Star,
  Heart,
} from "lucide-react";
import {
  getCompanies,
  getProjectGroups,
  getProjects,
} from "@/lib/api/companyApi";
import { saveDraft, submitEntries, getDrafts, getSubmitted, getRejected, deleteDraft } from "@/lib/api/workflowApi";
import { getFavoriteProjects, addFavoriteProject, removeFavoriteProject, type FavoriteProject } from "@/lib/api/favoriteProjectsApi";
import { getHolidays, Holiday } from "@/lib/api/holidaysApi";
import { getUserProjects, type UserProject } from "@/lib/api/userProjectApi";
import { getProjects as getAllProjectsFlat, API_URL } from "@/lib/api";
import { getCurrentPeriodId as fetchCurrentPeriodId } from "@/lib/manager-api";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModernLayout from "@/components/ModernLayout";

interface Company {
  id: number;
  name: string;
}
interface ProjectGroup {
  id: number;
  name: string;
  companyId?: number;
}
interface Project {
  id: number;
  name: string;
  projectGroupId: number;
}
interface ProjectRow {
  companyId: number;
  companyName: string;
  projectGroupId: number;
  projectGroupName: string;
  projectId: number;
  projectName: string;
}
interface TimeEntry {
  date: string;
  projectId: number;
  hours: number;
  taskType?: 'MONTAGE' | 'TEKENKAMER';
  eveningNightHours?: number;
  travelHours?: number;
  distanceKm?: number;
  km?: number;
  travelCosts?: number;
  otherExpenses?: number;
  expenses?: number;
  notes?: string;
  status?: string;
  rejectionReason?: string | null;
  id?: number;
}

interface ClosedDay {
  id: number;
  date: string;
  reason: string;
}

interface IndirectTask {
  taakGcId: number;
  code: string;
  description: string;
  budget: number;
  used: number;
}

interface IndirectEntry {
  date: string;
  taakGcId: number;
  taskCode: string;
  hours: number;
  id?: number;
  status?: string;
}

const MAX_HOURS_PER_DAY = 8;

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonthWeeks(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const weeks: Date[] = [];
  let current = new Date(firstDay);

  while (current <= lastDay) {
    const weekDays = getWeekDays(current);
    if (!weeks.some((w) => formatDate(w) === formatDate(weekDays[0]))) {
      weeks.push(weekDays[0]);
    }
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

export default function TimeRegistrationPage() {
  const { t } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentPeriodId, setCurrentPeriodId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projectGroups, setProjectGroups] = useState<
    Record<number, ProjectGroup[]>
  >({});
  const [projects, setProjects] = useState<Record<number, Project[]>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<number[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [entries, setEntries] = useState<Record<string, TimeEntry>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [copiedCell, setCopiedCell] = useState<TimeEntry | null>(null);
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [userAllowedTasks, setUserAllowedTasks] = useState<'BOTH' | 'MONTAGE_ONLY' | 'TEKENKAMER_ONLY'>('BOTH');
  const [assignedProjectIds, setAssignedProjectIds] = useState<number[] | null>(null);
  const [assignedGroupIds, setAssignedGroupIds] = useState<Set<number> | null>(null);
  const [hasSubmittedEntries, setHasSubmittedEntries] = useState(false);
  const [favoriteProjects, setFavoriteProjects] = useState<FavoriteProject[]>([]);
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<Set<number>>(new Set());
  const [projectMaxHours, setProjectMaxHours] = useState<Record<number, number>>({});
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedMobileDay, setSelectedMobileDay] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1; // 0=Mon, 6=Sun
  });
  const [selectedMobileWeek, setSelectedMobileWeek] = useState(0);
  const [indirectTasks, setIndirectTasks] = useState<IndirectTask[]>([]);
  const [indirectEntries, setIndirectEntries] = useState<Record<string, IndirectEntry>>({});

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  const monthNames = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];
  const weekNumber = getWeekNumber(currentWeek);
  const monthWeeks = getMonthWeeks(currentWeek);

  // Load current period ID on mount
  useEffect(() => {
    const loadPeriodId = async () => {
      try {
        const periodId = await fetchCurrentPeriodId();
        setCurrentPeriodId(periodId);
        console.log("Loaded current period ID:", periodId);
      } catch (error) {
        console.error("Failed to load period ID:", error);
        setCurrentPeriodId(100436); // Fallback
      }
    };
    loadPeriodId();
  }, []);

  useEffect(() => {
    loadCompanies();
    loadEntries();
    loadUserAllowedTasks();
    loadHolidays();
    loadAssignedProjects();
    loadFavoriteProjects();
    loadIndirectTasks();
  }, [currentWeek, viewMode]);

  // Reset mobile week/day selection when navigating months
  useEffect(() => {
    setSelectedMobileWeek(0);
    setSelectedMobileDay(0);
  }, [currentWeek]);

  useEffect(() => {
    loadClosedDays();
  }, [currentWeek]);

  const loadFavoriteProjects = async () => {
    try {
      const favorites = await getFavoriteProjects();
      setFavoriteProjects(favorites);
      setFavoriteProjectIds(new Set(favorites.map(f => f.projectGcId)));
    } catch (error) {
      console.error("Failed to load favorite projects:", error);
    }
  };

  const toggleFavorite = async (projectId: number, projectName: string) => {
    try {
      if (favoriteProjectIds.has(projectId)) {
        await removeFavoriteProject(projectId);
        setFavoriteProjectIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(projectId);
          return newSet;
        });
        setFavoriteProjects(prev => prev.filter(f => f.projectGcId !== projectId));
        showToast(`${projectName} verwijderd uit favorieten`, "success");
      } else {
        const favorite = await addFavoriteProject(projectId);
        setFavoriteProjectIds(prev => new Set([...prev, projectId]));
        setFavoriteProjects(prev => [...prev, favorite]);
        showToast(`${projectName} toegevoegd aan favorieten`, "success");
      }
    } catch (error) {
      showToast("Fout bij aanpassen favorieten", "error");
    }
  };

  const addFavoriteToRows = (favorite: FavoriteProject) => {
    if (!projectRows.some(r => r.projectId === favorite.projectGcId)) {
      setProjectRows(prev => [
        ...prev,
        {
          companyId: 0,
          companyName: favorite.companyName || "Favoriet",
          projectGroupId: 0,
          projectGroupName: favorite.projectGroupName || "",
          projectId: favorite.projectGcId,
          projectName: favorite.projectName || favorite.projectCode || `Project ${favorite.projectGcId}`,
        },
      ]);
    }
  };

  // Compute filtered projects at render time based on assignedProjectIds
  // This guarantees the filter is always applied regardless of load order
  const getVisibleProjects = (groupId: number): Project[] => {
    const allProjects = projects[groupId] || [];
    if (assignedProjectIds === null) {
      return allProjects;
    }
    return allProjects.filter(p => assignedProjectIds.includes(p.id));
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadClosedDays = async () => {
    try {
      const year = currentWeek.getFullYear();
      const response = await axios.get(
        `/api/holidays/closed?year=${year}`,
      );
      setClosedDays(response.data);
    } catch (error) {
      // Silent fail - closed days are optional
    }
  };

  const isClosedDay = (date: string) => {
    // Check holidays first
    const holiday = holidays.find(h => h.holidayDate === date);
    if (holiday && !holiday.isWorkAllowed) {
      return true;
    }

    // Check closed days
    return closedDays.some((day) => day.date === date);
  };

  // Check if date is a weekend (Saturday or Sunday)
  const isWeekend = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  };

  const loadHolidays = async () => {
    try {
      const year = currentWeek.getFullYear();
      const data = await getHolidays(year);
      setHolidays(data);
    } catch (error) {
      // Silent fail - holidays are optional
    }
  };

  const loadUserAllowedTasks = () => {
    // Get from localStorage (set during login as individual key)
    const allowedTasks = localStorage.getItem('allowedTasks');
    if (allowedTasks === 'MONTAGE_ONLY' || allowedTasks === 'TEKENKAMER_ONLY' || allowedTasks === 'BOTH') {
      setUserAllowedTasks(allowedTasks);
    } else {
      setUserAllowedTasks('BOTH'); // Default to both if not found
    }
  };

  const loadIndirectTasks = async () => {
    try {
      const medewGcId = localStorage.getItem("medewGcId");
      if (!medewGcId) return;

      // Fetch user's allocations and all tasks in parallel
      const [allocRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/users/${medewGcId}/hour-allocations`, {
          headers: { "ngrok-skip-browser-warning": "1" },
        }),
        axios.get(`${API_URL}/tasks`, {
          headers: { "ngrok-skip-browser-warning": "1" },
        }),
      ]);

      const allocations = allocRes.data || [];
      const allTasks = tasksRes.data?.tasks || [];

      // Only show codes where user has budget > 0
      const tasksWithBudget: IndirectTask[] = [];
      for (const alloc of allocations) {
        if ((alloc.annualBudget || 0) > 0) {
          const task = allTasks.find((t: any) => t.code === alloc.taskCode);
          if (task) {
            tasksWithBudget.push({
              taakGcId: task.id,
              code: alloc.taskCode,
              description: alloc.taskDescription || task.description,
              budget: alloc.annualBudget,
              used: alloc.used || 0,
            });
          }
        }
      }
      setIndirectTasks(tasksWithBudget);
    } catch (err) {
      console.error("Error loading indirect tasks:", err);
    }
  };

  const updateIndirectEntry = (taakGcId: number, taskCode: string, date: string, hours: number) => {
    const key = `${date}-indirect-${taskCode}`;
    setIndirectEntries((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        taakGcId,
        taskCode,
        hours,
      },
    }));
  };

  const getIndirectEntry = (taskCode: string, date: string): IndirectEntry | undefined => {
    return indirectEntries[`${date}-indirect-${taskCode}`];
  };

  const getIndirectTotalForCode = (taskCode: string): number => {
    return Object.values(indirectEntries)
      .filter((e) => e.taskCode === taskCode && e.hours > 0)
      .reduce((sum, e) => sum + e.hours, 0);
  };

  const shouldShowTaskDropdown = () => {
    return userAllowedTasks === 'BOTH';
  };

  const getDefaultTaskType = (): 'MONTAGE' | 'TEKENKAMER' => {
    if (userAllowedTasks === 'MONTAGE_ONLY') return 'MONTAGE';
    if (userAllowedTasks === 'TEKENKAMER_ONLY') return 'TEKENKAMER';
    return 'MONTAGE'; // Default for users with BOTH
  };

  const loadAssignedProjects = async () => {
    try {
      const userId = Number(localStorage.getItem("userId")) || 0;
      if (userId > 0) {
        const userProjects = await getUserProjects(userId);
        const ids = userProjects.map((up: any) => up.projectId || up.project_gc_id || up.projectGcId);
        const filteredIds = ids.filter((id: number) => id > 0);
        setAssignedProjectIds(filteredIds);

        // Extract max hours per project
        const maxHoursMap: Record<number, number> = {};
        for (const up of userProjects) {
          const pid = up.projectId || (up as any).project_gc_id || (up as any).projectGcId;
          if (pid && up.maxHours) {
            maxHoursMap[pid] = up.maxHours;
          }
        }
        setProjectMaxHours(maxHoursMap);

        // Determine which project groups contain assigned projects
        if (filteredIds.length > 0) {
          const allProjects = await getAllProjectsFlat();
          const assignedSet = new Set(filteredIds);
          const groupIds = new Set<number>();
          for (const p of allProjects) {
            const pid = (p as any).gcId || (p as any).id;
            if (assignedSet.has(pid) && (p as any).werkgrpGcId) {
              groupIds.add((p as any).werkgrpGcId);
            }
          }
          setAssignedGroupIds(groupIds);
        } else {
          setAssignedGroupIds(new Set());
        }
      } else {
        setAssignedProjectIds([]);
        setAssignedGroupIds(new Set());
        setProjectMaxHours({});
      }
    } catch (err) {
      setAssignedProjectIds([]);
      setAssignedGroupIds(new Set());
      setProjectMaxHours({});
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      showToast("Kon bedrijven niet laden", "error");
    }
  };

  const loadEntries = async () => {
    try {
      const urenperGcId = getCurrentPeriodId();

      // Load ALL statuses: DRAFT, SUBMITTED, APPROVED, REJECTED
      const [drafts, submitted, rejected] = await Promise.all([
        getDrafts(urenperGcId),
        getSubmitted(urenperGcId),
        getRejected(urenperGcId)
      ]);

      const allEntries = [...drafts, ...submitted, ...rejected];

      // Check if any entries are submitted or approved (locks the whole period)
      const hasLockedEntries = allEntries.some((e: any) => 
        e.status === 'SUBMITTED' || e.status === 'APPROVED'
      );
      setHasSubmittedEntries(hasLockedEntries);

      const map: Record<string, TimeEntry> = {};
      const projectIdsToAdd = new Set<number>();

      allEntries.forEach((e: any) => {
        const projectId = e.werkGcId || 0;
        // Normalize date format: API returns ISO format like "2026-01-06T00:00:00" or "2026-01-06"
        // We need it in "YYYY-MM-DD" format to match keys created by formatDate()
        const normalizedDate = e.datum.split('T')[0]; // Take only date part, ignore time
        const key = `${normalizedDate}-${projectId}`;

        map[key] = {
          date: normalizedDate,
          projectId: projectId,
          hours: e.aantal,
          eveningNightHours: e.eveningNightHours || 0,
          travelHours: e.travelHours || 0,
          distanceKm: e.distanceKm || 0,
          travelCosts: e.travelCosts || 0,
          otherExpenses: e.otherExpenses || 0,
          notes: e.omschrijving || "",
          status: e.status, // DRAFT, SUBMITTED, APPROVED, REJECTED
          rejectionReason: e.rejectionReason || null,
          id: e.id, // Save the database ID
        };

        // Track which projects need to be added
        if (projectId > 0) {
          projectIdsToAdd.add(projectId);
        }
      });

      // Update entries first
      setEntries(map);

      // Then add project rows for any projects that don't exist yet
      setProjectRows(prev => {
        const existingProjectIds = new Set(prev.map(r => r.projectId));
        const newRows: ProjectRow[] = [];

        projectIdsToAdd.forEach(projectId => {
          if (!existingProjectIds.has(projectId)) {
            // Find an entry with this projectId to get the description
            const entryWithProject = allEntries.find((e: any) => e.werkGcId === projectId);
            newRows.push({
              companyId: 0,
              companyName: "Altum Projects B.V.",
              projectGroupId: 0,
              projectGroupName: "",
              projectId: projectId,
              projectName: entryWithProject?.werkDescription || entryWithProject?.werkCode || `Project ${projectId}`,
            });
          }
        });

        return [...prev, ...newRows];
      });
    } catch (error) {
      showToast("Kon uren niet laden", "error");
    }
  };

  const toggleCompany = async (id: number) => {
    if (expandedCompanies.includes(id)) {
      setExpandedCompanies((prev) => prev.filter((x) => x !== id));
    } else {
      setExpandedCompanies((prev) => [...prev, id]);
      if (!projectGroups[id]) {
        try {
          const groups = await getProjectGroups(id);
          setProjectGroups((prev) => ({ ...prev, [id]: groups }));
        } catch (error) {
          showToast("Kon groepen niet laden", "error");
        }
      }
    }
  };

  const toggleGroup = async (id: number) => {
    if (expandedGroups.includes(id)) {
      setExpandedGroups((prev) => prev.filter((x) => x !== id));
    } else {
      setExpandedGroups((prev) => [...prev, id]);
      if (!projects[id]) {
        try {
          const projs = await getProjects(id);
          setProjects((prev) => ({ ...prev, [id]: projs }));
        } catch {
          showToast("Kon projecten niet laden", "error");
        }
      }
    }
  };

  const addProject = (
    company: Company,
    group: ProjectGroup,
    project: Project,
  ) => {
    if (!projectRows.some((r) => r.projectId === project.id)) {
      setProjectRows((prev) => [
        ...prev,
        {
          companyId: company.id,
          companyName: company.name,
          projectGroupId: group.id,
          projectGroupName: group.name,
          projectId: project.id,
          projectName: project.name,
        },
      ]);
    }
  };

  const copyCell = (projectId: number, date: string) => {
    const key = `${date}-${projectId}`;
    const entry = entries[key];

    if (
      !entry ||
      (entry.hours === 0 &&
        (entry.distanceKm ?? 0) === 0 &&
        (entry.otherExpenses ?? 0) === 0 &&
        !entry.notes)
    ) {
      showToast("Geen data om te kopiëren", "error");
      return;
    }

    setCopiedCell({ ...entry });
    showToast(
      "Cel gekopieerd! Klik op een andere cel om te plakken",
      "success",
    );
  };

  const pasteCell = (projectId: number, date: string) => {
    if (!copiedCell) {
      showToast("Geen data om te plakken", "error");
      return;
    }

    const key = `${date}-${projectId}`;
    const existingEntry = entries[key];

    // Check of cel niet ingeleverd is
    if (existingEntry && existingEntry.status === "ingeleverd") {
      showToast("Kan niet plakken in ingeleverde cel", "error");
      return;
    }

    // Plak de data
    setEntries((prev) => ({
      ...prev,
      [key]: {
        date,
        projectId,
        hours: copiedCell.hours || 0,
        eveningNightHours: copiedCell.eveningNightHours || 0,
        travelHours: copiedCell.travelHours || 0,
        distanceKm: copiedCell.distanceKm || 0,
        travelCosts: copiedCell.travelCosts || 0,
        otherExpenses: copiedCell.otherExpenses || 0,
        notes: copiedCell.notes || "",
        status: "opgeslagen",
      },
    }));

    showToast("Geplakt!", "success");
  };

  const removeProject = async (projectId: number) => {
    // Only try to delete entries that are editable (DRAFT or REJECTED)
    const entriesToDelete = Object.values(entries).filter(
      (e) => e.projectId === projectId && e.id && (e.status === "DRAFT" || e.status === "REJECTED" || e.status === "opgeslagen" || !e.status)
    );

    // Check if there are any non-deletable entries
    const nonDeletableEntries = Object.values(entries).filter(
      (e) => e.projectId === projectId && e.id && (e.status === "SUBMITTED" || e.status === "APPROVED")
    );

    if (nonDeletableEntries.length > 0) {
      showToast(`Kan project niet verwijderen: ${nonDeletableEntries.length} uur${nonDeletableEntries.length > 1 ? 'registraties zijn' : 'registratie is'} al ingeleverd of goedgekeurd`, "error");
      return;
    }

    let deletedCount = 0;
    let failedCount = 0;

    for (const entry of entriesToDelete) {
      try {
        if (entry.id) {
          await deleteDraft(entry.id);
          deletedCount++;
        }
      } catch (err: any) {
        failedCount++;
        console.error("Failed to delete entry:", entry.id, err);
      }
    }

    if (failedCount > 0) {
      showToast(`${failedCount} uur${failedCount > 1 ? 'registraties' : 'registratie'} kon niet verwijderd worden`, "error");
    }

    // Remove project row from UI
    setProjectRows((prev) => prev.filter((r) => r.projectId !== projectId));

    // Reload entries from server to ensure UI is in sync
    await loadEntries();

    if (deletedCount > 0 && failedCount === 0) {
      showToast(`Project en ${deletedCount} uur${deletedCount > 1 ? 'registraties' : 'registratie'} verwijderd`, "success");
    }
  };

  const updateEntry = (
    projectId: number,
    date: string,
    field: "hours" | "taskType" | "eveningNightHours" | "travelHours" | "distanceKm" | "travelCosts" | "otherExpenses" | "notes",
    value: any,
  ) => {
    const key = `${date}-${projectId}`;
    setEntries((prev) => {
      const existingEntry = (prev[key] || {}) as Partial<TimeEntry>;
      const updatedEntry: TimeEntry = {
        date,
        projectId,
        hours: existingEntry.hours ?? 0,
        ...existingEntry,
        [field]: value,
        taskType: existingEntry.taskType || getDefaultTaskType(),
      };
      return {
        ...prev,
        [key]: updatedEntry,
      };
    });
  };

  const toggleCellExpanded = (projectId: number, date: string) => {
    const key = `${date}-${projectId}`;
    setExpandedCells((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isCellExpanded = (projectId: number, date: string) => {
    const key = `${date}-${projectId}`;
    return expandedCells[key] || false;
  };

  const getTotalDay = (date: string) =>
    (Object.values(entries) as TimeEntry[])
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + (e.hours || 0), 0);

  const getTotalProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      return sum + (entries[key]?.hours || 0);
    }, 0);

  const getTotalWeek = () =>
    projectRows.reduce((sum, r) => sum + getTotalProject(r.projectId), 0);

  // KM totals
  const getTotalKmDay = (date: string) =>
    (Object.values(entries) as TimeEntry[])
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + (e.distanceKm || 0), 0);

  const getTotalKmProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      return sum + (entries[key]?.distanceKm || 0);
    }, 0);

  const getTotalKmWeek = () =>
    projectRows.reduce((sum, r) => sum + getTotalKmProject(r.projectId), 0);

  // Expenses totals
  const getTotalExpensesDay = (date: string) =>
    (Object.values(entries) as TimeEntry[])
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + ((e.travelCosts || 0) + (e.otherExpenses || 0)), 0);

  const getTotalExpensesProject = (projectId: number) =>
    weekDays.reduce((sum, day) => {
      const key = `${formatDate(day)}-${projectId}`;
      const entry = entries[key];
      return sum + ((entry?.travelCosts || 0) + (entry?.otherExpenses || 0));
    }, 0);

  const getTotalExpensesWeek = () =>
    projectRows.reduce(
      (sum, r) => sum + getTotalExpensesProject(r.projectId),
      0,
    );

  const getCurrentPeriodId = () => {
    // Return the cached period ID if already fetched
    return currentPeriodId || 100436; // Fallback to 100436 if not loaded yet
  };

  // Get total hours spent on a project (all entries, not just current week)
  const getTotalHoursForProject = (projectId: number) => {
    return (Object.values(entries) as TimeEntry[])
      .filter((e) => e.projectId === projectId)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  // Check if project has max hours set and if user is at/over limit
  const getProjectMaxInfo = (projectId: number) => {
    const maxHours = projectMaxHours[projectId];
    if (!maxHours) return { hasMax: false, currentHours: 0, maxHours: 0, isAtMax: false };
    const currentHours = getTotalHoursForProject(projectId);
    return {
      hasMax: true,
      currentHours,
      maxHours,
      isAtMax: currentHours >= maxHours,
      remaining: Math.max(0, maxHours - currentHours)
    };
  };

  // Helper functions for entry status styling and editability
  const isEditable = (status?: string) => {
    // Only lock individual entries that are SUBMITTED or APPROVED
    // New entries (no status) and DRAFT/REJECTED entries remain editable
    // This allows users to add new entries even when some are already submitted
    if (status === "SUBMITTED" || status === "APPROVED") {
      return false;
    }
    // DRAFT, REJECTED, and old "opgeslagen" status are editable
    return !status || status === "DRAFT" || status === "REJECTED" || status === "opgeslagen";
  };

  const getEntryClassName = (status?: string) => {
    // Return CSS class based on status
    if (status === "APPROVED") return "bg-green-50 dark:bg-green-900/20";
    if (status === "SUBMITTED") return "bg-gray-50 dark:bg-gray-700/50";
    if (status === "REJECTED") return "bg-red-50 dark:bg-red-900/20";
    return ""; // DRAFT - normal styling
  };

  const getInputClassName = (baseClass: string, status?: string) => {
    const editable = isEditable(status);
    if (!editable) {
      return `${baseClass} bg-gray-100 dark:bg-gray-700 cursor-not-allowed`;
    }
    if (status === "REJECTED") {
      return `${baseClass} border-red-300 dark:border-red-700`;
    }
    return baseClass;
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Validate total hours per day (project + indirect)
      const dayTotals: Record<string, number> = {};
      (Object.values(entries) as TimeEntry[]).forEach(e => {
        if (e.hours > 0) {
          dayTotals[e.date] = (dayTotals[e.date] || 0) + e.hours;
        }
      });
      Object.values(indirectEntries).forEach(e => {
        if (e.hours > 0) {
          dayTotals[e.date] = (dayTotals[e.date] || 0) + e.hours;
        }
      });
      const invalidDays = Object.entries(dayTotals).filter(([, total]) => total > MAX_HOURS_PER_DAY);
      if (invalidDays.length > 0) {
        showToast(`Te veel uren op: ${invalidDays.map(([date]) => date).join(', ')} (max ${MAX_HOURS_PER_DAY}u)`, "error");
        setSaving(false);
        return;
      }

      const toSave = (Object.values(entries) as TimeEntry[])
        .filter((e: TimeEntry) => e.hours > 0)
        .filter((e: TimeEntry) => !isClosedDay(e.date));

      if (toSave.length === 0) {
        showToast("Geen uren om op te slaan", "error");
        return;
      }

      const urenperGcId = getCurrentPeriodId();

      // Save each entry as draft using workflow API
      // Update entries with their IDs after saving
      const updatedEntries = { ...entries };

      for (const entry of toSave as TimeEntry[]) {
        // Determine taakGcId based on user's taskType selection or restriction
        let taakGcId: number;
        const taskType = entry.taskType || getDefaultTaskType();
        if (taskType === 'MONTAGE') {
          taakGcId = 100256; // Montage task
        } else {
          taakGcId = 100032; // Tekenkamer task
        }

        const result = await saveDraft({
          id: entry.id, // Include ID if it exists (for updates)
          urenperGcId,
          taakGcId,
          werkGcId: entry.projectId || null,
          datum: entry.date,
          aantal: entry.hours,
          omschrijving: entry.notes || "",
          eveningNightHours: entry.eveningNightHours || 0,
          travelHours: entry.travelHours || 0,
          distanceKm: entry.distanceKm || 0,
          travelCosts: entry.travelCosts || 0,
          otherExpenses: entry.otherExpenses || 0,
        });

        // Update the entry with the ID from the server
        const key = `${entry.date}-${entry.projectId}`;
        updatedEntries[key] = {
          ...entry,
          id: result.entry.id,
          status: result.entry.status,
        };
      }

      setEntries(updatedEntries);

      // Also save indirect entries (verlof, ATV, etc.)
      const indirectToSave = Object.values(indirectEntries).filter(
        (e) => e.hours > 0 && !isClosedDay(e.date)
      );
      const updatedIndirect = { ...indirectEntries };
      for (const ie of indirectToSave) {
        const result = await saveDraft({
          id: ie.id,
          urenperGcId,
          taakGcId: ie.taakGcId,
          werkGcId: null,
          datum: ie.date,
          aantal: ie.hours,
          omschrijving: "",
          eveningNightHours: 0,
          travelHours: 0,
          distanceKm: 0,
          travelCosts: 0,
          otherExpenses: 0,
        });
        const key = `${ie.date}-indirect-${ie.taskCode}`;
        updatedIndirect[key] = { ...ie, id: result.entry.id, status: result.entry.status };
      }
      setIndirectEntries(updatedIndirect);

      const totalSaved = toSave.length + indirectToSave.length;
      showToast(`✓ ${totalSaved} registratie(s) opgeslagen als concept`, "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Kan uren niet opslaan. Controleer je internetverbinding.";
      showToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const submitAll = async () => {
    setSaving(true);
    try {
      // Validate total hours per day
      const dayTotals: Record<string, number> = {};
      (Object.values(entries) as TimeEntry[]).forEach((e: TimeEntry) => {
        if (e.hours > 0) {
          dayTotals[e.date] = (dayTotals[e.date] || 0) + e.hours;
        }
      });
      Object.values(indirectEntries).forEach(e => {
        if (e.hours > 0) {
          dayTotals[e.date] = (dayTotals[e.date] || 0) + e.hours;
        }
      });
      const invalidDays = Object.entries(dayTotals).filter(([, total]) => total > MAX_HOURS_PER_DAY);
      if (invalidDays.length > 0) {
        const datesFormatted = invalidDays.map(([date]) => dayjs(date).format("DD MMMM")).join(", ");
        showToast(`Te veel uren op ${datesFormatted}. Maximaal ${MAX_HOURS_PER_DAY} uur per dag toegestaan.`, "error");
        setSaving(false);
        return;
      }

      const toSave = (Object.values(entries) as TimeEntry[])
        .filter((e: TimeEntry) => e.hours > 0)
        .filter((e: TimeEntry) => !isClosedDay(e.date));

      const indirectToSave = Object.values(indirectEntries).filter(
        (e) => e.hours > 0 && !isClosedDay(e.date)
      );

      if (toSave.length === 0 && indirectToSave.length === 0) {
        showToast("Geen uren ingevuld. Voeg eerst uren toe voordat je indient.", "error");
        return;
      }

      const urenperGcId = getCurrentPeriodId();

      // First save all project entries as drafts
      const savedIds: number[] = [];
      for (const entry of toSave as TimeEntry[]) {
        let taakGcId: number;
        const taskType = entry.taskType || getDefaultTaskType();
        if (taskType === 'MONTAGE') {
          taakGcId = 100256;
        } else {
          taakGcId = 100032;
        }

        const result = await saveDraft({
          id: entry.id,
          urenperGcId,
          taakGcId,
          werkGcId: entry.projectId || null,
          datum: entry.date,
          aantal: entry.hours,
          omschrijving: entry.notes || "",
          eveningNightHours: entry.eveningNightHours || 0,
          travelHours: entry.travelHours || 0,
          distanceKm: entry.distanceKm || 0,
          travelCosts: entry.travelCosts || 0,
          otherExpenses: entry.otherExpenses || 0,
        });
        savedIds.push(result.entry.id);
      }

      // Save indirect entries as drafts
      for (const ie of indirectToSave) {
        const result = await saveDraft({
          id: ie.id,
          urenperGcId,
          taakGcId: ie.taakGcId,
          werkGcId: null,
          datum: ie.date,
          aantal: ie.hours,
          omschrijving: "",
          eveningNightHours: 0,
          travelHours: 0,
          distanceKm: 0,
          travelCosts: 0,
          otherExpenses: 0,
        });
        savedIds.push(result.entry.id);
      }

      // Then submit all saved drafts
      await submitEntries({
        urenperGcId,
        entryIds: savedIds,
      });

      showToast(`✓ ${savedIds.length} registratie(s) ingediend voor goedkeuring!`, "success");

      // Force reload after a short delay to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadEntries();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Kan uren niet indienen. Controleer of alle velden correct zijn ingevuld.";
      showToast("❌ " + errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  // selectedDay for new design
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1;
  });

  const getDayEntries = (dayIndex: number) => {
    const date = formatDate(weekDays[dayIndex]);
    return projectRows.map(row => ({
      ...row,
      date,
      entry: entries[`${date}-${row.projectId}`],
    }));
  };

  const getDayTotal = (dayIndex: number) => {
    const date = formatDate(weekDays[dayIndex]);
    return getTotalDay(date);
  };

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="p-6 space-y-5 animate-fadeIn">
          {/* Toast */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
              <span>{toast.type === "success" ? "✓" : "✕"}</span>
              {toast.message}
            </div>
          )}

          {/* Project picker modal */}
          {showProjectPicker && (
            <div className="fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowProjectPicker(false)} />
              <div className="relative w-80 bg-white dark:bg-slate-800 shadow-xl overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Project kiezen</h3>
                  <button onClick={() => setShowProjectPicker(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500">&times;</button>
                </div>
                <div className="p-3 space-y-1">
                  {favoriteProjects.length > 0 && (
                    <div className="mb-3">
                      <p className="px-3 py-1 text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> Favorieten</p>
                      {favoriteProjects.map(fav => (
                        <div key={fav.projectGcId} className="flex items-center gap-2 px-3 py-2 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-md cursor-pointer" onClick={() => { addFavoriteToRows(fav); setShowProjectPicker(false); }}>
                          <Star className="w-3 h-3 text-amber-500 fill-current flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200">{fav.projectName || fav.projectCode}</span>
                        </div>
                      ))}
                      <div className="border-b border-slate-200 dark:border-slate-700 my-2" />
                    </div>
                  )}
                  {companies.map(company => (
                    <div key={company.id}>
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer" onClick={() => toggleCompany(company.id)}>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedCompanies.includes(company.id) ? "" : "-rotate-90"}`} />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{company.name.replace(/\s*[\(\{]\d+[\)\}]\s*$/, '')}</span>
                      </div>
                      {expandedCompanies.includes(company.id) && projectGroups[company.id]?.filter(g => assignedGroupIds === null || assignedGroupIds.has(g.id)).map(group => (
                        <div key={group.id} className="ml-4">
                          <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer" onClick={() => toggleGroup(group.id)}>
                            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${expandedGroups.includes(group.id) ? "" : "-rotate-90"}`} />
                            <span className="text-xs text-slate-600 dark:text-slate-300">{group.name}</span>
                          </div>
                          {expandedGroups.includes(group.id) && getVisibleProjects(group.id).map(project => (
                            <div key={project.id} className="ml-4 flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-md cursor-pointer group" onClick={() => { addProject(company, group, project); setShowProjectPicker(false); }}>
                              <button className={`flex-shrink-0 transition-colors ${favoriteProjectIds.has(project.id) ? "text-amber-500" : "text-slate-300 group-hover:text-amber-400"}`} onClick={e => { e.stopPropagation(); toggleFavorite(project.id, project.name); }}>
                                <Star className={`w-3 h-3 ${favoriteProjectIds.has(project.id) ? "fill-current" : ""}`} />
                              </button>
                              <span className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-emerald-600">{project.name}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Uren Registreren</h1>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
                <button onClick={() => setViewMode("week")} className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === "week" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Week</button>
                <button onClick={() => setViewMode("month")} className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === "month" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Maand</button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[64px] text-center">Week {weekNumber}</span>
                <button onClick={() => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={saveAll} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />{saving ? "Bezig..." : "Opslaan"}
              </button>
              <button onClick={submitAll} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />Inleveren
              </button>
            </div>
          </div>

          {/* Day tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {weekDays.map((day, i) => {
              const names = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
              const total = getDayTotal(i);
              const isToday = formatDate(day) === formatDate(new Date());
              const isSel = selectedDay === i;
              const closed = isClosedDay(formatDate(day));
              return (
                <button key={i} onClick={() => setSelectedDay(i)} className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-md text-sm transition-colors ${isSel ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"} ${closed ? "opacity-40" : ""}`}>
                  <span className={`text-xs font-medium ${isSel ? "text-blue-600" : "text-slate-500"}`}>{names[i]}</span>
                  <span className={`text-base font-bold ${isSel ? "text-blue-600" : isToday ? "text-blue-500" : "text-slate-700 dark:text-slate-300"}`}>{day.getDate()}</span>
                  {total > 0 ? <span className={`text-xs font-semibold ${isSel ? "text-blue-500" : "text-emerald-600"}`}>{total}u</span> : <span className="text-xs text-slate-300">—</span>}
                </button>
              );
            })}
          </div>

          {/* Day content */}
          <div className="space-y-3">
            {(() => {
              const date = formatDate(weekDays[selectedDay]);
              const dayEntryList = getDayEntries(selectedDay);
              const dayTotal = getDayTotal(selectedDay);
              const overMax = dayTotal > MAX_HOURS_PER_DAY;

              return (
                <>
                  {dayEntryList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                        <Clock className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Geen projecten voor deze dag</p>
                      <p className="text-xs text-slate-500 mt-1">Voeg een project toe om uren te registreren</p>
                      <button onClick={() => setShowProjectPicker(true)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
                        <Plus className="w-4 h-4" />Project toevoegen
                      </button>
                    </div>
                  ) : (
                    <>
                      {dayEntryList.map(row => {
                        const key = `${date}-${row.projectId}`;
                        const entry = entries[key];
                        const status = entry?.status;
                        const editable = isEditable(status);
                        const expanded = isCellExpanded(row.projectId, date);
                        return (
                          <div key={row.projectId} className={`bg-white dark:bg-slate-800 border rounded-xl p-4 transition-colors ${
                            status === "APPROVED" ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10" :
                            status === "SUBMITTED" ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10" :
                            status === "REJECTED" ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10" :
                            "border-slate-200 dark:border-slate-700"
                          }`}>
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.projectName}</span>
                                  {row.companyName && <span className="text-xs text-slate-400">{row.companyName}</span>}
                                  {status === "APPROVED" && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Goedgekeurd</span>}
                                  {status === "SUBMITTED" && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Ingediend</span>}
                                  {status === "REJECTED" && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Afgewezen</span>}
                                </div>
                                {entry?.rejectionReason && <p className="text-xs text-red-600 mt-1">{entry.rejectionReason}</p>}
                                <input
                                  type="text"
                                  placeholder="Opmerkingen toevoegen..."
                                  disabled={!editable}
                                  value={entry?.notes || ""}
                                  onChange={e => updateEntry(row.projectId, date, "notes", e.target.value)}
                                  className="mt-2 w-full text-xs text-slate-500 bg-transparent border-none outline-none placeholder:text-slate-300 disabled:cursor-not-allowed"
                                />
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {shouldShowTaskDropdown() && (
                                  <select
                                    disabled={!editable}
                                    value={entry?.taskType || getDefaultTaskType()}
                                    onChange={e => updateEntry(row.projectId, date, "taskType", e.target.value)}
                                    className="h-8 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 disabled:cursor-not-allowed"
                                  >
                                    <option value="MONTAGE">Montage</option>
                                    <option value="TEKENKAMER">Tekenkamer</option>
                                  </select>
                                )}
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0" max="24" step="0.5"
                                    disabled={!editable}
                                    value={entry?.hours || 0}
                                    onChange={e => updateEntry(row.projectId, date, "hours", parseFloat(e.target.value) || 0)}
                                    className="w-16 h-9 text-center border border-slate-200 dark:border-slate-600 rounded-md text-sm font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-slate-400 font-medium">u</span>
                                </div>
                                <button onClick={() => toggleCellExpanded(row.projectId, date)} className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${expanded ? "text-blue-500" : "text-slate-400"}`} title="Extra velden">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>
                                <button onClick={() => removeProject(row.projectId)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-colors" title="Verwijder project">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {expanded && (
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Moon className="w-3 h-3" />Nacht</label>
                                  <input type="number" min="0" step="0.5" disabled={!editable} value={entry?.eveningNightHours || 0} onChange={e => updateEntry(row.projectId, date, "eveningNightHours", parseFloat(e.target.value) || 0)} className="w-full h-8 px-2 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:cursor-not-allowed" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Car className="w-3 h-3" />Km</label>
                                  <input type="number" min="0" disabled={!editable} value={entry?.distanceKm || 0} onChange={e => updateEntry(row.projectId, date, "distanceKm", parseFloat(e.target.value) || 0)} className="w-full h-8 px-2 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:cursor-not-allowed" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Ticket className="w-3 h-3" />Reiskosten</label>
                                  <input type="number" min="0" step="0.01" disabled={!editable} value={entry?.travelCosts || 0} onChange={e => updateEntry(row.projectId, date, "travelCosts", parseFloat(e.target.value) || 0)} className="w-full h-8 px-2 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:cursor-not-allowed" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Euro className="w-3 h-3" />Onkosten</label>
                                  <input type="number" min="0" step="0.01" disabled={!editable} value={entry?.otherExpenses || 0} onChange={e => updateEntry(row.projectId, date, "otherExpenses", parseFloat(e.target.value) || 0)} className="w-full h-8 px-2 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:cursor-not-allowed" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <button onClick={() => setShowProjectPicker(true)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400 transition-colors">
                        <Plus className="w-4 h-4" />Project toevoegen
                      </button>

                      <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${overMax ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"}`}>
                        <span className={`text-sm font-medium ${overMax ? "text-red-600" : "text-slate-600 dark:text-slate-400"}`}>Totaal vandaag {overMax ? `— let op: max ${MAX_HOURS_PER_DAY}u` : ""}</span>
                        <span className={`text-lg font-bold ${overMax ? "text-red-600" : "text-slate-900 dark:text-slate-100"}`}>{dayTotal}u</span>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>

          {/* Week totaal */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Week totaal</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{getTotalWeek()}u</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, i) => {
                const names = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
                const total = getDayTotal(i);
                const isSel = selectedDay === i;
                return (
                  <button key={i} onClick={() => setSelectedDay(i)} className={`flex flex-col items-center py-2 rounded-lg transition-colors ${isSel ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}>
                    <span className="text-xs text-slate-400">{names[i]}</span>
                    <span className={`text-sm font-bold mt-0.5 ${total > 0 ? "text-blue-600" : "text-slate-300"}`}>{total > 0 ? `${total}u` : "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
