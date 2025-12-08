// lib/dateUtils.ts
import dayjs from 'dayjs';
import 'dayjs/locale/nl';
import relativeTime from 'dayjs/plugin/relativeTime';
import isoWeek from 'dayjs/plugin/isoWeek';

// Configureer dayjs met Nederlandse locale
dayjs.locale('nl');
dayjs.extend(relativeTime);
dayjs.extend(isoWeek);

/**
 * Formatteer datum naar Nederlands formaat
 * @param date - Datum string of Date object
 * @param format - Format string (standaard: "DD MMMM YYYY")
 * @returns Geformatteerde Nederlandse datum
 */
export function formatDateNL(date: string | Date, format: string = "DD MMMM YYYY"): string {
  return dayjs(date).format(format);
}

/**
 * Formatteer datum + tijd naar Nederlands formaat
 * @param date - Datum string of Date object
 * @returns Geformatteerde Nederlandse datum en tijd
 */
export function formatDateTimeNL(date: string | Date): string {
  return dayjs(date).format("DD MMMM YYYY HH:mm");
}

/**
 * Relatieve tijd in het Nederlands
 * @param date - Datum string of Date object
 * @returns Relatieve tijd (bijv. "2 uur geleden")
 */
export function fromNowNL(date: string | Date): string {
  return dayjs(date).fromNow();
}

/**
 * Korte datum formaat (DD-MM-YYYY)
 */
export function formatDateShortNL(date: string | Date): string {
  return dayjs(date).format("DD-MM-YYYY");
}

/**
 * Dag + maand naam (bijv. "15 nov")
 */
export function formatDateCompactNL(date: string | Date): string {
  return dayjs(date).format("DD MMM");
}

/**
 * Volledige datum met dag naam (bijv. "Maandag 5 november 2025")
 */
export function formatDateFullNL(date: string | Date): string {
  return dayjs(date).format("dddd D MMMM YYYY");
}

export default dayjs;
