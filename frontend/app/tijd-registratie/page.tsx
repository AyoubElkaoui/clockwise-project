"use client";
import { useTranslation } from "react-i18next";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import axios from "axios";
import {
  ChevronDown,
  Plus,
  Trash2,
  Star,
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
  const [openRows, setOpenRows] = useState<Set<number>>(new Set());

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

  // selectedDay for legacy day-view helpers (kept for compatibility)
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

  const toggleOpenRow = (projectId: number) => {
    setOpenRows(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const PROJECT_COLORS = ["var(--c-accent)","#1f9d74","#d08a2b","#9b59b6","#e74c3c","#2ecc71","#1abc9c","#f39c12"];
  const getProjectColor = (projectId: number) => PROJECT_COLORS[projectId % PROJECT_COLORS.length];

  // ─── Style constants ───────────────────────────────────────────────────────
  const primaryBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "9px 16px", border: "1px solid transparent",
    background: "var(--c-accent)", color: "#fff",
    borderRadius: "9px", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", fontFamily: "var(--font-geist, sans-serif)",
  };
  const secondaryBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "7px",
    padding: "9px 15px", border: "1px solid var(--c-border)",
    background: "var(--c-panel)", color: "var(--c-text)",
    borderRadius: "9px", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", boxShadow: "var(--c-shadow)",
    fontFamily: "var(--font-geist, sans-serif)",
  };
  const secondaryBtnSmStyle: React.CSSProperties = {
    padding: "0 13px", height: "32px", border: "1px solid var(--c-border)",
    background: "var(--c-panel)", borderRadius: "8px",
    color: "var(--c-text-2)", fontSize: "12.5px", fontWeight: 600,
    cursor: "pointer", boxShadow: "var(--c-shadow)",
    fontFamily: "var(--font-geist, sans-serif)",
  };
  const iconBtnStyle: React.CSSProperties = {
    width: "32px", height: "32px", display: "flex", alignItems: "center",
    justifyContent: "center", border: "1px solid var(--c-border)",
    background: "var(--c-panel)", borderRadius: "8px",
    color: "var(--c-text-2)", cursor: "pointer", boxShadow: "var(--c-shadow)",
    fontSize: "18px", fontFamily: "var(--font-geist, sans-serif)",
  };
  const colHeaderStyle: React.CSSProperties = {
    padding: "12px 16px", fontSize: "11px", fontWeight: 600,
    letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-muted)",
  };
  const extraLabelStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: "5px",
  };
  const extraLabelTextStyle: React.CSSProperties = {
    fontSize: "10.5px", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--c-muted)",
  };
  const extraInputStyle: React.CSSProperties = {
    width: "130px", padding: "8px 11px", border: "1px solid var(--c-border)",
    borderRadius: "8px", background: "var(--c-panel)", color: "var(--c-text)",
    fontSize: "13px", fontFamily: "var(--font-geist-mono, monospace)",
    outline: "none",
  };

  // ─── Computed values ───────────────────────────────────────────────────────
  const shortMonths = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  const weekTotal = getTotalWeek();
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];
  const rangeLabel = `${firstDay.getDate()} ${shortMonths[firstDay.getMonth()]} – ${lastDay.getDate()} ${shortMonths[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
  const prevWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d); };
  const nextWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d); };
  const goToday = () => setCurrentWeek(new Date());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "16px", right: "16px", zIndex: 50,
          padding: "12px 18px", borderRadius: "10px",
          background: toast.type === "success" ? "#059669" : "#dc2626",
          color: "#fff", fontSize: "13.5px", fontWeight: 500,
          display: "flex", alignItems: "center", gap: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          fontFamily: "var(--font-geist, sans-serif)",
        }}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.message}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, font: "700 22px var(--font-geist, sans-serif)", letterSpacing: "-0.015em", color: "var(--c-text)" }}>
            Uren registreren
          </h1>
          <p style={{ margin: "5px 0 0", fontSize: "13.5px", color: "var(--c-muted)" }}>
            Vul je uren per project in en lever je week in ter goedkeuring.
          </p>
        </div>
        <div style={{ display: "flex", gap: "9px" }}>
          <button onClick={saveAll} disabled={saving} style={secondaryBtnStyle}>
            {saving ? "Opslaan…" : "Concept opslaan"}
          </button>
          <button onClick={submitAll} disabled={saving} style={primaryBtnStyle}>
            ↑ Week inleveren
          </button>
        </div>
      </div>

      {/* Week navigator + status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <button onClick={prevWeek} style={iconBtnStyle}>‹</button>
          <div style={{ textAlign: "center", minWidth: "168px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--c-text)" }}>Week {weekNumber}</div>
            <div style={{ fontSize: "11.5px", color: "var(--c-muted)" }}>{rangeLabel}</div>
          </div>
          <button onClick={nextWeek} style={iconBtnStyle}>›</button>
          <button onClick={goToday} style={secondaryBtnSmStyle}>Vandaag</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: "16px", fontFamily: "var(--font-geist-mono, monospace)", color: "var(--c-text)", fontVariantNumeric: "tabular-nums" }}>
              {weekTotal}u <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--c-muted)" }}>/ 40u</span>
            </div>
            <div style={{ width: "154px", height: "5px", background: "var(--c-border)", borderRadius: "99px", marginTop: "6px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, Math.round(weekTotal / 40 * 100))}%`, background: "var(--c-accent)", borderRadius: "99px", transition: "width 0.2s" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet grid */}
      <div style={{ background: "var(--c-panel)", border: "1px solid var(--c-border)", borderRadius: "13px", boxShadow: "var(--c-shadow)", overflowX: "auto" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(232px,1.5fr) repeat(7,minmax(58px,1fr)) 88px", minWidth: "748px", borderBottom: "1px solid var(--c-border)", background: "var(--c-panel-2)" }}>
          <div style={colHeaderStyle}>Project</div>
          {weekDays.map((day, i) => {
            const date = formatDate(day);
            const isWknd = isWeekend(day);
            return (
              <div key={date} style={{ padding: "11px 4px", textAlign: "center", borderLeft: "1px solid var(--c-border)", background: isWknd ? "var(--c-panel-2)" : "transparent" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text-2)", textTransform: "capitalize" }}>{dayNames[i]}</div>
                <div style={{ fontSize: "11px", color: "var(--c-muted)", marginTop: "2px" }}>{day.getDate()} {shortMonths[day.getMonth()]}</div>
              </div>
            );
          })}
          <div style={{ ...colHeaderStyle, borderLeft: "1px solid var(--c-border)", textAlign: "center" }}>Totaal</div>
        </div>

        {/* Project rows */}
        {projectRows.map((row) => {
          const rowOpen = openRows.has(row.projectId);
          const rowTotal = getTotalProject(row.projectId);
          const projectColor = getProjectColor(row.projectId);
          return (
            <div key={row.projectId} style={{ borderBottom: "1px solid var(--c-border)" }}>
              {/* Main row */}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(232px,1.5fr) repeat(7,minmax(58px,1fr)) 88px", minWidth: "748px", alignItems: "stretch" }}>
                {/* Project info cell */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", minWidth: 0 }}>
                  <button
                    onClick={() => toggleOpenRow(row.projectId)}
                    title="Extra velden"
                    style={{ width: "20px", height: "20px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "var(--c-muted)", borderRadius: "5px", cursor: "pointer", fontSize: "11px" }}
                  >
                    {rowOpen ? "▾" : "▸"}
                  </button>
                  <span style={{ width: "8px", height: "8px", flexShrink: 0, borderRadius: "50%", background: projectColor }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.projectName}</div>
                    <div style={{ fontSize: "11px", fontFamily: "var(--font-geist-mono, monospace)", color: "var(--c-muted)", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.companyName}</div>
                  </div>
                  <button
                    onClick={() => removeProject(row.projectId)}
                    title="Verwijderen"
                    style={{ flexShrink: 0, padding: "4px", border: "none", background: "transparent", color: "var(--c-muted)", borderRadius: "6px", cursor: "pointer", display: "flex", opacity: 0.6 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "var(--c-red)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.6"; (e.currentTarget as HTMLButtonElement).style.color = "var(--c-muted)"; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Day input cells */}
                {weekDays.map((day) => {
                  const date = formatDate(day);
                  const key = `${date}-${row.projectId}`;
                  const entry = entries[key];
                  const editable = isEditable(entry?.status);
                  const isWknd = isWeekend(day);
                  const isClosed = isClosedDay(date);
                  return (
                    <div key={date} style={{ borderLeft: "1px solid var(--c-border)", background: (isWknd || isClosed) ? "var(--c-panel-2)" : (entry?.status === "APPROVED" ? "rgba(31,157,107,0.06)" : entry?.status === "SUBMITTED" ? "rgba(58,91,208,0.04)" : entry?.status === "REJECTED" ? "rgba(220,82,82,0.06)" : "transparent"), display: "flex" }}>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry?.hours || ""}
                        placeholder="–"
                        disabled={!editable || isClosed}
                        onChange={e => updateEntry(row.projectId, date, "hours", parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          border: "none",
                          background: "transparent",
                          textAlign: "center",
                          fontSize: "14px",
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--c-text)",
                          padding: "12px 2px",
                          outline: "none",
                          cursor: editable && !isClosed ? "text" : "not-allowed",
                          opacity: editable && !isClosed ? 1 : 0.5,
                        }}
                        onFocus={e => { e.currentTarget.style.background = "var(--c-panel)"; e.currentTarget.style.boxShadow = "inset 0 0 0 2px var(--c-accent)"; }}
                        onBlur={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "none"; }}
                      />
                    </div>
                  );
                })}

                {/* Total cell */}
                <div style={{ borderLeft: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontFamily: "var(--font-geist-mono, monospace)", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: rowTotal === 0 ? "var(--c-muted)" : "var(--c-text)" }}>
                  {rowTotal > 0 ? rowTotal : "–"}
                </div>
              </div>

              {/* Expandable extra fields */}
              {rowOpen && (
                <div style={{ padding: "14px 18px 16px 43px", background: "var(--c-panel-2)", borderTop: "1px dashed var(--c-border)", display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <label style={extraLabelStyle}>
                    <span style={extraLabelTextStyle}>Kilometers</span>
                    <input
                      type="number" min="0" placeholder="0"
                      value={(() => { const firstEntry = weekDays.map(d => entries[`${formatDate(d)}-${row.projectId}`]).find(e => e?.distanceKm); return firstEntry?.distanceKm || ""; })()}
                      onChange={e => weekDays.forEach(d => { const key = `${formatDate(d)}-${row.projectId}`; if (entries[key]?.hours) updateEntry(row.projectId, formatDate(d), "distanceKm", parseFloat(e.target.value) || 0); })}
                      style={extraInputStyle}
                    />
                  </label>
                  <label style={extraLabelStyle}>
                    <span style={extraLabelTextStyle}>Onkosten (€)</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0,00"
                      value={(() => { const firstEntry = weekDays.map(d => entries[`${formatDate(d)}-${row.projectId}`]).find(e => e?.otherExpenses); return firstEntry?.otherExpenses || ""; })()}
                      onChange={e => weekDays.forEach(d => { const key = `${formatDate(d)}-${row.projectId}`; if (entries[key]?.hours) updateEntry(row.projectId, formatDate(d), "otherExpenses", parseFloat(e.target.value) || 0); })}
                      style={extraInputStyle}
                    />
                  </label>
                  <label style={{ ...extraLabelStyle, flex: 1, minWidth: "220px" }}>
                    <span style={extraLabelTextStyle}>Opmerking</span>
                    <input
                      type="text" placeholder="Korte toelichting op de werkzaamheden…"
                      value={(() => { const firstEntry = weekDays.map(d => entries[`${formatDate(d)}-${row.projectId}`]).find(e => e?.notes); return firstEntry?.notes || ""; })()}
                      onChange={e => weekDays.forEach(d => { const key = `${formatDate(d)}-${row.projectId}`; if (entries[key]?.hours) updateEntry(row.projectId, formatDate(d), "notes", e.target.value); })}
                      style={{ ...extraInputStyle, width: "100%", fontFamily: "var(--font-geist, sans-serif)" }}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}

        {/* Add project button */}
        <button
          onClick={() => setShowProjectPicker(true)}
          style={{ display: "flex", alignItems: "center", gap: "9px", width: "100%", minWidth: "748px", padding: "12px 16px", border: "none", background: "transparent", color: "var(--c-muted)", fontSize: "13px", fontWeight: 600, cursor: "pointer", borderBottom: "1px solid var(--c-border)", fontFamily: "var(--font-geist, sans-serif)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--c-hover)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--c-accent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--c-muted)"; }}
        >
          <Plus size={16} /> Project toevoegen
        </button>

        {/* Day totals row */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(232px,1.5fr) repeat(7,minmax(58px,1fr)) 88px", minWidth: "748px", background: "var(--c-panel-2)" }}>
          <div style={{ padding: "12px 16px", fontSize: "12.5px", fontWeight: 600, color: "var(--c-text)" }}>Totaal per dag</div>
          {weekDays.map((day) => {
            const date = formatDate(day);
            const total = getTotalDay(date);
            const isWknd = isWeekend(day);
            return (
              <div key={date} style={{ borderLeft: "1px solid var(--c-border)", background: isWknd ? "var(--c-panel-2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontFamily: "var(--font-geist-mono, monospace)", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: total === 0 ? "var(--c-muted)" : (total > 8 ? "var(--c-red)" : "var(--c-text)") }}>
                {total > 0 ? total : "–"}
              </div>
            );
          })}
          <div style={{ borderLeft: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontFamily: "var(--font-geist-mono, monospace)", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--c-accent)" }}>
            {weekTotal}
          </div>
        </div>
      </div>

      {/* Info hint */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--c-muted)" }}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
        Klik op ▸ naast een project om kilometers, onkosten en een opmerking toe te voegen.
      </div>

      {/* Project picker modal */}
      {showProjectPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}
            onClick={() => setShowProjectPicker(false)}
          />
          <div style={{ position: "relative", width: "320px", background: "var(--c-panel)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", overflowY: "auto" }}>
            <div style={{ position: "sticky", top: 0, background: "var(--c-panel)", borderBottom: "1px solid var(--c-border)", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--c-text)", fontFamily: "var(--font-geist, sans-serif)" }}>Project kiezen</h3>
              <button
                onClick={() => setShowProjectPicker(false)}
                style={{ padding: "4px 8px", border: "none", background: "transparent", color: "var(--c-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1, borderRadius: "6px" }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {favoriteProjects.length > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <p style={{ margin: "0 0 4px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Star size={11} style={{ fill: "currentColor" }} /> Favorieten
                  </p>
                  {favoriteProjects.map(fav => (
                    <div
                      key={fav.projectGcId}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "var(--c-text)", fontFamily: "var(--font-geist, sans-serif)" }}
                      onClick={() => { addFavoriteToRows(fav); setShowProjectPicker(false); }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--c-hover)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                    >
                      <Star size={11} style={{ color: "#d97706", fill: "#d97706", flexShrink: 0 }} />
                      <span>{fav.projectName || fav.projectCode}</span>
                    </div>
                  ))}
                  <div style={{ borderBottom: "1px solid var(--c-border)", margin: "8px 0" }} />
                </div>
              )}
              {companies.map(company => (
                <div key={company.id}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}
                    onClick={() => toggleCompany(company.id)}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--c-hover)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    <ChevronDown
                      size={14}
                      style={{ color: "var(--c-muted)", flexShrink: 0, transform: expandedCompanies.includes(company.id) ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--c-text)", fontFamily: "var(--font-geist, sans-serif)" }}>
                      {company.name.replace(/\s*[\(\{]\d+[\)\}]\s*$/, '')}
                    </span>
                  </div>
                  {expandedCompanies.includes(company.id) && projectGroups[company.id]?.filter(g => assignedGroupIds === null || assignedGroupIds.has(g.id)).map(group => (
                    <div key={group.id} style={{ marginLeft: "16px" }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}
                        onClick={() => toggleGroup(group.id)}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--c-hover)"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                      >
                        <ChevronDown
                          size={12}
                          style={{ color: "var(--c-muted)", flexShrink: 0, transform: expandedGroups.includes(group.id) ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}
                        />
                        <span style={{ fontSize: "12.5px", color: "var(--c-text-2)", fontFamily: "var(--font-geist, sans-serif)" }}>{group.name}</span>
                      </div>
                      {expandedGroups.includes(group.id) && getVisibleProjects(group.id).map(project => (
                        <div
                          key={project.id}
                          style={{ marginLeft: "16px", display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}
                          onClick={() => { addProject(company, group, project); setShowProjectPicker(false); }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--c-hover)"}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                        >
                          <button
                            style={{ flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", color: favoriteProjectIds.has(project.id) ? "#d97706" : "var(--c-muted)" }}
                            onClick={e => { e.stopPropagation(); toggleFavorite(project.id, project.name); }}
                          >
                            <Star size={11} style={{ fill: favoriteProjectIds.has(project.id) ? "currentColor" : "none" }} />
                          </button>
                          <span style={{ fontSize: "12.5px", color: "var(--c-text-2)", fontFamily: "var(--font-geist, sans-serif)" }}>{project.name}</span>
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
    </div>
  );
}
