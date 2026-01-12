import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format hours to display format (e.g., "8.5" -> "8.5u")
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}u`;
}

/**
 * Format date to Dutch format (DD-MM-YYYY)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date to short format (DD MMM)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/**
 * Format time to HH:MM format
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Calculate duration between two dates in hours
 */
export function calculateDuration(start: Date | string, end: Date | string, breakMinutes: number = 0): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const breakHours = breakMinutes / 60;
  return Math.max(0, diffHours - breakHours);
}

/**
 * Get relative time string (e.g., "2 uur geleden")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Zojuist';
  if (diffMins < 60) return `${diffMins} min geleden`;
  if (diffHours < 24) return `${diffHours} uur geleden`;
  if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'en' : ''} geleden`;
  return formatDate(d);
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    goedgekeurd: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
    'in-behandeling': 'text-timr-orange bg-timr-orange-light dark:text-timr-orange dark:bg-timr-orange-light/20',
    afgewezen: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
    opgeslagen: 'text-timr-blue bg-timr-blue-light dark:text-timr-blue dark:bg-timr-blue-light/20',
    ingediend: 'text-timr-blue bg-timr-blue-light dark:text-timr-blue dark:bg-timr-blue-light/20',
  };
  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20';
}

/**
 * Get current week number
 */
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get start and end of week
 */
export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}
