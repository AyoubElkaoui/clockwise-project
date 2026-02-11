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
  companyId: number;
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
  taskType?: 'MONTAGE' | 'TEKENKAMER'; // User's choice of task type
  eveningNightHours?: number;
  travelHours?: number;
  distanceKm?: number;
  travelCosts?: number;
  otherExpenses?: number;
  notes?: string;
  status?: string;
  rejectionReason?: string | null;
  id?: number; // Workflow entry ID from database
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
        entry.km === 0 &&
        entry.expenses === 0 &&
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
      const existingEntry = prev[key] || {};
      const updatedEntry = {
        ...existingEntry,
        date,
        projectId,
        [field]: value,
        // Ensure taskType is always set based on user's allowed tasks
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

  return (
    <ProtectedRoute>
      <ModernLayout>
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
          {toast && (
            <div
              className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl text-white animate-in slide-in-from-top-2 ${
                toast.type === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {toast.type === "success" ? "✓" : "✕"}
                </span>
                <span className="font-medium">{toast.message}</span>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-30">
            <div className="px-3 md:px-6 py-3 md:py-4 space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <h1 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Uren Registreren
                </h1>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("week")}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "week"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode("month")}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "month"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Maand
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => {
                      const d = new Date(currentWeek);
                      if (viewMode === "week") {
                        d.setDate(d.getDate() - 7);
                      } else {
                        d.setMonth(d.getMonth() - 1);
                      }
                      setCurrentWeek(d);
                    }}
                    className="p-1.5 md:p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <div className="px-2 md:px-4 py-1 md:py-2 font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 min-w-[80px] text-center">
                    {viewMode === "week"
                      ? `Week ${weekNumber}`
                      : monthNames[currentWeek.getMonth()]}
                  </div>
                  <button
                    onClick={() => {
                      const d = new Date(currentWeek);
                      if (viewMode === "week") {
                        d.setDate(d.getDate() + 7);
                      } else {
                        d.setMonth(d.getMonth() + 1);
                      }
                      setCurrentWeek(d);
                    }}
                    className="p-1.5 md:p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="hidden md:flex gap-3">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="px-5 py-2.5 bg-timr-orange hover:bg-timr-orange-hover text-white rounded-lg font-medium shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" /> {saving ? "Bezig..." : "Opslaan"}
                </button>
                <button
                  onClick={submitAll}
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" /> Inleveren
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:h-[calc(100vh-5rem)]">
            {/* Mobile Project Picker Overlay */}
            {showProjectPicker && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowProjectPicker(false)} />
                <div className="absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto">
                  <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Project kiezen</h3>
                    <button
                      onClick={() => setShowProjectPicker(false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <span className="text-xl text-slate-500">&times;</span>
                    </button>
                  </div>
                  <div className="p-4 space-y-1">
                    {/* Favoriete Projecten sectie */}
                    {favoriteProjects.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 px-3 py-2 text-amber-600 dark:text-amber-400 font-semibold">
                          <Star className="w-4 h-4 fill-current" />
                          <span>Favorieten</span>
                        </div>
                        <div className="space-y-1">
                          {favoriteProjects.map((favorite) => (
                            <div
                              key={`mob-fav-${favorite.projectGcId}`}
                              className="flex items-center gap-2 px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-lg group transition-colors"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(favorite.projectGcId, favorite.projectName || "Project");
                                }}
                                className="text-amber-500 hover:text-amber-600"
                              >
                                <Star className="w-4 h-4 fill-current" />
                              </button>
                              <span
                                onClick={() => { addFavoriteToRows(favorite); setShowProjectPicker(false); }}
                                className="text-sm text-slate-700 dark:text-slate-200 group-hover:text-amber-600 cursor-pointer flex-1"
                              >
                                {favorite.projectName || favorite.projectCode || `Project ${favorite.projectGcId}`}
                              </span>
                              <Plus
                                onClick={() => { addFavoriteToRows(favorite); setShowProjectPicker(false); }}
                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="border-b border-slate-200 dark:border-slate-700 my-3" />
                      </div>
                    )}

                    {/* Bedrijven en projecten (mobile overlay) */}
                    {companies.map((company) => (
                      <div key={`mob-${company.id}`}>
                        <div
                          onClick={() => toggleCompany(company.id)}
                          className="flex items-center gap-2 px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer group transition-colors"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform text-slate-400 group-hover:text-blue-600 ${expandedCompanies.includes(company.id) ? "" : "-rotate-90"}`}
                          />
                          <span className="font-medium group-hover:text-blue-600">
                            {company.name.replace(/\s*[\(\{]\d+[\)\}]\s*$/, '')}
                          </span>
                        </div>
                        {expandedCompanies.includes(company.id) && (
                          <div className="ml-5 space-y-1">
                            {projectGroups[company.id]?.filter(group =>
                              assignedGroupIds === null || assignedGroupIds.has(group.id)
                            ).map((group, index) => (
                              <div key={group.id || `mob-group-${index}`}>
                                <div
                                  onClick={() => toggleGroup(group.id)}
                                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-timr-orange-light dark:hover:bg-slate-700 rounded-lg cursor-pointer group transition-colors"
                                >
                                  <ChevronDown
                                    className={`w-3 h-3 transition-transform text-slate-400 group-hover:text-timr-orange ${expandedGroups.includes(group.id) ? "" : "-rotate-90"}`}
                                  />
                                  <span className="text-sm group-hover:text-timr-orange">
                                    {group.name}
                                  </span>
                                </div>
                                {expandedGroups.includes(group.id) && (
                                  <div className="ml-5 space-y-1">
                                    {getVisibleProjects(group.id).map((project) => (
                                      <div
                                        key={`mob-proj-${project.id}`}
                                        className="flex items-center gap-2 px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg group transition-colors"
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(project.id, project.name);
                                          }}
                                          className={`transition-colors ${
                                            favoriteProjectIds.has(project.id)
                                              ? "text-amber-500"
                                              : "text-slate-300 hover:text-amber-400"
                                          }`}
                                        >
                                          <Star className={`w-4 h-4 ${favoriteProjectIds.has(project.id) ? "fill-current" : ""}`} />
                                        </button>
                                        <span
                                          onClick={() => { addProject(company, group, project); setShowProjectPicker(false); }}
                                          className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 cursor-pointer flex-1"
                                        >
                                          {project.name}
                                        </span>
                                        <Plus
                                          onClick={() => { addProject(company, group, project); setShowProjectPicker(false); }}
                                          className="w-4 h-4 text-emerald-600 cursor-pointer"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden md:block w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto shadow-lg">
              <div className="p-4 space-y-1">
                {/* Favoriete Projecten sectie */}
                {favoriteProjects.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 text-amber-600 dark:text-amber-400 font-semibold">
                      <Star className="w-4 h-4 fill-current" />
                      <span>Favorieten</span>
                    </div>
                    <div className="space-y-1">
                      {favoriteProjects.map((favorite) => (
                        <div
                          key={`fav-${favorite.projectGcId}`}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-lg group transition-colors"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(favorite.projectGcId, favorite.projectName || "Project");
                            }}
                            className="text-amber-500 hover:text-amber-600"
                          >
                            <Star className="w-3 h-3 fill-current" />
                          </button>
                          <span
                            onClick={() => addFavoriteToRows(favorite)}
                            className="text-sm text-slate-700 dark:text-slate-200 group-hover:text-amber-600 cursor-pointer flex-1"
                          >
                            {favorite.projectName || favorite.projectCode || `Project ${favorite.projectGcId}`}
                          </span>
                          <Plus
                            onClick={() => addFavoriteToRows(favorite)}
                            className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="border-b border-slate-200 dark:border-slate-700 my-3" />
                  </div>
                )}

                {/* Bedrijven en projecten */}
                {companies.map((company) => (
                  <div key={company.id}>
                    <div
                      onClick={() => toggleCompany(company.id)}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer group transition-colors"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform text-slate-400 group-hover:text-blue-600 ${expandedCompanies.includes(company.id) ? "" : "-rotate-90"}`}
                      />
                      <span className="font-medium group-hover:text-blue-600">
                        {company.name.replace(/\s*[\(\{]\d+[\)\}]\s*$/, '')}
                      </span>
                    </div>
                    {expandedCompanies.includes(company.id) && (
                      <div className="ml-5 space-y-1">
                        {projectGroups[company.id]?.filter(group =>
                          assignedGroupIds === null || assignedGroupIds.has(group.id)
                        ).map((group, index) => (
                          <div key={group.id || `group-${index}`}>
                            <div
                              onClick={() => toggleGroup(group.id)}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-timr-orange-light dark:hover:bg-slate-700 rounded-lg cursor-pointer group transition-colors"
                            >
                              <ChevronDown
                                className={`w-3 h-3 transition-transform text-slate-400 group-hover:text-timr-orange ${expandedGroups.includes(group.id) ? "" : "-rotate-90"}`}
                              />
                              <span className="text-sm group-hover:text-timr-orange">
                                {group.name}
                              </span>
                            </div>
                            {expandedGroups.includes(group.id) && (
                              <div className="ml-5 space-y-1">
                                {getVisibleProjects(group.id).map((project) => (
                                  <div
                                    key={project.id}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg group transition-colors"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(project.id, project.name);
                                      }}
                                      className={`transition-colors ${
                                        favoriteProjectIds.has(project.id)
                                          ? "text-amber-500"
                                          : "text-slate-300 hover:text-amber-400"
                                      }`}
                                    >
                                      <Star className={`w-3 h-3 ${favoriteProjectIds.has(project.id) ? "fill-current" : ""}`} />
                                    </button>
                                    <span
                                      onClick={() => addProject(company, group, project)}
                                      className="text-sm text-slate-600 group-hover:text-emerald-600 cursor-pointer flex-1"
                                    >
                                      {project.name}
                                    </span>
                                    <Plus
                                      onClick={() => addProject(company, group, project)}
                                      className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 md:p-6">
              {/* Mobile: Add project button */}
              <div className="md:hidden mb-3">
                <button
                  onClick={() => setShowProjectPicker(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition"
                >
                  <Plus className="w-5 h-5" />
                  Project toevoegen
                </button>
              </div>

              {projectRows.length === 0 ? (
                <div className="h-full flex items-center justify-center py-12">
                  <div className="text-center">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      Geen projecten geselecteerd
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Selecteer een project {typeof window !== 'undefined' && window.innerWidth < 768 ? 'via de knop hierboven' : 'in de sidebar'}
                    </p>
                  </div>
                </div>
              ) : viewMode === "month" ? (
                <>
                {/* ===== MOBILE MONTH VIEW ===== */}
                <div className="md:hidden space-y-3">
                  {/* Week selector tabs */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {monthWeeks.map((ws, i) => {
                      const wn = getWeekNumber(ws);
                      const isSelected = selectedMobileWeek === i;
                      const wdForWeek = getWeekDays(ws);
                      const weekTotal = wdForWeek.reduce((sum, d) =>
                        sum + projectRows.reduce((s, row) => {
                          const k = `${formatDate(d)}-${row.projectId}`;
                          return s + (entries[k]?.hours || 0);
                        }, 0), 0
                      );
                      return (
                        <button
                          key={`mob-week-${i}`}
                          onClick={() => { setSelectedMobileWeek(i); setSelectedMobileDay(0); }}
                          className={`flex-1 min-w-[56px] py-2 px-1.5 rounded-xl text-center transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="text-[9px] font-medium uppercase">Week</div>
                          <div className="text-lg font-bold">{wn}</div>
                          {weekTotal > 0 && (
                            <div className={`text-[10px] font-semibold ${isSelected ? "text-blue-200" : "text-blue-600 dark:text-blue-400"}`}>
                              {weekTotal}u
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Day tabs for selected week */}
                  {(() => {
                    const selWeekStart = monthWeeks[selectedMobileWeek] || monthWeeks[0];
                    if (!selWeekStart) return null;
                    const wdForWeek = getWeekDays(selWeekStart);
                    const curMonth = currentWeek.getMonth();
                    const curYear = currentWeek.getFullYear();

                    return (
                      <>
                        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                          {wdForWeek.map((day, i) => {
                            const isToday = formatDate(day) === formatDate(new Date());
                            const isSel = selectedMobileDay === i;
                            const dayTotal = getTotalDay(formatDate(day));
                            const closed = isClosedDay(formatDate(day));
                            const weekend = isWeekend(day);
                            const inMonth = day.getMonth() === curMonth && day.getFullYear() === curYear;
                            return (
                              <button
                                key={`mob-mday-${i}`}
                                onClick={() => setSelectedMobileDay(i)}
                                className={`flex-1 min-w-[48px] py-2 px-1 rounded-xl text-center transition-all ${
                                  !inMonth
                                    ? "opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400"
                                    : isSel
                                    ? "bg-blue-600 text-white shadow-md"
                                    : isToday
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                                    : closed || weekend
                                    ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                <div className="text-[10px] font-medium uppercase">{dayNames[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                                <div className="text-lg font-bold">{day.getDate()}</div>
                                {dayTotal > 0 && (
                                  <div className={`text-[10px] font-semibold ${isSel ? "text-blue-200" : "text-blue-600 dark:text-blue-400"}`}>
                                    {dayTotal}u
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Month total */}
                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Maandtotaal</span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {monthWeeks.reduce((total, ws) => {
                              const wd = getWeekDays(ws);
                              return total + wd.reduce((sum, d) => {
                                if (d.getMonth() !== curMonth || d.getFullYear() !== curYear) return sum;
                                return sum + projectRows.reduce((s, row) => {
                                  const k = `${formatDate(d)}-${row.projectId}`;
                                  return s + (entries[k]?.hours || 0);
                                }, 0);
                              }, 0);
                            }, 0)}u
                          </span>
                        </div>

                        {/* Project cards for selected day */}
                        {(() => {
                          const day = wdForWeek[selectedMobileDay];
                          if (!day) return null;
                          const date = formatDate(day);
                          const inMonth = day.getMonth() === curMonth && day.getFullYear() === curYear;
                          const closed = isClosedDay(date);
                          const weekend = isWeekend(day);

                          if (!inMonth) {
                            return (
                              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="font-medium">Andere maand</p>
                              </div>
                            );
                          }
                          if (closed) {
                            return (
                              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="font-medium">Gesloten dag</p>
                              </div>
                            );
                          }
                          if (weekend) {
                            return (
                              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="font-medium">Weekend</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {projectRows.map((row) => {
                                const key = `${date}-${row.projectId}`;
                                const entry = entries[key] || {
                                  date,
                                  projectId: row.projectId,
                                  hours: 0,
                                  taskType: getDefaultTaskType(),
                                  distanceKm: 0,
                                  travelCosts: 0,
                                  otherExpenses: 0,
                                  notes: "",
                                  status: "opgeslagen",
                                };
                                const entryEditable = isEditable(entry.status);
                                const maxInfo = getProjectMaxInfo(row.projectId);
                                const isAtMaxHours = maxInfo.hasMax && maxInfo.isAtMax && (entry.hours || 0) === 0;
                                const isDisabled = !entryEditable || isAtMaxHours;

                                return (
                                  <div
                                    key={`mob-month-entry-${row.projectId}`}
                                    className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm ${getEntryClassName(entry.status)} ${isAtMaxHours ? "opacity-50" : ""}`}
                                  >
                                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                          {row.companyName}{row.projectGroupName && ` › ${row.projectGroupName}`}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{row.projectName}</span>
                                          {maxInfo.hasMax && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${maxInfo.isAtMax ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                                              {maxInfo.currentHours}/{maxInfo.maxHours}u
                                            </span>
                                          )}
                                        </div>
                                        {entry.status === "SUBMITTED" && (
                                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-medium">Ingeleverd</span>
                                        )}
                                        {entry.status === "APPROVED" && (
                                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded font-medium">Goedgekeurd</span>
                                        )}
                                        {entry.status === "REJECTED" && (
                                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded font-medium">Afgekeurd</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => toggleFavorite(row.projectId, row.projectName)} className="p-1.5">
                                          <Heart className={`w-4 h-4 ${favoriteProjectIds.has(row.projectId) ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
                                        </button>
                                        <button onClick={() => removeProject(row.projectId)} className="p-1.5 text-red-500">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="p-4 space-y-3">
                                      {shouldShowTaskDropdown() && !isDisabled && (
                                        <select
                                          value={entry.taskType || getDefaultTaskType()}
                                          onChange={(e) => updateEntry(row.projectId, date, "taskType", e.target.value as 'MONTAGE' | 'TEKENKAMER')}
                                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 font-medium"
                                        >
                                          <option value="MONTAGE">Montage</option>
                                          <option value="TEKENKAMER">Tekenkamer</option>
                                        </select>
                                      )}
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Uren</label>
                                          <input type="number" inputMode="decimal" step="0.5" min="0" max="24"
                                            value={entry.hours || ""} onChange={(e) => updateEntry(row.projectId, date, "hours", parseFloat(e.target.value) || 0)}
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-center text-xl font-bold bg-white dark:bg-slate-700", entry.status)}
                                            placeholder="0"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                            <Moon className="w-3 h-3 text-indigo-500" /> Nacht
                                          </label>
                                          <input type="number" inputMode="decimal" step="0.5" min="0" max="24"
                                            value={entry.eveningNightHours || ""} onChange={(e) => updateEntry(row.projectId, date, "eveningNightHours", parseFloat(e.target.value) || 0)}
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-center text-xl font-bold bg-white dark:bg-slate-700", entry.status)}
                                            placeholder="0"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-blue-500" /> Reisuren
                                          </label>
                                          <input type="number" inputMode="decimal" step="0.5" min="0"
                                            value={entry.travelHours || ""} onChange={(e) => updateEntry(row.projectId, date, "travelHours", parseFloat(e.target.value) || 0)}
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700", entry.status)}
                                            placeholder="0"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                            <Car className="w-3 h-3 text-green-500" /> Kilometers
                                          </label>
                                          <input type="number" inputMode="decimal" step="1" min="0"
                                            value={entry.distanceKm || ""} onChange={(e) => updateEntry(row.projectId, date, "distanceKm", parseFloat(e.target.value) || 0)}
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700", entry.status)}
                                            placeholder="0"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                            <Ticket className="w-3 h-3 text-yellow-500" /> Reiskosten
                                          </label>
                                          <input type="number" inputMode="decimal" step="0.01" min="0"
                                            value={entry.travelCosts || ""} onChange={(e) => updateEntry(row.projectId, date, "travelCosts", parseFloat(e.target.value) || 0)}
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700", entry.status)}
                                            placeholder="€0"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                            <Euro className="w-3 h-3 text-orange-500" /> Onkosten
                                          </label>
                                          <input type="number" inputMode="decimal" step="0.01" min="0"
                                            value={entry.otherExpenses || ""} onChange={(e) => updateEntry(row.projectId, date, "otherExpenses", parseFloat(e.target.value) || 0)}
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700", entry.status)}
                                            placeholder="€0"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                          <FileText className="w-3 h-3 text-slate-500" /> Opmerkingen
                                        </label>
                                        <textarea
                                          value={entry.notes || ""} onChange={(e) => updateEntry(row.projectId, date, "notes", e.target.value)}
                                          disabled={isDisabled}
                                          className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-none bg-white dark:bg-slate-700", entry.status)}
                                          placeholder="Opmerkingen..." rows={2}
                                        />
                                      </div>
                                      {entry.status === "REJECTED" && entry.rejectionReason && (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                          <p className="text-xs font-semibold text-red-800 dark:text-red-300">Afgekeurd:</p>
                                          <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{entry.rejectionReason}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>

                {/* ===== DESKTOP MONTH VIEW ===== */}
                <div className="hidden md:block space-y-6 overflow-x-auto">
                  {monthWeeks.map((weekStart, idx) => {
                    const weekDaysForWeek = getWeekDays(weekStart);
                    const currentMonth = currentWeek.getMonth();
                    const currentYear = currentWeek.getFullYear();
                    const weekNum = getWeekNumber(weekStart);
                    return (
                      <div
                        key={`week-${weekStart.toISOString()}`}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[900px]"
                      >
                        <div className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 px-4 py-2">
                          <div className="font-semibold text-slate-900">
                            Week {weekNum}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatDate(weekDaysForWeek[0])} -{" "}
                            {formatDate(weekDaysForWeek[6])}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-3 p-4 bg-slate-100 dark:bg-slate-800">
                            <div />
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              Project
                            </div>
                            {weekDaysForWeek.map((day, i) => {
                              const isInCurrentMonth =
                                day.getMonth() === currentMonth &&
                                day.getFullYear() === currentYear;
                              return (
                                <div
                                  key={`day-${day.toISOString()}`}
                                  className={
                                    "text-center" +
                                    (!isInCurrentMonth ? " opacity-50" : "")
                                  }
                                >
                                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                    {
                                      dayNames[
                                        day.getDay() === 0
                                          ? 6
                                          : day.getDay() - 1
                                      ]
                                    }
                                  </div>
                                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                    {day.getDate()}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="text-center font-bold text-slate-800 dark:text-slate-200">
                              Totaal
                            </div>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {projectRows.map((row, idx) => (
                            <div
                              key={`${weekStart.toISOString()}-${row.projectId}`}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700"
                            >
                              <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-3 p-4">
                                <div />
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 font-medium">
                                    {row.companyName}
                                    {row.projectGroupName && ` › ${row.projectGroupName}`}
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <button
                                      onClick={() => toggleFavorite(row.projectId, row.projectName)}
                                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                      title={favoriteProjectIds.has(row.projectId) ? "Verwijder uit favorieten" : "Toevoegen aan favorieten"}
                                    >
                                      <Heart
                                        className={`w-4 h-4 ${favoriteProjectIds.has(row.projectId) ? "fill-red-500 text-red-500" : "text-slate-400"}`}
                                      />
                                    </button>
                                    <span className="font-semibold text-base text-slate-800 dark:text-slate-100">
                                      {row.projectName}
                                    </span>
                                    {(() => {
                                      const maxInfo = getProjectMaxInfo(row.projectId);
                                      if (maxInfo.hasMax) {
                                        return (
                                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${maxInfo.isAtMax ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                                            max {maxInfo.currentHours}/{maxInfo.maxHours}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() =>
                                        removeProject(row.projectId)
                                      }
                                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                                      title="Verwijder project"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {weekDaysForWeek.map((day) => {
                                  const date = formatDate(day);
                                  const key = `${date}-${row.projectId}`;
                                  const entry = entries[key] || {
                                    date,
                                    projectId: row.projectId,
                                    hours: 0,
                                    taskType: getDefaultTaskType(),
                                    distanceKm: 0,
                                    travelCosts: 0,
                                    otherExpenses: 0,
                                    notes: "",
                                    status: "opgeslagen",
                                  };
                                  const isInCurrentMonth =
                                    day.getMonth() === currentMonth &&
                                    day.getFullYear() === currentYear;
                                  const entryEditable = isEditable(entry.status);
                                  const isClosed = isClosedDay(date);
                                  const isWeekendDay = isWeekend(day);
                                  const maxInfo = getProjectMaxInfo(row.projectId);
                                  const isAtMaxHours = maxInfo.hasMax && maxInfo.isAtMax && (entry.hours || 0) === 0;
                                  const isDisabled =
                                    !isInCurrentMonth ||
                                    !entryEditable ||
                                    isClosed ||
                                    isWeekendDay ||
                                    isAtMaxHours;
                                  return (
                                    <div
                                      key={`entry-${date}-${row.projectId}`}
                                      className={
                                        "space-y-1.5 p-2 rounded " +
                                        getEntryClassName(entry.status) +
                                        (!isInCurrentMonth ? " opacity-30" : "") +
                                        (isAtMaxHours ? " opacity-50" : "")
                                      }
                                    >
                                      {/* Task type selector (alleen voor users met BOTH) */}
                                      {shouldShowTaskDropdown() && !isDisabled && (
                                        <select
                                          value={entry.taskType || getDefaultTaskType()}
                                          onChange={(e) =>
                                            updateEntry(
                                              row.projectId,
                                              date,
                                              "taskType",
                                              e.target.value as 'MONTAGE' | 'TEKENKAMER',
                                            )
                                          }
                                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 font-medium"
                                          title="Selecteer taaktype"
                                        >
                                          <option value="MONTAGE">⚙️ Montage</option>
                                          <option value="TEKENKAMER">📐 Tekenkamer</option>
                                        </select>
                                      )}

                                      {/* Uren + Avond/Nacht (naast elkaar) */}
                                      <div className="grid grid-cols-2 gap-1">
                                        <div>
                                          <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Uren</label>
                                          <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="24"
                                            value={entry.hours || ""}
                                            onChange={(e) =>
                                              updateEntry(
                                                row.projectId,
                                                date,
                                                "hours",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-1 py-1.5 border rounded text-center text-lg font-bold", entry.status)}
                                            placeholder="0"
                                            title={
                                              isClosed
                                                ? "Gesloten dag"
                                                : entry.status === "SUBMITTED" ? "Ingeleverd"
                                                : entry.status === "APPROVED" ? "Goedgekeurd"
                                                : "Gewerkte uren"
                                            }
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-0.5">
                                            <Moon className="w-3 h-3 text-indigo-500" /> Nacht
                                          </label>
                                          <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="24"
                                            value={entry.eveningNightHours || ""}
                                            onChange={(e) =>
                                              updateEntry(
                                                row.projectId,
                                                date,
                                                "eveningNightHours",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-1 py-1.5 border rounded text-center text-lg font-bold", entry.status)}
                                            placeholder="0"
                                            title="Avond/nacht uren"
                                          />
                                        </div>
                                      </div>

                                      {/* Reisuren + KM (naast elkaar) */}
                                      <div className="grid grid-cols-2 gap-1">
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                          <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={entry.travelHours || ""}
                                            onChange={(e) =>
                                              updateEntry(
                                                row.projectId,
                                                date,
                                                "travelHours",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-1 py-1 border rounded text-xs", entry.status)}
                                            placeholder="reisu"
                                            title="Reisuren"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Car className="w-3 h-3 text-green-500 flex-shrink-0" />
                                          <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={entry.distanceKm || ""}
                                            onChange={(e) =>
                                              updateEntry(
                                                row.projectId,
                                                date,
                                                "distanceKm",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-1 py-1 border rounded text-xs", entry.status)}
                                            placeholder="km"
                                            title="Kilometers"
                                          />
                                        </div>
                                      </div>

                                      {/* Reiskosten + Onkosten (naast elkaar) */}
                                      <div className="grid grid-cols-2 gap-1">
                                        <div className="flex items-center gap-1">
                                          <Ticket className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={entry.travelCosts || ""}
                                            onChange={(e) =>
                                              updateEntry(
                                                row.projectId,
                                                date,
                                                "travelCosts",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-1 py-1 border rounded text-xs", entry.status)}
                                            placeholder="€reis"
                                            title="Reiskosten"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Euro className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={entry.otherExpenses || ""}
                                            onChange={(e) =>
                                              updateEntry(
                                                row.projectId,
                                                date,
                                                "otherExpenses",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            disabled={isDisabled}
                                            className={getInputClassName("w-full px-1 py-1 border rounded text-xs", entry.status)}
                                            placeholder="€onk"
                                            title="Onkosten"
                                          />
                                        </div>
                                      </div>

                                      {/* Opmerkingen */}
                                      <div>
                                        <textarea
                                          value={entry.notes || ""}
                                          onChange={(e) =>
                                            updateEntry(
                                              row.projectId,
                                              date,
                                              "notes",
                                              e.target.value,
                                            )
                                          }
                                          disabled={isDisabled}
                                          className={getInputClassName("w-full px-1.5 py-1 border rounded text-xs resize-none", entry.status)}
                                          placeholder="Opmerkingen..."
                                          rows={2}
                                          title="Opmerkingen"
                                        />
                                      </div>

                                      {/* Afkeur reden */}
                                      {entry.status === "REJECTED" && entry.rejectionReason && (
                                        <div className="p-1.5 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-[10px]">
                                          <p className="font-semibold text-red-800 dark:text-red-300">Afgekeurd:</p>
                                          <p className="text-red-700 dark:text-red-400">{entry.rejectionReason}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className="text-sm font-bold text-blue-600">
                                    {weekDaysForWeek.reduce((sum, day) => {
                                      const key = `${formatDate(day)}-${row.projectId}`;
                                      return sum + (entries[key]?.hours || 0);
                                    }, 0)}
                                    u
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-3 p-4">
                            <div />
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              Totaal per dag
                            </div>
                            {weekDaysForWeek.map((day) => {
                              const dayTotal = projectRows.reduce(
                                (sum, row) => {
                                  const key = `${formatDate(day)}-${row.projectId}`;
                                  return sum + (entries[key]?.hours || 0);
                                },
                                0,
                              );
                              const dayKmTotal = projectRows.reduce(
                                (sum, row) => {
                                  const key = `${formatDate(day)}-${row.projectId}`;
                                  return sum + (entries[key]?.km || 0);
                                },
                                0,
                              );
                              const dayExpensesTotal = projectRows.reduce(
                                (sum, row) => {
                                  const key = `${formatDate(day)}-${row.projectId}`;
                                  return sum + (entries[key]?.expenses || 0);
                                },
                                0,
                              );
                              return (
                                <div
                                  key={`total-${formatDate(day)}`}
                                  className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-slate-700 rounded-lg"
                                >
                                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {dayTotal}u
                                  </span>
                                </div>
                              );
                            })}
                            <div className="flex flex-col items-center gap-1 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {weekDaysForWeek.reduce(
                                  (sum, day) =>
                                    sum +
                                    projectRows.reduce((s, row) => {
                                      const key = `${formatDate(day)}-${row.projectId}`;
                                      return s + (entries[key]?.hours || 0);
                                    }, 0),
                                  0,
                                )}
                                u
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              ) : (
                <>
                {/* ===== MOBILE DAY-BY-DAY VIEW ===== */}
                <div className="md:hidden space-y-3">
                  {/* Day selector tabs */}
                  <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                    {weekDays.map((day, i) => {
                      const isToday = formatDate(day) === formatDate(new Date());
                      const isSelected = selectedMobileDay === i;
                      const dayTotal = getTotalDay(formatDate(day));
                      const isClosed = isClosedDay(formatDate(day));
                      const isWeekendDay = isWeekend(day);
                      return (
                        <button
                          key={`mob-day-${i}`}
                          onClick={() => setSelectedMobileDay(i)}
                          className={`flex-1 min-w-[48px] py-2 px-1 rounded-xl text-center transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-md"
                              : isToday
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                              : isClosed || isWeekendDay
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="text-[10px] font-medium uppercase">{dayNames[i]}</div>
                          <div className="text-lg font-bold">{day.getDate()}</div>
                          {dayTotal > 0 && (
                            <div className={`text-[10px] font-semibold ${isSelected ? "text-blue-200" : "text-blue-600 dark:text-blue-400"}`}>
                              {dayTotal}u
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Week total summary */}
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Weektotaal</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{getTotalWeek()}u</span>
                  </div>

                  {/* Project cards for selected day */}
                  {(() => {
                    const day = weekDays[selectedMobileDay];
                    const date = formatDate(day);
                    const isClosed = isClosedDay(date);
                    const isWeekendDay = isWeekend(day);

                    if (isClosed) {
                      return (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="font-medium">Gesloten dag</p>
                        </div>
                      );
                    }
                    if (isWeekendDay) {
                      return (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="font-medium">Weekend</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {projectRows.map((row) => {
                          const key = `${date}-${row.projectId}`;
                          const entry = entries[key] || {
                            date,
                            projectId: row.projectId,
                            hours: 0,
                            taskType: getDefaultTaskType(),
                            distanceKm: 0,
                            travelCosts: 0,
                            otherExpenses: 0,
                            notes: "",
                            status: "opgeslagen",
                          };
                          const entryEditable = isEditable(entry.status);
                          const maxInfo = getProjectMaxInfo(row.projectId);
                          const isAtMaxHours = maxInfo.hasMax && maxInfo.isAtMax && (entry.hours || 0) === 0;
                          const isDisabled = !entryEditable || isAtMaxHours;

                          return (
                            <div
                              key={`mob-entry-${row.projectId}`}
                              className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm ${getEntryClassName(entry.status)} ${isAtMaxHours ? "opacity-50" : ""}`}
                            >
                              {/* Project header */}
                              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {row.companyName}{row.projectGroupName && ` › ${row.projectGroupName}`}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{row.projectName}</span>
                                    {maxInfo.hasMax && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${maxInfo.isAtMax ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                                        {maxInfo.currentHours}/{maxInfo.maxHours}u
                                      </span>
                                    )}
                                  </div>
                                  {/* Status badge */}
                                  {entry.status === "SUBMITTED" && (
                                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-medium">Ingeleverd</span>
                                  )}
                                  {entry.status === "APPROVED" && (
                                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded font-medium">Goedgekeurd</span>
                                  )}
                                  {entry.status === "REJECTED" && (
                                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded font-medium">Afgekeurd</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => toggleFavorite(row.projectId, row.projectName)}
                                    className="p-1.5"
                                  >
                                    <Heart className={`w-4 h-4 ${favoriteProjectIds.has(row.projectId) ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
                                  </button>
                                  <button
                                    onClick={() => removeProject(row.projectId)}
                                    className="p-1.5 text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Entry fields */}
                              <div className="p-4 space-y-3">
                                {/* Task type */}
                                {shouldShowTaskDropdown() && !isDisabled && (
                                  <select
                                    value={entry.taskType || getDefaultTaskType()}
                                    onChange={(e) => updateEntry(row.projectId, date, "taskType", e.target.value as 'MONTAGE' | 'TEKENKAMER')}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 font-medium"
                                  >
                                    <option value="MONTAGE">Montage</option>
                                    <option value="TEKENKAMER">Tekenkamer</option>
                                  </select>
                                )}

                                {/* Uren + Avond/Nacht */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Uren</label>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.5"
                                      min="0"
                                      max="24"
                                      value={entry.hours || ""}
                                      onChange={(e) => updateEntry(row.projectId, date, "hours", parseFloat(e.target.value) || 0)}
                                      disabled={isDisabled}
                                      className={getInputClassName("w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-center text-xl font-bold bg-white dark:bg-slate-700", entry.status)}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                      <Moon className="w-3 h-3 text-indigo-500" /> Nacht
                                    </label>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.5"
                                      min="0"
                                      max="24"
                                      value={entry.eveningNightHours || ""}
                                      onChange={(e) => updateEntry(row.projectId, date, "eveningNightHours", parseFloat(e.target.value) || 0)}
                                      disabled={isDisabled}
                                      className={getInputClassName("w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-center text-xl font-bold bg-white dark:bg-slate-700", entry.status)}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>

                                {/* Reisuren + KM */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-blue-500" /> Reisuren
                                    </label>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.5"
                                      min="0"
                                      value={entry.travelHours || ""}
                                      onChange={(e) => updateEntry(row.projectId, date, "travelHours", parseFloat(e.target.value) || 0)}
                                      disabled={isDisabled}
                                      className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700", entry.status)}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                      <Car className="w-3 h-3 text-green-500" /> Kilometers
                                    </label>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="1"
                                      min="0"
                                      value={entry.distanceKm || ""}
                                      onChange={(e) => updateEntry(row.projectId, date, "distanceKm", parseFloat(e.target.value) || 0)}
                                      disabled={isDisabled}
                                      className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700", entry.status)}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>

                                {/* Reiskosten + Onkosten */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                      <Ticket className="w-3 h-3 text-yellow-500" /> Reiskosten
                                    </label>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      min="0"
                                      value={entry.travelCosts || ""}
                                      onChange={(e) => updateEntry(row.projectId, date, "travelCosts", parseFloat(e.target.value) || 0)}
                                      disabled={isDisabled}
                                      className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700", entry.status)}
                                      placeholder="€0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                      <Euro className="w-3 h-3 text-orange-500" /> Onkosten
                                    </label>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      min="0"
                                      value={entry.otherExpenses || ""}
                                      onChange={(e) => updateEntry(row.projectId, date, "otherExpenses", parseFloat(e.target.value) || 0)}
                                      disabled={isDisabled}
                                      className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700", entry.status)}
                                      placeholder="€0"
                                    />
                                  </div>
                                </div>

                                {/* Opmerkingen */}
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-slate-500" /> Opmerkingen
                                  </label>
                                  <textarea
                                    value={entry.notes || ""}
                                    onChange={(e) => updateEntry(row.projectId, date, "notes", e.target.value)}
                                    disabled={isDisabled}
                                    className={getInputClassName("w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-none bg-white dark:bg-slate-700", entry.status)}
                                    placeholder="Opmerkingen..."
                                    rows={2}
                                  />
                                </div>

                                {/* Rejection reason */}
                                {entry.status === "REJECTED" && entry.rejectionReason && (
                                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-xs font-semibold text-red-800 dark:text-red-300">Afgekeurd:</p>
                                    <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{entry.rejectionReason}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* ===== DESKTOP WEEK VIEW ===== */}
                <div className="hidden md:block space-y-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                      <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                        <div />
                        <div className="font-semibold text-slate-700">
                          Project
                        </div>
                        {weekDays.map((day, i) => (
                          <div key={i} className="text-center">
                            <div className="text-xs text-slate-500">
                              {dayNames[i]}
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                              {day.getDate()}
                            </div>
                          </div>
                        ))}
                        <div className="text-center font-semibold text-slate-700">
                          Totaal
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {projectRows.map((row, idx) => (
                        <div
                          key={row.projectId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700"
                        >
                          <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                            <div />
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 font-medium">
                                {row.companyName}
                                {row.projectGroupName && ` › ${row.projectGroupName}`}
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  onClick={() => toggleFavorite(row.projectId, row.projectName)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                  title={favoriteProjectIds.has(row.projectId) ? "Verwijder uit favorieten" : "Toevoegen aan favorieten"}
                                >
                                  <Heart
                                    className={`w-4 h-4 ${favoriteProjectIds.has(row.projectId) ? "fill-red-500 text-red-500" : "text-slate-400"}`}
                                  />
                                </button>
                                <span className="font-semibold text-base text-slate-800 dark:text-slate-100">
                                  {row.projectName}
                                </span>
                                {(() => {
                                  const maxInfo = getProjectMaxInfo(row.projectId);
                                  if (maxInfo.hasMax) {
                                    return (
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${maxInfo.isAtMax ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                                        max {maxInfo.currentHours}/{maxInfo.maxHours}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => removeProject(row.projectId)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200"
                                  title="Verwijder"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {weekDays.map((day) => {
                              const date = formatDate(day);
                              const key = `${date}-${row.projectId}`;
                              const entry = entries[key] || {
                                date,
                                projectId: row.projectId,
                                hours: 0,
                                taskType: getDefaultTaskType(),
                                distanceKm: 0,
                                travelCosts: 0,
                                otherExpenses: 0,
                                notes: "",
                                status: "opgeslagen",
                              };
                              const entryEditable = isEditable(entry.status);
                              const isClosed = isClosedDay(date);
                              const isWeekendDay = isWeekend(day);
                              const maxInfo = getProjectMaxInfo(row.projectId);
                              const isAtMaxHours = maxInfo.hasMax && maxInfo.isAtMax && (entry.hours || 0) === 0;
                              const isDisabled = !entryEditable || isClosed || isWeekendDay || isAtMaxHours;
                              return (
                                <div
                                  key={`week-entry-${date}-${row.projectId}`}
                                  className={"space-y-1.5 p-2 rounded " + getEntryClassName(entry.status) + (isAtMaxHours ? " opacity-50" : "")}
                                >
                                  {/* Task type selector (alleen voor users met BOTH) */}
                                  {shouldShowTaskDropdown() && !isDisabled && (
                                    <select
                                      value={entry.taskType || getDefaultTaskType()}
                                      onChange={(e) =>
                                        updateEntry(
                                          row.projectId,
                                          date,
                                          "taskType",
                                          e.target.value as 'MONTAGE' | 'TEKENKAMER',
                                        )
                                      }
                                      className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 font-medium"
                                      title="Selecteer taaktype"
                                    >
                                      <option value="MONTAGE">⚙️ Montage</option>
                                      <option value="TEKENKAMER">📐 Tekenkamer</option>
                                    </select>
                                  )}

                                  {/* Uren + Avond/Nacht (naast elkaar) */}
                                  <div className="grid grid-cols-2 gap-1">
                                    <div>
                                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Uren</label>
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="24"
                                        value={entry.hours || ""}
                                        onChange={(e) =>
                                          updateEntry(
                                            row.projectId,
                                            date,
                                            "hours",
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        disabled={isDisabled}
                                        className={getInputClassName("w-full px-1 py-1.5 border rounded text-center text-lg font-bold", entry.status)}
                                        placeholder="0"
                                        title={
                                          isClosed
                                            ? "Gesloten dag"
                                            : entry.status === "SUBMITTED" ? "Ingeleverd"
                                            : entry.status === "APPROVED" ? "Goedgekeurd"
                                            : "Gewerkte uren"
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-0.5">
                                        <Moon className="w-3 h-3 text-indigo-500" /> Nacht
                                      </label>
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="24"
                                        value={entry.eveningNightHours || ""}
                                        onChange={(e) =>
                                          updateEntry(
                                            row.projectId,
                                            date,
                                            "eveningNightHours",
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        disabled={isDisabled}
                                        className={getInputClassName("w-full px-1 py-1.5 border rounded text-center text-lg font-bold", entry.status)}
                                        placeholder="0"
                                        title="Avond/nacht uren"
                                      />
                                    </div>
                                  </div>

                                  {/* Reisuren + KM (naast elkaar) */}
                                  <div className="grid grid-cols-2 gap-1">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={entry.travelHours || ""}
                                        onChange={(e) =>
                                          updateEntry(
                                            row.projectId,
                                            date,
                                            "travelHours",
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        disabled={isDisabled}
                                        className={getInputClassName("w-full px-1 py-1 border rounded text-xs", entry.status)}
                                        placeholder="reisu"
                                        title="Reisuren"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Car className="w-3 h-3 text-green-500 flex-shrink-0" />
                                      <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={entry.distanceKm || ""}
                                        onChange={(e) =>
                                          updateEntry(
                                            row.projectId,
                                            date,
                                            "distanceKm",
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        disabled={isDisabled}
                                        className={getInputClassName("w-full px-1 py-1 border rounded text-xs", entry.status)}
                                        placeholder="km"
                                        title="Kilometers"
                                      />
                                    </div>
                                  </div>

                                  {/* Reiskosten + Onkosten (naast elkaar) */}
                                  <div className="grid grid-cols-2 gap-1">
                                    <div className="flex items-center gap-1">
                                      <Ticket className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={entry.travelCosts || ""}
                                        onChange={(e) =>
                                          updateEntry(
                                            row.projectId,
                                            date,
                                            "travelCosts",
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        disabled={isDisabled}
                                        className={getInputClassName("w-full px-1 py-1 border rounded text-xs", entry.status)}
                                        placeholder="€reis"
                                        title="Reiskosten"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Euro className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={entry.otherExpenses || ""}
                                        onChange={(e) =>
                                          updateEntry(
                                            row.projectId,
                                            date,
                                            "otherExpenses",
                                            parseFloat(e.target.value) || 0,
                                          )
                                        }
                                        disabled={isDisabled}
                                        className={getInputClassName("w-full px-1 py-1 border rounded text-xs", entry.status)}
                                        placeholder="€onk"
                                        title="Onkosten"
                                      />
                                    </div>
                                  </div>

                                  {/* Opmerkingen */}
                                  <div>
                                    <textarea
                                      value={entry.notes || ""}
                                      onChange={(e) =>
                                        updateEntry(
                                          row.projectId,
                                          date,
                                          "notes",
                                          e.target.value,
                                        )
                                      }
                                      disabled={isDisabled}
                                      className={getInputClassName("w-full px-1.5 py-1 border rounded text-xs resize-none", entry.status)}
                                      placeholder="Opmerkingen..."
                                      rows={2}
                                      title="Opmerkingen"
                                    />
                                  </div>

                                  {/* Afkeur reden */}
                                  {entry.status === "REJECTED" && entry.rejectionReason && (
                                    <div className="p-1.5 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-[10px]">
                                      <p className="font-semibold text-red-800 dark:text-red-300">Afgekeurd:</p>
                                      <p className="text-red-700 dark:text-red-400">{entry.rejectionReason}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="text-sm font-bold text-blue-600">
                                {getTotalProject(row.projectId)}u
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border-t border-slate-200">
                      <div className="grid grid-cols-[40px_250px_repeat(7,1fr)_120px] gap-2 p-3">
                        <div />
                        <div className="font-semibold text-slate-700">
                          Totaal per dag
                        </div>
                        {weekDays.map((day) => (
                          <div
                            key={`week-total-${formatDate(day)}`}
                            className="flex flex-col items-center gap-0.5"
                          >
                            <span className="text-sm font-bold text-blue-600">
                              {getTotalDay(formatDate(day))}u
                            </span>
                          </div>
                        ))}
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-bold text-emerald-600">
                            {getTotalWeek()}u
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </>
              )}

              {/* Indirect hours section (Verlof, ATV, Ziekte) */}
              {indirectTasks.length > 0 && (
                <div className="mt-4 mx-2 md:mx-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Verlof & Indirecte uren
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 min-w-[180px]">
                            Uurcode
                          </th>
                          {(viewMode === "week" ? weekDays : getWeekDays(getMonthWeeks(currentWeek)[selectedMobileWeek] || currentWeek)).map((day) => (
                            <th key={formatDate(day)} className="text-center px-1 py-2 font-medium text-slate-500 dark:text-slate-400 w-16">
                              {dayNames[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                              <div className="text-[10px] text-slate-400">{day.getDate()}</div>
                            </th>
                          ))}
                          <th className="text-center px-2 py-2 font-semibold text-slate-600 dark:text-slate-400 w-16">Tot</th>
                          <th className="text-center px-2 py-2 font-semibold text-slate-600 dark:text-slate-400 w-20">Rest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indirectTasks.map((task) => {
                          const weekTotal = getIndirectTotalForCode(task.code);
                          const remaining = task.budget - task.used - weekTotal;
                          return (
                            <tr key={task.code} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                                    {task.code}
                                  </code>
                                  <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                                    {task.description}
                                  </span>
                                </div>
                              </td>
                              {(viewMode === "week" ? weekDays : getWeekDays(getMonthWeeks(currentWeek)[selectedMobileWeek] || currentWeek)).map((day) => {
                                const dateStr = formatDate(day);
                                const ie = getIndirectEntry(task.code, dateStr);
                                const closed = isClosedDay(dateStr);
                                return (
                                  <td key={dateStr} className="px-1 py-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="8"
                                      step="0.5"
                                      value={ie?.hours || ""}
                                      placeholder={closed ? "X" : "-"}
                                      disabled={closed}
                                      onChange={(e) =>
                                        updateIndirectEntry(task.taakGcId, task.code, dateStr, parseFloat(e.target.value) || 0)
                                      }
                                      className={`w-12 h-7 text-center text-xs border rounded ${
                                        closed
                                          ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                                          : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                      }`}
                                    />
                                  </td>
                                );
                              })}
                              <td className="px-2 py-1.5 text-center">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {weekTotal > 0 ? `${weekTotal}u` : "-"}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <span className={`text-xs font-bold ${
                                  remaining < 0
                                    ? "text-red-600 dark:text-red-400"
                                    : remaining <= task.budget * 0.1
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-green-600 dark:text-green-400"
                                }`}>
                                  {remaining}/{task.budget}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mobile floating action buttons */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-3 py-3 flex gap-2 safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="flex-1 py-3 bg-timr-orange hover:bg-timr-orange-hover text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition text-sm"
                >
                  <Save className="w-4 h-4" /> {saving ? "Bezig..." : "Opslaan"}
                </button>
                <button
                  onClick={submitAll}
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition text-sm"
                >
                  <Send className="w-4 h-4" /> Inleveren
                </button>
              </div>
              {/* Spacer to prevent content behind floating buttons on mobile */}
              <div className="md:hidden h-20" />
            </div>
          </div>
        </div>
      </ModernLayout>
    </ProtectedRoute>
  );
}
