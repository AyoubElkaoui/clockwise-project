// API-helpers voor de beheerpagina's (app/admin/**).
// Alle routes staan onder /api; de Bearer-token wordt door de axios-interceptor in lib/api.ts meegestuurd.
import axios from "axios";
import { API_URL } from "../api";

// ---------- Gebruikers ----------

export type AdminRole = "user" | "manager" | "admin";

export interface AdminUser {
  id: number;
  medewGcId: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: AdminRole | string;
  rank: string; // rol, of "inactive" als is_active=false
  isActive: boolean;
  contractHours: number | null;
  vacationDays: number | null;
  usedVacationDays: number | null;
  twoFactorEnabled: boolean;
  allowedTasks: string | null;
  lastLogin: string | null;
  createdAt: string | null;
}

export interface UpdateAdminUserBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: AdminRole;
  isActive?: boolean;
  contractHours?: number;
  vacationDays?: number;
  usedVacationDays?: number;
}

export interface CreateAdminUserBody {
  medewGcId: number;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: AdminRole;
  contractHours?: number;
  vacationDays?: number;
  managerId?: number;
}

export interface AtriumEmployee {
  medewGcId: number;
  name: string | null;
  linked: boolean;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await axios.get(`${API_URL}/users`);
  return Array.isArray(data) ? data : [];
}

export async function getAdminUser(medewGcId: number): Promise<AdminUser> {
  const { data } = await axios.get(`${API_URL}/users/${medewGcId}`);
  return data;
}

export async function updateAdminUser(medewGcId: number, body: UpdateAdminUserBody): Promise<void> {
  await axios.put(`${API_URL}/users/${medewGcId}`, body);
}

export async function createAdminUser(
  body: CreateAdminUserBody,
): Promise<{ success: boolean; id: number; medewGcId: number; username: string }> {
  const { data } = await axios.post(`${API_URL}/users`, body);
  return data;
}

export async function getAtriumEmployees(): Promise<AtriumEmployee[]> {
  const { data } = await axios.get(`${API_URL}/users/atrium-employees`);
  return Array.isArray(data) ? data : [];
}

// ---------- Dashboard-cijfers ----------

interface Period {
  gcId: number;
  gcCode: string;
  beginDatum: string;
  endDatum: string;
}

/** Bepaalt de urenperiode waarin vandaag valt (of anders de meest recente). */
async function getCurrentPeriodId(): Promise<number> {
  const { data } = await axios.get(`${API_URL}/periods?count=50`);
  const periods: Period[] = Array.isArray(data) ? data : [];
  if (periods.length === 0) throw new Error("Geen urenperiodes gevonden");
  const today = new Date();
  const current = periods.find((p) => {
    const start = new Date(p.beginDatum);
    const end = new Date(p.endDatum);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end;
  });
  if (current) return current.gcId;
  const sorted = [...periods].sort(
    (a, b) => new Date(b.beginDatum).getTime() - new Date(a.beginDatum).getTime(),
  );
  return sorted[0].gcId;
}

/** Aantal ingediende urenregels die op beoordeling wachten in de huidige periode. */
export async function getPendingReviewCount(): Promise<number> {
  const periodId = await getCurrentPeriodId();
  const { data } = await axios.get(`${API_URL}/workflow/review/pending`, {
    params: { urenperGcId: periodId },
  });
  if (typeof data?.totalCount === "number") return data.totalCount;
  return Array.isArray(data?.entries) ? data.entries.length : 0;
}

/** Aantal verlofaanvragen met status SUBMITTED/PENDING. */
export async function getPendingVacationCount(): Promise<number> {
  const { data } = await axios.get(`${API_URL}/vacation/all`);
  const list: { status?: string }[] = Array.isArray(data) ? data : [];
  return list.filter((r) => {
    const s = (r.status || "").toUpperCase();
    return s === "SUBMITTED" || s === "PENDING";
  }).length;
}

// ---------- Feestdagen ----------

export type HolidayType = "national" | "company" | "closed";

export interface AdminHoliday {
  id: number;
  holidayDate: string; // yyyy-MM-dd
  name: string;
  type: HolidayType | string;
  isWorkAllowed: boolean;
  createdBy: number | null;
  createdAt: string | null;
  notes: string | null;
}

export async function getHolidaysForYear(year: number): Promise<AdminHoliday[]> {
  const { data } = await axios.get(`${API_URL}/holidays`, { params: { year } });
  return Array.isArray(data) ? data : [];
}

export async function createHoliday(body: {
  holidayDate: string;
  name: string;
  type: "company" | "closed";
  isWorkAllowed: boolean;
  notes?: string;
}): Promise<{ id: number }> {
  const { data } = await axios.post(`${API_URL}/holidays`, body);
  return data;
}

export async function updateHoliday(
  id: number,
  body: { isWorkAllowed: boolean; notes?: string | null },
): Promise<void> {
  await axios.put(`${API_URL}/holidays/${id}`, body);
}

export async function deleteHoliday(id: number): Promise<void> {
  await axios.delete(`${API_URL}/holidays/${id}`);
}

export async function toggleHolidayWork(id: number): Promise<{ isWorkAllowed: boolean }> {
  const { data } = await axios.post(`${API_URL}/holidays/toggle-work/${id}`);
  return data;
}

export async function generateHolidays(
  year: number,
): Promise<{ message: string; year: number; count: number }> {
  const { data } = await axios.post(`${API_URL}/holidays/generate/${year}`);
  return data;
}

// ---------- Systeeminstellingen ----------

export type SystemSettings = Record<string, string>;

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data } = await axios.get(`${API_URL}/system-settings`);
  return data && typeof data === "object" ? data : {};
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  await axios.post(`${API_URL}/system-settings`, settings);
}

// ---------- Herinneringen ----------

export interface ReminderStatus {
  currentTime: string;
  currentDay: string;
  schedule: {
    employeeReminder: { day: string; time: string; nextRun: string };
    managerOverview: { day: string; time: string; nextRun: string };
  };
}

export async function getReminderStatus(): Promise<ReminderStatus> {
  const { data } = await axios.get(`${API_URL}/reminders/status`);
  return data;
}

export async function sendEmployeeReminder(): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post(`${API_URL}/reminders/employee`);
  return data;
}

export async function sendManagerOverview(): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post(`${API_URL}/reminders/manager`);
  return data;
}

// ---------- Foutafhandeling ----------

/** Haalt de {error}/{message} uit een backend-antwoord, anders de fallback. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === "object") {
      const msg = (data as any).error || (data as any).message;
      const details = (data as any).details;
      if (typeof msg === "string" && msg.trim()) {
        return typeof details === "string" && details.trim() ? `${msg}: ${details}` : msg;
      }
    }
    if (typeof data === "string" && data.trim()) return data;
    if (err.response?.status === 403) return "Geen toestemming voor deze actie";
    if (err.response?.status === 404) return "Niet gevonden";
    if (!err.response) return "Geen verbinding met de server";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
